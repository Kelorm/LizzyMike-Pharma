"""Authentication and user management views."""
import logging
from datetime import timedelta

from django.conf import settings
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken, TokenError
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from ..authentication import ACCESS_COOKIE, REFRESH_COOKIE
from ..models import FailedLoginAttempt, LockedAccount, SecurityEvent, User
from ..serializers import UserSerializer
from ..permissions import IsAdminRole
from ..audit_log import log_audit

logger = logging.getLogger(__name__)

MAX_FAILED_ATTEMPTS = 5
FAILED_WINDOW_MINUTES = 30


class LoginRateThrottle(AnonRateThrottle):
    """Brute-force limit on credential POSTs (independent of RateLimitMiddleware)."""

    scope = 'login'


def _get_ip(request) -> str:
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '127.0.0.1')


def _cookie_secure() -> bool:
    return bool(getattr(settings, 'SESSION_COOKIE_SECURE', False))


def _cookie_samesite() -> str:
    return getattr(settings, 'SESSION_COOKIE_SAMESITE', 'Lax') or 'Lax'


def _set_jwt_cookies(response, access: str, refresh: str | None = None) -> None:
    access_max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
    response.set_cookie(
        ACCESS_COOKIE,
        access,
        max_age=access_max_age,
        httponly=True,
        secure=_cookie_secure(),
        samesite=_cookie_samesite(),
        path='/',
    )
    if refresh is not None:
        refresh_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
        response.set_cookie(
            REFRESH_COOKIE,
            refresh,
            max_age=refresh_max_age,
            httponly=True,
            secure=_cookie_secure(),
            samesite=_cookie_samesite(),
            path='/',
        )


def _clear_jwt_cookies(response) -> None:
    response.delete_cookie(ACCESS_COOKIE, path='/')
    response.delete_cookie(REFRESH_COOKIE, path='/')


def _is_account_locked(username: str) -> LockedAccount | None:
    locked = LockedAccount.objects.filter(username=username).first()
    if not locked:
        return None
    if locked.is_expired():
        locked.delete()
        return None
    return locked


def _record_failed_login(username: str, ip: str) -> None:
    safe_ip = ip if ip and ip != 'unknown' else '127.0.0.1'
    FailedLoginAttempt.objects.create(username=username, ip_address=safe_ip)
    since = timezone.now() - timedelta(minutes=FAILED_WINDOW_MINUTES)
    count = FailedLoginAttempt.objects.filter(
        username=username, attempt_time__gte=since
    ).count()
    if count >= MAX_FAILED_ATTEMPTS:
        LockedAccount.objects.update_or_create(
            username=username,
            defaults={'ip_address': safe_ip},
        )
        SecurityEvent.objects.create(
            event_type='account_locked',
            username=username,
            ip_address=safe_ip,
            endpoint='/api/v1/token/',
            details=f'Locked after {count} failed attempts',
        )


def _clear_failed_logins(username: str) -> None:
    FailedLoginAttempt.objects.filter(username=username).delete()
    LockedAccount.objects.filter(username=username).delete()


@method_decorator(csrf_exempt, name='dispatch')
class CustomTokenObtainPairView(TokenObtainPairView):
    """JWT login: sets httpOnly cookies; body returns user profile only (no tokens)."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        # Bot honeypot — real users leave this empty
        honeypot = (request.data.get('website') or request.data.get('company_url') or '').strip()
        if honeypot:
            logger.warning("Login honeypot triggered from IP %s", _get_ip(request))
            return Response(
                {'detail': 'Invalid request.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        username = request.data.get('username', '')
        ip = _get_ip(request)

        locked = _is_account_locked(username)
        if locked:
            SecurityEvent.objects.create(
                event_type='login_failed',
                username=username,
                ip_address=ip,
                endpoint='/api/v1/token/',
                details='Attempt while account locked',
            )
            return Response(
                {'detail': 'Account temporarily locked. Try again later.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except (AuthenticationFailed, InvalidToken, DRFValidationError, Exception):
            _record_failed_login(username or 'unknown', ip)
            try:
                SecurityEvent.objects.create(
                    event_type='login_failed',
                    username=username,
                    ip_address=ip or '127.0.0.1',
                    endpoint='/api/v1/token/',
                    details='Invalid credentials',
                )
            except Exception:
                logger.exception('Failed to record security event')
            if _is_account_locked(username):
                return Response(
                    {'detail': 'Account temporarily locked. Try again later.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            return Response(
                {'detail': 'No active account found with the given credentials.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        _clear_failed_logins(username)
        data = serializer.validated_data
        access = str(data['access'])
        refresh = str(data['refresh'])

        user = serializer.user
        SecurityEvent.objects.create(
            event_type='login_success',
            user=user,
            username=user.username,
            ip_address=ip,
            endpoint='/api/v1/token/',
        )
        log_audit(
            user=user,
            action='login',
            entity='auth',
            entity_id=str(user.id),
            details={'username': user.username},
            request=request,
        )

        # Tokens only in httpOnly cookies — never in JSON body for SPA clients
        response = Response(
            {
                'user': UserSerializer(user).data,
                'detail': 'Login successful.',
            },
            status=status.HTTP_200_OK,
        )
        _set_jwt_cookies(response, access, refresh)
        return response


@method_decorator(csrf_exempt, name='dispatch')
class CustomTokenRefreshView(TokenRefreshView):
    """Refresh from body or refresh cookie; rotate cookies + return tokens."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if not data.get('refresh'):
            cookie_refresh = request.COOKIES.get(REFRESH_COOKIE)
            if cookie_refresh:
                data['refresh'] = cookie_refresh

        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as exc:
            logger.warning(
                "Token refresh failed from IP %s: %s",
                _get_ip(request), exc,
            )
            response = Response(
                {'detail': 'Token is invalid or expired.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            _clear_jwt_cookies(response)
            return response

        access = str(serializer.validated_data['access'])
        refresh = serializer.validated_data.get('refresh')
        response = Response({'detail': 'Token refreshed.'}, status=status.HTTP_200_OK)
        _set_jwt_cookies(response, access, str(refresh) if refresh is not None else None)
        return response


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    """Blacklist refresh token (body or cookie) and clear JWT cookies."""
    refresh_raw = request.data.get('refresh') or request.COOKIES.get(REFRESH_COOKIE)
    if refresh_raw:
        try:
            token = RefreshToken(refresh_raw)
            token.blacklist()
        except (TokenError, InvalidToken, AttributeError) as exc:
            logger.info("Logout blacklist skipped: %s", exc)

    response = Response({'detail': 'Logged out.'}, status=status.HTTP_200_OK)
    _clear_jwt_cookies(response)
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_cookie_view(request):
    """Ensure CSRF cookie is set for SPA cookie-authenticated POSTs."""
    return Response({'csrfToken': get_token(request)})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminRole])
