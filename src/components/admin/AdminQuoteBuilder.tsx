import React, { useState } from 'react';
import { ShadeConfigurator } from '../ShadeConfigurator';
import { generateQuoteUrl } from '../../utils/quoteManager';
import type { AdminProfile } from '../../hooks/useAdminProfile';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';

interface AdminQuoteBuilderProps {
  profile: AdminProfile;
}

export const AdminQuoteBuilder: React.FC<AdminQuoteBuilderProps> = ({ profile }) => {
  const [lastSaved, setLastSaved] = useState<{
    quoteId: string;
    accessToken: string;
    reference: string;
    url: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

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
            <p className="text-xs text-gray-500">Build a quote on behalf of a customer</p>
          </div>
          <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
            Sales Rep: {profile.full_name || profile.email}
          </span>
        </div>
        <div className="p-0">
          <ShadeConfigurator
            adminMode={true}
            adminProfile={profile}
            onAdminSaveComplete={handleAdminSaveComplete}
          />
        </div>
      </div>
    </div>
  );
};
