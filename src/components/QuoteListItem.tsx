import React from 'react';
import { QuoteData } from '../utils/quoteManager';
import { formatCurrency } from '../utils/currencyFormatter';
import { Button } from './ui/Button';

interface QuoteListItemProps {
  quote: QuoteData;
  onSelect: (quote: QuoteData) => void;
  onCopyLink: (quoteId: string) => void;
}

export function QuoteListItem({ quote, onSelect, onCopyLink }: QuoteListItemProps) {
  const expiresAt = new Date(quote.expires_at);
  const now = new Date();
  const isExpired = expiresAt < now;
  const isExpiringSoon = !isExpired && expiresAt <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const currency = quote.config_data?.currency || 'AUD';
  const totalPrice = quote.calculations_data?.totalPrice || 0;
  const corners = quote.config_data?.corners || 3;
  const fabricType = quote.config_data?.fabricType || 'Unknown';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFabricLabel = (fabricId: string) => {
    const fabrics: Record<string, string> = {
      monotec370: 'Monotec',
      extrablock330: 'ExtraBlock',
      shadetec320: 'Shadetec',
    };
    return fabrics[fabricId] || fabricId;
  };

  const getStatusBadge = () => {
    if (quote.status === 'completed') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#307C31] text-white">
          Completed
        </span>
      );
    }
    if (isExpired) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-400 text-white">
          Expired
        </span>
      );
    }
    if (isExpiringSoon) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-500 text-white">
          Expiring Soon
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#BFF102] text-[#01312D]">
        Active
      </span>
    );
  };

  return (
    <div
      className="bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-[#307C31] transition-all duration-200 cursor-pointer"
      onClick={() => onSelect(quote)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-[#01312D] mb-1">
            {quote.quote_name}
          </h3>
          <p className="text-sm font-mono text-slate-600">
            {quote.quote_reference}
          </p>
          {quote.customer_reference && (
            <p className="text-sm text-slate-500 mt-1">
              Ref: {quote.customer_reference}
            </p>
          )}
        </div>
        <div>
          {getStatusBadge()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-slate-500 mb-1">Fabric</p>
          <p className="text-sm font-semibold text-[#01312D]">
            {getFabricLabel(fabricType)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Corners</p>
          <p className="text-sm font-semibold text-[#01312D]">
            {corners}-Corner
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Total Price</p>
          <p className="text-sm font-bold text-[#307C31]">
            {formatCurrency(totalPrice, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">
            {isExpired ? 'Expired' : 'Expires'}
          </p>
          <p className={`text-sm font-semibold ${isExpired ? 'text-slate-400' : isExpiringSoon ? 'text-amber-600' : 'text-[#01312D]'}`}>
            {formatDate(quote.expires_at)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          Created {formatDate(quote.created_at)}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onCopyLink(quote.id);
          }}
          className="text-xs"
        >
          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Link
        </Button>
      </div>
    </div>
  );
}
