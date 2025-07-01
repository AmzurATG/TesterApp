import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock all external dependencies first
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../hooks/useSupabase');

jest.mock('papaparse', () => ({
  parse: jest.fn(),
}));

// Create a mock Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
} as any;

// Import after mocking
import Admin from '../pages/Admin';
import { useSupabase } from '../hooks/useSupabase';

const mockUseSupabase = useSupabase as jest.MockedFunction<typeof useSupabase>;

describe('Admin Component - TC001: User Authentication Check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock return values
    mockUseSupabase.mockReturnValue({
      supabase: mockSupabaseClient,
      user: null, // Unauthenticated user
      loading: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    });
  });

  test('should redirect unauthenticated users to home page', () => {
    // Arrange - user is already set to null in beforeEach

    // Act
    render(<Admin />);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  test('should not render admin content for unauthenticated users', () => {
    // Arrange - user is already set to null in beforeEach

    // Act
    render(<Admin />);

    // Assert - Since the component redirects, we verify navigation was called
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('should render admin content for authenticated users', () => {
    // Arrange - Set authenticated user
    mockUseSupabase.mockReturnValue({
      supabase: mockSupabaseClient,
      user: { id: '123', email: 'test@example.com' }, // Authenticated user
      loading: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    });

    // Act
    render(<Admin />);

    // Assert - Admin content should be visible
    expect(screen.getByText('Create New Test')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});