import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { PriceSummaryDisplay } from './PriceSummaryDisplay';
import { AccordionStep } from './AccordionStep';
import { FabricSelectionContent } from './steps/FabricSelectionContent';
import { EdgeTypeContent } from './steps/EdgeTypeContent';
import { CornersContent } from './steps/CornersContent';
import { CombinedMeasurementContent } from './steps/CombinedMeasurementContent';
import { DimensionsContent } from './steps/DimensionsContent';
import { HardwareContent } from './steps/HardwareContent';
import { ReviewContent } from './steps/ReviewContent';
import { useShadeCalculations } from '../hooks/useShadeCalculations';
import { useHardwareCatalog } from '../hooks/useHardwareCatalog';
import { usePricingSettings } from '../hooks/usePricingSettings';
import { useBasePricing } from '../hooks/useBasePricing';
import { useMobileGuidance } from '../hooks/useMobileGuidance';
import { ConfiguratorState, EdgeType } from '../types';
import { useFabricCatalog } from '../hooks/useFabricCatalog';
import { Point } from '../types';
import { validateMeasurements, validateHeights, getDiagonalKeysForCorners, formatDualMeasurement, getDualMeasurementValues, canReconstructShape, reconstructPolygonFromMeasurements, formatMeasurement, formatArea, getHeightRequirement, areHeightsProvided, isHeightRequiredForCheckout, getShapeAccuracy } from '../utils/geometry';
import { generatePdfFromBlocks, CustomerDetails } from '../utils/pdfGenerator';
import { loadActivePdfTemplate } from '../utils/activePdfTemplate';
import { ShapeCanvas } from './ShapeCanvas';
import { EXCHANGE_RATES } from '../data/pricing';
import { getShopifyDisplayCurrency } from '../utils/currencyDetection';
import { alignStorefrontToCurrency, cartCurrencyMismatches, clearCart } from '../utils/currencySync';

import { useToast } from "../components/ui/ToastProvider";
import { LoadingOverlay } from './ui/loader';
import { UnifiedSaveModal } from './UnifiedSaveModal';
import { AdminSaveQuoteModal } from './admin/AdminSaveQuoteModal';
import { ShapeModeToggle } from './ui/ShapeModeToggle';
import { getQuoteFromUrl, getQuoteById, updateQuoteStatus, markQuoteConverted, saveQuoteForCheckout, QuoteData } from '../utils/quoteManager';
import { generateDefaultQuoteName } from '../utils/quoteNaming';
import { PricingSetting } from '../hooks/usePricingSettings';
import { addQuoteToken } from '../utils/tokenManager';
import { analytics } from '../utils/analytics';
import { eventTrackers } from '../utils/eventTracker';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';
import { uploadToQuoteAssets } from '../utils/storageUpload';
import { renderSailPngBlob } from '../utils/renderSvgOffscreen';
import { Box, Layers } from 'lucide-react';
import { canRender3D, Device3DTier, supports3DForCorners } from '../utils/canRender3D';
import type { AdminProfile } from '../hooks/useAdminProfile';

const ShadeSail3DViewer = lazy(() => import('./ShadeSail3DViewer'));

export interface ShadeConfiguratorProps {
  adminMode?: boolean;
  adminProfile?: AdminProfile | null;
  onAdminSaveComplete?: (quoteId: string, accessToken: string, reference: string) => void;
  initialQuoteId?: string | null;
  initialQuoteToken?: string | null;
}

const INITIAL_STATE: ConfiguratorState = {
  step: 0,
  fabricType: '',
  fabricColor: '',
  edgeType: '' as EdgeType,
  corners: 0,
  unit: '' as 'metric' | 'imperial',
  measurementOption: '' as 'adjust' | 'exact',
  points: [
    { x: 100, y: 150 },
    { x: 500, y: 150 },
    { x: 500, y: 450 },
    { x: 100, y: 450 }
  ],
  measurements: {},
  fixingHeights: [],
  fixingTypes: undefined,
  attachmentTypes: [],
  eyeOrientations: undefined,
  fixingPointsInstalled: undefined,
  currency: 'USD',
  hasManuallyAdjustedShape: false
};

