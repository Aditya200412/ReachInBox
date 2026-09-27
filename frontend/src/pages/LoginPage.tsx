import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, login, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (loading || isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 to-dark-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-dark-700 p-8 rounded-2xl border border-dark-500 shadow-2xl animate-slide-up">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mb-4 border border-primary/30">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">ReachInbox</h1>
          <p className="text-text-secondary font-medium tracking-wide">EMAIL SCHEDULER</p>
          <p className="mt-4 text-text-muted text-sm leading-relaxed">
            Automate your email outreach campaigns with precision. Schedule, send, and track emails seamlessly.
          </p>
        </div>

        <button
          onClick={login}
          className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-gray-100 text-gray-900 px-4 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span>Sign in with Google</span>
        </button>
      </div>
    </div>
  );
};
