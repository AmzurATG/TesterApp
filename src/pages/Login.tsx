import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../hooks/useSupabase';
import Button from '../components/Button';
import { LogIn } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signInWithGoogle } = useSupabase();
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  
  // Let the ProtectedRoute in App.tsx handle redirections
  // Don't add useEffect for navigation here to avoid loops
  
  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      const { error } = await signInWithGoogle();
      if (error) throw error;
      // After successful sign-in, the auth state will update
      // and ProtectedRoute will handle the navigation
    } catch (error) {
      console.error('Error signing in with Google:', error);
      alert('Failed to sign in with Google. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Show loading spinner while authentication state is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-100">
        <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // If user is already logged in, navigate to dashboard
  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  // Only render login UI if user is null
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-8">Amzur Test Administration App</h1>
        
        <div className="text-center mb-8">
          <p className="text-gray-600 mb-4">Sign in to access tests and manage your assessments.</p>
        </div>
        
        <div className="flex flex-col space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            isLoading={isSigningIn}
            className="flex items-center justify-center w-full"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>By signing in, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;