export function ShadeConfigurator({ adminMode = false, adminProfile, onAdminSaveComplete, initialQuoteId, initialQuoteToken }: ShadeConfiguratorProps = {}) {
  const [config, setConfig] = useState<ConfiguratorState>(INITIAL_STATE);
  const [openStep, setOpenStep] = useState<number>(0);
  const [desktopViewMode, setDesktopViewMode] = useState<'plan' | '3d'>('plan');
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [typoSuggestions, setTypoSuggestions] = useState<{ [key: string]: number }>({});
  const [dismissedTypoSuggestions, setDismissedTypoSuggestions] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' && window.innerWidth < 1024);
  const [device3DTier, setDevice3DTier] = useState<Device3DTier>(() => canRender3D());
  const [mobileViewMode, setMobileViewMode] = useState<'plan' | '3d'>('plan');
  // Once the user picks a view, stop auto-applying the 3D default (their choice sticks).
  const hasUserChosenView = useRef(false);
  const handleDesktopViewModeChange = (mode: 'plan' | '3d') => {
    hasUserChosenView.current = true;
    setDesktopViewMode(mode);
  };
  const handleMobileViewModeChange = (mode: 'plan' | '3d') => {
    hasUserChosenView.current = true;
    setMobileViewMode(mode);
  };
  const reviewContentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast();
  const [showUnifiedSaveModal, setShowUnifiedSaveModal] = useState(false);
  const [agreedToAcknowledgments, setAgreedToAcknowledgments] = useState(false);
  const [capturedCustomerDetails, setCapturedCustomerDetails] = useState<{
    firstName: string; lastName: string; email: string; quoteReference?: string;
  } | null>(null);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [loadingStep, setLoadingStep] = useState({
    text: 'Preparing your order...',
    progress: 0
  });

  const { fabrics: FABRICS } = useFabricCatalog();

  // Quote management state
  const [quoteReference, setQuoteReference] = useState<string | null>(null);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [savedAccessToken, setSavedAccessToken] = useState<string | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(() => !!getQuoteFromUrl());
  const [purchasedOrder, setPurchasedOrder] = useState<{ orderNumber: string | null; purchasedAt: string | null } | null>(null);
  const [redirectingForCurrency, setRedirectingForCurrency] = useState<{
    targetDomain?: string;
    targetCountry?: string;
  } | null>(null);
  const [loadedPricingSnapshot, setLoadedPricingSnapshot] = useState<Record<string, PricingSetting> | null>(null);
  const [lockedQuote, setLockedQuote] = useState<{
    total: number;
    currency: string;
    baseNzd: number | null;
    fxRate: number | null;
    marketMarkup: number | null;
    zonosDhlMarkup: number | null;
    quoteId: string;
    quoteReference: string;
    lockedAt: string | null;
  } | null>(null);

  // Highlighted measurement state for sticky diagram
  const [highlightedMeasurement, setHighlightedMeasurement] = useState<string | null>(null);

  // Highlighted corner state for height input fields
  const [highlightedCorner, setHighlightedCorner] = useState<number | null>(null);

  // State to track if user wants to navigate to heights section specifically
  const [navigateToHeights, setNavigateToHeights] = useState(false);

  // Track whether heights sub-section is open (for 3D viewer section awareness)
  const [isHeightsSectionOpen, setIsHeightsSectionOpen] = useState(false);

  // Auto-add-to-cart when arriving from My Designs page with action param
  const [pendingAutoAddToCart, setPendingAutoAddToCart] = useState(false);

  // State to track if user wants to navigate to diagonals section specifically
  const [navigateToDiagonals, setNavigateToDiagonals] = useState(false);

  // Add a ref to track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Canvas ref for PDF generation
  const canvasRef = useRef<any>(null);
  // 3D viewer ref for screenshot capture
  const viewer3DRef = useRef<{ capture3DScreenshot: () => Promise<string | null> }>(null);

  const { settingsMap: pricingSettingsMap } = usePricingSettings();
  const { data: basePricingData } = useBasePricing();
  const { packs: hardwarePacks, items: hardwareItems } = useHardwareCatalog();
  const activePricingMap = loadedPricingSnapshot || pricingSettingsMap;
  const lockedOverride = useMemo(
    () =>
      lockedQuote && lockedQuote.currency === config.currency
        ? { total: lockedQuote.total, currency: lockedQuote.currency, baseNzd: lockedQuote.baseNzd ?? null }
        : null,
    [lockedQuote, config.currency]
  );
  const calculations = useShadeCalculations(
    config,
    activePricingMap,
    basePricingData,
    hardwarePacks,
    hardwareItems,
    lockedOverride
  );

  // Mobile guidance hook
  const mobileGuidance = useMobileGuidance({
    isMobile,
    currentStep: openStep,
  });

  // Mobile detection effect
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      setDevice3DTier(canRender3D());
    };

    // Initial check
    checkIsMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile);

    // Cleanup function to remove event listener
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  // Default the measurement guide to 3D for 3/4-corner sails, and force Plan for
  // 5+ corners (where 3D is temporarily unavailable). A manual toggle sticks.
  useEffect(() => {
    if (!supports3DForCorners(config.corners)) {
      setDesktopViewMode('plan');
      setMobileViewMode('plan');
    } else if (!hasUserChosenView.current) {
      setDesktopViewMode('3d');
      setMobileViewMode('plan');
    }
  }, [config.corners, device3DTier]);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cancel any pending operations if needed
      if (loading) {
        setLoading(false);
        setShowLoadingOverlay(false);
      }
    };
  }, [loading]);

  // Default fabric selection for desktop only, mobile has no preselection
  useEffect(() => {
    const hasNoFabricSelected = !config.fabricType;
    const isInitialLoad = config.step === 0 && !quoteReference;

    // Only preselect on initial load, when no quote is being loaded, and no fabric is selected
    if (hasNoFabricSelected && isInitialLoad && !isLoadingQuote) {
      if (!isMobile && FABRICS.length > 0) {
        const preferred = FABRICS.find(f => f.id === 'monotec370') ?? FABRICS[0];
        updateConfig({ fabricType: preferred.id });
      }
      // Mobile: explicitly ensure no fabric is preselected (already empty, but being explicit)
    }
  }, [isMobile, quoteReference, isLoadingQuote, FABRICS]);

  const applyPricingSnapshot = (
    quote: QuoteData
  ) => {
    const snapshot = quote.pricing_snapshot as Record<string, PricingSetting> | null;

    if (!snapshot || Object.keys(snapshot).length === 0) {
      return;
    }

    if (quote.pricing_status === 'locked') {
      setLoadedPricingSnapshot(snapshot);
      return;
    }

    const currency = quote.config_data.currency;
    const snapshotEntry = snapshot[currency];
    const liveEntry = pricingSettingsMap[currency];

    if (snapshotEntry && liveEntry) {
      const snapshotFactor = snapshotEntry.market_markup * snapshotEntry.zonos_dhl_markup * snapshotEntry.exchange_rate;
      const liveFactor = liveEntry.market_markup * liveEntry.zonos_dhl_markup * liveEntry.exchange_rate;

      if (Math.abs(snapshotFactor - liveFactor) > 0.001) {
        showToast(
          'Pricing has been updated since this quote was saved. The price shown reflects current rates.',
          'info'
        );
      }
    }
  };

  // Load saved quote from URL if present
  useEffect(() => {
    const loadQuoteFromUrl = async () => {
      const quoteData = getQuoteFromUrl();
      if (!quoteData) return;

      setIsLoadingQuote(true);

      // Track load attempt
      analytics.quoteLoadAttempted({
        quote_id: quoteData.id,
        source: 'url_parameter',
      });

      try {
        const quote = await getQuoteById(quoteData.id, quoteData.token);

        addQuoteToken(
          quote.id,
          quoteData.token,
          quote.quote_name,
          quote.quote_reference,
          quote.expires_at,
          quote.customer_email || undefined,
          quote.pricing_locked_until
        );

        const createdAt = new Date(quote.created_at);
        const quoteAgeHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

        // Align the Shopify storefront BEFORE we paint any prices so we never
        // render the quote currency on a storefront that is still on a different one.
        const quoteCurrency = quote.config_data?.currency;
        if (quoteCurrency) {
          const alignment = await alignStorefrontToCurrency(quoteCurrency, {
            quoteId: quote.id,
            triggeredBy: 'quote_load',
          });
          if (alignment.status === 'redirecting') {
            setRedirectingForCurrency({ targetDomain: alignment.targetDomain });
            return;
          }
          if (alignment.status === 'switching') {
            setRedirectingForCurrency({ targetCountry: alignment.targetCountry });
            return;
          }
        }

        setConfig(quote.config_data);
        setQuoteReference(quote.quote_reference);
        setSavedQuoteId(quoteData.id);
        setSavedAccessToken(quoteData.token);

        // Restore the locked total verbatim if we are within the lock window.
        // This bypasses the pricing engine so Market / FX / markup never reruns.
        if (
          quote.pricing_status === 'locked' &&
          typeof quote.locked_total === 'number' &&
          quote.locked_total > 0 &&
          quote.locked_total_currency
        ) {
          setLockedQuote({
            total: quote.locked_total,
            currency: quote.locked_total_currency,
            baseNzd: quote.locked_total_base_nzd ?? null,
            fxRate: quote.locked_fx_rate ?? null,
            marketMarkup: quote.locked_market_markup ?? null,
            zonosDhlMarkup: quote.locked_zonos_dhl_markup ?? null,
            quoteId: quote.id,
            quoteReference: quote.quote_reference,
            lockedAt: quote.locked_at ?? null,
          });
        }

        applyPricingSnapshot(quote);

        const reviewStep = steps.length - 1;
        const isFinishedQuote = quote.status === 'quote_ready' || quote.status === 'purchased';
        const resumeStep = isFinishedQuote
          ? reviewStep
          : Math.min(Math.max(quote.current_step ?? 4, 0), reviewStep);
        setOpenStep(resumeStep);

        analytics.quoteLoadSuccess({
          quote_reference: quote.quote_reference,
          quote_age_hours: quoteAgeHours,
          landing_step: resumeStep,
          had_email: !!quote.customer_email,
          total_price: quote.calculations_data.totalPrice,
          currency: quote.config_data.currency,
        });

        // Check if user arrived with action=add-to-cart from My Designs page
        const urlAction = new URLSearchParams(window.location.search).get('action');
        if (urlAction === 'add-to-cart' && quote.status === 'quote_ready') {
          setPendingAutoAddToCart(true);
        }

        if (quote.status === 'purchased') {
          setPurchasedOrder({
            orderNumber: quote.shopify_order_number || null,
            purchasedAt: quote.purchased_at || null,
          });
        }

        const statusMessage = quote.status === 'purchased'
          ? `Quote ${quote.quote_reference} loaded — this design has been ordered${quote.shopify_order_number ? ` (${quote.shopify_order_number})` : ''}.`
          : quote.status === 'quote_ready'
          ? `Quote ${quote.quote_reference} loaded successfully!`
          : `Configuration ${quote.quote_reference} loaded. Continue where you left off!`;
        showToast(statusMessage, quote.status === 'purchased' ? 'info' : 'success');
      } catch (error: any) {
        console.error('Failed to load quote:', error);

        analytics.quoteLoadFailed({
          quote_id: quoteData.id,
          error_message: error?.message || 'Unknown error',
          error_type: error?.name || 'LoadError',
        });

        showToast(
          'Failed to load quote. It may have been deleted, or you may not have access.',
          'error'
        );
      } finally {
        setIsLoadingQuote(false);
      }
    };

    loadQuoteFromUrl();
  }, []);

  // Admin mode: load quote from props instead of URL
  useEffect(() => {
    if (!adminMode || !initialQuoteId || !initialQuoteToken) return;

    const loadAdminQuote = async () => {
      setIsLoadingQuote(true);
      try {
        const quote = await getQuoteById(initialQuoteId, initialQuoteToken);
        setConfig(quote.config_data);
        setQuoteReference(quote.quote_reference);
        setSavedQuoteId(initialQuoteId);
        setSavedAccessToken(initialQuoteToken);

        if (
          quote.pricing_status === 'locked' &&
          typeof quote.locked_total === 'number' &&
          quote.locked_total > 0 &&
          quote.locked_total_currency
        ) {
          setLockedQuote({
            total: quote.locked_total,
            currency: quote.locked_total_currency,
            baseNzd: quote.locked_total_base_nzd ?? null,
            fxRate: quote.locked_fx_rate ?? null,
            marketMarkup: quote.locked_market_markup ?? null,
            zonosDhlMarkup: quote.locked_zonos_dhl_markup ?? null,
            quoteId: quote.id,
            quoteReference: quote.quote_reference,
            lockedAt: quote.locked_at ?? null,
          });
        }

        applyPricingSnapshot(quote);
        const reviewStep = steps.length - 1;
        const resumeStep = Math.min(Math.max(quote.current_step ?? reviewStep, 0), reviewStep);
        setOpenStep(resumeStep);
      } catch (err) {
        console.error('Failed to load quote for admin:', err);
      } finally {
        setIsLoadingQuote(false);
      }
    };

    loadAdminQuote();
  }, [adminMode, initialQuoteId, initialQuoteToken]);


  useEffect(() => {
    if (isLoadingQuote || quoteReference) return;

    const shopifyCurrency = getShopifyDisplayCurrency();
    setConfig(prev =>
      prev.currency === shopifyCurrency ? prev : { ...prev, currency: shopifyCurrency }
    );
  }, [isLoadingQuote, quoteReference]);

  useEffect(() => {
    if (adminMode) return;
    if (!pendingAutoAddToCart || isLoadingQuote || !quoteReference) return;
    setPendingAutoAddToCart(false);
    const timer = setTimeout(() => {
      handleAddToCartFromConfigurator();
    }, 500);
    return () => clearTimeout(timer);
  }, [pendingAutoAddToCart, isLoadingQuote, quoteReference, adminMode]);

  const updateConfig = (updates: Partial<ConfiguratorState>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const dismissTypoSuggestion = (fieldKey: string) => {
    const newSuggestions = { ...typoSuggestions };
    delete newSuggestions[fieldKey];
    setTypoSuggestions(newSuggestions);

    const newDismissed = new Set(dismissedTypoSuggestions);
    newDismissed.add(fieldKey);
    setDismissedTypoSuggestions(newDismissed);
  };

  const selectedFabric = FABRICS.find(f => f.id === config.fabricType);

  const handleGeneratePDFWithDetails = async (
    firstName: string,
    lastName: string,
    email: string,
    quoteName: string,
    customerReference: string | null,
    quoteUrl?: string
  ): Promise<string | void> => {
    try {
      let threeDImageDataUrl: string | undefined;
      try {
        const screenshot = await viewer3DRef.current?.capture3DScreenshot();
        if (screenshot) threeDImageDataUrl = screenshot;
      } catch { /* 3D capture is optional */ }

      const customerDetails: CustomerDetails = {
        firstName,
        lastName,
        email,
        quoteName,
        customerReference,
        quoteUrl
      };

      const template = await loadActivePdfTemplate();
      const pdf = await generatePdfFromBlocks(config, calculations, template.blocks, {
        layout: template.layout,
        chrome: template.chrome,
        customer: customerDetails,
        threeDImageDataUrl,
        isEmailSummary: true,
      });

      // Track PDF generation event
      const quoteParams = getQuoteFromUrl();
      eventTrackers.pdfDownload(
        quoteReference || (quoteParams?.id || null),
        email,
        calculations.totalPrice,
        config.currency
      );

      return pdf;
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      if (error instanceof Error) {
        console.error('❌ Error stack:', error.stack);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(`Failed to generate PDF: ${errorMessage}`, 'error');
      return undefined;
    }
  };


  // ============ ENHANCED DEBUGGING FOR UPLOAD FUNCTION ============
  const uploadImageToShopify = async (file: File | Blob, filename: string): Promise<string | null> => {
    try {
      console.log('📤 uploadImageToShopify called with:', {
        filename,
        fileType: file.type,
        fileSize: file.size,
        isFile: file instanceof File,
        isBlob: file instanceof Blob
      });

      // Ensure we have a proper File object
      let fileToUpload: File;

      if (file instanceof Blob && !(file instanceof File)) {
        // Convert Blob to File
        console.log('Converting Blob to File...');
        fileToUpload = new File([file], filename, {
          type: file.type || 'application/octet-stream'
        });
        console.log('Converted to File:', {
          name: fileToUpload.name,
          type: fileToUpload.type,
          size: fileToUpload.size
        });
      } else {
        fileToUpload = file as File;
        console.log('Already a File:', {
          name: fileToUpload.name,
          type: fileToUpload.type,
          size: fileToUpload.size
        });
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);

      console.log('Sending request to upload API...');
      const response = await fetch('/apps/shade_space/api/v1/public/file/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Upload API response status:', response.status, response.statusText);

      if (!response.ok) {
        console.error('❌ Upload failed with status:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Failed to upload file to Shopify: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📥 Upload API response:', result);

      if (result.success && result.url) {
        console.log(`✅ File uploaded successfully: ${filename} - URL: ${result.url}`);
        return result.url;
      } else {
        console.error('❌ Shopify upload failed:', result.error || 'Unknown error');
        console.error('❌ Full result:', result);
        return null;
      }
    } catch (error) {
      console.error('❌ Error uploading file to Shopify:', error);
      console.error('❌ Error details:', {
        message: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error),
        stack: typeof error === 'object' && error !== null && 'stack' in error ? (error as any).stack : '',
        name: typeof error === 'object' && error !== null && 'name' in error ? (error as any).name : ''
      });
      return null;
    }
  };

  const handleEmailPDFQuote = async (
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
  ): Promise<boolean> => {
    try {

      // Render the rich configurator diagram (ShadeSVGCore) so the stored
      // diagram matches the in-app quote PDF, emailed quote, and fulfilment PDF.
      let canvasImageUrl = null;
      let canvasImage3DUrl = null;

      try {
        const canvasImageBlob = await renderSailPngBlob(config, 800, 800);
        if (canvasImageBlob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `shade-sail-${config.corners}corner-${timestamp}.png`;
          canvasImageUrl = await uploadToQuoteAssets(canvasImageBlob, filename);
          if (!canvasImageUrl) {
            canvasImageUrl = await uploadImageToShopify(canvasImageBlob, filename);
          }
        }
      } catch (error) {
        console.error('Error processing canvas image:', error);
      }

      // Capture 3D screenshot
      try {
        const screenshot3D = await viewer3DRef.current?.capture3DScreenshot();
        if (screenshot3D) {
          const blob3D = await fetch(screenshot3D).then(r => r.blob());
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename3D = `shade-sail-3d-${config.corners}corner-${timestamp}.png`;
          canvasImage3DUrl = await uploadToQuoteAssets(blob3D, filename3D);
        }
      } catch { /* 3D capture is optional */ }

      const selectedFabricLocal = FABRICS.find(f => f.id === config.fabricType);
      const selectedColor = selectedFabricLocal?.colors.find(c => c.name === config.fabricColor);

      const edgeMeasurements: Record<string, { unit: string; formatted: string }> = {};
      for (let i = 0; i < config.corners; i++) {
        const nextIndex = (i + 1) % config.corners;
        const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
        const measurement = config.measurements[edgeKey];
        if (measurement && measurement > 0) {
          edgeMeasurements[edgeKey] = {
            unit: config.unit === 'imperial' ? 'inches' : 'millimeters',
            formatted: formatMeasurement(measurement, config.unit)
          };
        }
      }

      const diagonalKeys = getDiagonalKeysForCorners(config.corners);

      const diagonalMeasurementsObj: Record<string, { unit: string; formatted: string }> = {};
      diagonalKeys.forEach(key => {
        const measurement = config.measurements[key];
        if (measurement && measurement > 0) {
          diagonalMeasurementsObj[key] = {
            unit: config.unit === 'imperial' ? 'inches' : 'millimeters',
            formatted: formatMeasurement(measurement, config.unit)
          };
        }
      });

      const anchorPointMeasurements: Record<string, { unit: string; formatted: string }> = {};
      if (config.corners !== 3 && config.measurementOption === 'adjust' && config.heightsProvidedByUser && config.fixingHeights && config.fixingHeights.length > 0) {
        config.fixingHeights.forEach((height, index) => {
          if (height && height > 0) {
            const corner = String.fromCharCode(65 + index);
            anchorPointMeasurements[corner] = {
              unit: config.unit === 'imperial' ? 'inches' : 'millimeters',
              formatted: formatMeasurement(height, config.unit)
            };
          }
        });
      }

      const backendEdgeMeasurementsEmail: Record<string, string> = {};
      for (let i = 0; i < config.corners; i++) {
        const nextIndex = (i + 1) % config.corners;
        const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
        const measurement = config.measurements[edgeKey];
        if (measurement && measurement > 0) {
          backendEdgeMeasurementsEmail[edgeKey] = formatDualMeasurement(measurement, config.unit);
        }
      }

      const backendDiagonalMeasurementsEmail: Record<string, string> = {};
      diagonalKeys.forEach(key => {
        const measurement = config.measurements[key];
        if (measurement && measurement > 0) {
          backendDiagonalMeasurementsEmail[key] = formatDualMeasurement(measurement, config.unit);
        }
      });

      const backendAnchorMeasurementsEmail: Record<string, string> = {};
      if (config.corners !== 3 && config.measurementOption === 'adjust' && config.heightsProvidedByUser && config.fixingHeights && config.fixingHeights.length > 0) {
        config.fixingHeights.forEach((height, index) => {
          const corner = String.fromCharCode(65 + index);
          if (height && height > 0) {
            backendAnchorMeasurementsEmail[corner] = formatDualMeasurement(height, config.unit);
          }
        });
      }

      const orderData = {
        fabricType: config.fabricType,
        fabricColor: config.fabricColor,
        edgeType: config.edgeType,
        corners: config.corners,
        unit: config.unit,
        currency: config.currency,
        measurements: config.measurements,
        area: calculations.area,
        perimeter: calculations.perimeter,
        totalPrice: calculations.totalPrice.toFixed(2),
        selectedFabric: selectedFabricLocal,
        selectedColor,
        warranty: selectedFabricLocal?.warrantyYears || "",
        ...(config.corners !== 3 && config.measurementOption === 'adjust' && config.heightsProvidedByUser && {
          fixingHeights: config.fixingHeights,
          fixingTypes: config.fixingTypes,
        }),
        edgeMeasurements,
        diagonalMeasurementsObj,
        anchorPointMeasurements,
        Fabric_Type: selectedFabricLocal?.isFireRetardant && selectedColor && !selectedColor.isFireRetardant
          ? 'Not FR Certified'
          : selectedFabricLocal?.label,
        Shade_Factor: selectedColor?.shadeFactor,
        Edge_Type: config.edgeType === 'webbing' ? 'Webbing Reinforced' : 'Cabled Edge',
        Wire_Thickness: config.unit === 'imperial'
          ? calculations?.wireThickness !== undefined
            ? `${(calculations.wireThickness * 0.0393701).toFixed(2)}"`
            : 'N/A'
          : calculations?.wireThickness !== undefined
            ? `${calculations.wireThickness}mm`
            : 'N/A',
        Webbing_Edge_Width: config.unit === 'imperial'
          ? calculations?.webbingWidth !== undefined
            ? `${(calculations.webbingWidth * 0.0393701).toFixed(2)}"`
            : 'N/A'
          : calculations?.webbingWidth !== undefined
            ? `${calculations.webbingWidth}mm`
            : 'N/A',
        Area: formatArea(calculations.area * 1000000, config.unit),
        Perimeter: formatMeasurement(calculations.perimeter * 1000, config.unit),
        canvasImage: canvasImageUrl,
        canvasImage3D: canvasImage3DUrl,
        createdAt: new Date().toISOString(),
        backendEdgeMeasurements: backendEdgeMeasurementsEmail,
        backendDiagonalMeasurements: backendDiagonalMeasurementsEmail,
        backendAnchorMeasurements: backendAnchorMeasurementsEmail,
        originalUnit: config.unit,
        measurementOption: config.measurementOption,
        hardwareSelectionMode: config.hardwareSelectionMode ?? (config.measurementOption === 'adjust' ? 'standard' : 'none'),
        cornerHardware: config.cornerHardware,
        hardwareBreakdown: calculations.hardwareBreakdown,
        firstName,
        lastName,
        quoteName,
        customerReference,
        quoteReference: savedQuoteReference || quoteReference || undefined,
      };

      const effectiveQuoteId = savedQuoteId || null;
      const effectiveQuoteReference = savedQuoteReference || quoteReference || null;
      if (calculations.totalPrice == null || !config.currency) {
        console.warn('email-quote: missing price/currency before send', {
          totalPrice: calculations.totalPrice,
          currency: config.currency,
        });
      }
      const response = await fetch(
        '/apps/shade_space/send-config-email',
        {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdf: pdfBase64,
            ...orderData,
            email,
            firstName,
            lastName,
            quoteUrl,
            quoteId: effectiveQuoteId,
            quoteReference: effectiveQuoteReference,
            pricingLockedUntil: pricingLockedUntil || undefined,
            totalPrice: calculations.totalPrice,
            currency: config.currency,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        const emailDomain = email.split('@')[1] || 'unknown';

        if (data.emailSent !== false) {
          analytics.emailSummaryWithShopify({
            email_domain: emailDomain,
            includes_pdf: !!pdfBase64,
            includes_canvas: !!canvasImageUrl,
            total_price: calculations.totalPrice,
            currency: config.currency,
            shopify_customer_created: data.shopifyCustomerCreated || false,
            shopify_customer_id: data.shopifyCustomerId,
          });

          analytics.configEmailWithPdfSent({
            email_domain: emailDomain,
            includes_pdf: !!pdfBase64,
            includes_canvas: !!canvasImageUrl,
            total_price: calculations.totalPrice,
            currency: config.currency,
            quote_reference: quoteReference || '',
            shopify_customer_created: data.shopifyCustomerCreated || false,
            shopify_customer_id: data.shopifyCustomerId,
          });

          const quoteParams = getQuoteFromUrl();
          eventTrackers.emailSummary(
            quoteReference || (quoteParams?.id || null),
            email,
            calculations.totalPrice,
            config.currency,
            true
          );

          if (data.shopifyCustomerCreated && data.shopifyCustomerId) {
            analytics.shopifyCustomerCreated({
              customer_id: data.shopifyCustomerId,
              email_domain: emailDomain,
              source: 'email_pdf_quote',
              tags: ['quote_saved', 'email_pdf_quote_requested'],
              total_quote_value: calculations.totalPrice,
              currency: config.currency,
            });
          }
        }

        return true;
      } else {
        analytics.emailSendFailed({
          error_message: data.error || 'Unknown error',
          error_type: 'EmailSendError',
        });
        return false;
      }
    } catch (error: any) {
      console.error("Email send failed:", error);
      analytics.emailSendFailed({
        error_message: error?.message || 'Unknown error',
        error_type: error?.name || 'EmailSendError',
      });
      return false;
    }
  };

  const toggleAgreedToAcknowledgments = () => {
    setAgreedToAcknowledgments(prev => {
      const next = !prev;
      if (next) {
        void logAcknowledgmentConsent();
      }
      return next;
    });
  };

  const logAcknowledgmentConsent = async () => {
    try {
      await supabase.from('acknowledgment_consents').insert({
        quote_reference: quoteReference || '',
        agreed_at: new Date().toISOString(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent || '' : '',
        statements_version: 'v1-2026-05',
        statements_snapshot: [
          'I understand this shade sail is custom manufactured and cannot be returned or exchanged.',
          'I confirm all measurements provided are accurate and verified on-site.',
          'I acknowledge installation is not included and I am responsible for proper installation.',
          'I understand structural adequacy of fixing points is my responsibility.',
        ],
      });
    } catch {
      // best-effort audit log
    }
  };

  // Calculate derived state for order process
  const getDiagonalMeasurements = useMemo(() => {
    const keys = getDiagonalKeysForCorners(config.corners);
    return keys.map(key => ({
      key,
      hasValue: !!config.measurements[key]
    }));
  }, [config.corners, config.measurements]);

  const diagonalMeasurements = getDiagonalMeasurements;

  const allDiagonalsEntered = useMemo(() => {
    // If diagonals were initially provided in the Dimensions step, consider them as entered
    if (config.diagonalsInitiallyProvided) {
      return true;
    }

    // For corners that require diagonals, check if all required diagonal measurements are present
    if (config.corners >= 4) {
      const requiredDiagonals = getDiagonalKeysForCorners(config.corners);
      return requiredDiagonals.every(key =>
        config.measurements[key] && config.measurements[key] > 0
      );
    }

    // For 3 corners, no diagonals are required
    return true;
  }, [config.diagonalsInitiallyProvided, config.corners, config.measurements]);

  const allAcknowledgmentsChecked = agreedToAcknowledgments;

  // Check if heights are required and provided for 5+ corner sails
  const heightIsRequiredForCheckout = isHeightRequiredForCheckout(config.corners, config.measurementOption);
  const allHeightsProvided = areHeightsProvided(config.fixingHeights, config.corners);

  const canAddToCart = allDiagonalsEntered &&
    allAcknowledgmentsChecked &&
    (!heightIsRequiredForCheckout || allHeightsProvided);

  // Calculate if all edge measurements are complete
  const hasAllEdgeMeasurements = useMemo(() => {
    if (config.corners === 0) return false;
    let edgeCount = 0;
    for (let i = 0; i < config.corners; i++) {
      const nextIndex = (i + 1) % config.corners;
      const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
      if (config.measurements[edgeKey] && config.measurements[edgeKey] > 0) {
        edgeCount++;
      }
    }
    return edgeCount === config.corners;
  }, [config.corners, config.measurements]);

  const orderReadyFiredRef = useRef(false);

  useEffect(() => {
    if (orderReadyFiredRef.current) return;
    if (!config.corners || !config.fabricType || !hasAllEdgeMeasurements) return;

    const isReady = config.corners === 3
      ? hasAllEdgeMeasurements && openStep >= 6
      : allDiagonalsEntered;

    if (!isReady) return;

    orderReadyFiredRef.current = true;
    const diagonalKeys = config.corners >= 4 ? getDiagonalKeysForCorners(config.corners) : [];
    analytics.orderReady({
      corners: config.corners,
      fabric_type: config.fabricType,
      fabric_color: config.fabricColor,
      edge_type: config.edgeType,
      total_price: calculations.totalPrice,
      currency: config.currency,
      area_sqm: calculations.area,
      perimeter_m: calculations.perimeter,
      diagonal_count: diagonalKeys.length,
      measurement_unit: config.unit,
    });
  }, [allDiagonalsEntered, hasAllEdgeMeasurements, config.corners, openStep]);

  interface OrderData {
    fabricType: string;
    fabricColor: string;
    edgeType: string;
    corners: number;
    unit: 'metric' | 'imperial' | '';
    measurementOption: 'adjust' | 'exact' | '';
    hardware_included: 'Included' | 'Not Included';
    currency: string;
    measurements: Record<string, number>;
    points: Point[];
    fixingHeights: number[];
    fixingTypes?: string[];
    eyeOrientations?: string[];
    diagonalsInitiallyProvided?: boolean;
    area: number;
    perimeter: number;
    totalPrice: number;
    webbingWidth?: number;
    wireThickness?: number;
    selectedFabric: {
      id: string;
      label: string;
      weightPerSqm: number;
      uvProtection: string;
      warrantyYears: number;
      madeIn: string;
      detailedDescription: string;
      benefits: string[];
      bestFor: string[];
    };
    selectedColor: {
      name: string;
      shadeFactor: number;
      imageUrl?: string;
    };
    canvasImageUrl: string;
    canvasImage3DUrl?: string | null;
    warranty: string;
    Fabric_Type: string;
    Shade_Factor: string;
    Edge_Type: string;
    Wire_Thickness: string;
    Webbing_Edge_Width: string;
    Area: string;
    Perimeter: string;
    createdAt: string;
    [edgeKey: string]: string | number | boolean | object | undefined;
    backendEdgeMeasurements: Record<string, string>;
    backendDiagonalMeasurements: Record<string, string>;
    backendAnchorMeasurements: Record<string, string>;
    originalUnit: 'metric' | 'imperial';
  }

  // Helper function to wait with setTimeout
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Efficient variant availability check
  const isVariantAvailable = async (variantId: string | number): Promise<boolean> => {
    try {
      // Simple fetch to check variant
      const variantResponse = await fetch(`/variants/${variantId}.js`);
      if (variantResponse.ok) {
        const variant = await variantResponse.json();
        return variant.available === true;
      }
      return false;
    } catch (error) {
      console.log('Error checking variant availability:', error);
      return false;
    }
  };

  // Poll for variant with exponential backoff
  const waitForVariant = async (variantId: string | number): Promise<boolean> => {
    const maxAttempts = 10;
    const baseDelay = 800;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (!isMountedRef.current) return false;
      
      setLoadingStep({
        text: `Preparing product (attempt ${attempt}/${maxAttempts})...`,
        progress: 80 + (attempt * 2)
      });
      
      const isAvailable = await isVariantAvailable(variantId);
      
      if (isAvailable) {
        console.log(`✅ Variant available after ${attempt} attempt(s)`);
        return true;
      }
      
      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelay * Math.pow(1.3, attempt - 1), 3000);
        await wait(delay);
      }
    }
    
    return false;
  };

  const handleAddToCart = async (orderData: OrderData): Promise<void> => {
  console.log('🛒 DEBUG 2 - START handleAddToCartFromConfigurator:', {
    totalPrice: calculations.totalPrice,
    currency: config.currency,
    type: typeof calculations.totalPrice
  });
  
  console.log('Product being created. Add to cart');
  setShowLoadingOverlay(true);
  setLoadingStep({ text: 'Starting order process...', progress: 10 });
  setLoading(true);

  // Check if this is a converted quote
  const quoteParams = getQuoteFromUrl();
  let quoteData: any = null;

  if (quoteReference && quoteParams) {
    try {
      quoteData = await getQuoteById(quoteParams.id, quoteParams.token);
    } catch (error) {
      console.error('Failed to load quote data for conversion tracking:', error);
    }
  }

  // Auto-create a saved_quotes row if the user never explicitly saved.
  // This ensures the Shopify order webhook can match the order and backfill
  // the customer name from their shipping address for the fulfillment PDF.
  let autoSavedRef = quoteReference;
  if (!autoSavedRef) {
    try {
      setLoadingStep({ text: 'Preparing order details...', progress: 15 });
      const autoQuoteName = generateDefaultQuoteName(config, calculations);
      const autoResult = await saveQuoteForCheckout(
        config,
        calculations,
        autoQuoteName,
        pricingSettingsMap || null,
        orderData.canvasImageUrl || null,
        orderData.canvasImage3DUrl || null
      );
      autoSavedRef = autoResult.reference;
      setQuoteReference(autoResult.reference);
      console.log('Auto-saved quote for checkout:', autoResult.reference);
    } catch (autoSaveErr) {
      console.error('Auto-save for checkout failed (non-blocking):', autoSaveErr);
    }
  }

  const email: string | null = quoteData?.customer_email ?? capturedCustomerDetails?.email ?? null;

  try {
    setLoadingStep({ text: 'Creating your custom product...', progress: 30 });

    // PDF is generated on-demand via the serve-order-pdf edge function (permanent URL).
    // Technical drawing uses the permanent diagram_public_url stored during save.
    // No staged uploads needed -- those expire after a few hours.
    setLoadingStep({ text: 'Preparing order details...', progress: 40 });
    const technicalDrawingUrl = orderData.canvasImageUrl || null;

    // Format measurements for cart display
    const formatCartProperties = (measurements: any) => {
      const formatted: Record<string, string> = {};

      Object.keys(measurements).forEach(key => {
        if (measurements[key] && typeof measurements[key] === 'object' && measurements[key].formatted) {
          formatted[key] = measurements[key].formatted;
        }
      });

      return formatted;
    };

    const cartEdgeMeasurements = formatCartProperties(orderData.edgeMeasurements);
    const cartDiagonalMeasurements = formatCartProperties(orderData.diagonalMeasurementsObj);
    const cartAnchorMeasurements = formatCartProperties(orderData.anchorPointMeasurements);

    // Create backend-only dual measurement objects for Shopify admin
    const backendEdgeMeasurements: Record<string, string> = {};
    Object.keys(orderData.edgeMeasurements || {}).forEach(key => {
      const measurement = config.measurements[key];
      if (measurement && measurement > 0) {
        backendEdgeMeasurements[key] = formatDualMeasurement(measurement, config.unit);
      }
    });

    const backendDiagonalMeasurements: Record<string, string> = {};
    const diagonalKeys = getDiagonalKeysForCorners(config.corners);
    diagonalKeys.forEach(key => {
      const measurement = config.measurements[key];
      if (measurement && measurement > 0) {
        backendDiagonalMeasurements[key] = formatDualMeasurement(measurement, config.unit);
      }
    });

    // Only include backend anchor measurements if user provided them AND NOT a 3-corner sail AND measurementOption is 'adjust'
    const backendAnchorMeasurements: Record<string, string> = {};
    if (config.corners !== 3 && config.measurementOption === 'adjust' && config.heightsProvidedByUser && config.fixingHeights && config.fixingHeights.length > 0) {
      config.fixingHeights.forEach((height, index) => {
        const corner = String.fromCharCode(65 + index);
        if (height && height > 0) {
          backendAnchorMeasurements[corner] = formatDualMeasurement(height, config.unit);
        }
      });
    }

    // Format arrays for cart display
    const formatArrayForCart = (array: any[], label: string) => {
      if (!array || !Array.isArray(array)) return {};

      const result: Record<string, string> = {};
      array.forEach((item, index) => {
        const corner = String.fromCharCode(65 + index);
        result[`${label} ${corner}`] = typeof item === 'string' ? item : String(item);
      });
      return result;
    };

    // Only format cart fixing heights if user provided them AND NOT a 3-corner sail AND measurementOption is 'adjust'
    const cartFixingHeights = (config.corners !== 3 && config.measurementOption === 'adjust' && config.heightsProvidedByUser) ? formatArrayForCart(orderData.fixingHeights, 'Fixing Height') : {};
    const cartFixingTypes = (config.corners !== 3 && config.measurementOption === 'adjust' && config.heightsProvidedByUser) ? formatArrayForCart(orderData.fixingTypes ?? [], 'Fixing Type') : {};

    console.log('🌐 DEBUG 5 - SENDING TO BACKEND:', {
      totalPrice: orderData.totalPrice,
      currency: orderData.currency,
      type: typeof orderData.totalPrice,
      fullPayload: {
        totalPrice: orderData.totalPrice,
        currency: orderData.currency
      }
    });
    
    // If this is a locked quote being added to cart, the authoritative total comes
    // from the saved locked_total — never the recomputed value.
    const authoritativeTotal =
      lockedQuote && lockedQuote.currency === config.currency
        ? lockedQuote.total
        : (typeof orderData.totalPrice === 'number'
            ? orderData.totalPrice
            : Number(orderData.totalPrice));
    // Always use the selected Shopify currency if available, otherwise fallback
    let selectedCurrency = null;
    if (typeof window !== 'undefined' && (window as any)?.Shopify?.currency?.active) {
      selectedCurrency = ((window as any).Shopify.currency.active || '').toUpperCase();
    }
    const authoritativeCurrency = selectedCurrency || lockedQuote?.currency || orderData.currency || config.currency;
    // Derive NZD base from totalPrice/fxRate so Shopify Markets converts back correctly
    let authoritativeBaseNzd: number | null = lockedQuote?.fxRate
      ? Math.round((authoritativeTotal / lockedQuote.fxRate) * 100) / 100
      : null;
    if (!authoritativeBaseNzd && authoritativeCurrency !== 'NZD') {
      let fxRate = null;
      if (typeof window !== 'undefined' && (window as any)?.Shopify?.currency?.rate) {
        fxRate = parseFloat((window as any).Shopify.currency.rate);
      } else if (orderData.fxRate) {
        fxRate = parseFloat(String(orderData.fxRate));
      }
      if (fxRate && fxRate > 0 && typeof authoritativeTotal === 'number') {
        // Avoid price drift by rounding to 2 decimals
        authoritativeBaseNzd = Math.round((authoritativeTotal / fxRate) * 100) / 100;
      }
    }

    const response = await fetch('/apps/shade_space/api/v1/public/product/create', {
      method: 'POST',
      body: JSON.stringify({
        ...orderData,
        canvasImageUrl: technicalDrawingUrl,
        cartEdgeMeasurements,
        cartDiagonalMeasurements,
        cartAnchorMeasurements,
        cartFixingHeights,
        cartFixingTypes,
        backendEdgeMeasurements,
        backendDiagonalMeasurements,
        backendAnchorMeasurements,
        originalUnit: config.unit,
        fabricationType: config.measurementOption === 'adjust' ? 'fabricated_to_fit' : 'dimensions_provided',
        quoteReference: autoSavedRef || quoteReference || null,
        totalPrice: authoritativeTotal,
        currency: authoritativeCurrency, // Always send selected currency
        lockedTotal: lockedQuote?.total ?? null,
        lockedCurrency: lockedQuote?.currency ?? null,
        lockedBaseNzd: authoritativeBaseNzd,
        lockedFxRate: lockedQuote?.fxRate ?? null,
        lockedMarketMarkup: lockedQuote?.marketMarkup ?? null,
        lockedZonosDhlMarkup: lockedQuote?.zonosDhlMarkup ?? null,
        lockedQuoteId: lockedQuote?.quoteId ?? null,
        lockedQuoteReference: lockedQuote?.quoteReference ?? null,
        lockedAt: lockedQuote?.lockedAt ?? null,
      }),
    });

    const data = await response.json();
    const { success, product, error, fulfillmentProperties } = data;

    if (success && product) {
      console.log('Product created... Adding to cart');
      setLoadingStep({ text: 'Processing product details...', progress: 60 });

      const metafieldProperties: Record<string, string> = {};

      const allowedCartProperties = [
        'fabric_material',
        'fabric_color',
        'edge_type',
        'wire_thickness',
        'corners',
        'area',
        'perimeter'
      ];

      const edgeTypeValue = product.metafields.edges.find((e: any) => e.node.key.toLowerCase() === 'edge_type')?.node.value.toLowerCase();

      product.metafields.edges.forEach((edge: any) => {
        if (!allowedCartProperties.includes(edge.node.key)) return;

        if (edge.node.key === 'wire_thickness' && (edgeTypeValue === 'webbing' || edgeTypeValue === 'webbing reinforced')) {
          return;
        }

        const key = edge.node.key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        metafieldProperties[key] = edge.node.value;
      });

      metafieldProperties['Fabric Material'] = orderData.selectedFabric?.label || '';
      metafieldProperties['Fabric Color'] = orderData.selectedColor?.name || '';
      metafieldProperties['Edge Type'] = orderData.Edge_Type || 'Cabled Edge';

      if (orderData.Edge_Type !== 'Webbing Reinforced') {
        metafieldProperties['Wire Thickness'] = orderData.Wire_Thickness || 'N/A';
      }

      metafieldProperties['Corners'] = orderData.corners?.toString() || '4';
      metafieldProperties['Area'] = orderData.Area || '0 m²';
      metafieldProperties['Perimeter'] = orderData.Perimeter || '';

      {
        const mode = config.hardwareSelectionMode ?? (config.measurementOption === 'adjust' ? 'standard' : 'none');
        if (mode === 'standard') {
          metafieldProperties['Hardware Pack'] = 'Included';
        } else if (mode === 'none') {
          metafieldProperties['Hardware Pack'] = 'Not Included';
        }
      }

      Object.entries(cartEdgeMeasurements).forEach(([key, value]) => {
        metafieldProperties[`Edge ${key}`] = value;
      });
      Object.entries(cartDiagonalMeasurements).forEach(([key, value]) => {
        metafieldProperties[`Diagonal ${key}`] = value;
      });
      Object.entries(cartAnchorMeasurements).forEach(([key, value]) => {
        const cornerIndex = key.charCodeAt(0) - 65;
        const fixingType = orderData.fixingTypes?.[cornerIndex];
        const typeLabel = fixingType ? fixingType.charAt(0).toUpperCase() + fixingType.slice(1) : 'Not specified';
        metafieldProperties[`Anchor Height ${key}`] = `${value} (${typeLabel})`;
      });

        // ============ PDF URLs: Use dynamic serve-order-pdf endpoint ============
        // This generates the PDF on-demand with the latest customer details from the Shopify order
        const quoteRef = autoSavedRef || quoteReference || (metafieldProperties['_locked_quote_reference'] as string) || null;
        if (quoteRef) {
          const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-order-pdf?ref=${encodeURIComponent(quoteRef)}`;
          metafieldProperties['_quote_pdf_url'] = `${baseUrl}&type=quote`;
          metafieldProperties['_quote_pdf_filename'] = `shade-sail-quote-${quoteRef}.pdf`;
          metafieldProperties['_fulfilment_pdf_url'] = `${baseUrl}&type=fulfilment`;
          metafieldProperties['_fulfilment_pdf_filename'] = `shade-sail-fulfilment-${quoteRef}.pdf`;
          metafieldProperties['_pdf_generated_at'] = new Date().toISOString();
          console.log('✅ Added dynamic PDF URLs to line item properties (quote + fulfilment)');
        } else {
          console.log('❌ No quote reference available for PDF URL');
        }

        // Corner hardware line items
        {
          const mode = config.hardwareSelectionMode ?? (config.measurementOption === 'adjust' ? 'standard' : 'none');
          const label = mode === 'manual' ? 'Manual per corner' : mode === 'standard' ? 'Hardware Tensioning Kit' : 'No hardware';
          metafieldProperties['Hardware Selection'] = label;
          if (mode === 'manual' && config.cornerHardware) {
            for (let i = 0; i < config.corners; i++) {
              const lines = config.cornerHardware[i] || [];
              const letter = String.fromCharCode(65 + i);
              lines.forEach((line, lineIdx) => {
                const skuPart = line.sku ? ` (${line.sku})` : '';
                metafieldProperties[`Corner ${letter} Hardware ${lineIdx + 1}`] = `${line.qty}x ${line.name}${skuPart}`;
              });
            }
          }
        }

      // Authoritative locked-total properties so Shopify cart / Markets / cart-transforms
      // can anchor on a non-recomputed figure. `_locked_*` keys are hidden from the
      // customer; the visible "Quote Total" mirrors them for transparency.
      metafieldProperties['_locked_total'] = String(authoritativeTotal);
      metafieldProperties['_locked_currency'] = String(authoritativeCurrency);
      if (authoritativeBaseNzd != null) {
        metafieldProperties['_locked_base_nzd'] = String(authoritativeBaseNzd);
      }
      if (lockedQuote) {
        metafieldProperties['_locked_quote_id'] = lockedQuote.quoteId;
        metafieldProperties['_locked_quote_reference'] = lockedQuote.quoteReference;
        if (lockedQuote.fxRate != null) metafieldProperties['_locked_fx_rate'] = String(lockedQuote.fxRate);
        if (lockedQuote.marketMarkup != null) metafieldProperties['_locked_market_markup'] = String(lockedQuote.marketMarkup);
        if (lockedQuote.zonosDhlMarkup != null) metafieldProperties['_locked_zonos_dhl_markup'] = String(lockedQuote.zonosDhlMarkup);
        if (lockedQuote.lockedAt) metafieldProperties['_locked_at'] = lockedQuote.lockedAt;
        metafieldProperties['Quote Total'] = `${authoritativeCurrency} ${authoritativeTotal}`;
      }

      const fabricationTypeValue = config.measurementOption === 'adjust' ? 'fabricated_to_fit' : 'dimensions_provided';
      metafieldProperties['_fabrication_type'] = fabricationTypeValue;
      metafieldProperties['Fabrication Method'] = config.measurementOption === 'adjust'
        ? 'Manufactured to fit my space'
        : 'Custom dimensions provided by customer';
      console.log('✅ Added fabrication type:', fabricationTypeValue);

      if (technicalDrawingUrl && technicalDrawingUrl.startsWith('http') && !technicalDrawingUrl.includes('shopify-staged-uploads')) {
        metafieldProperties['_technical_drawing_url'] = technicalDrawingUrl;
        console.log('✅ Added technical drawing URL:', technicalDrawingUrl);
      }

      const gid = product?.variants?.edges?.[0]?.node?.id;
      if (gid) {
        const variantId = gid.split('/').pop();

        const properties: Record<string, string> = { ...metafieldProperties };

        if (fulfillmentProperties && typeof fulfillmentProperties === 'object') {
          Object.entries(fulfillmentProperties).forEach(([key, value]) => {
            if (key.startsWith('_')) {
              properties[key] = String(value);
            }
          });
        }

        console.log('📋 ALL PROPERTIES TO BE ADDED TO CART:');
        Object.entries(properties).forEach(([key, value]) => {
          console.log(`  ${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
        });

        const formData = {
          items: [{
            id: Number(variantId),
            quantity: 1,
            properties: properties
          }]
        };

        console.log('Add to cart in progress');
        console.log('Form data JSON:', JSON.stringify(formData, null, 2));

          const cartState = await cartCurrencyMismatches(config.currency);
          if (cartState.mismatch) {
            console.warn(
              `Cart currency ${cartState.cartCurrency} does not match quote currency ${config.currency}. Switching storefront.`
            );
            if (cartState.itemCount > 0) {
              await clearCart();
            }
            const alignment = await alignStorefrontToCurrency(config.currency, {
              quoteId: quoteParams?.id || null,
              triggeredBy: 'cart_guard',
            });
            if (alignment.status === 'redirecting' || alignment.status === 'switching') {
              return;
            }
            if (alignment.status === 'unsupported') {
              showToast(
                `Your cart is in ${cartState.cartCurrency} but this quote is in ${config.currency}. Please switch markets and try again.`,
                'error'
              );
              setShowLoadingOverlay(false);
              setLoading(false);
              return;
            }
          }

        setLoadingStep({ text: 'Preparing your item for cart...', progress: 80 });

        // Helper function to wait
        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Simple variant availability check (no heavy polling)
        const checkVariant = async (id: string | number): Promise<boolean> => {
          try {
            const variantResponse = await fetch(`/variants/${id}.js`);
            if (variantResponse.ok) {
              const variant = await variantResponse.json();
              return variant.available === true;
            }
            return false;
          } catch (error) {
            return false;
          }
        };

        // Quick check with single retry
        let isAvailable = await checkVariant(variantId);
        if (!isAvailable) {
          await wait(1500);
          isAvailable = await checkVariant(variantId);
        }

        if (!isAvailable && isMountedRef.current) {
          console.error('❌ Variant not available');
          showToast(
            'Your product was created but is taking a moment to become available. Please try adding to cart again in a few seconds.',
            'error'
          );
          setShowLoadingOverlay(false);
          setLoading(false);
          return;
        }

        setLoadingStep({ text: 'Adding item to your cart...', progress: 92 });

        // Single cart addition attempt
        const cartResponse = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (cartResponse.ok) {
          const cartData = await cartResponse.json();
          console.log('Cart response data:', cartData);

          if (cartData.items && cartData.items[0] && cartData.items[0].properties) {
            console.log('📦 Properties in cart item:', cartData.items[0].properties);
            if (cartData.items[0].properties['_quote_pdf_url']) {
              console.log('✅ PDF URL successfully added to cart!');
            }
          }

          const customerName = capturedCustomerDetails
            ? `${capturedCustomerDetails.firstName} ${capturedCustomerDetails.lastName}`.trim()
            : quoteData?.customer_first_name
              ? `${quoteData.customer_first_name} ${quoteData.customer_last_name || ''}`.trim()
              : undefined;

          // Fire and forget tracking - don't await
          eventTrackers.addToCart(
            quoteReference || (quoteParams?.id || null),
            email || null,
            calculations.totalPrice,
            config.currency,
            true,
            customerName,
            config.fabricType || undefined,
            config.corners
          );

          if (quoteData && quoteParams) {
            try {
              const createdAt = new Date(quoteData.created_at);
              const quoteAgeHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

              analytics.quoteConvertedToCart({
                quote_reference: quoteReference!,
                quote_age_hours: quoteAgeHours,
                time_from_save_to_cart_hours: quoteAgeHours,
                total_price: calculations.totalPrice,
                currency: config.currency,
                conversion_source: 'loaded_quote',
              });

              await markQuoteConverted(quoteParams.id, quoteParams.token);
            } catch (error) {
              console.error('Failed to track quote conversion:', error);
            }
          }

          setLoadingStep({ text: 'Order complete! Redirecting...', progress: 100 });
          await wait(300);
          window.location.href = '/cart';
        } else {
          const errorText = await cartResponse.text();
          throw new Error(`Add to cart failed: ${cartResponse.status} ${errorText}`);
        }
      } else {
        console.error('No variant found in product');
        setShowLoadingOverlay(false);
        setLoading(false);
      }
    } else if (!success && error) {
      console.error('Product creation failed:', error);
      setShowLoadingOverlay(false);
      setLoading(false);
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
    showToast('Failed to add item to cart. Please try again.', 'error');
    setShowLoadingOverlay(false);
    setLoading(false);
  }
};

  const handleAddToCartFromConfigurator = async (): Promise<void> => {
    // Prevent multiple simultaneous calls
    if (loading) {
      console.log('Already processing, skipping...');
      return;
    }
    
    console.log('🛒 Starting add to cart process from configurator');
    setLoading(true);
    setShowLoadingOverlay(true);
    setLoadingStep({ text: 'Starting order process...', progress: 10 });

    try {
      // First, render the rich configurator diagram (ShadeSVGCore) so the
      // technical drawing on the Shopify order matches the in-app quote PDF.
      let canvasImageUrl = null;

      try {
        setLoadingStep({ text: 'Generating technical drawing...', progress: 20 });
        const canvasImageBlob = await renderSailPngBlob(config, 800, 800);
        if (canvasImageBlob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `shade-sail-${config.corners}corner-${timestamp}.png`;
          canvasImageUrl = await uploadToQuoteAssets(canvasImageBlob, filename);
          if (!canvasImageUrl) {
            canvasImageUrl = await uploadImageToShopify(canvasImageBlob, filename);
          }
        }
      } catch (error) {
        console.error('Error processing canvas image:', error);
      }

      // Capture 3D screenshot for checkout save
      let canvasImage3DUrlForCheckout: string | null = null;
      try {
        const screenshot3D = await viewer3DRef.current?.capture3DScreenshot();
        if (screenshot3D) {
          const blob3D = await fetch(screenshot3D).then(r => r.blob());
          const ts3d = new Date().toISOString().replace(/[:.]/g, '-');
          const fn3d = `shade-sail-3d-${config.corners}corner-${ts3d}.png`;
          canvasImage3DUrlForCheckout = await uploadToQuoteAssets(blob3D, fn3d);
        }
      } catch { /* 3D capture is optional */ }

      // Prepare the edge measurements
      const edgeMeasurements: { [key: string]: { unit: string; formatted: string } } = {};
      for (let i = 0; i < config.corners; i++) {
        const nextIndex = (i + 1) % config.corners;
        const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
        const measurement = config.measurements[edgeKey];

        if (measurement && measurement > 0) {
          edgeMeasurements[edgeKey] = {
            unit: config.unit === 'imperial' ? 'inches' : 'millimeters',
            formatted: formatMeasurement(measurement, config.unit)
          };
        }
      }

      // Prepare diagonal measurements
      const diagonalKeys = getDiagonalKeysForCorners(config.corners);
      const diagonalMeasurementsObj: { [key: string]: { unit: string; formatted: string } } = {};
      diagonalKeys.forEach(key => {
        const measurement = config.measurements[key];
        if (measurement && measurement > 0) {
          diagonalMeasurementsObj[key] = {
            unit: config.unit === 'imperial' ? 'inches' : 'millimeters',
            formatted: formatMeasurement(measurement, config.unit)
          };
        }
      });

      // Prepare anchor point measurements
      const anchorPointMeasurements: { [key: string]: { unit: string; formatted: string } } = {};
      if (config.corners !== 3 && config.measurementOption === 'adjust' && config.heightsProvidedByUser && config.fixingHeights && config.fixingHeights.length > 0) {
        config.fixingHeights.forEach((height, index) => {
          if (height && height > 0) {
            const corner = String.fromCharCode(65 + index);
            anchorPointMeasurements[corner] = {
              unit: config.unit === 'imperial' ? 'inches' : 'millimeters',
              formatted: formatMeasurement(height, config.unit)
            };
          }
        });
      }

      // Prepare backend measurements
      const backendEdgeMeasurements: Record<string, string> = {};
      for (let i = 0; i < config.corners; i++) {
        const nextIndex = (i + 1) % config.corners;
        const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
        const measurement = config.measurements[edgeKey];
        if (measurement && measurement > 0) {
          backendEdgeMeasurements[edgeKey] = formatDualMeasurement(measurement, config.unit);
        }
      }

      const backendDiagonalMeasurements: Record<string, string> = {};
      diagonalKeys.forEach(key => {
        const measurement = config.measurements[key];
        if (measurement && measurement > 0) {
          backendDiagonalMeasurements[key] = formatDualMeasurement(measurement, config.unit);
        }
      });

      const backendAnchorMeasurements: Record<string, string> = {};
      if (config.corners !== 3 && config.measurementOption === 'adjust' && config.heightsProvidedByUser && config.fixingHeights && config.fixingHeights.length > 0) {
        config.fixingHeights.forEach((height, index) => {
          const corner = String.fromCharCode(65 + index);
          if (height && height > 0) {
            backendAnchorMeasurements[corner] = formatDualMeasurement(height, config.unit);
          }
        });
      }

      const selectedFabricLocal = FABRICS.find(f => f.id === config.fabricType);
      const selectedColorLocal = selectedFabricLocal?.colors.find(c => c.name === config.fabricColor);
      const hardwareIncluded = config.measurementOption === 'adjust';
      const hardwareText = hardwareIncluded ? 'Included' : 'Not Included';

      // Create the order data
      const orderData: any = {
        fabricType: config.fabricType,
        fabricColor: config.fabricColor,
        edgeType: config.edgeType,
        corners: config.corners,
        unit: config.unit,
        currency: config.currency,
        measurementOption: config.measurementOption,
        hardware_included: hardwareText,
        measurements: config.measurements,
        area: calculations.area,
        perimeter: calculations.perimeter,
        totalPrice: calculations.totalPrice,
        totalWeightGrams: calculations.totalWeightGrams,
        selectedFabric: selectedFabricLocal,
        selectedColor: selectedColorLocal,
        canvasImageUrl: canvasImageUrl,
        canvasImage3DUrl: canvasImage3DUrlForCheckout,
        warranty: selectedFabricLocal?.warrantyYears || "",
        ...(config.corners !== 3 && config.measurementOption === 'adjust' && config.heightsProvidedByUser && {
          fixingHeights: config.fixingHeights,
          fixingTypes: config.fixingTypes,
        }),
        edgeMeasurements: edgeMeasurements,
        diagonalMeasurementsObj: diagonalMeasurementsObj,
        anchorPointMeasurements: anchorPointMeasurements,
        Fabric_Type: selectedFabricLocal?.isFireRetardant && selectedColorLocal && !selectedColorLocal.isFireRetardant ?
          'Not FR Certified' : selectedFabricLocal?.label,
        Shade_Factor: selectedColorLocal?.shadeFactor,
        Edge_Type: config.edgeType === 'webbing' ? 'Webbing Reinforced' : 'Cabled Edge',
        Wire_Thickness: config.unit === 'imperial' ?
          calculations?.wireThickness !== undefined ? `${(calculations.wireThickness * 0.0393701).toFixed(2)}"` : 'N/A'
          : calculations?.wireThickness !== undefined ? `${calculations.wireThickness}mm` : 'N/A',
        Area: formatArea(calculations.area * 1000000, config.unit),
        Perimeter: formatMeasurement(calculations.perimeter * 1000, config.unit),
        createdAt: new Date().toISOString(),
        backendEdgeMeasurements,
        backendDiagonalMeasurements,
        backendAnchorMeasurements,
        originalUnit: config.unit
      };

      console.log('🚨 Order data prepared:', {
        totalPrice: orderData.totalPrice,
        currency: orderData.currency,
        type: typeof orderData.totalPrice
      });

      // Call the main add to cart function
      setLoadingStep({ text: 'Creating your custom product...', progress: 30 });
      await handleAddToCart(orderData);
      
    } catch (error) {
      console.error('Error in add to cart process:', error);
      if (isMountedRef.current) {
        showToast('Failed to add item to cart. Please try again.', 'error');
        setShowLoadingOverlay(false);
        setLoading(false);
      }
    }
  };

  // Auto-center shape when moving between steps
  const centerShape = (points: Point[]): Point[] => {
    if (points.length === 0) return points;

    // Calculate current bounds
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));

    // Calculate current center
    const currentCenterX = (minX + maxX) / 2;
    const currentCenterY = (minY + maxY) / 2;

    // Target center (canvas center)
    const targetCenterX = 300;
    const targetCenterY = 300;

    // Calculate offset needed
    const offsetX = targetCenterX - currentCenterX;
    const offsetY = targetCenterY - currentCenterY;

    // Apply offset to all points
    return points.map(point => ({
      x: Math.max(5, Math.min(595, point.x + offsetX)),
      y: Math.max(5, Math.min(595, point.y + offsetY))
    }));
  };

  // Helper function to check if a step should be skipped
  const shouldSkipStep = (_step: number): boolean => {
    return false;
  };

  // Helper function to get the actual next step (accounting for skips)
  const getActualNextStep = (currentStep: number): number => {
    let nextStep = currentStep + 1;
    while (nextStep <= 6 && shouldSkipStep(nextStep)) {
      nextStep++;
    }
    return Math.min(nextStep, 6);
  };

  // Helper function to get the actual previous step (accounting for skips)
  const getActualPrevStep = (currentStep: number): number => {
    let prevStep = currentStep - 1;
    while (prevStep >= 0 && shouldSkipStep(prevStep)) {
      prevStep--;
    }
    return Math.max(prevStep, 0);
  };

  // Helper function to calculate the displayed step number (accounting for skipped steps)
  const getDisplayedStepNumber = (stepIndex: number): number => {
    let displayNumber = 1;
    for (let i = 0; i < stepIndex; i++) {
      if (!shouldSkipStep(i)) {
        displayNumber++;
      }
    }
    return displayNumber;
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 0: // Fabric & Color
        return !!config.fabricType && !!config.fabricColor;
      case 1: // Style (Edge Type)
        return !!config.edgeType;
      case 2: // Number of Fixing Points
        return config.corners >= 3 && config.corners <= 8;
      case 3: // Measurement Options (Combined)
        return (config.unit === 'metric' || config.unit === 'imperial') && (config.measurementOption === 'adjust' || config.measurementOption === 'exact');
      case 4: // Dimensions
        if (config.corners === 0) {
          return false;
        }

        let edgeCount = 0;
        for (let i = 0; i < config.corners; i++) {
          const nextIndex = (i + 1) % config.corners;
          const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
          const measurement = config.measurements[edgeKey];
          if (measurement && measurement > 0) {
            edgeCount++;
          }
        }

        const allEdgesProvided = edgeCount === config.corners;

        // Heights are never required to complete this step - they can be added during review
        return allEdgesProvided;
      case 5: // Hardware Selection
        if (config.hardwareSelectionMode === 'manual') {
          const ch = config.cornerHardware || {};
          for (let i = 0; i < config.corners; i++) {
            if (!ch[i] || ch[i].length === 0) return false;
          }
          return true;
        }
        return true;
      case 6: // Review
        return true;
      default:
        return true;
    }
  };

  const smoothScrollToStep = (stepNumber: number) => {
    // stepNumber here is the step index (0-6), we need to get its displayed number
    const displayedNumber = getDisplayedStepNumber(stepNumber);
    const stepElement = document.getElementById(`step-${displayedNumber}`);
    if (!stepElement) return;

    const isMobileView = window.innerWidth < 1024;
    const headerOffset = isMobileView ? 120 : 140;

    const elementPosition = stepElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  };

  const scrollToErrorField = (errorKey: string, isTypoSuggestion: boolean = false) => {
    setTimeout(() => {
      let targetElement: Element | null = null;

      if (isTypoSuggestion) {
        targetElement = document.querySelector('.bg-amber-50') ||
          document.querySelector('.border-amber-500');
      } else {
        targetElement = document.querySelector(`[data-error="${errorKey}"]`) ||
          document.querySelector('input.border-red-500') ||
          document.querySelector('.border-red-500');
      }

      if (targetElement) {
        const isMobileView = window.innerWidth < 1024;
        const headerOffset = isMobileView ? 100 : 120;
        const viewportOffset = window.innerHeight * 0.2;

        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset - viewportOffset;

        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth'
        });

        setTimeout(() => {
          targetElement?.classList.add('pulse-error');
          setTimeout(() => {
            targetElement?.classList.remove('pulse-error');
          }, 2000);
        }, 400);
      }
    }, 100);
  };

  const nextStep = () => {
    // Clear previous validation errors and dismissed typo tracking
    setValidationErrors({});
    setTypoSuggestions({});
    setDismissedTypoSuggestions(new Set());

    // Perform validation for current step
    const errors: { [key: string]: string } = {};
    const suggestions: { [key: string]: number } = {};

    switch (openStep) {
      case 0: // Fabric & Color
        if (!config.fabricType) {
          errors.fabricType = 'Please select a fabric type';
        }
        if (!config.fabricColor || config.fabricColor === '') {
          errors.fabricColor = 'Please select a fabric color';
        }
        break;
      case 1: // Style (Edge Type)
        if (!config.edgeType) {
          errors.edgeType = 'Please select an edge reinforcement type';
        }
        break;
      case 2: // Number of Fixing Points
        if (config.corners < 3 || config.corners > 8) {
          errors.corners = 'Please select the number of fixing points (3-8)';
        }
        break;
      case 3: // Measurement Options
        if (!config.unit) {
          errors.unit = 'Please select measurement units';
        }
        if (!config.measurementOption) {
          errors.measurementOption = 'Please select a measurement option';
        }
        break;
      case 4: // Dimensions
        const requiredDiagonals = getDiagonalKeysForCorners(config.corners);
        const allDiagonalsProvided = requiredDiagonals.every(key =>
          config.measurements[key] && config.measurements[key] > 0
        );

        // Update the flag to track if diagonals were initially provided on this step
        updateConfig({ diagonalsInitiallyProvided: allDiagonalsProvided });

        if (calculations.perimeter > 60) {
          if (config.unit === 'imperial') {
            const perimeterFt = calculations.perimeter * 3.28084;
            const maxPerimeterFt = 60 * 3.28084;
            errors.perimeterTooLarge = `Shade sail is too large (${perimeterFt.toFixed(1)}ft perimeter). Maximum allowed is ${maxPerimeterFt.toFixed(0)}ft. Please re-check your measurements.`;
          } else {
            errors.perimeterTooLarge = `Shade sail is too large (${calculations.perimeter.toFixed(1)}m perimeter). Maximum allowed is 60m. Please re-check your measurements.`;
          }
        }

        // Validate measurements
        const measurementValidation = validateMeasurements(config.measurements, config.corners, config.unit);

        // Add measurement validation errors with specific messages
        Object.keys(measurementValidation.errors).forEach(key => {
          errors[key] = measurementValidation.errors[key];
        });

        // Add typo suggestions
        Object.keys(measurementValidation.typoSuggestions).forEach(key => {
          suggestions[key] = measurementValidation.typoSuggestions[key];
        });

        // Check for missing edge measurements
        for (let i = 0; i < config.corners; i++) {
          const nextIndex = (i + 1) % config.corners;
          const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
          const measurement = config.measurements[edgeKey];
          if (!measurement || measurement <= 0) {
            errors[edgeKey] = 'Measurement required';
          }
        }
        break;
      case 5: // Hardware Selection
        if (config.hardwareSelectionMode === 'manual') {
          const ch = config.cornerHardware || {};
          for (let i = 0; i < config.corners; i++) {
            if (!ch[i] || ch[i].length === 0) {
              errors.cornerHardware = `Please select hardware for all ${config.corners} corners before continuing.`;
              break;
            }
          }
        }
        break;
    }

    // Update typo suggestions state
    setTypoSuggestions(suggestions);

    // Check for unacknowledged typo suggestions (suggestions that haven't been dismissed or corrected)
    const unacknowledgedTypos = Object.keys(suggestions).filter(key => !dismissedTypoSuggestions.has(key));
    const hasUnacknowledgedTypos = unacknowledgedTypos.length > 0;

    // If there are any validation errors OR unacknowledged typo suggestions, block progression
    if (Object.keys(errors).length > 0 || hasUnacknowledgedTypos) {
      setValidationErrors(errors);

      // Prioritize scrolling to typo suggestions first, then other errors
      if (hasUnacknowledgedTypos) {
        const firstTypoKey = unacknowledgedTypos[0];
        scrollToErrorField(firstTypoKey, true);
      } else if (Object.keys(errors).length > 0) {
        const firstErrorKey = Object.keys(errors)[0];
        scrollToErrorField(firstErrorKey, false);
      }

      return; // Don't proceed to next step
    }

    // If no validation errors, proceed to next step
    const nextStepIndex = getActualNextStep(openStep);

    const stepNames = ['Fabric & Color', 'Style', 'Fixing Points', 'Measurement Options', 'Dimensions', 'Hardware Selection', 'Review & Purchase'];
    eventTrackers.stepChange(nextStepIndex, stepNames[nextStepIndex] || `Step ${nextStepIndex}`, 'forward', {
      fabricType: config.fabricType,
      fabricColor: config.fabricColor,
      corners: config.corners,
      edgeType: config.edgeType,
    });

    // Auto-center shape when moving to next step
    const centeredPoints = centerShape(config.points);

    setConfig(prev => ({ ...prev, step: nextStepIndex }));
    updateConfig({ points: centeredPoints });
    setOpenStep(nextStepIndex);

    setTimeout(() => {
      smoothScrollToStep(nextStepIndex);
    }, isMobile ? 400 : 350);
  };

  const prevStep = (options?: { navigateToHeights?: boolean; navigateToDiagonals?: boolean }) => {
    const wantsDimensions = options?.navigateToHeights || options?.navigateToDiagonals;
    const prevStepIndex = wantsDimensions ? 4 : getActualPrevStep(openStep);

    // Auto-center shape when moving to previous step
    const centeredPoints = centerShape(config.points);

    // Set the heights navigation flag if specified
    if (options?.navigateToHeights) {
      setNavigateToHeights(true);
    }

    // Set the diagonals navigation flag if specified
    if (options?.navigateToDiagonals) {
      setNavigateToDiagonals(true);
    }

    setConfig(prev => ({ ...prev, step: Math.max(prev.step, prevStepIndex) }));
    updateConfig({ points: centeredPoints });
    setOpenStep(prevStepIndex);

    setTimeout(() => {
      smoothScrollToStep(prevStepIndex);
    }, isMobile ? 400 : 350);
  };

  const toggleStep = (stepIndex: number) => {
    if (stepIndex <= config.step) {
      // Auto-center shape when switching steps
      const centeredPoints = centerShape(config.points);
      updateConfig({ points: centeredPoints });

      const newOpenStep = openStep === stepIndex ? -1 : stepIndex;
      setOpenStep(newOpenStep);

      if (newOpenStep !== -1) {
        setTimeout(() => {
          smoothScrollToStep(newOpenStep);
        }, isMobile ? 400 : 350);
      }
    }
  };

  const getStepSelection = (step: number): string => {
    switch (step) {
      case 0: // Fabric & Color
        const fabric = FABRICS.find(f => f.id === config.fabricType);
        const colorText = config.fabricColor ? ` - ${config.fabricColor}` : '';
        return fabric ? `${fabric.label}${colorText}` : 'Not selected';
      case 1: // Style (Edge Type)
        return config.edgeType === 'webbing' ? 'Webbing Reinforced' :
          config.edgeType === 'cabled' ? 'Cabled Edge' : 'Not selected';
      case 2: // Number of Fixing Points
        return config.corners ? `${config.corners} fixing points` : 'Not selected';
      case 3: // Measurement Options (Combined)
        const unitText = config.unit === 'metric' ? 'Metric' : config.unit === 'imperial' ? 'Imperial' : '';
        const optionText = config.measurementOption === 'adjust' ? 'Adjust to fit' :
          config.measurementOption === 'exact' ? 'Exact dimensions' : '';
        if (unitText && optionText) {
          return `${unitText}, ${optionText}`;
        } else if (unitText || optionText) {
          return unitText || optionText;
        }
        return 'Not selected';
      case 4: // Dimensions
        const measurementCount = Object.keys(config.measurements).length;
        // Count only edge measurements for display
        let edgeCount = 0;
        for (let i = 0; i < config.corners; i++) {
          const nextIndex = (i + 1) % config.corners;
          const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
          if (config.measurements[edgeKey] && config.measurements[edgeKey] > 0) {
            edgeCount++;
          }
        }
        return edgeCount === config.corners ? `${edgeCount} edge measurements entered` : `${edgeCount}/${config.corners} edges measured`;
      case 5: // Hardware Selection
        {
          const m = config.hardwareSelectionMode ?? (config.measurementOption === 'adjust' ? 'standard' : 'none');
          if (m === 'manual') {
            const ch = config.cornerHardware || {};
            const configured = Array.from({ length: config.corners }, (_, i) => (ch[i]?.length || 0) > 0).filter(Boolean).length;
            return `Manual (${configured}/${config.corners} corners)`;
          }
          if (m === 'none') return 'No hardware';
          return 'Standard hardware pack';
        }
      case 6: // Review
        return 'Ready for purchase';
      default:
        return 'Not selected';
    }
  };

  // Define step titles for navigation with dynamic skipping
  const getNextStepTitle = (currentStep: number): string => {
    const stepSubtitles = [
      'Fabric & Color',
      'Style',
      'Fixing Points',
      'Measurement Options',
      'Dimensions',
      'Hardware Selection',
      'see pricing'
    ];

    const actualNextStep = getActualNextStep(currentStep);

    if (currentStep === 4 && shouldSkipStep(5)) {
      return 'see pricing';
    }

    return stepSubtitles[actualNextStep] || '';
  };
  const shouldShowBackButton = (currentStep: number) => currentStep > 0;

  const steps = [
    {
      title: 'Fabric & Color',
      subtitle: 'Select your preferred fabric type and color',
      component: FabricSelectionContent
    },
    {
      title: 'Style',
      subtitle: 'Select edge reinforcement type',
      component: EdgeTypeContent
    },
    {
      title: 'Number of Fixing Points',
      subtitle: 'How many fixing points will your shade sail have?',
      component: CornersContent
    },
    {
      title: 'Measurement Options',
      subtitle: 'Choose units and measurement handling',
      component: CombinedMeasurementContent
    },
    {
      title: 'Dimensions',
      subtitle: 'Set precise measurements',
      component: DimensionsContent
    },
    {
      title: 'Hardware Selection',
      subtitle: 'Choose corner hardware',
      component: HardwareContent
    },
    {
      title: 'Review & Purchase',
      subtitle: 'Confirm your order',
      component: ReviewContent
    }
  ];

  // Check if quote is ready (has price)
  const hasQuote = calculations.totalPrice > 0;

  // Handle save quote - opens unified modal
  const handleSaveQuote = () => {
    setShowUnifiedSaveModal(true);
  };

  // Handle toggle between Auto and Manual mode
  const handleToggleMode = (isAutomatic: boolean) => {
    if (isAutomatic) {
      // Switching to Automatic mode - always allow the switch
      updateConfig({ hasManuallyAdjustedShape: false });

      if (canReconstructShape(config.measurements, config.corners)) {
        // If we have enough measurements, reconstruct the shape
        const reconstructedPoints = reconstructPolygonFromMeasurements(
          config.measurements,
          config.corners,
          600,
          600,
          config.fixingHeights
        );

        if (reconstructedPoints && reconstructedPoints.length === config.corners) {
          updateConfig({
            points: reconstructedPoints,
            hasManuallyAdjustedShape: false
          });
          toast.success('Switched to Automatic mode - shape fitted to measurements', {
            autoClose: 3000,
            hideProgressBar: false,
          });
        } else {
          toast.info('Switched to Automatic mode - shape will update as you enter measurements', {
            autoClose: 3000,
            hideProgressBar: false,
          });
        }
      } else {
        // Partial or no measurements - still allow the switch
        toast.info('Switched to Automatic mode - shape will update as you enter measurements', {
          autoClose: 3000,
          hideProgressBar: false,
        });
      }
    } else {
      // Switching to Manual mode
      updateConfig({ hasManuallyAdjustedShape: true });
      toast.info('Switched to Manual mode - drag corners to customize shape', {
        autoClose: 3000,
        hideProgressBar: false,
      });
    }
  };

  if (redirectingForCurrency) {
    const { targetDomain, targetCountry } = redirectingForCurrency;
    const message = targetDomain
      ? `Switching you to ${targetDomain} so your quote is shown in its original currency...`
      : `Updating the store to ${targetCountry || 'your quote region'} so prices match your saved quote...`;
    return (
      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-16 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-[#BFF102] border-t-[#307C31] rounded-full mx-auto mb-4"></div>
        <p className="text-lg text-slate-700 mb-2">{message}</p>
        <p className="text-sm text-slate-500">If this page does not change within a few seconds, please refresh.</p>
      </div>
    );
  }

  if (isLoadingQuote) {
    return (
      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-16 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-[#BFF102] border-t-[#307C31] rounded-full mx-auto mb-4"></div>
        <p className="text-lg text-slate-700">Loading your saved quote...</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Sticky Progress Indicator */}
      {isMobile && (
        <div className="sticky top-0 left-0 right-0 z-[999] bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#01312D] truncate">
                {steps[openStep]?.title || 'Configure'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] font-medium text-[#01312D]/60">
                {Math.min(openStep + 1, steps.length)}/{steps.filter((_, i) => !shouldSkipStep(i)).length}
              </span>
              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#307C31] to-[#BFF102] rounded-full transition-all duration-500 progress-bar-fill"
                  style={{ width: `${Math.min(((openStep + 1) / steps.filter((_, i) => !shouldSkipStep(i)).length) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-8 pb-16">
        {/* Header */}
        <div className="text-center mb-6">
          {/* Quote Reference Display */}
          {quoteReference && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#BFF102]/20 border border-[#307C31]/30 rounded-full">
              <svg className="w-5 h-5 text-[#307C31]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-semibold text-[#01312D]">
                Quote: {quoteReference}
              </span>
            </div>
          )}
        </div>

        {purchasedOrder && (
          <div className="mb-6 mx-auto max-w-2xl bg-teal-50 border border-teal-200 rounded-lg p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-teal-800">
              <span className="font-semibold">This shade sail has been ordered</span>
              {purchasedOrder.orderNumber && <span> ({purchasedOrder.orderNumber})</span>}
              {purchasedOrder.purchasedAt && (
                <span className="text-teal-600"> on {new Date(purchasedOrder.purchasedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              )}
            </p>
          </div>
        )}

        <div className={`grid grid-cols-1 gap-8 ${(openStep === 4 || openStep === 5) ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {/* Accordion Steps */}
          <div className={`space-y-2 min-h-0 ${(openStep === 4 || openStep === 5) // Dimensions or Hardware step (50% of 4 cols)
            ? 'lg:col-span-2'
            : (openStep >= 5 && !shouldSkipStep(5)) // Review step (66.7% of 3 cols when step 5 is not skipped)
              ? 'lg:col-span-2'
              : (openStep === 6 && shouldSkipStep(5)) // Review step (66.7% of 3 cols when step 5 is skipped)
                ? 'lg:col-span-2'
                : 'lg:col-span-3'
            }`}>
            {steps.map((step, index) => {
              const StepComponent = step.component;
              const isCompleted = index < config.step;
              const isCurrent = index === config.step;
              const isOpen = openStep === index;
              const canOpen = index <= config.step;
              const selection = getStepSelection(index);

              // Skip steps that should be hidden based on measurement option
              if (shouldSkipStep(index)) {
                return null;
              }

              // On mobile, show current step, completed steps, and the next available step
              if (isMobile && index > config.step) {
                return null;
              }

              return (
                <AccordionStep
                  key={index}
                  title={step.title}
                  subtitle={step.subtitle}
                  stepNumber={getDisplayedStepNumber(index)}
                  isCompleted={isCompleted}
                  isCurrent={isCurrent}
                  isOpen={isOpen}
                  canOpen={canOpen}
                  selection={selection}
                  onToggle={() => toggleStep(index)}
                >
                  <StepComponent
                    config={config}
                    updateConfig={updateConfig}
                    calculations={calculations}
                    validationErrors={validationErrors}
                    typoSuggestions={typoSuggestions}
                    onNext={nextStep}
                    onPrev={prevStep}
                    setValidationErrors={setValidationErrors}
                    setTypoSuggestions={setTypoSuggestions}
                    dismissTypoSuggestion={dismissTypoSuggestion}
                    mobileGuidance={mobileGuidance}
                    // Props for ReviewContent
                    agreedToAcknowledgments={agreedToAcknowledgments}
                    onToggleAgreement={toggleAgreedToAcknowledgments}
                    handleAddToCart={handleAddToCart}
                    allDiagonalsEntered={allDiagonalsEntered}
                    allAcknowledgmentsChecked={allAcknowledgmentsChecked}
                    canAddToCart={canAddToCart}
                    hasAllEdgeMeasurements={hasAllEdgeMeasurements}
                    nextStepTitle={getNextStepTitle(index)}
                    showBackButton={shouldShowBackButton(index)}
                    isMobile={isMobile}
                    isStepOpen={isOpen}
                    setHighlightedMeasurement={setHighlightedMeasurement}
                    highlightedMeasurement={highlightedMeasurement}
                    highlightedCorner={highlightedCorner}
                    setHighlightedCorner={setHighlightedCorner}
                    canvasRef={canvasRef}
                    ref={index === 6 ? reviewContentRef : undefined}
                    fabrics={FABRICS}
                    loading={loading}
                    setLoading={setLoading}
                    setShowLoadingOverlay={setShowLoadingOverlay}
                    onSaveQuote={handleSaveQuote}
                    quoteReference={quoteReference}
                    viewMode={index === 6 ? desktopViewMode : undefined}
                    onViewModeChange={index === 6 ? handleDesktopViewModeChange : undefined}
                    navigateToHeights={index === 4 ? navigateToHeights : undefined}
                    setNavigateToHeights={index === 4 ? setNavigateToHeights : undefined}
                    navigateToDiagonals={index === 4 ? navigateToDiagonals : undefined}
                    setNavigateToDiagonals={index === 4 ? setNavigateToDiagonals : undefined}
                    onHeightsSectionChange={index === 4 ? setIsHeightsSectionOpen : undefined}
                    device3DTier={device3DTier}
                    mobileViewMode={mobileViewMode}
                    onMobileViewModeChange={handleMobileViewModeChange}
                    pricingSettingsMap={activePricingMap}
                    adminMode={adminMode}
                  />
                </AccordionStep>
              );
            })}
          </div>

          {/* Sticky Diagram for Dimensions Step - Desktop Only */}
          {(openStep === 4 || openStep === 5) && !isMobile && (() => {
            const desktopShapeAccuracy = getShapeAccuracy(config.measurements, config.corners);
            const desktopDiagonalKeys = config.corners >= 4 ? getDiagonalKeysForCorners(config.corners) : [];
            const desktopMinDiagonals = config.corners >= 4 ? config.corners - 3 : 0;
            const desktopProvidedDiagonals = desktopDiagonalKeys.filter(key => config.measurements[key] && config.measurements[key] > 0).length;
            const desktopHasEnoughDiagonals = desktopProvidedDiagonals >= desktopMinDiagonals && desktopMinDiagonals > 0;
            const desktop3DAvailable = supports3DForCorners(config.corners);
            const effectiveDesktopView = desktop3DAvailable ? desktopViewMode : 'plan';

            return (
              <div className="hidden lg:block lg:col-span-2 lg:sticky lg:top-24 lg:self-start z-10 max-h-[calc(100vh-7rem)] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-slate-900">
                    {openStep === 5 ? 'Sail Diagram' : 'Interactive Measurement Guide'}
                  </h4>
                  {desktop3DAvailable && (
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                      <button
                        onClick={() => handleDesktopViewModeChange('plan')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          effectiveDesktopView === 'plan'
                            ? 'bg-white shadow-sm text-slate-900'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Layers className="w-4 h-4" />
                        Plan
                      </button>
                      <button
                        onClick={() => handleDesktopViewModeChange('3d')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          effectiveDesktopView === '3d'
                            ? 'bg-white shadow-sm text-slate-900'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Box className="w-4 h-4" />
                        3D
                      </button>
                    </div>
                  )}
                </div>

                {openStep === 5 && effectiveDesktopView === 'plan' && (
                  <p className="text-sm text-slate-600 mb-3">
                    Hover over a corner below to preview which corner on the sail you are configuring.
                  </p>
                )}

                {effectiveDesktopView === 'plan' ? (
                  openStep === 4 ? (
                    <div>
                      <ShapeCanvas
                        config={config}
                        updateConfig={updateConfig}
                        readonly={false}
                        snapToGrid={true}
                        highlightedMeasurement={highlightedMeasurement}
                        highlightedCorner={highlightedCorner}
                        isMobile={isMobile}
                        measurementOption={config.measurementOption}
                        unit={config.unit}
                      />
                      {config.corners >= 4 && (
                        <div className="mt-3">
                          <ShapeModeToggle
                            isAutoMode={!config.hasManuallyAdjustedShape}
                            onToggle={(isAuto) => handleToggleMode(isAuto)}
                            corners={config.corners}
                            hasEnoughDiagonals={desktopHasEnoughDiagonals}
                            shapeAccuracy={desktopShapeAccuracy.accuracy}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <ShapeCanvas
                      config={config}
                      updateConfig={updateConfig}
                      readonly={true}
                      snapToGrid={true}
                      highlightedMeasurement={highlightedMeasurement}
                      highlightedCorner={highlightedCorner}
                      isMobile={isMobile}
                      measurementOption={config.measurementOption}
                      unit={config.unit}
                    />
                  )
                ) : (
                  <div className="h-[calc(100vh-12rem)]">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-full bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-center">
                          <div className="animate-spin w-8 h-8 border-3 border-slate-300 border-t-slate-700 rounded-full mx-auto mb-3"></div>
                          <p className="text-sm text-slate-500">Loading 3D viewer...</p>
                        </div>
                      </div>
                    }>
                      <ShadeSail3DViewer
                        ref={viewer3DRef}
                        config={config}
                        highlightedMeasurement={highlightedMeasurement}
                        highlightedCorner={highlightedCorner}
                        activeSection={openStep === 5 ? 'hardware' : isHeightsSectionOpen ? 'heights' : 'dimensions'}
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Desktop Pricing Summary - Sticky Sidebar (Review step) */}
          {(openStep === 6) && (
            <div className="hidden lg:block lg:col-span-1 lg:sticky lg:top-20 lg:self-start z-10 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <PriceSummaryDisplay
                config={config}
                calculations={calculations}
                onSaveQuote={handleSaveQuote}
                allAcknowledgmentsChecked={openStep === 6 ? allAcknowledgmentsChecked : false}
                canAddToCart={openStep === 6 ? canAddToCart : false}
                handleAddToCart={handleAddToCartFromConfigurator}
                loading={loading}
                fabrics={FABRICS}
                isEmailMode={openStep === 6 && hasAllEdgeMeasurements}
                adminMode={adminMode}
              />
            </div>
          )}

        </div>

        <LoadingOverlay
          isVisible={showLoadingOverlay}
          currentStep={loadingStep.text}
          progress={loadingStep.progress}
        />
      </div>

      {/* Unified Save Modal */}
      {adminMode ? (
        <AdminSaveQuoteModal
          isOpen={showUnifiedSaveModal}
          onClose={() => setShowUnifiedSaveModal(false)}
          config={config}
          calculations={calculations}
          adminProfile={adminProfile!}
          pricingSnapshot={pricingSettingsMap}
          existingQuoteId={savedQuoteId}
          existingAccessToken={savedAccessToken}
          onQuoteCreated={(ref, id, token) => {
            setQuoteReference(ref);
            setSavedQuoteId(id);
            setSavedAccessToken(token);
            onAdminSaveComplete?.(id, token, ref);
          }}
          getCanvasImageUrl={async () => {
            try {
              const blob = await renderSailPngBlob(config, 800, 800);
              if (!blob) return null;
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `shade-sail-${config.corners}corner-${timestamp}.png`;
              return await uploadToQuoteAssets(blob, filename) || await uploadImageToShopify(blob, filename);
            } catch (err) {
              console.warn('Failed to capture diagram for saved quote:', err);
              return null;
            }
          }}
          getCanvasImage3DUrl={async () => {
            try {
              const screenshot = await viewer3DRef.current?.capture3DScreenshot();
              if (!screenshot) return null;
              const blob = await fetch(screenshot).then(r => r.blob());
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `shade-sail-3d-${config.corners}corner-${timestamp}.png`;
              return await uploadToQuoteAssets(blob, filename);
            } catch (err) {
              console.warn('Failed to capture 3D for saved quote:', err);
              return null;
            }
          }}
        />
      ) : (
        <UnifiedSaveModal
          isOpen={showUnifiedSaveModal}
          onClose={() => setShowUnifiedSaveModal(false)}
          config={config}
          calculations={calculations}
          currentStep={openStep}
          totalSteps={7}
          shouldShowEmailOption={openStep === 6 && hasAllEdgeMeasurements}
          pricingSnapshot={pricingSettingsMap}
          existingQuoteId={savedQuoteId}
          existingAccessToken={savedAccessToken}
          onQuoteCreated={(ref, id, token) => {
            setQuoteReference(ref);
            setSavedQuoteId(id);
            setSavedAccessToken(token);
          }}
          onSaveComplete={() => setLoadedPricingSnapshot(null)}
          onCustomerDetailsCaptured={setCapturedCustomerDetails}
          onGeneratePDFWithDetails={handleGeneratePDFWithDetails}
          onEmailPDFQuote={handleEmailPDFQuote}
          getCanvasImageUrl={async () => {
            try {
              const blob = await renderSailPngBlob(config, 800, 800);
              if (!blob) return null;
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `shade-sail-${config.corners}corner-${timestamp}.png`;
              return await uploadToQuoteAssets(blob, filename) || await uploadImageToShopify(blob, filename);
            } catch (err) {
              console.warn('Failed to capture diagram for saved quote:', err);
              return null;
            }
          }}
          getCanvasImage3DUrl={async () => {
            try {
              const screenshot = await viewer3DRef.current?.capture3DScreenshot();
              if (!screenshot) return null;
              const blob = await fetch(screenshot).then(r => r.blob());
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `shade-sail-3d-${config.corners}corner-${timestamp}.png`;
              return await uploadToQuoteAssets(blob, filename);
            } catch (err) {
              console.warn('Failed to capture 3D for saved quote:', err);
              return null;
            }
          }}
        />
      )}
    </>
  );
}