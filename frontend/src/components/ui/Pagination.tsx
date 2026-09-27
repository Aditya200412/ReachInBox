import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, limit, total, onPageChange }) => {
  const totalPages = Math.ceil(total / limit) || 1;
  
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-dark-600 bg-dark-800 rounded-b-lg">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="relative inline-flex items-center px-4 py-2 border border-dark-500 text-sm font-medium rounded-md text-text-primary bg-dark-700 hover:bg-dark-600 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-dark-500 text-sm font-medium rounded-md text-text-primary bg-dark-700 hover:bg-dark-600 disabled:opacity-50"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-text-secondary">
            Showing <span className="font-medium text-text-primary">{((page - 1) * limit) + 1}</span> to <span className="font-medium text-text-primary">{Math.min(page * limit, total)}</span> of <span className="font-medium text-text-primary">{total}</span> results
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-dark-500 bg-dark-700 text-sm font-medium text-text-secondary hover:bg-dark-600 disabled:opacity-50"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="relative inline-flex items-center px-4 py-2 border border-dark-500 bg-dark-700 text-sm font-medium text-text-primary">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-dark-500 bg-dark-700 text-sm font-medium text-text-secondary hover:bg-dark-600 disabled:opacity-50"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};
