import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  message = 'Something went wrong. Please try again later.',
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[300px]">
      <AlertCircle className="w-12 h-12 text-accent-error mb-4 opacity-80" />
      <h3 className="text-lg font-medium text-text-primary mb-2">Error Loading Data</h3>
      <p className="text-text-secondary max-w-md mb-6">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-dark-600 hover:bg-dark-500 text-text-primary rounded-lg transition-colors border border-dark-500"
        >
          Retry
        </button>
      )}
    </div>
  );
};
