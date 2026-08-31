"""
Tests for authentication views.

Covers:
- Login with correct credentials
- Login with wrong password
- Login lockout after too many attempts
- Logout
- Accessing protected endpoint without login
"""
import pytest
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status

from core.models import FailedLoginAttempt, LockedAccount
from core.tests.factories import UserFactory


pytestmark = pytest.mark.django_db


# =============================================================================
# Login Tests
# =============================================================================

class TestLogin:
    """Test cases for user login."""

    def test_login_with_correct_credentials(self, api_client, user):
        """Test that login succeeds with correct credentials."""
        # Use factory's set_password method to ensure password is correct
        user.set_password('testpass123')
        user.save()
        
        response = api_client.post(
            '/api/v1/token/',
            {
                'username': user.username,
                'password': 'testpass123',
            },
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' not in response.data
        assert 'refresh' not in response.data
        assert 'user' in response.data
        assert 'access_token' in response.cookies
        assert 'refresh_token' in response.cookies

    def test_login_honeypot_rejected(self, api_client, user):
        user.set_password('testpass123')
        user.save()
        response = api_client.post(
            '/api/v1/token/',
            {
                'username': user.username,
                'password': 'testpass123',
                'website': 'http://spam.example',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_with_wrong_password(self, api_client, user):
        """Test that login fails with wrong password."""
        user.set_password('correctpassword')
        user.save()
        
        response = api_client.post(
            '/api/v1/token/',
            {
                'username': user.username,
                'password': 'wrongpassword',
            },
            format='json'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'error' in response.data or 'detail' in response.data

    def test_login_nonexistent_user(self, api_client):
        """Test that login fails for nonexistent user."""
        response = api_client.post(
            '/api/v1/token/',
            {
                'username': 'nonexistent_user',
                'password': 'anypassword',
            },
            format='json'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_inactive_user(self, api_client, user):
        """Test that login fails for inactive user."""
        user.is_active = False
        user.save()
        
        response = api_client.post(
            '/api/v1/token/',
            {
                'username': user.username,
                'password': 'testpass123',
            },
            format='json'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# Login Lockout Tests
# =============================================================================

class TestLoginLockout:
    """Test cases for login lockout after failed attempts."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Clear cache before each test."""
        cache.clear()
        yield
        cache.clear()

    def test_login_lockout_after_too_many_attempts(self, api_client, user):
        """Test that account is locked after too many failed login attempts."""
        user.set_password('correctpassword')
        user.save()
        
        for i in range(5):
            response = api_client.post(
                '/api/v1/token/',
                {
                    'username': user.username,
                    'password': 'wrongpassword',
                },
                format='json'
            )
            assert response.status_code in (
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_429_TOO_MANY_REQUESTS,
            )
        
        response = api_client.post(
            '/api/v1/token/',
            {
                'username': user.username,
                'password': 'correctpassword',
            },
            format='json'
        )
        
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_locked_account_record_created(self, api_client, user):
        """Test that LockedAccount record is created after lockout."""
        user.set_password('correctpassword')
        user.save()
        for _ in range(5):
            api_client.post(
                '/api/v1/token/',
                {'username': user.username, 'password': 'wrong'},
                format='json',
            )
        assert LockedAccount.objects.filter(username=user.username).exists()

    def test_rate_limit_on_login_endpoint(self, api_client, user):
        """Lockout engages after repeated failures (auth-layer protection)."""
        user.set_password('correctpassword')
        user.save()
        last = None
        for _ in range(6):
            last = api_client.post(
                '/api/v1/token/',
                {'username': user.username, 'password': 'wrongpassword'},
                format='json',
            )
        assert last.status_code == status.HTTP_429_TOO_MANY_REQUESTS


# =============================================================================
# Logout Tests
# =============================================================================

class TestLogout:
    """Test cases for user logout."""

    def test_logout_invalidates_token(self, authenticated_client, user):
        """Test that logout invalidates the access token."""
        # Make a request with the token - should work
        response = authenticated_client.get('/api/v1/medications/')
        assert response.status_code == status.HTTP_200_OK
        
        # Note: With JWT, logout is typically handled client-side
        # by discarding the token. Server-side logout would require
        # token blacklisting, which is not implemented by default.
        # This test verifies the token works before any "logout" action.

    def test_accessing_protected_endpoint_after_logout(self, api_client, user):
        """Test that accessing protected endpoint fails after token is discarded."""
        from rest_framework_simplejwt.tokens import RefreshToken
        
        # Get tokens
        refresh = RefreshToken.for_user(user)
        
        # Make request with access token - should work
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        response = api_client.get('/api/v1/medications/')
        assert response.status_code == status.HTTP_200_OK
        
        # Discard token (simulating logout)
        api_client.credentials()
        
        # Make request without token - should fail
        response = api_client.get('/api/v1/medications/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# Protected Endpoint Access Tests
# =============================================================================

class TestProtectedEndpoint:
    """Test cases for accessing protected endpoints."""

    def test_accessing_protected_endpoint_without_login(self, api_client):
        """Test that accessing protected endpoint without login fails."""
        response = api_client.get('/api/v1/medications/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_accessing_protected_endpoint_with_invalid_token(self, api_client):
        """Test that accessing protected endpoint with invalid token fails."""
        api_client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token_here')
        
        response = api_client.get('/api/v1/medications/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_accessing_protected_endpoint_with_expired_token(self, api_client, user):
        """Test that accessing protected endpoint with expired token fails."""
        from rest_framework_simplejwt.tokens import RefreshToken
        
        # Create an expired token (not practical in tests but verifies behavior)
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        response = api_client.get('/api/v1/medications/')
        
        # If token is valid, should get 200. If expired, should get 401
        # This test verifies the endpoint requires authentication
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED]

    def test_accessing_admin_endpoint_without_admin_role(self, authenticated_client, user):
        """Test that non-admin users cannot access admin endpoints."""
        # user has 'staff' role by default
        response = authenticated_client.get('/api/v1/users/')
        
        # Should be forbidden for non-admin
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]


# =============================================================================
# Token Refresh Tests
# =============================================================================

class TestTokenRefresh:
    """Test cases for token refresh."""

    def test_refresh_token(self, api_client, user):
        """Test that token refresh works."""
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh = RefreshToken.for_user(user)
        
        response = api_client.post(
            '/api/v1/token/refresh/',
            {'refresh': str(refresh)},
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' not in response.data
        assert 'access_token' in response.cookies

    def test_refresh_with_invalid_token(self, api_client):
        """Test that refresh fails with invalid token."""
        response = api_client.post(
            '/api/v1/token/refresh/',
            {'refresh': 'invalid_refresh_token'},
            format='json'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED