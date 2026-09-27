import React, { useState } from 'react';
import { useScheduledEmails, useSearchEmails } from '../hooks/useEmails';
import { SearchBar } from '../components/emails/SearchBar';
import { EmailTable, ColumnDef } from '../components/emails/EmailTable';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Email } from '../types';

export const ScheduledEmailsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const limit = 10;

  const scheduledQuery = useScheduledEmails(page, limit);
  const searchQuery = useSearchEmails(query, 'SCHEDULED', page, limit);

  const isSearching = query.length > 0;
  const currentQuery = isSearching ? searchQuery : scheduledQuery;

  const { data, isLoading } = currentQuery;

  const columns: ColumnDef[] = [
    {
      key: 'recipientEmail',
      header: 'Recipient',
      render: (email: Email) => <span className="font-medium">{email.recipientEmail}</span>
    },
    {
      key: 'subject',
      header: 'Subject',
    },
    {
      key: 'scheduledAt',
      header: 'Scheduled For',
      render: (email: Email) => new Date(email.scheduledAt).toLocaleString()
    },
    {
      key: 'status',
      header: 'Status',
      render: (email: Email) => <StatusBadge status={email.status} />
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Scheduled Emails</h1>
          <p className="text-text-secondary text-sm mt-1">Manage and track your upcoming emails.</p>
        </div>
        <SearchBar onSearch={(q) => { setQuery(q); setPage(1); }} placeholder="Search scheduled emails..." />
      </div>

      <div className="bg-dark-800 rounded-xl shadow-sm border border-dark-600">
        <EmailTable
          emails={data?.data?.data || []}
          columns={columns}
          loading={isLoading}
          emptyMessage={isSearching ? 'No emails matched your search.' : 'No scheduled emails found.'}
        />
        {!isLoading && data?.data && data.data.total > 0 && (
          <Pagination
            page={page}
            limit={limit}
            total={data.data.total}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
};


