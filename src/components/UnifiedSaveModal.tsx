import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { ConfiguratorState, ShadeCalculations } from '../types';
import { saveQuote, generateQuoteUrl } from '../utils/quoteManager';
import { addQuoteToken } from '../utils/tokenManager';
import { useToast } from './ui/ToastProvider';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { analytics } from '../utils/analytics';
import {
  generateDefaultQuoteName,
  sanitizeQuoteName,
  sanitizeCustomerReference,
  getCharacterCount,
  isNearLimit,
  MAX_QUOTE_NAME_LENGTH,
  MAX_REFERENCE_LENGTH
} from '../utils/quoteNaming';

type ModalStep = 'form' | 'success';

interface UnifiedSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguratorState;
  calculations: ShadeCalculations;
  currentStep?: number;
  totalSteps?: number;
  shouldShowEmailOption?: boolean;
  pricingSnapshot?: Record<string, unknown> | null;
  onGeneratePDFWithDetails?: (
    firstName: string,
    lastName: string,
    email: string,
    quoteName: string,
    customerReference: string | null,
    quoteUrl?: string
  ) => Promise<string | void>;
  onEmailPDFQuote?: (
    firstName: string,
    lastName: string,
    email: string,
    quoteName: string,
    customerReference: string | null,
    pdfBase64: string,
    quoteUrl?: string,
    savedQuoteId?: string,
    savedQuoteReference?: string,
    pricingLockedUntil?: string,
  ) => Promise<boolean>;
  onSaveComplete?: () => void;
  onCustomerDetailsCaptured?: (details: { firstName: string; lastName: string; email: string; quoteReference?: string }) => void;
  getCanvasImageUrl?: () => Promise<string | null>;
}

