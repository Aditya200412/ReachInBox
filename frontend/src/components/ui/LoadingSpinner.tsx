import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', message }) => {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center space-y-3 p-4">
      <div className={`animate-spin rounded-full border-t-2 border-b-2 border-primary ${sizeClass}`}></div>
      {message && <p className="text-text-muted text-sm">{message}</p>}
    </div>
  );
};
