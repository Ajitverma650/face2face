/**
 * Tests for UserList.jsx
 * Verifies rendering and call button behavior
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import UserList from '../components/UserList.jsx';

describe('UserList Component', () => {
  test('renders empty state when no users', () => {
    render(<UserList users={[]} onCall={vi.fn()} disabled={false} />);
    expect(screen.getByText(/No other users online/i)).toBeInTheDocument();
  });

  test('renders user list with call buttons', () => {
    const users = [
      { _id: '1', username: 'Alice' },
      { _id: '2', username: 'Bob' },
    ];
    const onCall = vi.fn();

    render(<UserList users={users} onCall={onCall} disabled={false} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    const callButtons = screen.getAllByText('CALL');
    expect(callButtons).toHaveLength(2);

    fireEvent.click(callButtons[0]);
    expect(onCall).toHaveBeenCalledWith('1');
  });

  test('disables call buttons when disabled prop is true', () => {
    const users = [{ _id: '1', username: 'Alice' }];

    render(<UserList users={users} onCall={vi.fn()} disabled={true} />);

    // When disabled, button has disabled:hidden class
    const button = screen.queryByText('CALL');
    // The button should be disabled
    if (button) {
      expect(button).toBeDisabled();
    }
  });
});