export function UnifiedSaveModal({
  isOpen,
  onClose,
  config,
  calculations,
  currentStep,
  totalSteps = 7,
  shouldShowEmailOption = false,
  pricingSnapshot,
  onGeneratePDFWithDetails,
  onEmailPDFQuote,
  onSaveComplete,
  onCustomerDetailsCaptured,
  getCanvasImageUrl,
}: UnifiedSaveModalProps) {
  const isEmailMode = shouldShowEmailOption;
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
    customerReference: string | null;
    url: string;
    pricingLockedUntil: string;
    accessToken: string;
  } | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [saveEmailSent, setSaveEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const [defaultQuoteName, setDefaultQuoteName] = useState('');
  const [modalOpenTime, setModalOpenTime] = useState<number>(Date.now());

  useEffect(() => {
    if (isOpen) {
      const openTime = Date.now();
      setModalOpenTime(openTime);
      const generatedName = generateDefaultQuoteName(config, calculations);
      setDefaultQuoteName(generatedName);

      const isMobile = window.innerWidth < 1024;
      analytics.quoteSaveModalOpened({
        source: 'unified_save_button',
        device_type: isMobile ? 'mobile' : 'desktop',
        total_price: calculations.totalPrice,
        currency: config.currency,
        corners: config.corners,
        fabric_type: config.fabricType,
      });

      analytics.quoteSaveMethodSelected({
        method: shouldShowEmailOption ? 'email_pdf_quote' : 'save_progress',
        total_price: calculations.totalPrice,
        currency: config.currency,
        time_to_select_seconds: 0,
      });
    }
  }, [isOpen, calculations.totalPrice, config.currency, config.corners, config.fabricType, shouldShowEmailOption]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  if (!isOpen) return null;

  const isFormValid = () => {
    return firstName.trim() !== '' &&
           lastName.trim() !== '' &&
           email.trim() !== '' &&
           email.includes('@') &&
           (quoteName.trim() !== '' || defaultQuoteName !== '');
  };

  const handleSaveProgress = async () => {
    console.log('Initiating save progress...');
    setIsSubmitting(true);
    try {
      const finalQuoteName = quoteName.trim() ? sanitizeQuoteName(quoteName) : undefined;
      const sanitizedReference = customerReference.trim() ? sanitizeCustomerReference(customerReference) : undefined;

      let capturedCanvasUrl: string | null = null;
      if (getCanvasImageUrl) {
        try {
          capturedCanvasUrl = await getCanvasImageUrl();
        } catch (err) {
          console.warn('Canvas capture failed, continuing without diagram:', err);
        }
      }

      const result = await saveQuote(
        config,
        calculations,
        email,
        finalQuoteName,
        sanitizedReference,
        currentStep,
        totalSteps,
        pricingSnapshot,
        firstName.trim(),
        lastName.trim(),
        capturedCanvasUrl
      );

      console.log('Save quote result:', result);

      const quoteUrl = generateQuoteUrl(result.id, result.accessToken);
      const modalDuration = (Date.now() - modalOpenTime) / 1000;
      const emailDomain = email ? email.split('@')[1] : null;

      addQuoteToken(
        result.id,
        result.accessToken,
        result.quoteName,
        result.reference,
        result.expiresAt,
        email,
        result.pricingLockedUntil
      );

      setSavedQuote({
        id: result.id,
        reference: result.reference,
        quoteName: result.quoteName,
        customerReference: result.customerReference || null,
        url: quoteUrl,
        pricingLockedUntil: result.pricingLockedUntil,
        accessToken: result.accessToken,
      });

      if (email) {
        try {
          const emailResponse = await fetch(
            '/apps/shade_space/api/v1/public/quote-save-email',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: email.trim(),
                quoteReference: result.reference,
                quoteUrl,
                quoteName: result.quoteName,
                quoteId: result.id,
                expiresAt: result.pricingLockedUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                pricingLockedUntil: result.pricingLockedUntil || null,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
              }),
            }
          );
          if (!emailResponse.ok) {
            const rawText = await emailResponse.text();
            console.warn('Save progress email HTTP error:', emailResponse.status, rawText.substring(0, 500));
            setSaveEmailSent(false);
          } else {
            const emailData = await emailResponse.json();
            setSaveEmailSent(!!emailData.success);
            if (emailData.success) {
              analytics.saveProgressEmailSent({
                email_domain: email.split('@')[1] || 'unknown',
                quote_reference: result.reference,
                total_price: calculations.totalPrice,
                currency: config.currency,
              });
            } else {
              console.warn('Save progress confirmation email failed:', emailData.error);
            }
          }
        } catch (emailError) {
          console.error('Error sending save progress email:', emailError);
          setSaveEmailSent(false);
        }
      }

      analytics.quoteSaveSuccess({
        quote_reference: result.reference,
        quote_name: result.quoteName,
        has_custom_name: !result.nameAutoGenerated,
        has_customer_reference: !!result.customerReference,
        save_method: 'save_progress',
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


      onCustomerDetailsCaptured?.({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        quoteReference: result.reference,
      });

      setModalStep('success');
      onSaveComplete?.();
    } catch (error: any) {
      console.error('Failed to save quote:', error);
      analytics.quoteSaveFailed({
        error_message: error?.message || 'Unknown error',
        error_type: error?.name || 'SaveError',
        save_method: 'save_progress',
        total_price: calculations.totalPrice,
        currency: config.currency,
      });
      showToast('Failed to save quote. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailPDFQuote = async () => {
    setIsSubmitting(true);
    try {
      const finalQuoteName = quoteName.trim() ? sanitizeQuoteName(quoteName) : defaultQuoteName;
      const sanitizedReference = customerReference.trim() ? sanitizeCustomerReference(customerReference) : null;

      let capturedCanvasUrl: string | null = null;
      if (getCanvasImageUrl) {
        try {
          capturedCanvasUrl = await getCanvasImageUrl();
        } catch (err) {
          console.warn('Canvas capture failed, continuing without diagram:', err);
        }
      }

      const result = await saveQuote(
        config,
        calculations,
        email.trim(),
        finalQuoteName,
        sanitizedReference || undefined,
        currentStep,
        totalSteps,
        pricingSnapshot,
        firstName.trim(),
        lastName.trim(),
        capturedCanvasUrl
      );

      const quoteUrl = generateQuoteUrl(result.id, result.accessToken);
      const savedRef = result.reference;

      addQuoteToken(
        result.id,
        result.accessToken,
        result.quoteName,
        result.reference,
        result.expiresAt,
        email.trim(),
        result.pricingLockedUntil
      );

      setSavedQuote({
        id: result.id,
        reference: result.reference,
        quoteName: result.quoteName,
        customerReference: result.customerReference || null,
        url: quoteUrl,
        pricingLockedUntil: result.pricingLockedUntil,
        accessToken: result.accessToken,
      });

      if (!quoteUrl) {
        throw new Error('Failed to generate quote URL');
      }

      if (onGeneratePDFWithDetails && onEmailPDFQuote) {
        const pdfBase64 = await onGeneratePDFWithDetails(
          firstName.trim(),
          lastName.trim(),
          email.trim(),
          finalQuoteName,
          sanitizedReference,
          quoteUrl
        );

        if (pdfBase64) {
          const success = await onEmailPDFQuote(
            firstName.trim(),
            lastName.trim(),
            email.trim(),
            finalQuoteName,
            sanitizedReference,
            pdfBase64,
            quoteUrl,
            result.id,
            result.reference,
            result.pricingLockedUntil,
          );

          if (success) {
            onCustomerDetailsCaptured?.({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim(),
              quoteReference: savedRef,
            });

            setEmailSent(true);
            setModalStep('success');
            showToast('PDF sent to your email!', 'success');

            analytics.quoteSaveSuccess({
              quote_reference: savedRef,
              quote_name: finalQuoteName,
              has_custom_name: !!quoteName.trim(),
              has_customer_reference: !!sanitizedReference,
              save_method: 'email_pdf_quote',
              email_domain: email.split('@')[1],
              total_price: calculations.totalPrice,
              currency: config.currency,
              corners: config.corners,
              fabric_type: config.fabricType,
              edge_type: config.edgeType,
              hardware_included: config.measurementOption === 'adjust',
              area_sqm: calculations.area,
              perimeter_m: calculations.perimeter,
              modal_duration_seconds: (Date.now() - modalOpenTime) / 1000,
              has_shopify_customer: !!result.shopifyCustomerId,
              shopify_customer_id: result.shopifyCustomerId || null,
            });
          } else {
            throw new Error('Failed to send email');
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to email PDF quote:', error);
      analytics.quoteSaveFailed({
        error_message: error?.message || 'Unknown error',
        error_type: error?.name || 'EmailError',
        save_method: 'email_pdf_quote',
        total_price: calculations.totalPrice,
        currency: config.currency,
      });
      showToast('Failed to send email. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    if (isEmailMode) {
      await handleEmailPDFQuote();
    } else {
      await handleSaveProgress();
    }
  };

  const handleCopyLink = () => {
    if (savedQuote) {
      try {
        navigator.clipboard.writeText(savedQuote.url);
        setCopied(true);
        showToast('Link copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 3000);
      } catch (error) {
        console.error('Failed to copy link:', error);
      }
    }
  };

  const handleClose = () => {
    if (modalStep !== 'success') {
      const modalDuration = (Date.now() - modalOpenTime) / 1000;
      analytics.quoteSaveModalCancelled({
        modal_duration_seconds: modalDuration,
        had_selected_method: true,
        had_entered_email: !!email,
      });
    }

    setModalStep('form');
    setFirstName('');
    setLastName('');
    setEmail('');
    setQuoteName('');
    setCustomerReference('');
    setSavedQuote(null);
    setEmailSent(false);
    setSaveEmailSent(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overscroll-contain" onClick={handleClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overscroll-contain" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 pb-0">
          <div />
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {modalStep === 'form' && (
            <>
              <h3 className="text-2xl font-bold text-[#01312D] mb-2">
                {isEmailMode ? 'Save & Email PDF' : 'Save Your Progress'}
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                {isEmailMode
                  ? 'Enter your details to save your configuration and receive a detailed PDF via email.'
                  : 'Enter your details to save your configuration. You can return anytime to continue.'}
              </p>

              {isEmailMode && (
                <div className="flex items-start gap-2 bg-[#BFF102]/10 border border-[#BFF102]/40 rounded-lg p-3 mb-5">
                  <svg className="w-5 h-5 text-[#307C31] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-[#01312D]">
                    A detailed PDF with your specifications, pricing, and a link to resume will be emailed to you.
                  </p>
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Smith"
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">By saving, you'll receive helpful updates about your shade sail configuration. Unsubscribe any time from the link in the email.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Shade Sail Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={quoteName}
                    onChange={(e) => setQuoteName(e.target.value)}
                    placeholder="e.g., Smith Family Patio, Backyard Project"
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
                    placeholder="e.g., Invoice #1234, Project B"
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

            </>
          )}

          {modalStep === 'success' && savedQuote && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#BFF102] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#01312D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-[#01312D] mb-2">
                  {emailSent ? 'Configuration Saved & PDF Sent!' : 'Progress Saved!'}
                </h3>
                <p className="text-sm text-slate-600">
                  {emailSent
                    ? 'Your configuration has been saved and a detailed PDF has been sent to your email.'
                    : 'Your configuration has been saved successfully. You can return anytime to continue.'}
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-[#BFF102]/20 border-2 border-[#BFF102] rounded-lg p-4">
                  <div className="text-xs font-medium text-[#307C31] mb-1">
                    Configuration Name
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
                    Price Locked Until
                  </div>
                  <div className="text-sm font-semibold text-[#01312D]">
                    {formatDate(savedQuote.pricingLockedUntil)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Your link never expires. After this date, live pricing applies.
                  </p>
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

                {emailSent ? (
                  <>
                    <div className="bg-[#BFF102]/10 border border-[#307C31]/30 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-[#307C31] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-[#01312D]">
                          We've sent your PDF to <strong>{email}</strong>. Please check your inbox (and spam folder if needed).
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-[#01312D] mb-2">Your PDF includes:</h4>
                      <ul className="text-xs text-slate-600 space-y-1">
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#307C31]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Complete configuration summary
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#307C31]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          All measurements and specifications
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#307C31]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Shade sail preview diagram
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#307C31]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Pricing and warranty details
                        </li>
                      </ul>
                    </div>
                  </>
                ) : saveEmailSent ? (
                  <div className="bg-[#BFF102]/10 border border-[#307C31]/30 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-[#307C31] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-[#01312D]">
                        We've sent an email to <strong>{email}</strong> with your configuration details and access link.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-slate-700">
                        Your configuration has been saved. Copy the link above to return to it anytime.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-white rounded-b-xl flex-shrink-0">
          {modalStep === 'success' ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleClose}
              className="w-full"
            >
              Done
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                className="w-full"
                disabled={isSubmitting || !isFormValid()}
              >
                {isSubmitting
                  ? (isEmailMode ? 'Saving & Sending...' : 'Saving...')
                  : (isEmailMode ? 'Save & Email' : 'Save Progress')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
