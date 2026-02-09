/**
 * Tests for Controls.jsx
 * Bug #12: Removed dead `callUser` destructure
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import Controls from '../components/Controls.jsx';

describe('Controls Component (Bug #12)', () => {
  test('renders calling state with cancel button', () => {
    const actions = { endCall: vi.fn(), acceptCall: vi.fn(), rejectCall: vi.fn() };
    const states = { isJoined: false, isCalling: true, isRinging: false, incomingCall: null };

    render(<Controls states={states} actions={actions} />);
    
    const cancelBtn = screen.getByText('Cancel Request');
    expect(cancelBtn).toBeInTheDocument();
    
    fireEvent.click(cancelBtn);
    expect(actions.endCall).toHaveBeenCalledTimes(1);
  });

  test('renders incoming call with accept/decline buttons', () => {
    const actions = { endCall: vi.fn(), acceptCall: vi.fn(), rejectCall: vi.fn() };
    const states = { isJoined: false, isCalling: false, isRinging: true, incomingCall: 'socket-123' };

    render(<Controls states={states} actions={actions} />);
    
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Accept'));
    expect(actions.acceptCall).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Decline'));
    expect(actions.rejectCall).toHaveBeenCalledTimes(1);
  });

  test('renders active call with end call button', () => {
    const actions = { endCall: vi.fn(), acceptCall: vi.fn(), rejectCall: vi.fn() };
    const states = { isJoined: true, isCalling: false, isRinging: false, incomingCall: null };

    render(<Controls states={states} actions={actions} />);
    
    const endBtn = screen.getByText('Terminate Call');
    expect(endBtn).toBeInTheDocument();

    fireEvent.click(endBtn);
    expect(actions.endCall).toHaveBeenCalledTimes(1);
  });

  test('does not crash without callUser in actions (Bug #12 fix)', () => {
    // Previously, Controls destructured `callUser` which was never passed
    const actions = { endCall: vi.fn(), acceptCall: vi.fn(), rejectCall: vi.fn() };
    const states = { isJoined: false, isCalling: false, isRinging: false, incomingCall: null };

    // Should render without errors
    const { container } = render(<Controls states={states} actions={actions} />);
    expect(container).toBeTruthy();
  });
});
