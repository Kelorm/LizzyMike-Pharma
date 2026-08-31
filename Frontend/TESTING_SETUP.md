# Frontend Testing Setup Guide

This document covers the complete testing setup for your React TypeScript pharmacy frontend.

## 🎯 What's Been Set Up

### 1. **Testing Dependencies** (package.json)
- **Jest**: Test runner (via react-scripts)
- **React Testing Library**: For testing React components
- **MSW (Mock Service Worker)**: API mocking for backend calls
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: DOM matchers

### 2. **MSW (Mock Service Worker) Setup**
MSW intercepts API calls at the network level and returns mock responses, eliminating the need for backend during tests.

**Files Created:**
- `src/tests/mocks/handlers.ts` - API endpoint mocks
- `src/tests/mocks/server.ts` - MSW server initialization
- `src/setupTests.ts` - Updated to load MSW server

**What's Mocked:**
- ✅ Authentication (login, profile, token refresh)
- ✅ Sales endpoints (list, create with validation)
- ✅ Medications (list)
- ✅ Customers (list)
- ✅ All return proper mock data and validation errors

### 3. **Test Files Created**

#### `src/tests/auth.test.tsx` (7 test suites, 20+ tests)
Tests authentication context and login flows:
- ✅ Login form renders correctly
- ✅ Submits with correct credentials
- ✅ Shows error on wrong password
- ✅ Shows loading state while submitting
- ✅ Displays user info after successful login
- ✅ Clears session on logout
- ✅ Redirects to login after logout
- ✅ Persists session from localStorage
- ✅ Handles invalid tokens

#### `src/tests/sales.test.tsx` (6 test suites, 20+ tests)
Tests sales form validation and submission:
- ✅ Validates customer name is required
- ✅ Validates price is required and > 0
- ✅ Cannot submit with quantity of 0
- ✅ Rejects negative quantities/prices
- ✅ Shows success message after submission
- ✅ Clears form after successful sale
- ✅ Shows loading state while processing
- ✅ Handles server validation errors
- ✅ Handles network errors
- ✅ Accepts decimal prices
- ✅ Allows different payment methods

#### `src/tests/api.test.ts` (6 test suites, 15+ tests)
Tests axios interceptors and error handling:
- ✅ Adds auth token to requests
- ✅ Sends requests without token if none exists
- ✅ Uses correct Bearer scheme
- ✅ Handles 401 errors by redirecting
- ✅ Handles token refresh on 401
- ✅ Handles network errors gracefully
- ✅ Handles 400, 403, 500 status codes
- ✅ Includes correct Content-Type header
- ✅ Respects timeout configuration

### 4. **Test Utilities**
`src/tests/test-utils.tsx` provides:
- `renderWithProviders()` - Renders components with AuthProvider and React Router
- Re-exports all React Testing Library utilities
- Simplified test component rendering with proper context setup

## 📋 NPM Scripts

```bash
# Run tests in watch mode (great for development)
npm run test:watch

# Run tests once with coverage report
npm run test:coverage

# Run tests in CI mode (used by CI/CD pipelines)
npm run test:ci

# Run tests once (default)
npm test
```

## 🚀 Running Your First Test

1. **Install dependencies** (if not already done):
```bash
cd Frontend
npm install
```

2. **Run tests in watch mode**:
```bash
npm run test:watch
```

3. **Run specific test file**:
```bash
npm test auth.test
npm test sales.test
npm test api.test
```

4. **Run with coverage report**:
```bash
npm run test:coverage
```

This generates a coverage report showing:
- Lines covered: % of code executed during tests
- Branches covered: % of conditional branches tested
- Functions covered: % of functions executed
- Statements covered: % of statements executed

## 📊 Test Structure

### Authentication Tests Example
```typescript
// Test login flow
it('should submit login form with correct credentials', async () => {
  const user = userEvent.setup();
  renderWithProviders(<LoginForm />);
  
  await user.type(screen.getByTestId('username-input'), 'testuser');
  await user.type(screen.getByTestId('password-input'), 'correct-password');
  await user.click(screen.getByTestId('login-button'));
  
  await waitFor(() => {
    expect(localStorage.getItem('access_token')).toBeTruthy();
  });
});
```

### Sales Form Validation Example
```typescript
// Test validation
it('should not allow quantity of 0', async () => {
  const user = userEvent.setup();
  renderWithProviders(<SaleForm />);
  
  await user.type(screen.getByTestId('customer-name-input'), 'John');
  await user.clear(screen.getByTestId('quantity-input'));
  await user.type(screen.getByTestId('quantity-input'), '0');
  
  await user.click(screen.getByTestId('submit-button'));
  
  expect(screen.getByTestId('error-message')).toHaveTextContent(
    'Quantity must be greater than 0'
  );
});
```

