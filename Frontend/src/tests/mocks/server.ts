import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW Server Setup for Node environment (used in tests)
 * This sets up the request interception at the Node level for test environment
 */
export const server = setupServer(...handlers);

// Enable API mocking before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Reset any handlers added during tests
afterEach(() => {
  server.resetHandlers();
});

// Disable API mocking after all tests
afterAll(() => {
  server.close();
});
