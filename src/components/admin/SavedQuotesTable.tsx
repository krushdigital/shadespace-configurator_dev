import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  shopify_order_id: string | null;
  shopify_order_number: string | null;
  purchased_at: string | null;
  diagram_3d_public_url: string | null;
  quote_thread_id: string | null;
  is_thread_primary: boolean;
}

interface ThreadGroup {
  threadId: string;
  primary: Quote;
  secondaries: Quote[];
  quoteCount: number;
}

const PAGE_SIZE = 50;
const SELECT_FIELDS = 'id,quote_reference,quote_name,customer_email,customer_reference,customer_first_name,customer_last_name,customer_ip,customer_country,customer_country_code,is_excluded,status,created_at,access_token,calculations_data,config_data,current_step,total_steps,shopify_order_id,shopify_order_number,purchased_at,diagram_3d_public_url,quote_thread_id,is_thread_primary';

export const SavedQuotesTable: React.FC<SavedQuotesTableProps & { excludeInternal?: boolean; timezone?: string }> = ({ dateRange, excludeInternal, timezone = 'UTC' }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [generatingFulfilment, setGeneratingFulfilment] = useState<string | null>(null);
  const [togglingExclusion, setTogglingExclusion] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [regenerateMode, setRegenerateMode] = useState<'single' | 'bulk' | null>(null);
  const [regenerateQuote, setRegenerateQuote] = useState<Quote | null>(null);
  const [exporting, setExporting] = useState(false);
  const [groupByThread, setGroupByThread] = useState(true);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [threadActionLoading, setThreadActionLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [dateRange, statusFilter, excludeInternal]);

  useEffect(() => {
    fetchQuotes();
  }, [dateRange, statusFilter, excludeInternal, debouncedSearch, page]);

  const buildQueryParams = useCallback((searchTerm: string) => {
    const params: string[] = [
      `select=${SELECT_FIELDS}`,
      `created_at=gte.${dateRange.start}T00:00:00`,
      `created_at=lte.${dateRange.end}T23:59:59`,
      'order=created_at.desc',
    ];

    if (statusFilter === 'active') {
      params.push('status=in.(quote_ready,purchased,completed)');
    } else if (statusFilter !== 'all') {
      params.push(`status=eq.${statusFilter}`);
    }

    if (excludeInternal) {
      params.push('is_excluded=eq.false');
    }

    if (searchTerm) {
      const encoded = encodeURIComponent(`*${searchTerm}*`);
      params.push(`or=(quote_name.ilike.${encoded},quote_reference.ilike.${encoded},customer_email.ilike.${encoded},customer_reference.ilike.${encoded},customer_first_name.ilike.${encoded},customer_last_name.ilike.${encoded})`);
    }

    return params;
  }, [dateRange, statusFilter, excludeInternal]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const params = buildQueryParams(debouncedSearch);
      const offset = page * PAGE_SIZE;
      params.push(`limit=${PAGE_SIZE}`, `offset=${offset}`);

      const query = `${supabaseUrl}/rest/v1/saved_quotes?${params.join('&')}`;
      const headers = await getAdminAuthHeaders();
      const response = await fetch(query, {
        headers: { ...headers, 'Prefer': 'count=exact' },
      });

      if (response.ok) {
        const data = await response.json();
        setQuotes(data);
        const contentRange = response.headers.get('content-range');
        if (contentRange) {
          const total = parseInt(contentRange.split('/')[1], 10);
          if (!isNaN(total)) setTotalCount(total);
        }
      }
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', timeZone: timezone });
    const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
    return { datePart, timePart };
  };

  const DateCell = ({ dateString }: { dateString: string }) => {
    const { datePart, timePart } = formatDate(dateString);
    return (
      <div className="whitespace-nowrap">
        <div>{datePart}</div>
        <div className="text-xs text-gray-400">{timePart}</div>
      </div>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { NZD: 'NZ$', USD: 'US$', AUD: 'AU$', GBP: '\u00a3', EUR: '\u20ac', CAD: 'CA$' };
    return `${symbols[currency] || currency}${amount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string, orderNumber?: string | null) => {
    const statusStyles: Record<string, string> = {
      in_progress: 'bg-yellow-100 text-yellow-800',
      quote_ready: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      expired: 'bg-gray-100 text-gray-800',
      purchased: 'bg-teal-100 text-teal-800',
      checkout_pending: 'bg-orange-100 text-orange-800',
    };
    return (
      <div className="flex items-center gap-1.5">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
          {status.replace('_', ' ')}
        </span>
        {status === 'purchased' && orderNumber && (
          <span className="text-xs font-medium text-teal-700">{orderNumber}</span>
        )}
      </div>
    );
  };

  const getCustomerDisplay = (quote: Quote) => {
    const name = [quote.customer_first_name, quote.customer_last_name].filter(Boolean).join(' ');
    if (name && quote.customer_email) return <><div className="font-medium text-gray-900">{name}</div><div className="text-xs text-gray-500">{quote.customer_email}</div></>;
    if (name) return <span className="text-gray-900">{name}</span>;
    if (quote.customer_email) return <span className="text-gray-600">{quote.customer_email}</span>;
    return <span className="text-gray-400">No contact info</span>;
  };

  const buildThreadGroups = (allQuotes: Quote[]): ThreadGroup[] => {
    const threadMap = new Map<string, Quote[]>();
    const noThread: Quote[] = [];

    for (const q of allQuotes) {
      if (q.quote_thread_id) {
        const existing = threadMap.get(q.quote_thread_id) || [];
        existing.push(q);
        threadMap.set(q.quote_thread_id, existing);
      } else {
        noThread.push(q);
      }
    }

    const groups: ThreadGroup[] = [];

    for (const [threadId, threadQuotes] of threadMap) {
      const primary = threadQuotes.find(q => q.is_thread_primary) || threadQuotes[0];
      const secondaries = threadQuotes.filter(q => q.id !== primary.id).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      groups.push({ threadId, primary, secondaries, quoteCount: threadQuotes.length });
    }

    for (const q of noThread) {
      groups.push({ threadId: q.id, primary: q, secondaries: [], quoteCount: 1 });
    }

    groups.sort((a, b) => new Date(b.primary.created_at).getTime() - new Date(a.primary.created_at).getTime());
    return groups;
  };

  const toggleThread = (threadId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  };

  const splitFromThread = async (quote: Quote) => {
    if (!quote.quote_thread_id) return;
    try {
      setThreadActionLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;
      const headers = await getAdminAuthHeaders();

      // Create a new solo thread for this quote
      const threadRes = await fetch(`${supabaseUrl}/rest/v1/quote_threads`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          customer_email: quote.customer_email,
          primary_quote_id: quote.id,
          status: quote.status,
          quote_count: 1,
          latest_value: quote.calculations_data?.totalPrice ?? null,
          latest_currency: quote.config_data?.currency ?? null,
        }),
      });
      if (!threadRes.ok) { alert('Failed to create new thread.'); return; }
      const [newThread] = await threadRes.json();

      // Move quote to new thread
      await fetch(`${supabaseUrl}/rest/v1/saved_quotes?id=eq.${quote.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ quote_thread_id: newThread.id, is_thread_primary: true }),
      });

      // Recalculate old thread count
      const oldThreadId = quote.quote_thread_id;
      const countRes = await fetch(`${supabaseUrl}/rest/v1/saved_quotes?quote_thread_id=eq.${oldThreadId}&select=id`, { headers });
      const remaining = countRes.ok ? await countRes.json() : [];
      if (remaining.length > 0) {
        await fetch(`${supabaseUrl}/rest/v1/quote_threads?id=eq.${oldThreadId}`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ quote_count: remaining.length }),
        });
      } else {
        await fetch(`${supabaseUrl}/rest/v1/quote_threads?id=eq.${oldThreadId}`, {
          method: 'DELETE',
          headers,
        });
      }

      fetchQuotes();
      setSelectedQuote(null);
    } catch (error) {
      console.error('Split from thread failed:', error);
      alert('Failed to split quote from thread.');
    } finally {
      setThreadActionLoading(false);
    }
  };

  const markCustomerCommercial = async (quote: Quote) => {
    if (!quote.customer_email) { alert('No email on this quote.'); return; }
    try {
      setThreadActionLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;
      const headers = await getAdminAuthHeaders();

      // Upsert customer_thread_config
      await fetch(`${supabaseUrl}/rest/v1/customer_thread_config`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          customer_email: quote.customer_email.toLowerCase(),
          default_thread_type: 'commercial',
          always_separate_threads: true,
        }),
      });

      alert(`${quote.customer_email} marked as commercial. Future quotes will each get their own thread.`);
    } catch (error) {
      console.error('Mark commercial failed:', error);
      alert('Failed to mark customer as commercial.');
    } finally {
      setThreadActionLoading(false);
    }
  };

  const threadGroups = groupByThread ? buildThreadGroups(quotes) : [];

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
        threeDImageDataUrl: quote.diagram_3d_public_url || undefined,
      });
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. The quote may have incomplete configuration data.');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleDownloadFulfilmentPDF = async (quote: Quote) => {
    try {
      setGeneratingFulfilment(quote.id);
      const customerDetails: CustomerDetails = {
        firstName: quote.customer_first_name || undefined,
        lastName: quote.customer_last_name || undefined,
        email: quote.customer_email || undefined,
        quoteName: quote.quote_name,
        customerReference: quote.customer_reference,
        quoteUrl: getQuoteUrl(quote),
      };
      const template = await loadActivePdfTemplate(false, 'fulfilment');
      await generatePdfFromBlocks(quote.config_data, quote.calculations_data, template.blocks, {
        layout: template.layout,
        chrome: template.chrome,
        customer: customerDetails,
        isEmailSummary: false,
        threeDImageDataUrl: quote.diagram_3d_public_url || undefined,
        fulfilment: true,
      });
    } catch (error) {
      console.error('Failed to generate fulfilment PDF:', error);
      alert('Failed to generate fulfilment PDF. The quote may have incomplete configuration data.');
    } finally {
      setGeneratingFulfilment(null);
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

  const exportToCSV = async () => {
    try {
      setExporting(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const params = buildQueryParams(debouncedSearch);
      const query = `${supabaseUrl}/rest/v1/saved_quotes?${params.join('&')}`;
      const headers = await getAdminAuthHeaders();
      const response = await fetch(query, { headers });
      if (!response.ok) return;
      const allQuotes: Quote[] = await response.json();

      const csvHeaders = [
        'Quote Reference', 'Quote Name', 'Customer Name', 'Customer Email', 'Customer Reference',
        'IP Address', 'Country', 'Internal',
        'Status', 'Order Number', 'Purchased At', 'Total Price', 'Currency', 'Corners', 'Fabric Type', 'Fabric Color',
        'Edge Type', 'Step Progress', 'Created At',
      ];
      const rows = allQuotes.map(q => [
        q.quote_reference,
        q.quote_name,
        [q.customer_first_name, q.customer_last_name].filter(Boolean).join(' '),
        q.customer_email || '',
        q.customer_reference || '',
        q.customer_ip || '',
        q.customer_country || '',
        q.is_excluded ? 'Yes' : 'No',
        q.status,
        q.shopify_order_number || '',
        q.purchased_at || '',
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
    } catch (error) {
      console.error('CSV export failed:', error);
    } finally {
      setExporting(false);
    }
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
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
            <Input placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="active">Active (default)</option>
              <option value="all">All Statuses</option>
              <option value="quote_ready">Quote Ready</option>
              <option value="purchased">Purchased</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="checkout_pending">Checkout Pending</option>
              <option value="expired">Expired</option>
            </select>
            <button
              onClick={() => setGroupByThread(!groupByThread)}
              className={`px-3 py-2 rounded border text-sm font-medium transition-colors whitespace-nowrap ${groupByThread ? 'bg-[#01312D] text-white border-[#01312D]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {groupByThread ? 'Grouped' : 'Flat List'}
            </button>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button onClick={() => setRegenerateMode('bulk')} size="sm" variant="outline" className="text-[#01312D] border-[#01312D]/30 hover:bg-[#01312D]/5 whitespace-nowrap">Regenerate Prices</Button>
            <Button onClick={exportToCSV} size="sm" variant="outline" disabled={exporting} className="whitespace-nowrap">{exporting ? 'Exporting...' : 'Export CSV'}</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-3 pb-3 text-sm font-semibold text-gray-700 whitespace-nowrap">Reference</th>
                <th className="px-3 pb-3 text-sm font-semibold text-gray-700">Quote Name</th>
                <th className="px-3 pb-3 text-sm font-semibold text-gray-700">Customer</th>
                <th className="px-3 pb-3 text-sm font-semibold text-gray-700 whitespace-nowrap">IP / Country</th>
                <th className="px-3 pb-3 text-sm font-semibold text-gray-700">Status</th>
                <th className="px-3 pb-3 text-sm font-semibold text-gray-700 whitespace-nowrap">Total Price</th>
                <th className="px-3 pb-3 text-sm font-semibold text-gray-700 whitespace-nowrap">Created</th>
                <th className="px-3 pb-3 text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No quotes found</td></tr>
              ) : groupByThread ? (
                threadGroups.map((group) => (
                  <React.Fragment key={group.threadId}>
                    <tr className={`border-b border-gray-100 hover:bg-gray-50 ${group.primary.is_excluded ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-1.5">
                          {group.quoteCount > 1 && (
                            <button
                              onClick={() => toggleThread(group.threadId)}
                              className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 mr-1 flex-shrink-0"
                            >
                              <svg className={`w-3.5 h-3.5 transition-transform ${expandedThreads.has(group.threadId) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          )}
                          <button onClick={() => setSelectedQuote(group.primary)} className="text-lime-600 hover:text-lime-700 font-medium">
                            {group.primary.quote_reference}
                          </button>
                          {group.quoteCount > 1 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-700">{group.quoteCount}</span>
                          )}
                          {group.primary.is_excluded && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-600">INT</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">{group.primary.quote_name}</td>
                      <td className="px-3 py-4 text-sm">{getCustomerDisplay(group.primary)}</td>
                      <td className="px-3 py-4">
                        <div className="text-xs font-mono text-gray-600">{group.primary.customer_ip && group.primary.customer_ip !== 'unknown' ? group.primary.customer_ip.split(',')[0].trim() : '-'}</div>
                        {group.primary.customer_country && (
                          <div className="text-xs text-gray-500">{group.primary.customer_country_code ? `${group.primary.customer_country_code} - ` : ''}{group.primary.customer_country}</div>
                        )}
                      </td>
                      <td className="px-3 py-4">{getStatusBadge(group.primary.status, group.primary.shopify_order_number)}</td>
                      <td className="px-3 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {formatCurrency(group.primary.calculations_data?.totalPrice ?? 0, group.primary.config_data?.currency ?? 'NZD')}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap"><DateCell dateString={group.primary.created_at} /></td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <Button onClick={() => handleDownloadPDF(group.primary)} size="sm" variant="outline" className="text-xs" disabled={generatingPdf === group.primary.id}>
                            {generatingPdf === group.primary.id ? '...' : 'PDF'}
                          </Button>
                          <Button onClick={() => copyQuoteUrl(group.primary)} size="sm" variant="outline" className="text-xs">Link</Button>
                          <Button onClick={() => setSelectedQuote(group.primary)} size="sm" variant="outline" className="text-xs">View</Button>
                        </div>
                      </td>
                    </tr>
                    {expandedThreads.has(group.threadId) && group.secondaries.map((sec) => (
                      <tr key={sec.id} className="border-b border-gray-50 bg-gray-50/50">
                        <td className="px-3 py-3 pl-12">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-px bg-gray-300"></span>
                            <button onClick={() => setSelectedQuote(sec)} className="text-gray-500 hover:text-gray-700 text-sm">
                              {sec.quote_reference}
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">{sec.quote_name}</td>
                        <td className="px-3 py-3 text-xs text-gray-500">{sec.customer_email || '-'}</td>
                        <td className="px-3 py-3 text-xs text-gray-400">-</td>
                        <td className="px-3 py-3">{getStatusBadge(sec.status, sec.shopify_order_number)}</td>
                        <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {formatCurrency(sec.calculations_data?.totalPrice ?? 0, sec.config_data?.currency ?? 'NZD')}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap"><DateCell dateString={sec.created_at} /></td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <Button onClick={() => setSelectedQuote(sec)} size="sm" variant="outline" className="text-xs">View</Button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                quotes.map((quote) => (
                  <tr key={quote.id} className={`border-b border-gray-100 hover:bg-gray-50 ${quote.is_excluded ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSelectedQuote(quote)} className="text-lime-600 hover:text-lime-700 font-medium">
                          {quote.quote_reference}
                        </button>
                        {quote.is_excluded && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-600">INT</span>
                        )}
                        {!quote.is_thread_primary && quote.quote_thread_id && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-600">2nd</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">{quote.quote_name}</td>
                    <td className="px-3 py-4 text-sm">{getCustomerDisplay(quote)}</td>
                    <td className="px-3 py-4">
                      <div className="text-xs font-mono text-gray-600">{quote.customer_ip && quote.customer_ip !== 'unknown' ? quote.customer_ip.split(',')[0].trim() : '-'}</div>
                      {quote.customer_country && (
                        <div className="text-xs text-gray-500">{quote.customer_country_code ? `${quote.customer_country_code} - ` : ''}{quote.customer_country}</div>
                      )}
                    </td>
                    <td className="px-3 py-4">{getStatusBadge(quote.status, quote.shopify_order_number)}</td>
                    <td className="px-3 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {formatCurrency(quote.calculations_data?.totalPrice ?? 0, quote.config_data?.currency ?? 'NZD')}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap"><DateCell dateString={quote.created_at} /></td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <Button onClick={() => handleDownloadPDF(quote)} size="sm" variant="outline" className="text-xs" disabled={generatingPdf === quote.id}>
                          {generatingPdf === quote.id ? '...' : 'PDF'}
                        </Button>
                        <Button onClick={() => handleDownloadFulfilmentPDF(quote)} size="sm" variant="outline" className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50" disabled={generatingFulfilment === quote.id}>
                          {generatingFulfilment === quote.id ? '...' : 'Fulfilment'}
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

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {totalCount === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} quotes
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-700">
              Page {page + 1} of {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * PAGE_SIZE >= totalCount}
            >
              Next
            </Button>
          </div>
        </div>
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
                <div className="mt-1">{getStatusBadge(selectedQuote.status, selectedQuote.shopify_order_number)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Created</label>
                <p className="text-gray-900">{formatDate(selectedQuote.created_at).datePart} {formatDate(selectedQuote.created_at).timePart}</p>
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
            {selectedQuote.status === 'purchased' && (
              <div className="mt-4 bg-teal-50 border border-teal-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-teal-900 mb-2">Purchase Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedQuote.shopify_order_number && (
                    <div>
                      <span className="text-teal-700">Order Number:</span>{' '}
                      <span className="font-medium text-teal-900">{selectedQuote.shopify_order_number}</span>
                    </div>
                  )}
                  {selectedQuote.purchased_at && (
                    <div>
                      <span className="text-teal-700">Purchased:</span>{' '}
                      <span className="font-medium text-teal-900">{formatDate(selectedQuote.purchased_at!).datePart} {formatDate(selectedQuote.purchased_at!).timePart}</span>
                    </div>
                  )}
                  {selectedQuote.shopify_order_id && (
                    <div className="col-span-2">
                      <span className="text-teal-700">Shopify Order ID:</span>{' '}
                      <span className="font-mono text-xs text-teal-900">{selectedQuote.shopify_order_id}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedQuote.quote_thread_id && (
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-2">Thread Info</h4>
                <div className="flex items-center gap-3 text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedQuote.is_thread_primary ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {selectedQuote.is_thread_primary ? 'Primary' : 'Secondary'}
                  </span>
                  <span className="text-slate-600">Thread: <span className="font-mono text-xs">{selectedQuote.quote_thread_id.slice(0, 8)}...</span></span>
                </div>
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
              {selectedQuote.quote_thread_id && !selectedQuote.is_thread_primary && (
                <Button
                  onClick={() => splitFromThread(selectedQuote)}
                  variant="outline"
                  disabled={threadActionLoading}
                  className="text-indigo-600 hover:bg-indigo-50 border-indigo-200"
                >
                  {threadActionLoading ? 'Splitting...' : 'Split from Thread'}
                </Button>
              )}
              {selectedQuote.customer_email && (
                <Button
                  onClick={() => markCustomerCommercial(selectedQuote)}
                  variant="outline"
                  disabled={threadActionLoading}
                  className="text-orange-600 hover:bg-orange-50 border-orange-200"
                >
                  Mark Commercial
                </Button>
              )}
              <Button onClick={() => handleDownloadPDF(selectedQuote)} variant="outline" disabled={generatingPdf === selectedQuote.id}>
                {generatingPdf === selectedQuote.id ? 'Generating PDF...' : 'Download PDF'}
              </Button>
              <Button onClick={() => handleDownloadFulfilmentPDF(selectedQuote)} variant="outline" disabled={generatingFulfilment === selectedQuote.id} className="text-amber-700 hover:bg-amber-50 border-amber-300">
                {generatingFulfilment === selectedQuote.id ? 'Generating...' : 'Fulfilment PDF'}
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
