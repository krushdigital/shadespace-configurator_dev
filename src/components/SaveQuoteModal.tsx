import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { ConfiguratorState, ShadeCalculations } from '../types';
import { saveQuote, generateQuoteUrl } from '../utils/quoteManager';
import { useToast } from './ui/ToastProvider';
import { analytics } from '../utils/analytics';
import { MyQuotesModal } from './MyQuotesModal';
import {
  generateDefaultQuoteName,
  sanitizeQuoteName,
  sanitizeCustomerReference,
  validateQuoteName,
  validateCustomerReference,
  getCharacterCount,
  isNearLimit,
  MAX_QUOTE_NAME_LENGTH,
  MAX_REFERENCE_LENGTH
} from '../utils/quoteNaming';

interface SaveQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguratorState;
  calculations: ShadeCalculations;
}

interface SaveQuoteModalState {
  showMyQuotesModal: boolean;
  savedEmail: string;
}

export function SaveQuoteModal({
  isOpen,
  onClose,
  config,
  calculations,
}: SaveQuoteModalProps) {
  const [email, setEmail] = useState('');
  const [quoteName, setQuoteName] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [saveMethod, setSaveMethod] = useState<'email' | 'link' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedQuote, setSavedQuote] = useState<{
    reference: string;
    quoteName: string;
    customerReference: string | null;
    url: string;
    expiresAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const [defaultQuoteName, setDefaultQuoteName] = useState('');
  const [showMyQuotesModal, setShowMyQuotesModal] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');

  // Time tracking states
  const [modalOpenTime, setModalOpenTime] = useState<number>(Date.now());
  const [methodSelectionTime, setMethodSelectionTime] = useState<number | null>(null);
  const [emailFocusTime, setEmailFocusTime] = useState<number | null>(null);

  // Track modal open and generate default quote name
  useEffect(() => {
    if (isOpen) {
      const openTime = Date.now();
      setModalOpenTime(openTime);

      const isMobile = window.innerWidth < 1024;

      const generatedName = generateDefaultQuoteName(config, calculations);
      setDefaultQuoteName(generatedName);

      analytics.quoteSaveModalOpened({
        source: 'review_content',
        device_type: isMobile ? 'mobile' : 'desktop',
        total_price: calculations.totalPrice,
        currency: config.currency,
        corners: config.corners,
        fabric_type: config.fabricType,
      });
    }
  }, [isOpen, calculations.totalPrice, config.currency, config.corners, config.fabricType, config.fabricColor, config.fabricType]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const sanitizedQuoteName = quoteName.trim() ? sanitizeQuoteName(quoteName) : undefined;
      const sanitizedReference = customerReference.trim() ? sanitizeCustomerReference(customerReference) : undefined;

      const result = await saveQuote(
        config,
        calculations,
        saveMethod === 'email' ? email : undefined,
        sanitizedQuoteName,
        sanitizedReference
      );

      const quoteUrl = generateQuoteUrl(result.id);
      const modalDuration = (Date.now() - modalOpenTime) / 1000;
      const emailDomain = email ? email.split('@')[1] : null;

      setSavedQuote({
        reference: result.reference,
        quoteName: result.quoteName,
        customerReference: result.customerReference || null,
        url: quoteUrl,
        expiresAt: result.expiresAt,
      });

      if (saveMethod === 'email' && email) {
        setSavedEmail(email);
      }


   // Send confirmation email if user chose email method
if (saveMethod === 'email' && email) {
  try {
    // Validate that we have all required data
    if (!result.reference || !quoteUrl || !result.expiresAt) {
      console.warn('Missing required quote data for email:', {
        reference: result.reference,
        quoteUrl: quoteUrl,
        expiresAt: result.expiresAt
      });
      return; // Don't attempt to send email without required data
    }

    const emailResponse = await fetch(
      '/apps/shade_space/api/v1/public/quote-save-email',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          quoteReference: result.reference,
          quoteUrl: quoteUrl,
          expiresAt: result.expiresAt
        }),
      }
    );

    const emailData = await emailResponse.json();
    
    if (!emailData.success) {
      console.warn('Quote confirmation email failed:', emailData.error);
      // Don't throw error here - quote is saved successfully regardless of email
    } else {
      console.log('Quote confirmation email sent successfully');
    }
  } catch (emailError) {
    console.error('Error sending quote confirmation email:', emailError);
    // Don't throw error here - quote is saved successfully regardless of email
  }
}


      // Track success with comprehensive data
      analytics.quoteSaveSuccess({
        quote_reference: result.reference,
        quote_name: result.quoteName,
        has_custom_name: !result.nameAutoGenerated,
        has_customer_reference: !!result.customerReference,
        save_method: saveMethod || 'link',
        email_domain: emailDomain,
        total_price: calculations.totalPrice,
        currency: config.currency,
        corners: config.corners,
        fabric_type: config.fabricType,
        edge_type: config.edgeType,
        hardware_included: config.measurementOption === 'adjust',
        area_sqm: calculations.area,
        perimeter_m: calculations.perimeter,
        modal_duration_seconds: modalDuration,
        has_shopify_customer: !!result.shopifyCustomerId,
        shopify_customer_id: result.shopifyCustomerId,
      });

      // Track link generation
      const expiresDate = new Date(result.expiresAt);
      const daysUntilExpiration = Math.ceil(
        (expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      analytics.quoteLinkGenerated({
        quote_reference: result.reference,
        expires_at: result.expiresAt,
        days_until_expiration: daysUntilExpiration,
      });

      // Track Shopify customer creation if it happened
      if (result.shopifyCustomerCreated && result.shopifyCustomerId && emailDomain) {
        analytics.shopifyCustomerCreated({
          customer_id: result.shopifyCustomerId,
          email_domain: emailDomain,
          source: 'quote_save',
          tags: ['quote_saved', 'configurator_user'],
          total_quote_value: calculations.totalPrice,
          currency: config.currency,
        });
      }

      showToast(
        saveMethod === 'email'
          ? 'Quote saved! Check your email for the link.'
          : 'Quote saved successfully!',
        'success'
      );
    } catch (error: any) {
      console.error('Failed to save quote:', error);

      analytics.quoteSaveFailed({
        error_message: error?.message || 'Unknown error',
        error_type: error?.name || 'SaveError',
        save_method: saveMethod || 'unknown',
        total_price: calculations.totalPrice,
        currency: config.currency,
      });

      showToast('Failed to save quote. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (savedQuote) {
      try {
        navigator.clipboard.writeText(savedQuote.url);
        setCopied(true);

        analytics.quoteLinkCopied({
          quote_reference: savedQuote.reference,
          copy_successful: true,
        });

        showToast('Link copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 3000);
      } catch (error) {
        analytics.quoteLinkCopied({
          quote_reference: savedQuote.reference,
          copy_successful: false,
        });
      }
    }
  };

  const handleMethodSelection = (method: 'email' | 'link') => {
    const selectionTime = Date.now();
    const timeToSelect = (selectionTime - modalOpenTime) / 1000;

    setMethodSelectionTime(selectionTime);
    setSaveMethod(method);

    analytics.quoteSaveMethodSelected({
      method,
      total_price: calculations.totalPrice,
      currency: config.currency,
      time_to_select_seconds: timeToSelect,
    });
  };

  const handleEmailFocus = () => {
    setEmailFocusTime(Date.now());
  };

  const handleEmailBlur = () => {
    if (emailFocusTime && email) {
      const timeSpent = (Date.now() - emailFocusTime) / 1000;
      const emailDomain = email.split('@')[1] || 'unknown';

      analytics.quoteSaveEmailEntered({
        email_domain: emailDomain,
        time_spent_on_email_field_seconds: timeSpent,
      });
    }
  };

  const handleClose = () => {
    if (!savedQuote) {
      // User cancelled without saving
      const modalDuration = (Date.now() - modalOpenTime) / 1000;

      analytics.quoteSaveModalCancelled({
        modal_duration_seconds: modalDuration,
        had_selected_method: !!saveMethod,
        had_entered_email: !!email,
      });
    } else {
      // User completed save and clicked Done
      const totalDuration = (Date.now() - modalOpenTime) / 1000;

      analytics.quoteSaveCompleted({
        quote_reference: savedQuote.reference,
        action: 'done_button_clicked',
        total_duration_seconds: totalDuration,
      });
    }

    setEmail('');
    setQuoteName('');
    setCustomerReference('');
    setSaveMethod(null);
    setSavedQuote(null);
    setCopied(false);
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <>
      <MyQuotesModal
        isOpen={showMyQuotesModal}
        onClose={() => setShowMyQuotesModal(false)}
        initialEmail={savedEmail}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {!savedQuote ? (
            <>
              <h3 className="text-2xl font-bold text-[#01312D] mb-2">
                Save Your Quote
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                Your quote will be saved for 30 days. Choose how you'd like to access it later.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quote Name <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <Input
                    type="text"
                    value={quoteName}
                    onChange={(e) => setQuoteName(e.target.value)}
                    placeholder="e.g., Smith Family Patio, Project 2024-A"
                    maxLength={MAX_QUOTE_NAME_LENGTH}
                    className="w-full"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-slate-500">
                      {quoteName.trim() ? 'Custom name will be used' : `Default: ${defaultQuoteName}`}
                    </p>
                    <span className={`text-xs ${isNearLimit(quoteName, MAX_QUOTE_NAME_LENGTH) ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                      {getCharacterCount(quoteName, MAX_QUOTE_NAME_LENGTH)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Customer Reference <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <Input
                    type="text"
                    value={customerReference}
                    onChange={(e) => setCustomerReference(e.target.value)}
                    placeholder="e.g., Invoice #1234, Site B"
                    maxLength={MAX_REFERENCE_LENGTH}
                    className="w-full"
                  />
                  <div className="flex justify-end mt-1">
                    <span className={`text-xs ${isNearLimit(customerReference, MAX_REFERENCE_LENGTH) ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                      {getCharacterCount(customerReference, MAX_REFERENCE_LENGTH)}
                    </span>
                  </div>
                </div>
              </div>

              {!saveMethod ? (
                <div className="space-y-3">
                  <button
                    onClick={() => handleMethodSelection('email')}
                    className="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-[#307C31] hover:bg-[#BFF102]/10 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-[#BFF102] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5 text-[#01312D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#01312D] mb-1">
                          Save with Email
                        </h4>
                        <p className="text-sm text-slate-600">
                          We'll email you a link to resume your quote anytime
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleMethodSelection('link')}
                    className="hidden w-full p-4 border-2 border-slate-200 rounded-lg hover:border-[#307C31] hover:bg-[#BFF102]/10 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-[#BFF102] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5 text-[#01312D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#01312D] mb-1">
                          Get Quote Link
                        </h4>
                        <p className="text-sm text-slate-600">
                          Generate a shareable link without providing an email
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {saveMethod === 'email' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address
                      </label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={handleEmailFocus}
                        onBlur={handleEmailBlur}
                        placeholder="your@email.com"
                        className="w-full"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        We'll send you a link to access your quote later
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSaveMethod(null)}
                      className="flex-1"
                      disabled={isSaving}
                    >
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSave}
                      className="flex-1"
                      disabled={isSaving || (saveMethod === 'email' && !email)}
                    >
                      {isSaving ? 'Saving...' : 'Save Quote'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#BFF102] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#01312D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-[#01312D] mb-2">
                  Quote Saved!
                </h3>
                <p className="text-sm text-slate-600">
                  Your quote has been saved successfully
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-[#BFF102]/20 border-2 border-[#BFF102] rounded-lg p-4">
                  <div className="text-xs font-medium text-[#307C31] mb-1">
                    Quote Name
                  </div>
                  <div className="text-lg font-bold text-[#01312D]">
                    {savedQuote.quoteName}
                  </div>
                  {savedQuote.customerReference && (
                    <div className="mt-2 pt-2 border-t border-[#BFF102]/40">
                      <div className="text-xs font-medium text-[#307C31]">
                        Customer Reference
                      </div>
                      <div className="text-sm font-semibold text-[#01312D] mt-1">
                        {savedQuote.customerReference}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-xs font-medium text-slate-600 mb-1">
                    System Reference
                  </div>
                  <div className="text-sm font-bold text-[#01312D] font-mono">
                    {savedQuote.reference}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-xs font-medium text-slate-600 mb-1">
                    Valid Until
                  </div>
                  <div className="text-sm font-semibold text-[#01312D]">
                    {formatDate(savedQuote.expiresAt)}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-xs font-medium text-slate-600 mb-2">
                    Shareable Link
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={savedQuote.url}
                      readOnly
                      className="flex-1 text-xs bg-white border border-slate-300 rounded px-3 py-2 font-mono text-slate-700"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="flex-shrink-0"
                    >
                      {copied ? (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </span>
                      )}
                    </Button>
                  </div>
                </div>

                {saveMethod === 'email' && (
                  <div className="bg-[#BFF102]/10 border border-[#307C31]/30 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-[#307C31] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-[#01312D]">
                        We've sent an email to <strong>{email}</strong> with your quote details and access link.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {savedEmail && (
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setShowMyQuotesModal(true);
                    }}
                    className="w-full"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View My Quotes
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleClose}
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            </>
          )}

          {!savedQuote && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="w-full mt-4"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
