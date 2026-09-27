import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-dark-800 border-b border-dark-600 flex items-center justify-end px-6 sticky top-0 z-10">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-text-primary">{user?.name || 'User'}</p>
            <p className="text-xs text-text-muted">{user?.email}</p>
          </div>
          {user?.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.name} 
              className="w-9 h-9 rounded-full border border-dark-500 object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-dark-600 flex items-center justify-center border border-dark-500">
              <UserIcon className="w-5 h-5 text-text-secondary" />
            </div>
          )}
        </div>
        <div className="h-6 w-px bg-dark-600 mx-2"></div>
        <button
          onClick={logout}
          className="text-text-secondary hover:text-accent-error transition-colors p-2 rounded-lg hover:bg-dark-700"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
