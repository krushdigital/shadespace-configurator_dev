import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface SavedQuotesTableProps {
  dateRange: { start: string; end: string };
}

interface Quote {
  id: string;
  quote_reference: string;
  quote_name: string;
  customer_email: string | null;
  customer_reference: string | null;
  status: string;
  created_at: string;
  calculations_data: {
    totalPrice: number;
  };
  config_data: {
    currency: string;
    corners: number;
    fabricType: string;
    fabricColor: string;
  };
}

export const SavedQuotesTable: React.FC<SavedQuotesTableProps> = ({ dateRange }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  useEffect(() => {
    fetchQuotes();
  }, [dateRange, statusFilter]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase credentials not found');
        return;
      }

      let query = `${supabaseUrl}/rest/v1/saved_quotes?created_at=gte.${dateRange.start}T00:00:00&created_at=lte.${dateRange.end}T23:59:59&order=created_at.desc&limit=100`;

      if (statusFilter !== 'all') {
        query += `&status=eq.${statusFilter}`;
      }

      const response = await fetch(query, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQuotes(data);
      }
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter((quote) => {
    const searchLower = search.toLowerCase();
    return (
      quote.quote_name?.toLowerCase().includes(searchLower) ||
      quote.quote_reference?.toLowerCase().includes(searchLower) ||
      quote.customer_email?.toLowerCase().includes(searchLower) ||
      quote.customer_reference?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = {
      NZD: 'NZ$',
      USD: 'US$',
      AUD: 'AU$',
      GBP: '£',
      EUR: '€',
      CAD: 'CA$',
    };
    return `${symbols[currency] || currency}${amount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      in_progress: 'bg-yellow-100 text-yellow-800',
      quote_ready: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      expired: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const handleDeleteQuote = async () => {
    if (!quoteToDelete) return;

    try {
      setIsDeleting(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase credentials not found');
        return;
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/delete_saved_quote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          p_quote_id: quoteToDelete.id,
        }),
      });

      if (response.ok) {
        setDeleteSuccess(true);
        setQuotes(quotes.filter(q => q.id !== quoteToDelete.id));
        setQuoteToDelete(null);
        setSelectedQuote(null);
        setTimeout(() => setDeleteSuccess(false), 3000);
      } else {
        console.error('Failed to delete quote');
        alert('Failed to delete quote. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting quote:', error);
      alert('An error occurred while deleting the quote.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getQuoteUrl = (quoteReference: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/pages/shade-sail-configurator/?quote=${quoteReference}`;
  };

  const copyQuoteUrl = (quoteReference: string) => {
    const url = getQuoteUrl(quoteReference);
    navigator.clipboard.writeText(url);
    alert('Quote link copied to clipboard!');
  };

  const exportToCSV = () => {
    const headers = ['Quote Reference', 'Quote Name', 'Customer Email', 'Status', 'Total Price', 'Currency', 'Created At'];
    const rows = filteredQuotes.map(q => [
      q.quote_reference,
      q.quote_name,
      q.customer_email || '',
      q.status,
      q.calculations_data.totalPrice,
      q.config_data.currency,
      q.created_at,
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shadespace-quotes-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex-1 flex gap-4">
            <Input
              placeholder="Search quotes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="all">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="quote_ready">Quote Ready</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <Button onClick={exportToCSV} size="sm" variant="outline">
            Export CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="pb-3 text-sm font-semibold text-gray-700">Quote Reference</th>
                <th className="pb-3 text-sm font-semibold text-gray-700">Quote Name</th>
                <th className="pb-3 text-sm font-semibold text-gray-700">Customer</th>
                <th className="pb-3 text-sm font-semibold text-gray-700">Status</th>
                <th className="pb-3 text-sm font-semibold text-gray-700">Total Price</th>
                <th className="pb-3 text-sm font-semibold text-gray-700">Created</th>
                <th className="pb-3 text-sm font-semibold text-gray-700">Quote Link</th>
                <th className="pb-3 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No quotes found
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4">
                      <button
                        onClick={() => setSelectedQuote(quote)}
                        className="text-lime-600 hover:text-lime-700 font-medium"
                      >
                        {quote.quote_reference}
                      </button>
                    </td>
                    <td className="py-4 text-sm text-gray-900">{quote.quote_name}</td>
                    <td className="py-4 text-sm text-gray-600">
                      {quote.customer_email || <span className="text-gray-400">No email</span>}
                    </td>
                    <td className="py-4">{getStatusBadge(quote.status)}</td>
                    <td className="py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(quote.calculations_data.totalPrice, quote.config_data.currency)}
                    </td>
                    <td className="py-4 text-sm text-gray-600">{formatDate(quote.created_at)}</td>
                    <td className="py-4">
                      <Button
                        onClick={() => copyQuoteUrl(quote.quote_reference)}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        Copy Link
                      </Button>
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <Button onClick={() => setSelectedQuote(quote)} size="sm" variant="outline">
                          View
                        </Button>
                        <Button
                          onClick={() => setQuoteToDelete(quote)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 border-red-200"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredQuotes.length} of {quotes.length} quotes
        </div>
      </Card>

      {/* Quote Detail Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedQuote.quote_name}</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedQuote.quote_reference}</p>
              </div>
              <button
                onClick={() => setSelectedQuote(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-600">Customer Email</label>
                <p className="text-gray-900">{selectedQuote.customer_email || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Customer Reference</label>
                <p className="text-gray-900">{selectedQuote.customer_reference || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div className="mt-1">{getStatusBadge(selectedQuote.status)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Created</label>
                <p className="text-gray-900">{formatDate(selectedQuote.created_at)}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Corners</label>
                  <p className="text-gray-900">{selectedQuote.config_data.corners}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Fabric Type</label>
                  <p className="text-gray-900">{selectedQuote.config_data.fabricType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Fabric Color</label>
                  <p className="text-gray-900">{selectedQuote.config_data.fabricColor}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Total Price</label>
                  <p className="text-gray-900 text-xl font-bold">
                    {formatCurrency(selectedQuote.calculations_data.totalPrice, selectedQuote.config_data.currency)}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Quote Resume Link</h4>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white p-2 rounded border border-blue-200 text-blue-900 overflow-x-auto">
                    {getQuoteUrl(selectedQuote.quote_reference)}
                  </code>
                  <Button
                    onClick={() => copyQuoteUrl(selectedQuote.quote_reference)}
                    size="sm"
                    variant="outline"
                  >
                    Copy Link
                  </Button>
                  <Button
                    onClick={() => window.open(getQuoteUrl(selectedQuote.quote_reference), '_blank')}
                    size="sm"
                  >
                    Open Quote
                  </Button>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  Share this link with the customer to allow them to continue their quote configuration.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                onClick={() => setQuoteToDelete(selectedQuote)}
                variant="outline"
                className="text-red-600 hover:bg-red-50 border-red-200"
              >
                Delete Quote
              </Button>
              <Button onClick={() => setSelectedQuote(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {quoteToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Delete</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete quote <strong>{quoteToDelete.quote_reference}</strong>?
              This will also delete all associated events and cannot be undone.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This action is permanent. The quote and all related data will be removed from the database and analytics.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setQuoteToDelete(null)}
                variant="outline"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteQuote}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete Quote'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Success Notification */}
      {deleteSuccess && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-900 font-medium">Quote deleted successfully</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
