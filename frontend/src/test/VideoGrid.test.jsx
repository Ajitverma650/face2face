/**
 * Tests for VideoGrid.jsx
 * Bug #16: Fixed col-span-8 → col-span-6
 */
import { render } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import React from 'react';
import VideoGrid from '../components/VideoGrid.jsx';

describe('VideoGrid Component (Bug #16)', () => {
  test('should use col-span-6 instead of col-span-8', () => {
    const ref = React.createRef();
    const { container } = render(<VideoGrid remoteVideoRef={ref} isJoined={false} />);
    
    const wrapper = container.firstChild;
    expect(wrapper.className).toContain('lg:col-span-6');
    expect(wrapper.className).not.toContain('lg:col-span-8');
  });

  test('shows placeholder when not joined', () => {
    const ref = React.createRef();
    const { getByText } = render(<VideoGrid remoteVideoRef={ref} isJoined={false} />);
    
    expect(getByText('Ready for encrypted connection')).toBeInTheDocument();
  });

  test('hides placeholder when joined', () => {
    const ref = React.createRef();
    const { queryByText } = render(<VideoGrid remoteVideoRef={ref} isJoined={true} />);
    
    expect(queryByText('Ready for encrypted connection')).not.toBeInTheDocument();
  });
});
