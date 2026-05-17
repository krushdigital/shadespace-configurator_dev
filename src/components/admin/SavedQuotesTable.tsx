import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { getAdminAuthHeaders } from '../../utils/adminAuth';
import { generatePdfFromBlocks, CustomerDetails } from '../../utils/pdfGenerator';
import { loadActivePdfTemplate } from '../../utils/activePdfTemplate';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { RegeneratePricesModal } from './RegeneratePricesModal';

interface SavedQuotesTableProps {
  dateRange: { start: string; end: string };
}

interface Quote {
  id: string;
  quote_reference: string;
  quote_name: string;
  customer_email: string | null;
  customer_reference: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_ip: string | null;
  customer_country: string | null;
  customer_country_code: string | null;
  is_excluded: boolean;
  status: string;
  created_at: string;
  access_token: string;
  current_step: number | null;
  total_steps: number | null;
  calculations_data: ShadeCalculations;
  config_data: ConfiguratorState;
}

export const SavedQuotesTable: React.FC<SavedQuotesTableProps & { excludeInternal?: boolean; timezone?: string }> = ({ dateRange, excludeInternal, timezone = 'UTC' }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [togglingExclusion, setTogglingExclusion] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [regenerateMode, setRegenerateMode] = useState<'single' | 'bulk' | null>(null);
  const [regenerateQuote, setRegenerateQuote] = useState<Quote | null>(null);
  useBodyScrollLock(!!selectedQuote || !!quoteToDelete || !!regenerateMode);

  useEffect(() => {
    const isOpen = !!selectedQuote || !!quoteToDelete;
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedQuote(null); setQuoteToDelete(null); }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [selectedQuote, quoteToDelete]);

  useEffect(() => {
    fetchQuotes();
  }, [dateRange, statusFilter, excludeInternal]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      let query = `${supabaseUrl}/rest/v1/saved_quotes?select=id,quote_reference,quote_name,customer_email,customer_reference,customer_first_name,customer_last_name,customer_ip,customer_country,customer_country_code,is_excluded,status,created_at,access_token,calculations_data,config_data,current_step,total_steps&created_at=gte.${dateRange.start}T00:00:00&created_at=lte.${dateRange.end}T23:59:59&order=created_at.desc&limit=100`;

      if (statusFilter !== 'all') {
        query += `&status=eq.${statusFilter}`;
      }

      if (excludeInternal) {
        query += '&is_excluded=eq.false';
      }

      const headers = await getAdminAuthHeaders();
      const response = await fetch(query, { headers });

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
    const customerName = [quote.customer_first_name, quote.customer_last_name].filter(Boolean).join(' ').toLowerCase();
    return (
      quote.quote_name?.toLowerCase().includes(searchLower) ||
      quote.quote_reference?.toLowerCase().includes(searchLower) ||
      quote.customer_email?.toLowerCase().includes(searchLower) ||
      quote.customer_reference?.toLowerCase().includes(searchLower) ||
      customerName.includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      timeZone: timezone,
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { NZD: 'NZ$', USD: 'US$', AUD: 'AU$', GBP: '\u00a3', EUR: '\u20ac', CAD: 'CA$' };
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

  const getCustomerDisplay = (quote: Quote) => {
    const name = [quote.customer_first_name, quote.customer_last_name].filter(Boolean).join(' ');
    if (name && quote.customer_email) return <><div className="font-medium text-gray-900">{name}</div><div className="text-xs text-gray-500">{quote.customer_email}</div></>;
    if (name) return <span className="text-gray-900">{name}</span>;
    if (quote.customer_email) return <span className="text-gray-600">{quote.customer_email}</span>;
    return <span className="text-gray-400">No contact info</span>;
  };

  const handleDownloadPDF = async (quote: Quote) => {
    try {
      setGeneratingPdf(quote.id);
      const customerDetails: CustomerDetails = {
        firstName: quote.customer_first_name || undefined,
        lastName: quote.customer_last_name || undefined,
        email: quote.customer_email || undefined,
        quoteName: quote.quote_name,
        customerReference: quote.customer_reference,
        quoteUrl: getQuoteUrl(quote),
      };
      const template = await loadActivePdfTemplate();
      await generatePdfFromBlocks(quote.config_data, quote.calculations_data, template.blocks, {
        layout: template.layout,
        chrome: template.chrome,
        customer: customerDetails,
        isEmailSummary: false,
      });
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. The quote may have incomplete configuration data.');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleDeleteQuote = async () => {
    if (!quoteToDelete) return;
    try {
      setIsDeleting(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const headers = await getAdminAuthHeaders();
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/delete_saved_quote`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_quote_id: quoteToDelete.id }),
      });

      if (response.ok) {
        setDeleteSuccess(true);
        setQuotes(quotes.filter(q => q.id !== quoteToDelete.id));
        setQuoteToDelete(null);
        setSelectedQuote(null);
        setTimeout(() => setDeleteSuccess(false), 3000);
      } else {
        alert('Failed to delete quote. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting quote:', error);
      alert('An error occurred while deleting the quote.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleExclusion = async (quote: Quote) => {
    try {
      setTogglingExclusion(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/saved_quotes?id=eq.${quote.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ is_excluded: !quote.is_excluded }),
      });

      if (res.ok) {
        const updated = { ...quote, is_excluded: !quote.is_excluded };
        setQuotes(quotes.map(q => q.id === quote.id ? updated : q));
        if (selectedQuote?.id === quote.id) setSelectedQuote(updated);
      }
    } catch (error) {
      console.error('Failed to toggle exclusion:', error);
    } finally {
      setTogglingExclusion(false);
    }
  };

  const handleResendEmail = async (quote: Quote) => {
    if (!quote.customer_email) {
      alert('No customer email on this quote.');
      return;
    }
    setResendingEmail(quote.id);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: 'pdf_quote_delivery',
          toEmail: quote.customer_email,
          quoteId: quote.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 3000);
      } else {
        alert(`Failed to resend: ${data.error || res.statusText}`);
      }
    } catch (error) {
      console.error('Resend email failed:', error);
      alert('Failed to resend email. Check console for details.');
    } finally {
      setResendingEmail(null);
    }
  };

  const getQuoteUrl = (quote: Quote) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/pages/shade-sail-configurator?quote=${quote.id}&token=${encodeURIComponent(quote.access_token)}`;
  };

  const copyQuoteUrl = (quote: Quote) => {
    navigator.clipboard.writeText(getQuoteUrl(quote));
    alert('Quote link copied to clipboard!');
  };

  const exportToCSV = () => {
    const csvHeaders = [
      'Quote Reference', 'Quote Name', 'Customer Name', 'Customer Email', 'Customer Reference',
      'IP Address', 'Country', 'Internal',
      'Status', 'Total Price', 'Currency', 'Corners', 'Fabric Type', 'Fabric Color',
      'Edge Type', 'Step Progress', 'Created At',
    ];
    const rows = filteredQuotes.map(q => [
      q.quote_reference,
      q.quote_name,
      [q.customer_first_name, q.customer_last_name].filter(Boolean).join(' '),
      q.customer_email || '',
      q.customer_reference || '',
      q.customer_ip || '',
      q.customer_country || '',
      q.is_excluded ? 'Yes' : 'No',
      q.status,
      q.calculations_data?.totalPrice ?? '',
      q.config_data?.currency ?? '',
      q.config_data?.corners ?? '',
      q.config_data?.fabricType ?? '',
      q.config_data?.fabricColor ?? '',
      q.config_data?.edgeType ?? '',
      q.current_step != null && q.total_steps ? `${q.current_step + 1}/${q.total_steps}` : '',
      q.created_at,
    ]);

    const csv = [csvHeaders, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
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
      <Card className="p-6">
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
      <Card className="p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex-1 flex gap-4">
            <Input placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-2">
              <option value="all">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="quote_ready">Quote Ready</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <Button onClick={() => setRegenerateMode('bulk')} size="sm" variant="outline" className="text-[#01312D] border-[#01312D]/30 hover:bg-[#01312D]/5">Regenerate Prices</Button>
          <Button onClick={exportToCSV} size="sm" variant="outline">Export CSV</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-4 pb-3 text-sm font-semibold text-gray-700">Reference</th>
                <th className="px-4 pb-3 text-sm font-semibold text-gray-700">Quote Name</th>
                <th className="px-4 pb-3 text-sm font-semibold text-gray-700">Customer</th>
                <th className="px-4 pb-3 text-sm font-semibold text-gray-700">IP / Country</th>
                <th className="px-4 pb-3 text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 pb-3 text-sm font-semibold text-gray-700">Total Price</th>
                <th className="px-4 pb-3 text-sm font-semibold text-gray-700">Created</th>
                <th className="px-4 pb-3 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No quotes found</td></tr>
              ) : (
                filteredQuotes.map((quote) => (
                  <tr key={quote.id} className={`border-b border-gray-100 hover:bg-gray-50 ${quote.is_excluded ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSelectedQuote(quote)} className="text-lime-600 hover:text-lime-700 font-medium">
                          {quote.quote_reference}
                        </button>
                        {quote.is_excluded && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-600">INT</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">{quote.quote_name}</td>
                    <td className="px-4 py-4 text-sm">{getCustomerDisplay(quote)}</td>
                    <td className="px-4 py-4">
                      <div className="text-xs font-mono text-gray-600">{quote.customer_ip && quote.customer_ip !== 'unknown' ? quote.customer_ip.split(',')[0].trim() : '-'}</div>
                      {quote.customer_country && (
                        <div className="text-xs text-gray-500">{quote.customer_country_code ? `${quote.customer_country_code} - ` : ''}{quote.customer_country}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(quote.status)}</td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(quote.calculations_data?.totalPrice ?? 0, quote.config_data?.currency ?? 'NZD')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{formatDate(quote.created_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <Button onClick={() => handleDownloadPDF(quote)} size="sm" variant="outline" className="text-xs" disabled={generatingPdf === quote.id}>
                          {generatingPdf === quote.id ? 'Generating...' : 'PDF'}
                        </Button>
                        <Button onClick={() => copyQuoteUrl(quote)} size="sm" variant="outline" className="text-xs">Link</Button>
                        <Button onClick={() => setSelectedQuote(quote)} size="sm" variant="outline" className="text-xs">View</Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-600">Showing {filteredQuotes.length} of {quotes.length} quotes</div>
      </Card>

      {selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedQuote(null)}>
          <Card className="max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start p-8 pb-4 flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedQuote.quote_name}</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedQuote.quote_reference}</p>
              </div>
              <button onClick={() => setSelectedQuote(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100" aria-label="Close">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-8">

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-600">Customer</label>
                <p className="text-gray-900">
                  {[selectedQuote.customer_first_name, selectedQuote.customer_last_name].filter(Boolean).join(' ') || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
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
              <div>
                <label className="text-sm font-medium text-gray-600">Step Progress</label>
                <p className="text-gray-900">
                  {selectedQuote.current_step != null && selectedQuote.total_steps
                    ? `Step ${selectedQuote.current_step + 1} of ${selectedQuote.total_steps}`
                    : 'Not tracked'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">IP Address</label>
                <p className="text-gray-900 font-mono text-sm">
                  {selectedQuote.customer_ip && selectedQuote.customer_ip !== 'unknown'
                    ? selectedQuote.customer_ip.split(',')[0].trim()
                    : 'Not recorded'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Country</label>
                <p className="text-gray-900">
                  {selectedQuote.customer_country
                    ? `${selectedQuote.customer_country}${selectedQuote.customer_country_code ? ` (${selectedQuote.customer_country_code})` : ''}`
                    : 'Unknown'}
                </p>
              </div>
            </div>
            {selectedQuote.is_excluded && (
              <div className="mt-4 bg-gray-100 border border-gray-300 rounded-lg p-3">
                <p className="text-sm text-gray-700 font-medium">This quote is flagged as internal/test traffic and excluded from analytics.</p>
              </div>
            )}

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Corners</label>
                  <p className="text-gray-900">{selectedQuote.config_data?.corners}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Fabric Type</label>
                  <p className="text-gray-900">{selectedQuote.config_data?.fabricType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Fabric Color</label>
                  <p className="text-gray-900">{selectedQuote.config_data?.fabricColor}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Edge Type</label>
                  <p className="text-gray-900">{selectedQuote.config_data?.edgeType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Measurement Option</label>
                  <p className="text-gray-900">{selectedQuote.config_data?.measurementOption}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Units</label>
                  <p className="text-gray-900">{selectedQuote.config_data?.unit}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-600">Total Price</label>
                  <p className="text-gray-900 text-xl font-bold">
                    {formatCurrency(selectedQuote.calculations_data?.totalPrice ?? 0, selectedQuote.config_data?.currency ?? 'NZD')}
                  </p>
                </div>
              </div>
            </div>

            {selectedQuote.config_data?.measurements && Object.keys(selectedQuote.config_data.measurements).length > 0 && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Measurements</h3>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(selectedQuote.config_data.measurements).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 rounded p-3">
                      <label className="text-xs font-medium text-gray-500">{key}</label>
                      <p className="text-sm font-medium text-gray-900">{value}mm</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Quote Resume Link</h4>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white p-2 rounded border border-blue-200 text-blue-900 overflow-x-auto">
                    {getQuoteUrl(selectedQuote)}
                  </code>
                  <Button onClick={() => copyQuoteUrl(selectedQuote)} size="sm" variant="outline">Copy</Button>
                  <Button onClick={() => window.open(getQuoteUrl(selectedQuote), '_blank')} size="sm">Open</Button>
                </div>
              </div>
            </div>

            </div>
            <div className="px-8 py-4 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0 flex-wrap">
              <Button
                onClick={() => toggleExclusion(selectedQuote)}
                variant="outline"
                disabled={togglingExclusion}
                className={selectedQuote.is_excluded ? 'text-green-600 hover:bg-green-50 border-green-200' : 'text-gray-600 hover:bg-gray-50 border-gray-300'}
              >
                {togglingExclusion ? 'Updating...' : selectedQuote.is_excluded ? 'Unmark Internal' : 'Mark as Internal'}
              </Button>
              <Button
                onClick={() => { setRegenerateQuote(selectedQuote); setRegenerateMode('single'); }}
                variant="outline"
                className="text-[#01312D] hover:bg-[#01312D]/5 border-[#01312D]/30"
              >
                Regenerate Price
              </Button>
              <Button onClick={() => handleDownloadPDF(selectedQuote)} variant="outline" disabled={generatingPdf === selectedQuote.id}>
                {generatingPdf === selectedQuote.id ? 'Generating PDF...' : 'Download PDF'}
              </Button>
              <Button
                onClick={() => handleResendEmail(selectedQuote)}
                variant="outline"
                disabled={resendingEmail === selectedQuote.id || !selectedQuote.customer_email}
                className="text-blue-600 hover:bg-blue-50 border-blue-200"
              >
                {resendingEmail === selectedQuote.id ? 'Sending...' : 'Resend Email'}
              </Button>
              <Button onClick={() => setQuoteToDelete(selectedQuote)} variant="outline" className="text-red-600 hover:bg-red-50 border-red-200">
                Delete Quote
              </Button>
              <Button onClick={() => setSelectedQuote(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}

      {quoteToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setQuoteToDelete(null)}>
          <Card className="max-w-md w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start p-6 pb-0 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Confirm Delete</h2>
              <button onClick={() => setQuoteToDelete(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100" aria-label="Close">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete quote <strong>{quoteToDelete.quote_reference}</strong>?
                This will also delete all associated events and cannot be undone.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This action is permanent.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
              <Button onClick={() => setQuoteToDelete(null)} variant="outline" disabled={isDeleting}>Cancel</Button>
              <Button onClick={handleDeleteQuote} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
                {isDeleting ? 'Deleting...' : 'Delete Quote'}
              </Button>
            </div>
          </Card>
        </div>
      )}

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

      {resendSuccess && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-blue-900 font-medium">Email resent successfully</p>
            </div>
          </div>
        </div>
      )}

      {regenerateMode && (
        <RegeneratePricesModal
          mode={regenerateMode}
          quoteId={regenerateQuote?.id}
          quoteReference={regenerateQuote?.quote_reference}
          currentPrice={regenerateQuote?.calculations_data?.totalPrice}
          currency={regenerateQuote?.config_data?.currency}
          customerEmail={regenerateQuote?.customer_email}
          onClose={() => { setRegenerateMode(null); setRegenerateQuote(null); }}
          onComplete={() => fetchQuotes()}
        />
      )}
    </>
  );
};
