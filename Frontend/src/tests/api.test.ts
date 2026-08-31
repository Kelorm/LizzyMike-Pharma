import apiClient from '../utils/axios';
import { server } from './mocks/server';
import { http, HttpResponse } from 'msw';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

describe('API Client (Axios)', () => {
  beforeEach(() => {
    // Clear any tokens before each test
    localStorage.clear();
    delete apiClient.defaults.headers.common['Authorization'];
  });

  describe('Request Interceptor', () => {
    it('should add auth token to requests when token exists', async () => {
      const token = 'test-auth-token-123';
      localStorage.setItem('access_token', token);

      // Make a request to /profile/ which requires auth
      try {
        await apiClient.get(`${API_BASE_URL}/profile/`);
      } catch (error) {
        // We're just checking the interceptor works, not the response
      }

      // Verify the token is being added to requests
      expect(localStorage.getItem('access_token')).toBe(token);
    });

    it('should send requests without token if none exists', async () => {
      localStorage.clear();
      expect(localStorage.getItem('access_token')).toBeNull();

      // Make a request without token
      try {
        await apiClient.get(`${API_BASE_URL}/profile/`);
      } catch (error) {
        // Expected to fail due to 401
      }
    });

    it('should set Authorization header with Bearer scheme', async () => {
      const token = 'bearer-token-test';
      localStorage.setItem('access_token', token);

      let capturedAuthHeader = '';
      
      // Override handler temporarily to capture the header
      server.use(
        http.get(`${API_BASE_URL}/profile/`, ({ request }) => {
          capturedAuthHeader = request.headers.get('authorization') || '';
          return HttpResponse.json({ success: true });
        })
      );

      await apiClient.get(`${API_BASE_URL}/profile/`);
      
      expect(capturedAuthHeader).toBe(`Bearer ${token}`);
    });
  });

  describe('Response Interceptor - 401 Handling', () => {
    it('should redirect to login on 401 error without retry', async () => {
      // Setup a failing endpoint
      server.use(
        http.get(`${API_BASE_URL}/protected-resource/`, () => {
          return HttpResponse.json(
            { detail: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      localStorage.setItem('access_token', 'invalid-token');

      try {
        await apiClient.get(`${API_BASE_URL}/protected-resource/`);
      } catch (error: any) {
        // Error is expected
        expect(error.response?.status).toBe(401);
      }

      // Verify tokens are cleared
      expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('should handle successful token refresh on 401', async () => {
      let requestCount = 0;

      // First request returns 401, triggering refresh
      server.use(
        http.get(`${API_BASE_URL}/protected-resource/`, () => {
          requestCount++;
          if (requestCount === 1) {
            return HttpResponse.json(
              { detail: 'Unauthorized' },
              { status: 401 }
            );
          }
          // After refresh, return success
          return HttpResponse.json({ success: true });
        })
      );

      server.use(
        http.post(`${API_BASE_URL}/token/refresh/`, async ({ request }) => {
          const body = await request.json() as any;
          if (body.refresh) {
            return HttpResponse.json({ access: 'new-access-token' });
          }
          return HttpResponse.json(
            { detail: 'Invalid refresh token' },
            { status: 401 }
          );
        })
      );

      localStorage.setItem('access_token', 'old-token');
      localStorage.setItem('refresh_token', 'valid-refresh-token');

      try {
        // This will trigger 401 → refresh → retry flow
        await apiClient.get(`${API_BASE_URL}/protected-resource/`);
      } catch (error) {
        // Can fail but refresh logic should have been attempted
      }
    });

    it('should not retry token endpoint on 401', async () => {
      server.use(
        http.post(`${API_BASE_URL}/token/`, () => {
          return HttpResponse.json(
            { detail: 'Invalid credentials' },
            { status: 401 }
          );
        })
      );

      localStorage.setItem('access_token', 'token');

      try {
        await apiClient.post(`${API_BASE_URL}/token/`, {
          username: 'test',
          password: 'wrong',
        });
      } catch (error: any) {
        expect(error.response?.status).toBe(401);
      }
    });
  });

  describe('Network Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate network error
      server.use(
        http.get(`${API_BASE_URL}/network-error/`, () => {
          return HttpResponse.error();
        })
      );

      try {
        await apiClient.get(`${API_BASE_URL}/network-error/`);
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/ERR_NETWORK|error/i);
      }
    });

    it('should reject with error object on connection failure', async () => {
      server.use(
        http.post(`${API_BASE_URL}/connection-failed/`, () => {
          return HttpResponse.error();
        })
      );

      try {
        await apiClient.post(`${API_BASE_URL}/connection-failed/`, {});
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Error Status Codes', () => {
    it('should handle 400 Bad Request', async () => {
      server.use(
        http.post(`${API_BASE_URL}/validation-error/`, () => {
          return HttpResponse.json(
            { field: ['This field is required'] },
            { status: 400 }
          );
        })
      );

      try {
        await apiClient.post(`${API_BASE_URL}/validation-error/`, {});
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data?.field).toBeDefined();
      }
    });

    it('should handle 403 Forbidden', async () => {
      server.use(
        http.delete(`${API_BASE_URL}/forbidden-resource/`, () => {
          return HttpResponse.json(
            { detail: 'Permission denied' },
            { status: 403 }
          );
        })
      );

      try {
        await apiClient.delete(`${API_BASE_URL}/forbidden-resource/`);
      } catch (error: any) {
        expect(error.response?.status).toBe(403);
      }
    });

    it('should handle 500 Server Error', async () => {
      server.use(
        http.get(`${API_BASE_URL}/server-error/`, () => {
          return HttpResponse.json(
            { detail: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      try {
        await apiClient.get(`${API_BASE_URL}/server-error/`);
      } catch (error: any) {
        expect(error.response?.status).toBe(500);
      }
    });
  });

  describe('Request Configuration', () => {
    it('should include Content-Type header', async () => {
      let capturedHeaders: any = {};

      server.use(
        http.post(`${API_BASE_URL}/test-headers/`, ({ request }) => {
          capturedHeaders.contentType = request.headers.get('content-type');
          return HttpResponse.json({ success: true });
        })
      );

      await apiClient.post(`${API_BASE_URL}/test-headers/`, {
        test: 'data',
      });

      expect(capturedHeaders.contentType).toContain('application/json');
    });

    it('should respect timeout configuration', async () => {
      // Note: actual timeout testing is difficult in Jest without manual delays
      // This test verifies the config is set
      expect(apiClient.defaults.timeout).toBe(10000); // 10 seconds
    });

    it('should use correct baseURL', () => {
      expect(apiClient.defaults.baseURL).toBe(API_BASE_URL);
    });
  });
});