### API Interceptor Test Example
```typescript
// Test token injection
it('should add auth token to requests', async () => {
  localStorage.setItem('access_token', 'test-token');
  
  let capturedAuthHeader = '';
  server.use(
    http.get('/api/v1/profile/', ({ request }) => {
      capturedAuthHeader = request.headers.get('authorization') || '';
      return HttpResponse.json({ success: true });
    })
  );
  
  await apiClient.get('/api/v1/profile/');
  
  expect(capturedAuthHeader).toBe('Bearer test-token');
});
```

## 🔧 Customizing MSW Handlers

To add or modify API mock responses, edit `src/tests/mocks/handlers.ts`:

```typescript
// Example: Add a new endpoint
http.get(`${API_BASE_URL}/new-endpoint/`, ({ request }) => {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return HttpResponse.json(
      { detail: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  return HttpResponse.json(
    { data: 'mock response' },
    { status: 200 }
  );
}),
```

## 📝 Test Data

### Mock Credentials
- **Username**: `testuser`
- **Password**: `correct-password` (for success), anything else for failure

### Mock User Profile
```javascript
{
  id: 'user-uuid-12345',
  username: 'testuser',
  email: 'test@example.com',
  role: 'pharmacist',
  full_name: 'Test User'
}
```

### Mock Sale Data
```javascript
{
  id: 'sale-uuid-1',
  customer_name: 'John Doe',
  total: 150.00,
  items: [
    {
      medication_name: 'Paracetamol',
      qty: 2,
      price: 75.00
    }
  ]
}
```

## 🐛 Common Issues & Solutions

### Issue: Tests fail with "Cannot find module"
**Solution**: Make sure all imports use correct paths. Check the file structure:
```
src/
  tests/
    auth.test.tsx
    sales.test.tsx
    api.test.ts
    test-utils.tsx
    mocks/
      handlers.ts
      server.ts
```

### Issue: "ReferenceError: fetch is not defined"
**Solution**: MSW requires Node-like fetch. This is already set up via `src/setupTests.ts`.

### Issue: Tests hang or timeout
**Solution**: Make sure you're using `waitFor()` for async operations:
```typescript
await waitFor(() => {
  expect(element).toBeInTheDocument();
});
```

### Issue: localStorage not clearing between tests
**Solution**: Tests should have a `beforeEach` hook that clears storage:
```typescript
beforeEach(() => {
  localStorage.clear();
});
```

## 🎓 Writing New Tests

### Template for Component Test
```typescript
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './test-utils';
import MyComponent from '../components/MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should do something', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MyComponent />);
    
    // Interact
    await user.click(screen.getByRole('button'));
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });
  });
});
```

### Template for API Test
```typescript
import apiClient from '../utils/axios';
import { server } from './mocks/server';
import { http, HttpResponse } from 'msw';

const API_BASE_URL = '/api/v1';

describe('API Feature', () => {
  it('should handle successful response', async () => {
    server.use(
      http.get(`${API_BASE_URL}/endpoint/`, () => {
        return HttpResponse.json({ data: 'test' });
      })
    );
    
    const response = await apiClient.get(`${API_BASE_URL}/endpoint/`);
    expect(response.data.data).toBe('test');
  });
});
```

## 📚 Useful Testing Library Queries

```typescript
// By role (recommended)
screen.getByRole('button', { name: /login/i })
screen.getByRole('textbox', { name: /username/i })

// By label
screen.getByLabelText('Customer Name')

// By placeholder
screen.getByPlaceholderText('Enter customer name')

// By test ID
screen.getByTestId('customer-name-input')

// By text content
screen.getByText(/Sale recorded successfully/i)

// Query variants
getByX() // Throws error if not found
queryByX() // Returns null if not found
findByX() // Async, waits for element
```

## 🚢 CI/CD Integration

For GitHub Actions or similar CI systems, use:
```yaml
- name: Run tests with coverage
  run: npm run test:ci
```

This:
- Runs all tests once
- Generates coverage report
- Exits with proper exit code
- Suitable for blocking PRs on test failure

## 📖 Additional Resources

- [React Testing Library Docs](https://testing-library.com/react)
- [MSW Documentation](https://mswjs.io/)
- [Jest Docs](https://jestjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## ✅ Next Steps

1. ✅ Run `npm run test:coverage` to see current coverage
2. ✅ Add tests for your other components
3. ✅ Aim for 80%+ code coverage
4. ✅ Integrate tests into your CI/CD pipeline
5. ✅ Run tests before committing code

---

**Happy Testing! 🎉**
