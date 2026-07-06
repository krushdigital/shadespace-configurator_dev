import React, { useState, useCallback } from 'react';
import { ShadeConfigurator } from '../ShadeConfigurator';
import { generateQuoteUrl } from '../../utils/quoteManager';
import type { AdminProfile } from '../../hooks/useAdminProfile';
import { Copy, Check, ExternalLink, Search, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';

interface AdminQuoteBuilderProps {
  profile: AdminProfile;
}

interface QuoteSearchResult {
  id: string;
  access_token: string;
  quote_reference: string;
  quote_name: string;
  customer_email: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  created_at: string;
  status: string;
  sales_rep_name: string | null;
}

export const AdminQuoteBuilder: React.FC<AdminQuoteBuilderProps> = ({ profile }) => {
  const [lastSaved, setLastSaved] = useState<{
    quoteId: string;
    accessToken: string;
    reference: string;
    url: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadedQuote, setLoadedQuote] = useState<{ id: string; token: string } | null>(null);
  const [showQuoteSearch, setShowQuoteSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<QuoteSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [configuratorKey, setConfiguratorKey] = useState(0);

  const handleAdminSaveComplete = (quoteId: string, accessToken: string, reference: string) => {
    const url = generateQuoteUrl(quoteId, accessToken);
    setLastSaved({ quoteId, accessToken, reference, url });
  };

  const handleCopyLink = async () => {
    if (!lastSaved) return;
    try {
      await navigator.clipboard.writeText(lastSaved.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from('saved_quotes')
        .select('id,access_token,quote_reference,quote_name,customer_email,customer_first_name,customer_last_name,created_at,status,sales_rep_name')
        .or(`quote_name.ilike.*${searchQuery}*,quote_reference.ilike.*${searchQuery}*,customer_email.ilike.*${searchQuery}*,customer_first_name.ilike.*${searchQuery}*,customer_last_name.ilike.*${searchQuery}*`)
        .order('created_at', { ascending: false })
        .limit(10);
      setSearchResults((data as QuoteSearchResult[]) || []);
    } catch (err) {
      console.error('Quote search failed:', err);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleLoadQuote = (quote: QuoteSearchResult) => {
    setLoadedQuote({ id: quote.id, token: quote.access_token });
    setLastSaved(null);
    setShowQuoteSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setConfiguratorKey(prev => prev + 1);
  };

  const handleNewQuote = () => {
    setLoadedQuote(null);
    setLastSaved(null);
    setConfiguratorKey(prev => prev + 1);
  };

  return (
    <div className="space-y-4">
      {lastSaved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-green-800">
              Quote <span className="font-bold">{lastSaved.reference}</span> saved successfully
            </p>
            <p className="text-xs text-green-600 mt-0.5">Share the link below with your customer</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              <span className="ml-1.5">{copied ? 'Copied' : 'Copy Link'}</span>
            </Button>
            <a
              href={lastSaved.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </a>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Shade Sail Configurator</h3>
            <p className="text-xs text-gray-500">
              {loadedQuote ? 'Editing existing quote' : 'Build a quote on behalf of a customer'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
              Sales Rep: {profile.full_name || profile.email}
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowQuoteSearch(true)}>
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Load Quote
            </Button>
            {loadedQuote && (
              <Button variant="outline" size="sm" onClick={handleNewQuote}>
                New Quote
              </Button>
            )}
          </div>
        </div>
        <div className="p-0">
          <ShadeConfigurator
            key={configuratorKey}
            adminMode={true}
            adminProfile={profile}
            onAdminSaveComplete={handleAdminSaveComplete}
            initialQuoteId={loadedQuote?.id}
            initialQuoteToken={loadedQuote?.token}
          />
        </div>
      </div>

      {/* Quote Search Modal */}
      {showQuoteSearch && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowQuoteSearch(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Load Existing Quote</h3>
              <button onClick={() => setShowQuoteSearch(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-4">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by reference, name, or email..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                  {searching ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {searchResults.map((quote) => (
                    <button
                      key={quote.id}
                      onClick={() => handleLoadQuote(quote)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{quote.quote_reference}</span>
                          <span className="text-xs text-gray-500 ml-2">{quote.quote_name}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          quote.status === 'quote_ready' ? 'bg-green-100 text-green-700'
                          : quote.status === 'purchased' ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                        }`}>
                          {quote.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {quote.customer_email && <span>{quote.customer_email}</span>}
                        {quote.customer_first_name && <span>{quote.customer_first_name} {quote.customer_last_name}</span>}
                        <span>{new Date(quote.created_at).toLocaleDateString()}</span>
                        {quote.sales_rep_name && <span className="text-blue-600">Rep: {quote.sales_rep_name}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.length === 0 && searchQuery && !searching && (
                <p className="text-sm text-gray-500 text-center py-4">No quotes found matching your search.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