def register_user(request):
    """
    Create a new system user.  **Admin-only.**

    Required body fields: ``username``, ``email``, ``password``, ``full_name``
    Optional: ``role`` (``staff`` or ``pharmacist`` only; default ``staff``), ``phone``
    """
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError as DjangoValidationError

    data = {**request.data}
    if 'role' not in data or data.get('role') in (None, ''):
        data['role'] = 'staff'

    serializer = UserSerializer(data=data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    password = serializer.validated_data.get('password') or request.data.get('password', '')
    if not password:
        return Response(
            {'password': ['Password is required.']},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        validate_password(password)
    except DjangoValidationError as exc:
        return Response({'password': list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(
        username=serializer.validated_data['username'],
        password=password,
        email=serializer.validated_data['email'],
        full_name=serializer.validated_data.get('full_name') or '',
        role=serializer.validated_data.get('role', 'staff'),
        phone=serializer.validated_data.get('phone') or '',
    )
    branches = serializer.validated_data.get('branches') or []
    if branches:
        user.branches.set(branches)
    else:
        from ..models import Branch
        if Branch.objects.exists():
            user.branches.add(Branch.get_default())
    logger.info(
        "User '%s' (role=%s) created by admin '%s'.",
        user.username, user.role, request.user.username,
    )
    log_audit(
        user=request.user,
        action='create',
        entity='user',
        entity_id=str(user.id),
        details={'username': user.username, 'role': user.role},
        request=request,
    )
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """Return the authenticated user's own profile plus accessible branches."""
    try:
        from ..branching import user_accessible_branches, resolve_branch
        data = UserSerializer(request.user).data
        branches = list(user_accessible_branches(request.user))
        # Admins see all active; serialize full list
        if getattr(request.user, 'role', None) == 'admin':
            from ..models import Branch
            from ..serializers import BranchSerializer
            data['branches'] = BranchSerializer(
                Branch.objects.filter(is_active=True).order_by('name'), many=True
            ).data
        active = None
        try:
            active = resolve_branch(request, required=False)
        except Exception:
            active = branches[0] if branches else None
        data['active_branch_id'] = str(active.id) if active else None
        return Response(data)
    except Exception as exc:
        logger.error("Profile view error for user %s: %s", request.user.id, exc)
        return Response(
            {'error': 'Could not retrieve profile.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change the authenticated user's password (requires current password)."""
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError as DjangoValidationError

    current_password = request.data.get('current_password') or ''
    new_password = request.data.get('new_password') or ''

    if not current_password or not new_password:
        return Response(
            {'detail': 'current_password and new_password are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not request.user.check_password(current_password):
        return Response(
            {'current_password': ['Current password is incorrect.']},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if current_password == new_password:
        return Response(
            {'new_password': ['New password must be different from the current password.']},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        validate_password(new_password, user=request.user)
    except DjangoValidationError as exc:
        return Response({'new_password': list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

    request.user.set_password(new_password)
    request.user.save(update_fields=['password'])
    logger.info("Password changed for user '%s'", request.user.username)
    log_audit(
        user=request.user,
        action='update',
        entity='auth',
        entity_id=str(request.user.id),
        details={'event': 'password_change', 'username': request.user.username},
        request=request,
    )
    return Response({'detail': 'Password updated successfully.'}, status=status.HTTP_200_OK)
