/**
 * Tests for AuthContext.jsx
 *  Missing API_URL fallback
 *  Logout accepts callback
 */
import { render, screen, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock axios
vi.mock('axios', () => {
  return {
    default: {
      post: vi.fn(),
      defaults: { headers: { common: {} } },
    },
  };
});

// Must import after mock
import axios from 'axios';
import { AuthProvider, useAuth } from '../store/AuthContext.jsx';

// Helper component to access context
const TestConsumer = ({ onRender }) => {
  const ctx = useAuth();
  React.useEffect(() => {
    onRender(ctx);
  }, [ctx]);
  return <div data-testid="user">{ctx.user ? ctx.user.username : 'none'}</div>;
};

describe('AuthContext (Bug #2 & #17)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    axios.defaults.headers.common = {};
  });

  test('should provide null user when no token in localStorage', () => {
    let captured;
    render(
      <AuthProvider>
        <TestConsumer onRender={(ctx) => { captured = ctx; }} />
      </AuthProvider>
    );

    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  test('should restore user from localStorage', () => {
    localStorage.setItem('user', JSON.stringify({ id: '1', username: 'Test' }));
    localStorage.setItem('token', 'saved-token');

    render(
      <AuthProvider>
        <TestConsumer onRender={() => {}} />
      </AuthProvider>
    );

    expect(screen.getByTestId('user').textContent).toBe('Test');
  });

  test('logout should call onLogout callback (Bug #17)', async () => {
    localStorage.setItem('user', JSON.stringify({ id: '1', username: 'Test' }));
    localStorage.setItem('token', 'saved-token');

    let capturedCtx;
    render(
      <AuthProvider>
        <TestConsumer onRender={(ctx) => { capturedCtx = ctx; }} />
      </AuthProvider>
    );

    const onLogout = vi.fn();
    
    await act(() => {
      capturedCtx.logout(onLogout);
    });

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  test('logout clears Authorization header', async () => {
    localStorage.setItem('user', JSON.stringify({ id: '1', username: 'Test' }));
    localStorage.setItem('token', 'my-token');
    axios.defaults.headers.common['Authorization'] = 'my-token';

    let capturedCtx;
    render(
      <AuthProvider>
        <TestConsumer onRender={(ctx) => { capturedCtx = ctx; }} />
      </AuthProvider>
    );

    await act(() => {
      capturedCtx.logout();
    });

    expect(axios.defaults.headers.common['Authorization']).toBeUndefined();
  });

  test('login should use fallback URL when VITE_API_URL not set (Bug #2)', async () => {
    axios.post.mockResolvedValue({
      data: { token: 'new-token', user: { id: '2', username: 'newUser' } }
    });

    let capturedCtx;
    render(
      <AuthProvider>
        <TestConsumer onRender={(ctx) => { capturedCtx = ctx; }} />
      </AuthProvider>
    );

    await act(async () => {
      await capturedCtx.login('test@test.com', 'password');
    });

    // Should have been called with a URL (not undefined/api/...)
    const calledUrl = axios.post.mock.calls[0][0];
    expect(calledUrl).not.toContain('undefined');
    expect(calledUrl).toContain('/api/users/login');
  });
});
