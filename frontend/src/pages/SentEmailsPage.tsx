import React, { useState } from 'react';
import { useSentEmails, useSearchEmails } from '../hooks/useEmails';
import { SearchBar } from '../components/emails/SearchBar';
import { EmailTable, ColumnDef } from '../components/emails/EmailTable';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Email } from '../types';
import { ExternalLink, LayoutDashboard, Inbox } from 'lucide-react';

export const SentEmailsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const limit = 10;

  const sentQuery = useSentEmails(page, limit);
  const searchQuery = useSearchEmails(query, 'SENT', page, limit);

  const isSearching = query.length > 0;
  const currentQuery = isSearching ? searchQuery : sentQuery;

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
      key: 'sentAt',
      header: 'Sent Time',
      render: (email: Email) => email.sentAt ? new Date(email.sentAt).toLocaleString() : '-'
    },
    {
      key: 'status',
      header: 'Status',
      render: (email: Email) => <StatusBadge status={email.status} />
    },
    {
      key: 'actions',
      header: 'Ethereal Preview',
      render: (email: Email) => (
        email.previewUrl ? (
          <a
            href={email.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={email.previewUrl}
            className="inline-flex items-center space-x-1.5 text-sm text-primary hover:text-primary-hover font-semibold transition-colors underline underline-offset-2 decoration-primary/40 hover:decoration-primary"
          >
            <span>Open in Ethereal</span>
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          </a>
        ) : (
          <span className="text-text-muted text-xs italic">Not yet sent</span>
        )
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sent Emails</h1>
          <p className="text-text-secondary text-sm mt-1">Review your successfully sent emails.</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="http://localhost:4000/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-dark-700 border border-dark-500 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-dark-600 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Bull Board</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://ethereal.email"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-dark-700 border border-dark-500 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-dark-600 transition-colors"
          >
            <Inbox className="w-4 h-4" />
            <span>Ethereal Inbox</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <SearchBar onSearch={(q) => { setQuery(q); setPage(1); }} placeholder="Search sent emails..." />
        </div>
      </div>

      {/* Ethereal info banner */}
      <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex items-start gap-3">
        <Inbox className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <span className="font-semibold text-primary">Ethereal SMTP (Test Mode):</span>
          <span className="text-text-secondary ml-1">
            Emails are delivered to a fake inbox at{' '}
            <a href="https://ethereal.email" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary-hover">ethereal.email</a>.
            Click <strong>Open in Ethereal</strong> on any row to preview that email, or visit the Ethereal inbox to see all messages.
          </span>
        </div>
      </div>

      <div className="bg-dark-800 rounded-xl shadow-sm border border-dark-600">
        <EmailTable
          emails={data?.data?.data || []}
          columns={columns}
          loading={isLoading}
          emptyMessage={isSearching ? 'No emails matched your search.' : 'No sent emails found.'}
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
