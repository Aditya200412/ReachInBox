import React from 'react';
import { EmailStatus } from '../../types';

interface StatusBadgeProps {
  status: EmailStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-primary-light text-primary border-primary/30';
      case 'PROCESSING':
        return 'bg-accent-warning/20 text-accent-warning border-accent-warning/30 animate-pulse';
      case 'SENT':
        return 'bg-accent-success/20 text-accent-success border-accent-success/30';
      case 'FAILED':
        return 'bg-accent-error/20 text-accent-error border-accent-error/30';
      case 'CANCELLED':
        return 'bg-dark-500 text-text-muted border-dark-500';
      default:
        return 'bg-dark-500 text-text-muted border-dark-500';
    }
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border inline-block ${getStyles()}`}>
      {status}
    </span>
  );
};
