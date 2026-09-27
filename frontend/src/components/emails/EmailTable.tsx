import React from 'react';
import { Email } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { ExternalLink, MailX } from 'lucide-react';

export interface ColumnDef {
  key: string;
  header: string;
  render?: (email: Email) => React.ReactNode;
}

interface EmailTableProps {
  emails: Email[];
  columns: ColumnDef[];
  loading: boolean;
  emptyMessage?: string;
}

export const EmailTable: React.FC<EmailTableProps> = ({ 
  emails, 
  columns, 
  loading,
  emptyMessage = 'No emails found'
}) => {
  if (loading) {
    return (
      <div className="w-full bg-dark-800 rounded-xl border border-dark-600 min-h-[400px] flex items-center justify-center">
        <LoadingSpinner message="Loading emails..." />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="w-full bg-dark-800 rounded-xl border border-dark-600">
        <EmptyState 
          icon={<MailX className="w-12 h-12" />} 
          title="No Emails Found" 
          description={emptyMessage} 
        />
      </div>
    );
  }

  return (
    <div className="w-full bg-dark-800 rounded-xl border border-dark-600 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap">
          <thead>
            <tr className="bg-dark-700 border-b border-dark-600 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {columns.map((col) => (
                <th key={col.key} className="px-6 py-4">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-600">
            {emails.map((email) => (
              <tr key={email.id} className="hover:bg-dark-700/50 transition-colors">
                {columns.map((col) => (
                  <td key={`${email.id}-${col.key}`} className="px-6 py-4 text-sm text-text-primary">
                    {col.render ? col.render(email) : (email as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
