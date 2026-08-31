import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';

/**
 * Custom render function that wraps components with necessary providers
 * This ensures all context and routing dependencies are available in tests
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  withAuth?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialRoute = '/',
    withAuth = true,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Set up initial route if needed
  window.history.pushState({}, 'Test page', initialRoute);

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const content = withAuth ? (
      <AuthProvider>{children}</AuthProvider>
    ) : (
      children
    );

    return (
      <BrowserRouter>
        {content}
      </BrowserRouter>
    );
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { renderWithProviders as render };
