import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { QuoteListItem } from './QuoteListItem';
import { useToast } from './ui/ToastProvider';
import {
  searchQuotes,
  QuoteSearchFilters,
  QuoteData,
  generateQuoteUrl,
  QuoteSearchResult,
} from '../utils/quoteManager';
import {
  getAllQuoteTokens,
  getAccessTokens,
  addQuoteToken,
  importQuoteFromUrl,
  hasTokenForEmail,
} from '../utils/tokenManager';
import { analytics } from '../utils/analytics';

interface MyQuotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

interface ViewMode {
  type: 'list' | 'import';
}

export function MyQuotesModal({ isOpen, onClose, initialEmail }: MyQuotesModalProps) {
  const [email, setEmail] = useState(initialEmail || '');
  const [emailConfirmed, setEmailConfirmed] = useState(!!initialEmail);
  const [viewMode, setViewMode] = useState<ViewMode>({ type: 'list' });
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'expiring' | 'expired' | 'completed' | 'all'>('active');
  const [fabricFilter, setFabricFilter] = useState<string>('');
  const [cornerFilter, setCornerFilter] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<'created_at' | 'expires_at' | 'price' | 'quote_name'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const [searchResult, setSearchResult] = useState<QuoteSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { showToast } = useToast();

  const performSearch = useCallback(async (page: number = 1) => {
    if (!emailConfirmed) return;

    setIsLoading(true);
    try {
      const accessTokens = getAccessTokens(email || undefined);

      if (accessTokens.length === 0) {
        setSearchResult({
          quotes: [],
          pagination: {
            page: 1,
            pageSize: 20,
            totalPages: 0,
            totalResults: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          stats: {
            total: 0,
            active: 0,
            expiring: 0,
            expired: 0,
            completed: 0,
          },
        });
        setIsLoading(false);
        return;
      }

      const filters: QuoteSearchFilters = {
        search: searchText || undefined,
        status: statusFilter,
        fabricType: fabricFilter || undefined,
        corners: cornerFilter,
        sortBy,
        sortOrder,
        page,
        pageSize: 20,
      };

      const result = await searchQuotes(accessTokens, filters);
      setSearchResult(result);
      setCurrentPage(page);

      analytics.quoteSearchPerformed({
        email_domain: email ? email.split('@')[1] || 'unknown' : 'anonymous',
        search_text: searchText || null,
        status_filter: statusFilter,
        fabric_filter: fabricFilter || null,
        corner_filter: cornerFilter || null,
        sort_by: sortBy,
        sort_order: sortOrder,
        results_count: result.quotes.length,
        total_results: result.pagination.totalResults,
      });
    } catch (error: any) {
      console.error('Failed to search quotes:', error);
      showToast('Failed to load quotes. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [emailConfirmed, email, searchText, statusFilter, fabricFilter, cornerFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (emailConfirmed && isOpen) {
      performSearch();
    }
  }, [emailConfirmed, isOpen, statusFilter, fabricFilter, cornerFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedQuote(null);
      setSearchText('');
      setShowFilters(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (emailConfirmed && searchText !== undefined) {
        performSearch();
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [searchText]);

  if (!isOpen) return null;

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (email && !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    const hasTokens = email ? hasTokenForEmail(email) : getAllQuoteTokens().length > 0;

    if (!hasTokens) {
      showToast(
        email
          ? `No quotes found for ${email}. Save a quote first or import one using a quote link.`
          : 'No quotes found. Save a quote first or import one using a quote link.',
        'error'
      );
      return;
    }

    setEmailConfirmed(true);
    if (email) {
      localStorage.setItem('savedQuotesEmail', email);
      analytics.quoteSearchModalOpened({
        email_domain: email.split('@')[1] || 'unknown',
      });
    } else {
      analytics.quoteSearchModalOpened({
        email_domain: 'anonymous',
      });
    }
  };

  const handleCopyLink = (quoteId: string) => {
    const tokens = getAllQuoteTokens();
    const token = tokens.find(t => t.quoteId === quoteId);

    if (!token) {
      showToast('Failed to copy link: Quote not found', 'error');
      return;
    }

    const url = generateQuoteUrl(quoteId, token.accessToken);
    navigator.clipboard.writeText(url);
    showToast('Quote link copied to clipboard!', 'success');

    analytics.quoteLinkCopied({
      quote_reference: token.quoteReference,
      copy_successful: true,
    });
  };

  const handleImportQuote = async () => {
    if (!importUrl.trim()) {
      showToast('Please enter a quote URL', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const imported = importQuoteFromUrl(importUrl);

      if (!imported) {
        showToast('Invalid quote URL format', 'error');
        setIsImporting(false);
        return;
      }

      const quote = await import('../utils/quoteManager').then(m =>
        m.getQuoteById(imported.quoteId, imported.accessToken)
      );

      addQuoteToken(
        quote.id,
        imported.accessToken,
        quote.quote_name,
        quote.quote_reference,
        quote.expires_at,
        email || undefined
      );

      showToast('Quote imported successfully!', 'success');
      setImportUrl('');
      setViewMode({ type: 'list' });
      performSearch();
    } catch (error: any) {
      console.error('Failed to import quote:', error);
      showToast(
        error.message || 'Failed to import quote. Please check the URL and try again.',
        'error'
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (searchResult) {
      analytics.quoteSearchModalClosed({
        email_domain: email ? email.split('@')[1] || 'unknown' : 'anonymous',
        quotes_viewed: searchResult.quotes.length,
        had_selected_quote: !!selectedQuote,
      });
    }
    setViewMode({ type: 'list' });
    setImportUrl('');
    onClose();
  };

  const handleChangeEmail = () => {
    setEmailConfirmed(false);
    setSearchResult(null);
    setSelectedQuote(null);
    setViewMode({ type: 'list' });
    setImportUrl('');
    localStorage.removeItem('savedQuotesEmail');
  };

  const activeFilterCount = [
    fabricFilter,
    cornerFilter,
    statusFilter !== 'active',
  ].filter(Boolean).length;

  if (!emailConfirmed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
          <div className="p-6">
            <h3 className="text-2xl font-bold text-[#01312D] mb-2">
              View My Quotes
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Enter your email address to view your saved quotes, or leave it blank to view all quotes on this device
            </p>

            <form onSubmit={handleEmailSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com (optional)"
                  className="w-full"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleClose}
                  className="flex-1"
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  className="flex-1"
                >
                  View Quotes
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (selectedQuote) {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-[#01312D]">
                Quote Details
              </h3>
              <button
                onClick={() => setSelectedQuote(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#BFF102]/20 border-2 border-[#BFF102] rounded-lg p-4">
                <div className="text-xs font-medium text-[#307C31] mb-1">
                  Quote Name
                </div>
                <div className="text-lg font-bold text-[#01312D]">
                  {selectedQuote.quote_name}
                </div>
                {selectedQuote.customer_reference && (
                  <div className="mt-2 pt-2 border-t border-[#BFF102]/40">
                    <div className="text-xs font-medium text-[#307C31]">
                      Customer Reference
                    </div>
                    <div className="text-sm font-semibold text-[#01312D] mt-1">
                      {selectedQuote.customer_reference}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="text-xs font-medium text-slate-600 mb-1">
                  System Reference
                </div>
                <div className="text-sm font-bold text-[#01312D] font-mono">
                  {selectedQuote.quote_reference}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-xs font-medium text-slate-600 mb-1">
                    Created
                  </div>
                  <div className="text-sm font-semibold text-[#01312D]">
                    {formatDate(selectedQuote.created_at)}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-xs font-medium text-slate-600 mb-1">
                    Expires
                  </div>
                  <div className="text-sm font-semibold text-[#01312D]">
                    {formatDate(selectedQuote.expires_at)}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="text-xs font-medium text-slate-600 mb-2">
                  Shareable Link
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={(() => {
                      const tokens = getAllQuoteTokens();
                      const token = tokens.find(t => t.quoteId === selectedQuote.id);
                      return token ? generateQuoteUrl(selectedQuote.id, token.accessToken) : '';
                    })()}
                    readOnly
                    className="flex-1 text-xs bg-white border border-slate-300 rounded px-3 py-2 font-mono text-slate-700"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(selectedQuote.id)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setSelectedQuote(null)}
              className="w-full mt-6"
            >
              Back to List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-[#01312D]">
                My Quotes
              </h3>
              <p className="text-sm text-slate-600">
                {email}
                <button
                  onClick={handleChangeEmail}
                  className="ml-2 text-[#307C31] hover:underline"
                >
                  Change
                </button>
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {viewMode.type === 'import' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Paste Quote URL
                </label>
                <Input
                  type="text"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://example.com/configurator?quote=...&token=..."
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Enter a quote link that was shared with you to add it to your quotes
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setViewMode({ type: 'list' });
                    setImportUrl('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleImportQuote}
                  disabled={isImporting || !importUrl.trim()}
                  className="flex-1"
                >
                  {isImporting ? 'Importing...' : 'Import Quote'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search by quote name or reference..."
                    className="w-full"
                  />
                </div>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setViewMode({ type: 'import' })}
                  className="flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Import Quote
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-[#BFF102] text-[#01312D] rounded-full px-2 py-0.5 text-xs font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['active', 'expiring', 'expired', 'completed', 'all'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        statusFilter === status
                          ? 'bg-[#307C31] text-white'
                          : 'bg-white border border-slate-300 text-slate-700 hover:border-[#307C31]'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fabric Type
                  </label>
                  <select
                    value={fabricFilter}
                    onChange={(e) => setFabricFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#307C31]"
                  >
                    <option value="">All Fabrics</option>
                    <option value="monotec370">Monotec</option>
                    <option value="extrablock330">ExtraBlock</option>
                    <option value="shadetec320">Shadetec</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Corners
                  </label>
                  <select
                    value={cornerFilter || ''}
                    onChange={(e) => setCornerFilter(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#307C31]"
                  >
                    <option value="">All Corners</option>
                    <option value="3">3 Corners</option>
                    <option value="4">4 Corners</option>
                    <option value="5">5 Corners</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#307C31]"
                  >
                    <option value="created_at">Date Created</option>
                    <option value="expires_at">Expiration Date</option>
                    <option value="price">Price</option>
                    <option value="quote_name">Quote Name</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-slate-300 rounded-lg hover:border-[#307C31] transition-colors"
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFabricFilter('');
                  setCornerFilter(undefined);
                  setStatusFilter('active');
                  setSortBy('created_at');
                  setSortOrder('desc');
                }}
                className="w-full"
              >
                Clear All Filters
              </Button>
            </div>
          )}
            </>
          )}

          {viewMode.type === 'list' && searchResult && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="text-slate-600">
                {searchResult.pagination.totalResults} quote{searchResult.pagination.totalResults !== 1 ? 's' : ''} found
                {searchResult.stats.expiring > 0 && (
                  <span className="ml-2 text-amber-600 font-medium">
                    ({searchResult.stats.expiring} expiring soon)
                  </span>
                )}
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-[#307C31] font-medium">
                  {searchResult.stats.active} Active
                </span>
                {searchResult.stats.completed > 0 && (
                  <span className="text-slate-500">
                    {searchResult.stats.completed} Completed
                  </span>
                )}
                {searchResult.stats.expired > 0 && (
                  <span className="text-slate-400">
                    {searchResult.stats.expired} Expired
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#BFF102] border-t-[#307C31] rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600">Loading quotes...</p>
              </div>
            </div>
          ) : searchResult && searchResult.quotes.length > 0 ? (
            <div className="space-y-4">
              {searchResult.quotes.map((quote) => (
                <QuoteListItem
                  key={quote.id}
                  quote={quote}
                  onSelect={setSelectedQuote}
                  onCopyLink={handleCopyLink}
                />
              ))}

              {searchResult.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => performSearch(currentPage - 1)}
                    disabled={!searchResult.pagination.hasPreviousPage}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-slate-600">
                    Page {searchResult.pagination.page} of {searchResult.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => performSearch(currentPage + 1)}
                    disabled={!searchResult.pagination.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h4 className="text-lg font-semibold text-slate-700 mb-2">
                  No quotes found
                </h4>
                <p className="text-sm text-slate-500">
                  Try adjusting your filters or search terms
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
