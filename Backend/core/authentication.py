"""JWT authentication via httpOnly cookies (SPA) with CSRF on unsafe methods."""
from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication


ACCESS_COOKIE = getattr(settings, 'JWT_ACCESS_COOKIE', 'access_token')
REFRESH_COOKIE = getattr(settings, 'JWT_REFRESH_COOKIE', 'refresh_token')


class DummyGetResponse:
    def __call__(self, request):
        return None


def enforce_csrf(request):
    """Enforce Django CSRF for cookie-authenticated unsafe requests."""
    check = CsrfViewMiddleware(DummyGetResponse())
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        raise exceptions.PermissionDenied(f'CSRF Failed: {reason}')


class CookieJWTAuthentication(JWTAuthentication):
    """
    Authenticate using the access JWT in an httpOnly cookie.

    Falls through (returns None) when the cookie is absent so Bearer
    ``JWTAuthentication`` can still succeed for API clients.
    """

    def authenticate(self, request):
        # Login/refresh must not require an existing cookie + CSRF check.
        path = request.path or ''
        if path.endswith('/token/') or path.endswith('/token/refresh/'):
            return None

        raw = request.COOKIES.get(ACCESS_COOKIE)
        if not raw:
            return None

        validated = self.get_validated_token(raw)
        user = self.get_user(validated)

        if request.method not in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
            # Cookie sessions require CSRF; Bearer clients skip this class.
            enforce_csrf(request)

        return user, validated
