import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock all external dependencies first
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../hooks/useSupabase');
jest.mock('../components/Button');
jest.mock('lucide-react', () => ({
  LogIn: () => <div data-testid="login-icon">LoginIcon</div>,
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
import Login from '../pages/Login';
import { useSupabase } from '../hooks/useSupabase';
import Button from '../components/Button';

const mockUseSupabase = useSupabase as jest.MockedFunction<typeof useSupabase>;
const MockButton = Button as jest.MockedFunction<typeof Button>;

describe('Login Component - TC003: Initial Page Render', () => {
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
    // Mock Button component to render properly
    MockButton.mockImplementation(({ children, onClick, isLoading, className }) => (
      <button 
        onClick={onClick} 
        disabled={isLoading}
        className={className}
        data-testid="google-signin-button"
      >
        {isLoading ? 'Loading...' : children}
      </button>
    ));

    // Set default mock return values for unauthenticated user
    mockUseSupabase.mockReturnValue({
      supabase: mockSupabaseClient,
      user: null, // Unauthenticated user
      loading: false, // Not loading auth state
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    });
  });

  test('should render main application title', () => {
    // Act
    render(<Login />);

    // Assert
    expect(screen.getByText('Amzur Test Administration App')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /amzur test administration app/i })).toBeInTheDocument();
  });

  test('should render welcome message text', () => {
    // Act
    render(<Login />);

    // Assert
    expect(screen.getByText('Sign in to access tests and manage your assessments.')).toBeInTheDocument();
  });

  test('should render Google Sign In button', () => {
    // Act
    render(<Login />);

    // Assert
    const signInButton = screen.getByTestId('google-signin-button');
    expect(signInButton).toBeInTheDocument();
    expect(signInButton).toBeVisible();
    expect(signInButton).not.toBeDisabled();
  });

  test('should render Google Sign In button with correct text', () => {
    // Act
    render(<Login />);

    // Assert
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  test('should render login icon in the button', () => {
    // Act
    render(<Login />);

    // Assert
    expect(screen.getByTestId('login-icon')).toBeInTheDocument();
  });

  test('should render terms and privacy policy text', () => {
    // Act
    render(<Login />);

    // Assert
    expect(screen.getByText('By signing in, you agree to our Terms of Service and Privacy Policy.')).toBeInTheDocument();
  });

  test('should render login container with proper styling classes', () => {
    // Act
    const { container } = render(<Login />);

    // Assert - Check for main container classes
    const mainContainer = container.querySelector('.min-h-screen');
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass('flex', 'flex-col', 'justify-center', 'items-center', 'bg-gray-100', 'px-4');
  });

  test('should render login card with proper styling', () => {
    // Act
    const { container } = render(<Login />);

    // Assert - Check for card container classes
    const cardContainer = container.querySelector('.w-full.max-w-md');
    expect(cardContainer).toBeInTheDocument();
    expect(cardContainer).toHaveClass('bg-white', 'rounded-lg', 'shadow-md', 'p-8');
  });

  test('should render all UI elements together', () => {
    // Act
    render(<Login />);

    // Assert - Verify all key elements are present
    expect(screen.getByText('Amzur Test Administration App')).toBeInTheDocument();
    expect(screen.getByText('Sign in to access tests and manage your assessments.')).toBeInTheDocument();
    expect(screen.getByTestId('google-signin-button')).toBeInTheDocument();
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    expect(screen.getByTestId('login-icon')).toBeInTheDocument();
    expect(screen.getByText('By signing in, you agree to our Terms of Service and Privacy Policy.')).toBeInTheDocument();
  });

  test('should not show loading spinner when auth is not loading', () => {
    // Act
    render(<Login />);

    // Assert
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  test('should have proper heading hierarchy', () => {
    // Act
    render(<Login />);

    // Assert
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Amzur Test Administration App');
  });
});