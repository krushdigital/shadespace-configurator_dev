import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { saveQuoteAsAdmin, updateQuote, generateQuoteUrl } from '../../utils/quoteManager';
import { addQuoteToken } from '../../utils/tokenManager';
import { useToast } from '../ui/ToastProvider';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import type { AdminProfile } from '../../hooks/useAdminProfile';
import { generatePdfFromBlocks, CustomerDetails } from '../../utils/pdfGenerator';
import { loadActivePdfTemplate } from '../../utils/activePdfTemplate';
import {
  generateDefaultQuoteName,
  sanitizeQuoteName,
  sanitizeCustomerReference,
  MAX_QUOTE_NAME_LENGTH,
  MAX_REFERENCE_LENGTH
} from '../../utils/quoteNaming';
import { Copy, Check, FileText, Link2, X } from 'lucide-react';

type ModalStep = 'form' | 'success';

interface AdminSaveQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguratorState;
  calculations: ShadeCalculations;
  adminProfile: AdminProfile;
  pricingSnapshot?: Record<string, unknown> | null;
  existingQuoteId?: string | null;
  existingAccessToken?: string | null;
  onQuoteCreated?: (reference: string, id: string, accessToken: string) => void;
  getCanvasImageUrl?: () => Promise<string | null>;
  getCanvasImage3DUrl?: () => Promise<string | null>;
}

export function AdminSaveQuoteModal({
  isOpen,
  onClose,
  config,
  calculations,
  adminProfile,
  pricingSnapshot,
  existingQuoteId,
  existingAccessToken,
  onQuoteCreated,
  getCanvasImageUrl,
  getCanvasImage3DUrl,
}: AdminSaveQuoteModalProps) {
  const [modalStep, setModalStep] = useState<ModalStep>('form');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [quoteName, setQuoteName] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedQuote, setSavedQuote] = useState<{
    id: string;
    reference: string;
    quoteName: string;
    url: string;
    pricingLockedUntil: string;
    accessToken: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { showToast } = useToast();
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const canvasImageUrl = await getCanvasImageUrl?.() ?? null;
      const canvasImage3DUrl = await getCanvasImage3DUrl?.() ?? null;
      const finalQuoteName = quoteName || generateDefaultQuoteName(config);

      let result;

      if (existingQuoteId && existingAccessToken) {
        result = await updateQuote(existingQuoteId, existingAccessToken, config, calculations, {
          email: email || undefined,
          quoteName: finalQuoteName,
          customerReference: customerReference || undefined,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          pricingSnapshot,
          canvasImageUrl,
          canvasImage3DUrl,
          status: 'quote_ready',
        });
      } else {
        result = await saveQuoteAsAdmin(config, calculations, adminProfile.id, adminProfile.full_name || adminProfile.email, {
          email: email || undefined,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          quoteName: finalQuoteName,
          customerReference: customerReference || undefined,
          pricingSnapshot,
          canvasImageUrl,
          canvasImage3DUrl,
        });
      }

      const quoteUrl = generateQuoteUrl(result.id, result.accessToken);
      addQuoteToken(result.id, result.accessToken);

      setSavedQuote({
        id: result.id,
        reference: result.reference,
        quoteName: result.quoteName,
        url: quoteUrl,
        pricingLockedUntil: result.pricingLockedUntil,
        accessToken: result.accessToken,
      });

      onQuoteCreated?.(result.reference, result.id, result.accessToken);
      setModalStep('success');
      showToast('Quote saved successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save quote', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!savedQuote) return;
    try {
      await navigator.clipboard.writeText(savedQuote.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy link', 'error');
    }
  };

  const handleGeneratePdf = async () => {
    if (!savedQuote) return;
    try {
      setGeneratingPdf(true);
      const customerDetails: CustomerDetails = {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        quoteName: savedQuote.quoteName,
        customerReference: customerReference || undefined,
        quoteUrl: savedQuote.url,
      };
      const template = await loadActivePdfTemplate();
      await generatePdfFromBlocks(config, calculations, template.blocks, {
        layout: template.layout,
        chrome: template.chrome,
        customer: customerDetails,
        isEmailSummary: false,
      });
      showToast('PDF downloaded', 'success');
    } catch (err) {
      showToast('Failed to generate PDF', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleClose = () => {
    setModalStep('form');
    setFirstName('');
    setLastName('');
    setEmail('');
    setQuoteName('');
    setCustomerReference('');
    setSavedQuote(null);
    setCopied(false);
    onClose();
  };

  const lockDate = savedQuote?.pricingLockedUntil
    ? new Date(savedQuote.pricingLockedUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {modalStep === 'form' ? 'Save Quote as Sales Rep' : 'Quote Saved'}
            </h2>
            <p className="text-sm text-gray-500">
              {modalStep === 'form'
                ? `Creating as ${adminProfile.full_name || adminProfile.email}`
                : `Reference: ${savedQuote?.reference}`}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {modalStep === 'form' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Customer details are optional. You can save the quote now and share the link with your customer later.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quote Name</label>
                <Input
                  value={quoteName}
                  onChange={(e) => setQuoteName(sanitizeQuoteName(e.target.value))}
                  placeholder={generateDefaultQuoteName(config)}
                  maxLength={MAX_QUOTE_NAME_LENGTH}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Reference (optional)</label>
                <Input
                  value={customerReference}
                  onChange={(e) => setCustomerReference(sanitizeCustomerReference(e.target.value))}
                  placeholder="e.g. Project name, address..."
                  maxLength={MAX_REFERENCE_LENGTH}
                />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Customer Details (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">First Name</label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Last Name</label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@email.com"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Saving...' : existingQuoteId ? 'Update Quote' : 'Save Quote'}
                </Button>
              </div>
            </div>
          )}

          {modalStep === 'success' && savedQuote && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">Quote saved and ready to share!</p>
                <p className="text-xs text-green-600 mt-1">
                  Pricing locked until {lockDate}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Share Link</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={savedQuote.url}
                    className="flex-1 text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 font-mono truncate"
                  />
                  <Button variant="outline" size="sm" onClick={handleCopyLink}>
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Customers can open this link to view, modify, and purchase their shade sail.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-500">Reference</span>
                  <p className="font-medium text-gray-900">{savedQuote.reference}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-500">Sales Rep</span>
                  <p className="font-medium text-gray-900">{adminProfile.full_name || adminProfile.email}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={handleCopyLink} className="flex-1">
                  <Link2 className="w-4 h-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button variant="outline" onClick={handleGeneratePdf} disabled={generatingPdf} className="flex-1">
                  <FileText className="w-4 h-4 mr-2" />
                  {generatingPdf ? 'Generating...' : 'Download PDF'}
                </Button>
              </div>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
