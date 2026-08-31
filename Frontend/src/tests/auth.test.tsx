import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './test-utils';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../utils/axios';
import { server } from './mocks/server';
import { http, HttpResponse } from 'msw';
import { resetMockSession } from './mocks/handlers';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

function LoginForm() {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post(`${API_BASE_URL}/token/`, { username, password });
      await login();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        data-testid="username-input"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        data-testid="password-input"
      />
      {error && <div data-testid="error-message">{error}</div>}
      <button type="submit" disabled={isLoading} data-testid="login-button">
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

function ProtectedComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <div data-testid="not-authenticated">Not authenticated</div>;
  }

  return (
    <div>
      <div data-testid="user-display">Welcome {user?.username}</div>
      <div data-testid="user-email">{user?.email}</div>
      <button onClick={() => logout()} data-testid="logout-button">
        Logout
      </button>
    </div>
  );
}

describe('Authentication Context', () => {
  beforeEach(() => {
    localStorage.clear();
    resetMockSession();
    delete apiClient.defaults.headers.common['Authorization'];
  });

  describe('Login Form', () => {
    it('should render login form with username and password inputs', () => {
      renderWithProviders(<LoginForm />, { withAuth: true });
      expect(screen.getByTestId('username-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
    });

    it('should establish cookie session without storing tokens in localStorage', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <div>
          <LoginForm />
          <ProtectedComponent />
        </div>,
        { withAuth: true }
      );

      await user.type(screen.getByTestId('username-input'), 'testuser');
      await user.type(screen.getByTestId('password-input'), 'correct-password');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('user-display')).toHaveTextContent('Welcome testuser');
      });
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('should show error message on wrong password', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />, { withAuth: true });

      await user.type(screen.getByTestId('username-input'), 'testuser');
      await user.type(screen.getByTestId('password-input'), 'wrong-password');
      await user.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid credentials');
      });
      expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('should show loading state while logging in', async () => {
      const user = userEvent.setup();
      server.use(
        http.post(`${API_BASE_URL}/token/`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({
            access: 'test-token',
            refresh: 'test-refresh',
          });
        })
      );

      renderWithProviders(<LoginForm />, { withAuth: true });
      await user.type(screen.getByTestId('username-input'), 'testuser');
      await user.type(screen.getByTestId('password-input'), 'correct-password');
      await user.click(screen.getByTestId('login-button'));
      expect(screen.getByTestId('login-button')).toHaveTextContent('Logging in...');
    });
  });

  describe('Protected Component', () => {
    it('should show not authenticated when user is not logged in', async () => {
      renderWithProviders(<ProtectedComponent />, { withAuth: true });
      await waitFor(() => {
        expect(screen.getByTestId('not-authenticated')).toBeInTheDocument();
      });
    });
  });
});
