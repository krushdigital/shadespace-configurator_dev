import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';

import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { PriceSummaryDisplay } from './PriceSummaryDisplay';
import { StepRail, MobileHeader } from './StepNavigation';
import { StepNavigationFooter } from './StepNavigationFooter';
import { HelpPopover, STEP_HELP_CONTENT } from './HelpPopover';
import { MaterialFinishContent } from './steps/MaterialFinishContent';
import { ShapeSizeContent } from './steps/ShapeSizeContent';
import { DimensionsContent } from './steps/DimensionsContent';
import { FixedShapeDimensionsContent, generateFixedShapePoints, computeFixedShapeMeasurements } from './steps/FixedShapeDimensionsContent';
import { FixedShapeHardwareContent } from './steps/FixedShapeHardwareContent';
import { HardwareContent } from './steps/HardwareContent';
import { EdgeTypeContent } from './steps/EdgeTypeContent';
import { ReviewContent } from './steps/ReviewContent';
import { useShadeCalculations } from '../hooks/useShadeCalculations';
import { useHardwareCatalog } from '../hooks/useHardwareCatalog';
import { usePricingSettings } from '../hooks/usePricingSettings';
import { useBasePricing } from '../hooks/useBasePricing';
import { useMobileGuidance } from '../hooks/useMobileGuidance';
import { ConfiguratorState, EdgeType } from '../types';
import { useFabricCatalog } from '../hooks/useFabricCatalog';
import { Point } from '../types';
import { validateMeasurements, validateHeights, getDiagonalKeysForCorners, formatDualMeasurement, getDualMeasurementValues, canReconstructShape, reconstructPolygonFromMeasurements, formatMeasurement, formatArea, getHeightRequirement, areHeightsProvided, isHeightRequiredForCheckout, getShapeAccuracy, generateRegularPolygonPoints } from '../utils/geometry';
import { generatePdfFromBlocks, CustomerDetails } from '../utils/pdfGenerator';
import { loadActivePdfTemplate } from '../utils/activePdfTemplate';
import { ShapeCanvas } from './ShapeCanvas';
import { EXCHANGE_RATES } from '../data/pricing';
import { getShopifyDisplayCurrency } from '../utils/currencyDetection';
import { alignStorefrontToCurrency, cartCurrencyMismatches, clearCart } from '../utils/currencySync';
import { formatCurrency } from '../utils/currencyFormatter';

import { useToast } from "../components/ui/ToastProvider";
import { LoadingOverlay } from './ui/loader';
import { UnifiedSaveModal } from './UnifiedSaveModal';
import { AdminSaveQuoteModal } from './admin/AdminSaveQuoteModal';
import { ShapeModeToggle } from './ui/ShapeModeToggle';
import { getQuoteFromUrl, getQuoteById, updateQuote, updateQuoteStatus, markQuoteConverted, saveQuoteForCheckout, clearQuoteStash, QuoteData } from '../utils/quoteManager';
import { generateDefaultQuoteName } from '../utils/quoteNaming';
import { PricingSetting } from '../hooks/usePricingSettings';
import { addQuoteToken } from '../utils/tokenManager';
import { analytics } from '../utils/analytics';
import { reportClientError } from '../utils/errorReporter';
import { eventTrackers } from '../utils/eventTracker';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';
import { uploadToQuoteAssets } from '../utils/storageUpload';
import { renderSailPngBlob } from '../utils/renderSvgOffscreen';
import { Maximize2 } from 'lucide-react';
import SailBuildPlaceholder from './SailBuildPlaceholder';
import { canRender3D, Device3DTier, supports3DForCorners } from '../utils/canRender3D';
import { ParsedSketchData } from '../utils/sketchParser';
import type { AdminProfile } from '../hooks/useAdminProfile';

const ShadeSail3DViewer = lazy(() => import('./ShadeSail3DViewer'));
const Expanded3DViewerModal = lazy(() => import('./Expanded3DViewerModal'));

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
  hasManuallyAdjustedShape: false,
  shapeMode: undefined,
  fixedShapeType: null
};

export function ShadeConfigurator({ adminMode = false, adminProfile, onAdminSaveComplete, initialQuoteId, initialQuoteToken }: ShadeConfiguratorProps = {}) {
  const [config, setConfig] = useState<ConfiguratorState>(INITIAL_STATE);
  const [openStep, setOpenStep] = useState<number>(0);
  const [desktopViewMode, setDesktopViewMode] = useState<'plan' | '3d'>('plan');
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [typoSuggestions, setTypoSuggestions] = useState<{ [key: string]: number }>({});
  const [dismissedTypoSuggestions, setDismissedTypoSuggestions] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' && window.innerWidth < 900);
  const [summaryWidth, setSummaryWidth] = useState(() => Math.round(window.innerWidth / 3));
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(390);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = summaryWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = dragStartXRef.current - ev.clientX;
      const next = Math.min(Math.max(dragStartWidthRef.current + delta, 320), window.innerWidth * 0.5);
      setSummaryWidth(next);
    };
    const onUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [summaryWidth]);

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
    firstName: string; lastName: string; email: string; quoteReference?: string; quoteName?: string; customerReference?: string;
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
  const fixedEdgeKeys = useMemo(() => {
    if (!highlightedMeasurement || config.shapeMode !== 'fixed' || !config.fixedShapeType) return undefined;
    switch (config.fixedShapeType) {
      case 'triangle': return new Set(['AB', 'BC', 'CA']);
      case 'square': return new Set(['AB', 'BC', 'CD', 'DA']);
      case 'rectangle':
        return highlightedMeasurement === 'AB' ? new Set(['AB', 'CD']) : new Set(['BC', 'DA']);
      case 'right-angle-triangle':
        return highlightedMeasurement === 'AB' ? new Set(['AB', 'BC']) : new Set(['CA', 'BC']);
      default: return undefined;
    }
  }, [highlightedMeasurement, config.shapeMode, config.fixedShapeType]);

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
  const measureGuideDismissRef = useRef<(() => void) | null>(null);
  const [isMeasureGuideVisible, setIsMeasureGuideVisible] = useState(false);
  const skipMeasureGuideRef = useRef(false);
  // 3D viewer ref for screenshot capture
  const viewer3DRef = useRef<{ capture3DScreenshot: () => Promise<string | null> }>(null);
  const [is3DExpanded, setIs3DExpanded] = useState(false);

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
      setIsMobile(window.innerWidth < 900);
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
  // For fixed shapes, always default to 3D on their dimensions step.
  useEffect(() => {
    if (!supports3DForCorners(config.corners)) {
      setDesktopViewMode('plan');
      setMobileViewMode('plan');
    } else if (!hasUserChosenView.current) {
      const isFixed = config.shapeMode === 'fixed';
      setDesktopViewMode(isFixed || device3DTier !== 'none' ? '3d' : 'plan');
      setMobileViewMode('plan');
    }
  }, [config.corners, device3DTier, config.shapeMode]);

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

        if (quote.customer_email) {
          setCapturedCustomerDetails({
            firstName: (quote as any).customer_first_name || '',
            lastName: (quote as any).customer_last_name || '',
            email: quote.customer_email,
            quoteReference: quote.quote_reference,
          });
        }

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
          : Math.min(Math.max(quote.current_step ?? 2, 0), reviewStep);
        setOpenStep(resumeStep);
        clearQuoteStash();

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

        if (quote.status === 'purchased' || quote.status === 'checkout_pending') {
          setCheckoutSnapshotSaved(true);
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

        reportClientError({
          message: error?.message || 'Quote load failed',
          stack: error?.stack ?? null,
          source: 'quote_load',
        });

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

        setCapturedCustomerDetails({
          firstName: (quote as any).customer_first_name || '',
          lastName: (quote as any).customer_last_name || '',
          email: quote.customer_email || '',
          quoteReference: quote.quote_reference,
          quoteName: quote.quote_name || '',
          customerReference: (quote as any).customer_reference || '',
        });

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
        Shape_Type: config.shapeMode === 'fixed' && config.fixedShapeType
          ? `Standard - ${config.fixedShapeType === 'right-angle-triangle' ? 'Right Angle Triangle' : config.fixedShapeType.charAt(0).toUpperCase() + config.fixedShapeType.slice(1)}`
          : `Custom made-to-measure (${config.corners} corners)`,
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
        statements_version: 'v2-2026-07',
        statements_snapshot: [
          'My measurements are point-to-point and I have checked them. Our team checks them again before anything is cut, and we will contact you if something looks off.',
          'My fixing points are in place and structurally sound.',
          'I understand this is made for me and cannot be resold, which is why it is not returnable — and why we back it with our Fit Guarantee.',
          'I am arranging my own installation. A step-by-step guide is included.',
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
    // Fixed shapes have known geometry -- diagonals are never required
    if (config.shapeMode === 'fixed') {
      return true;
    }

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
  }, [config.shapeMode, config.diagonalsInitiallyProvided, config.corners, config.measurements]);

  const allAcknowledgmentsChecked = agreedToAcknowledgments;

  // Check if heights are required and provided for 5+ corner sails
  const heightIsRequiredForCheckout = isHeightRequiredForCheckout(config.corners, config.measurementOption);
  const allHeightsProvided = areHeightsProvided(config.fixingHeights, config.corners);

  // Check if attachment types are required and all provided for checkout
  const allAttachmentTypesProvided = useMemo(() => {
    const attachmentRequired = config.corners >= 5 || (config.corners === 4 && config.heightsProvidedByUser);
    if (!attachmentRequired) return true;
    for (let i = 0; i < config.corners; i++) {
      if (config.fixingTypes?.[i] !== 'post' && config.fixingTypes?.[i] !== 'building') return false;
    }
    return true;
  }, [config.corners, config.heightsProvidedByUser, config.fixingTypes]);

  const isFixedShapeMode = config.shapeMode === 'fixed';
  const canAddToCart = allDiagonalsEntered &&
    (isFixedShapeMode || allAcknowledgmentsChecked) &&
    (!heightIsRequiredForCheckout || allHeightsProvided) &&
    (isFixedShapeMode || allAttachmentTypesProvided);

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
      ? hasAllEdgeMeasurements && openStep >= 2
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
  } else if (quoteParams) {
    try {
      setLoadingStep({ text: 'Preparing order details...', progress: 15 });
      const checkoutSnapshot = {
        config_data: config,
        calculations_data: calculations,
        locked_total: lockedQuote?.total ?? calculations.totalPrice ?? null,
        locked_currency: lockedQuote?.currency ?? config.currency ?? null,
        snapshotted_at: new Date().toISOString(),
      };
      await updateQuote(quoteParams.id, quoteParams.token, config, calculations, {
        status: 'checkout_pending',
        checkoutSnapshot,
      });
      setCheckoutSnapshotSaved(true);
      console.log('Updated existing quote config for checkout:', autoSavedRef);
    } catch (updateErr) {
      console.error('Checkout snapshot save failed — blocking cart:', updateErr);
      setLoading(false);
      setShowLoadingOverlay(false);
      showToast('Failed to prepare your order. Please try again.', 'error');
      return;
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
        Shape_Type: config.shapeMode === 'fixed' && config.fixedShapeType
          ? `Standard - ${config.fixedShapeType === 'right-angle-triangle' ? 'Right Angle Triangle' : config.fixedShapeType.charAt(0).toUpperCase() + config.fixedShapeType.slice(1)}`
          : `Custom made-to-measure (${config.corners} corners)`,
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
  const shouldSkipStep = (step: number): boolean => {
    const isFixed = config.shapeMode === 'fixed';
    switch (step) {
      case 2: // Dimensions (custom) - custom only
      case 5: // Hardware (custom) - custom only
        return isFixed;
      case 3: // Fixed Dimensions - fixed only
      case 6: // Fixed Hardware - fixed only
        return !isFixed;
      default:
        return false;
    }
  };

  // Helper function to get the actual next step (accounting for skips)
  const getActualNextStep = (currentStep: number): number => {
    let nextStep = currentStep + 1;
    while (nextStep <= 7 && shouldSkipStep(nextStep)) {
      nextStep++;
    }
    return Math.min(nextStep, 7);
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
      case 0: // Shape & Size
        if (config.shapeMode === 'custom') return config.corners >= 3 && config.corners <= 8;
        if (config.shapeMode === 'fixed') return !!config.fixedShapeType;
        return false;
      case 1: // Fabric & Finish
        return !!config.fabricType && !!config.fabricColor;
      case 2: // Dimensions (custom)
        if (config.corners === 0) return false;
        let edgeCount = 0;
        for (let i = 0; i < config.corners; i++) {
          const nextIndex = (i + 1) % config.corners;
          const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
          const measurement = config.measurements[edgeKey];
          if (measurement && measurement > 0) edgeCount++;
        }
        return edgeCount === config.corners;
      case 3: // Fixed Dimensions
        if (!config.fixedShapeType) return false;
        const needsTwo = config.fixedShapeType === 'right-angle-triangle' || config.fixedShapeType === 'rectangle';
        if (needsTwo) return (config.measurements['AB'] || 0) > 0 && (config.measurements['BC'] || 0) > 0;
        return (config.measurements['AB'] || 0) > 0;
      case 4: // Edge Style
        return !!config.edgeType;
      case 5: // Hardware Selection (custom)
        if (config.hardwareSelectionMode === 'manual') {
          const ch = config.cornerHardware || {};
          for (let i = 0; i < config.corners; i++) {
            if (!ch[i] || ch[i].length === 0) return false;
          }
          return true;
        }
        return true;
      case 6: // Fixed Hardware
        return true;
      case 7: // Review
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

    const isMobileView = window.innerWidth < 900;
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
        const isMobileView = window.innerWidth < 900;
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
      case 0: // Shape & Size
        if (config.shapeMode === 'custom') {
          if (config.corners < 3 || config.corners > 8) {
            errors.corners = 'Please select the number of fixing points (3-8)';
          }
        } else if (config.shapeMode === 'fixed') {
          if (!config.fixedShapeType) {
            errors.fixedShapeType = 'Please select a fixed shape';
          }
        } else {
          errors.shapeMode = 'Please select a shape type';
        }
        break;
      case 1: // Fabric & Finish
        if (!config.fabricType) {
          errors.fabricType = 'Please select a fabric type';
        }
        if (!config.fabricColor || config.fabricColor === '') {
          errors.fabricColor = 'Please select a fabric color';
        }
        break;
      case 2: // Dimensions (custom)
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
      case 3: // Fixed Dimensions
        {
          const needsTwo = config.fixedShapeType === 'right-angle-triangle' || config.fixedShapeType === 'rectangle';
          if (!config.measurements['AB'] || config.measurements['AB'] <= 0) {
            errors['AB'] = 'Please enter edge length';
          }
          if (needsTwo && (!config.measurements['BC'] || config.measurements['BC'] <= 0)) {
            errors['BC'] = 'Please enter edge length';
          }
        }
        break;
      case 4: // Edge Style
        if (!config.edgeType) {
          errors.edgeType = 'Please select an edge reinforcement type';
        }
        break;
      case 5: // Hardware Selection (custom)
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
      case 6: // Fixed Hardware - always optional
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

      // Determine if we need extra delay for heights section expansion
      const hasAttachmentErrors = Object.keys(errors).some(k => k.startsWith('attachmentType_'));
      const needsHeightsExpansion = hasAttachmentErrors && !isHeightsSectionOpen;

      // Prioritize scrolling to typo suggestions first, then other errors
      if (hasUnacknowledgedTypos) {
        const firstTypoKey = unacknowledgedTypos[0];
        scrollToErrorField(firstTypoKey, true);
      } else if (Object.keys(errors).length > 0) {
        const firstErrorKey = Object.keys(errors)[0];
        // If the first error is an attachment type and section needs expanding, use longer delay
        if (needsHeightsExpansion && firstErrorKey.startsWith('attachmentType_')) {
          setTimeout(() => scrollToErrorField(firstErrorKey, false), 500);
        } else {
          scrollToErrorField(firstErrorKey, false);
        }
      }

      return; // Don't proceed to next step
    }

    // If fixed shape selected at step 1, auto-set unit and measurementOption since those steps are skipped
    if (openStep === 0 && config.shapeMode === 'fixed') {
      if (!config.unit) {
        const autoUnit = config.currency === 'USD' ? 'imperial' : 'metric';
        updateConfig({ unit: autoUnit, measurementOption: 'adjust' });
      } else if (!config.measurementOption) {
        updateConfig({ measurementOption: 'adjust' });
      }
    }

    // If no validation errors, proceed to next step
    const nextStepIndex = getActualNextStep(openStep);

    const stepNames = ['Shape & Size', 'Fabric & Finish', 'Dimensions', 'Fixed Dimensions', 'Edge Style', 'Hardware', 'Fixed Hardware', 'Review & Purchase'];
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

    if (nextStepIndex === 7) {
      setDesktopViewMode('plan');
    }

    setTimeout(() => {
      smoothScrollToStep(nextStepIndex);
    }, (nextStepIndex === 7) ? (isMobile ? 600 : 500) : (isMobile ? 400 : 350));
  };

  const prevStep = (options?: { navigateToHeights?: boolean; navigateToDiagonals?: boolean }) => {
    const wantsDimensions = options?.navigateToHeights || options?.navigateToDiagonals;
    const prevStepIndex = wantsDimensions ? 2 : getActualPrevStep(openStep);

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
      case 0: // Shape & Size
        if (config.shapeMode === 'custom') return config.corners ? `Custom made-to-measure - ${config.corners} points` : 'Custom made-to-measure';
        if (config.shapeMode === 'fixed' && config.fixedShapeType) {
          const labels: Record<string, string> = { triangle: 'Triangle', 'right-angle-triangle': 'Right Angle Triangle', square: 'Square', rectangle: 'Rectangle' };
          return `Standard - ${labels[config.fixedShapeType]}`;
        }
        return 'Not selected';
      case 1: // Fabric & Finish
        const fabric = FABRICS.find(f => f.id === config.fabricType);
        const colorText = config.fabricColor ? ` - ${config.fabricColor}` : '';
        return fabric ? `${fabric.label}${colorText}` : 'Not selected';
      case 2: // Dimensions (custom)
        {
          let edgeCount = 0;
          for (let i = 0; i < config.corners; i++) {
            const nextIndex = (i + 1) % config.corners;
            const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
            if (config.measurements[edgeKey] && config.measurements[edgeKey] > 0) {
              edgeCount++;
            }
          }
          return edgeCount === config.corners ? `${edgeCount} edge measurements entered` : `${edgeCount}/${config.corners} edges measured`;
        }
      case 3: // Fixed Dimensions
        if (config.fixedShapeType && config.measurements['AB'] > 0) {
          return `Dimensions entered`;
        }
        return 'Not entered';
      case 4: // Edge Style
        return config.edgeType === 'cabled' ? 'Cabled Edge' : config.edgeType === 'webbing' ? 'Webbing Reinforced' : 'Not selected';
      case 5: // Hardware Selection (custom)
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
      case 6: // Fixed Hardware
        {
          const hasAny = config.cornerHardware && Object.values(config.cornerHardware).some(lines => lines.length > 0);
          return hasAny ? 'Hardware selected' : 'No hardware selected';
        }
      case 7: // Review
        return 'Ready for purchase';
      default:
        return 'Not selected';
    }
  };

  // Define step titles for navigation with dynamic skipping
  const getNextStepTitle = (currentStep: number): string => {
    const stepSubtitles = [
      'Shape & Size',
      'Fabric & Finish',
      'Dimensions',
      'Dimensions',
      'Edge Style',
      'Hardware',
      'Hardware',
      'see pricing'
    ];
    const actualNextStep = getActualNextStep(currentStep);
    if (actualNextStep === 7) return 'see pricing';
    return stepSubtitles[actualNextStep] || '';
  };
  const shouldShowBackButton = (currentStep: number) => currentStep > 0;

  const steps = [
    {
      title: 'Shape & Size',
      subtitle: 'Choose your shade sail shape',
      component: ShapeSizeContent
    },
    {
      title: 'Fabric & Finish',
      subtitle: 'Select fabric and color',
      component: MaterialFinishContent
    },
    {
      title: 'Dimensions',
      subtitle: 'Set precise measurements',
      component: DimensionsContent
    },
    {
      title: 'Dimensions',
      subtitle: 'Enter your shade sail dimensions',
      component: FixedShapeDimensionsContent
    },
    {
      title: 'Edge Style',
      subtitle: 'Choose edge reinforcement',
      component: EdgeTypeContent
    },
    {
      title: 'Hardware',
      subtitle: 'Choose corner hardware',
      component: HardwareContent
    },
    {
      title: 'Hardware',
      subtitle: 'Add mounting hardware (recommended)',
      component: FixedShapeHardwareContent
    },
    {
      title: 'Review & Purchase',
      subtitle: 'Confirm your order',
      component: ReviewContent
    }
  ];

  // Check if quote is ready (has price)
  const hasQuote = calculations.totalPrice > 0;

  // Handle save quote - auto-save silently if user has already saved once
  const [isSilentSaving, setIsSilentSaving] = useState(false);
  const [checkoutSnapshotSaved, setCheckoutSnapshotSaved] = useState(false);
  const handleSaveQuote = async () => {
    const canAutoSave = !adminMode && savedQuoteId && savedAccessToken && capturedCustomerDetails;
    if (!canAutoSave) {
      setShowUnifiedSaveModal(true);
      return;
    }

    // Never overwrite a quote that has already reached checkout or been purchased
    if (checkoutSnapshotSaved) {
      showToast('This quote has been sent to checkout. Start a new quote to make changes.', 'info');
      return;
    }

    setIsSilentSaving(true);
    try {
      let capturedCanvasUrl: string | null = null;
      try {
        const blob = await renderSailPngBlob(config, 800, 800);
        if (blob) {
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          capturedCanvasUrl = await uploadToQuoteAssets(blob, `shade-sail-${config.corners}corner-${ts}.png`) || null;
        }
      } catch {}

      let capturedCanvas3DUrl: string | null = null;
      try {
        const screenshot = await viewer3DRef.current?.capture3DScreenshot();
        if (screenshot) {
          const blob3d = await fetch(screenshot).then(r => r.blob());
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          capturedCanvas3DUrl = await uploadToQuoteAssets(blob3d, `shade-sail-3d-${config.corners}corner-${ts}.png`) || null;
        }
      } catch {}

      await updateQuote(savedQuoteId, savedAccessToken, config, calculations, {
        email: capturedCustomerDetails.email,
        firstName: capturedCustomerDetails.firstName,
        lastName: capturedCustomerDetails.lastName,
        currentStep: openStep,
        totalSteps: steps.filter((_, i) => !shouldSkipStep(i)).length,
        pricingSnapshot: pricingSettingsMap,
        canvasImageUrl: capturedCanvasUrl,
        canvasImage3DUrl: capturedCanvas3DUrl,
        status: 'in_progress',
      });

      showToast('Progress saved!', 'success');
    } catch (err) {
      console.error('Silent auto-save failed:', err);
      setShowUnifiedSaveModal(true);
    } finally {
      setIsSilentSaving(false);
    }
  };

  // Handle sketch upload apply - fills configurator with AI-extracted data and advances
  const handleSketchApply = (data: ParsedSketchData) => {
    const corners = data.corners;

    // Generate default polygon points
    const centerX = 300;
    const centerY = 300;
    const radius = 160;
    let points: { x: number; y: number }[] = [];

    if (corners === 5) {
      points = [
        { x: 156, y: 180 }, { x: 300, y: 140 }, { x: 444, y: 180 },
        { x: 420, y: 420 }, { x: 180, y: 420 }
      ];
    } else if (corners === 6) {
      points = [
        { x: 156, y: 156 }, { x: 300, y: 140 }, { x: 444, y: 156 },
        { x: 444, y: 444 }, { x: 300, y: 460 }, { x: 156, y: 444 }
      ];
    } else {
      for (let i = 0; i < corners; i++) {
        const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
        points.push({
          x: Math.round(centerX + radius * Math.cos(angle)),
          y: Math.round(centerY + radius * Math.sin(angle)),
        });
      }
    }

    // Convert measurements from base unit (meters/feet) to mm
    const toMm = data.unit === 'imperial' ? 304.8 : 1000;

    // Generate the expected edge keys for this corner count
    const cornerLabels = 'ABCDEFGH'.slice(0, corners);
    const expectedEdgeKeys: string[] = [];
    for (let i = 0; i < corners; i++) {
      expectedEdgeKeys.push(cornerLabels[i] + cornerLabels[(i + 1) % corners]);
    }
    const expectedDiagKeys = getDiagonalKeysForCorners(corners);

    // Classify all measurements using geometric rule:
    // For shade sails, diagonals are always longer than edges.
    // Pool all values, sort, and assign smallest N to edges, rest to diagonals.
    const allValues = [
      ...data.edges.map(e => ({ value: e.value, origLabel: e.label, origType: 'edge' as const })),
      ...data.diagonals.map(d => ({ value: d.value, origLabel: d.label, origType: 'diagonal' as const })),
    ];

    // Sort by value ascending - smallest values are edges, largest are diagonals
    allValues.sort((a, b) => a.value - b.value);

    const measurements: { [key: string]: number } = {};

    if (allValues.length >= corners) {
      // Take the N smallest as edges (in their original clockwise order from AI)
      // First, separate using the geometric rule
      const edgePool = allValues.slice(0, corners);
      const diagPool = allValues.slice(corners);

      // For edge ordering: use the AI's original clockwise order for edge values
      // The AI returns edges in clockwise order (position 1, 2, 3, etc.)
      // Find which of the original AI edges ended up in our edge pool
      const aiEdgeOrder = data.edges.map(e => e.value);
      const aiDiagValues = data.diagonals.map(d => d.value);

      // Match edge values back to their clockwise position
      // Strategy: the edge pool values should be assigned to edge keys in
      // the same relative order the AI originally provided them
      const edgeValues = edgePool.map(e => e.value);

      // Try to preserve AI's clockwise ordering by matching original positions
      const orderedEdgeValues: number[] = [];
      const usedIndices = new Set<number>();

      // For each expected edge position, find the best matching value
      // from the AI's original edge array (preserving clockwise order)
      for (let pos = 0; pos < corners; pos++) {
        if (pos < aiEdgeOrder.length) {
          // Check if this AI edge value is in our edge pool
          const aiVal = aiEdgeOrder[pos];
          const poolIdx = edgeValues.findIndex((v, i) => !usedIndices.has(i) && Math.abs(v - aiVal) < 0.001);
          if (poolIdx >= 0) {
            orderedEdgeValues.push(edgeValues[poolIdx]);
            usedIndices.add(poolIdx);
          }
        }
      }
      // Add any remaining edge pool values that weren't matched
      for (let i = 0; i < edgeValues.length; i++) {
        if (!usedIndices.has(i)) {
          orderedEdgeValues.push(edgeValues[i]);
        }
      }

      // Assign edges to their positional keys (AB, BC, CD, DA, etc.)
      for (let i = 0; i < Math.min(orderedEdgeValues.length, expectedEdgeKeys.length); i++) {
        measurements[expectedEdgeKeys[i]] = orderedEdgeValues[i] * toMm;
      }

      // Assign diagonals to diagonal keys in order
      for (let i = 0; i < Math.min(diagPool.length, expectedDiagKeys.length); i++) {
        measurements[expectedDiagKeys[i]] = diagPool[i].value * toMm;
      }
    } else {
      // Not enough measurements to fill all edges - just assign what we have
      // Use edge values for edges, diagonal values for diagonals (trust AI classification)
      for (let i = 0; i < Math.min(data.edges.length, expectedEdgeKeys.length); i++) {
        measurements[expectedEdgeKeys[i]] = data.edges[i].value * toMm;
      }
      for (let i = 0; i < Math.min(data.diagonals.length, expectedDiagKeys.length); i++) {
        measurements[expectedDiagKeys[i]] = data.diagonals[i].value * toMm;
      }
    }

    const fixingHeights: number[] = Array(corners).fill(undefined);
    for (const h of data.heights) {
      const idx = cornerLabels.indexOf(h.corner.toUpperCase());
      if (idx >= 0 && idx < corners) {
        fixingHeights[idx] = h.value * toMm;
      }
    }

    // Advance to the Dimensions step (index 2) so user can review measurements
    const measurementOptionsStepIndex = 2;

    // Apply all data in one batch
    updateConfig({
      step: 2,
      measurementOption: 'adjust',
      shapeMode: 'custom',
      fixedShapeType: null,
      corners,
      unit: data.unit,
      points,
      measurements,
      fixingHeights,
      fixingTypes: Array(corners).fill(''),
      eyeOrientations: Array(corners).fill(''),
      attachmentTypes: Array(corners).fill(''),
      fixingPointsInstalled: undefined,
      diagonalsInitiallyProvided: data.diagonals.length > 0 ? true : undefined,
      heightsProvidedByUser: data.heights.length > 0 ? true : undefined,
      hasManuallyAdjustedShape: false,
    });

    setOpenStep(measurementOptionsStepIndex);
    setSketchAppliedBanner(true);
  };

  const [sketchAppliedBanner, setSketchAppliedBanner] = useState(false);

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

  const visibleSteps = steps
    .map((s, i) => ({ ...s, originalIndex: i }))
    .filter(s => !shouldSkipStep(s.originalIndex));

  const currentDisplayStep = visibleSteps.findIndex(s => s.originalIndex === openStep);
  const totalVisibleSteps = visibleSteps.length;

  const getRailSubtitle = (stepIndex: number): string => {
    switch (stepIndex) {
      case 0:
        if (config.shapeMode === 'fixed' && config.fixedShapeType)
          return config.fixedShapeType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (config.shapeMode === 'custom' && config.corners >= 3)
          return `Custom ${config.corners}-point`;
        return 'Choose your shape';
      case 1:
        if (config.fabricType && config.fabricColor) {
          const fab = FABRICS.find(f => f.id === config.fabricType);
          return `${fab?.label || config.fabricType}, ${config.fabricColor}`;
        }
        return 'Select fabric and color';
      case 2: case 3: return 'Set measurements';
      case 4: return config.edgeType ? (config.edgeType === 'cabled' ? 'Cabled edge' : 'Webbing reinforced') : 'Choose edge style';
      case 5: case 6: return config.hardwareSelectionMode ? (config.hardwareSelectionMode === 'standard' ? 'Hardware kit' : config.hardwareSelectionMode === 'manual' ? 'Manual selection' : 'No hardware') : 'Choose hardware';
      case 7: return 'Confirm your order';
      default: return '';
    }
  };

  const railSteps = visibleSteps.map((s) => ({
    label: s.title,
    subtitle: getRailSubtitle(s.originalIndex),
    completed: s.originalIndex < config.step,
    current: s.originalIndex === openStep,
    accessible: s.originalIndex <= config.step,
  }));

  const mobileStepLabels = visibleSteps.map(s => s.title);

  const handleRailStepClick = (displayIndex: number) => {
    const step = visibleSteps[displayIndex];
    if (step && step.originalIndex <= config.step && step.originalIndex !== openStep) {
      const centeredPoints = centerShape(config.points);
      updateConfig({ points: centeredPoints });
      if (step.originalIndex === 2 || step.originalIndex === 3) {
        skipMeasureGuideRef.current = true;
      }
      setOpenStep(step.originalIndex);
      setTimeout(() => {
        smoothScrollToStep(step.originalIndex);
      }, isMobile ? 400 : 350);
    }
  };

  const isDiagramStep = openStep === 2 || openStep === 3 || openStep === 5 || openStep === 6;
  const isReviewStep = openStep === 7;
  const ActiveStepComponent = steps[openStep]?.component;

  // Compute footer state per step
  const footerNextLabel = isReviewStep
    ? `Add to cart${calculations.totalPrice > 0 && hasAllEdgeMeasurements ? ' \u00b7 ' + formatCurrency(calculations.totalPrice, config.currency) : ''}`
    : ((openStep === 2 || openStep === 3) && isMeasureGuideVisible)
      ? `Continue > Dimensions`
      : `Continue > ${getNextStepTitle(openStep)}`;

  const footerDisableNext = (() => {
    switch (openStep) {
      case 0: return !config.shapeMode || (config.shapeMode === 'custom' && (config.corners < 3 || config.corners > 8)) || (config.shapeMode === 'fixed' && !config.fixedShapeType);
      case 1: return !config.fabricType || !config.fabricColor;
      case 7: return !canAddToCart;
      default: return false;
    }
  })();

  const footerDisabledHint = (() => {
    switch (openStep) {
      case 0:
        if (!config.shapeMode) return 'Choose a shape to continue';
        if (config.shapeMode === 'custom' && config.corners < 3) return 'Select fixing points';
        return 'Select a shape';
      case 1:
        if (!config.fabricType) return 'Choose a fabric to continue';
        if (!config.fabricColor) return 'Choose a color to continue';
        return '';
      case 7:
        if (!allDiagonalsEntered) return 'Enter diagonals to continue';
        if (!allAcknowledgmentsChecked && config.shapeMode !== 'fixed') return 'Accept all acknowledgements';
        return '';
      default: return '';
    }
  })();

  const footerPriceDisplay = calculations.totalPrice > 0 && hasAllEdgeMeasurements
    ? formatCurrency(calculations.totalPrice, config.currency)
    : undefined;

  return (
    <>
      {/* Mobile Header with progress */}
      <MobileHeader
        currentStep={currentDisplayStep + 1}
        totalSteps={totalVisibleSteps}
        stepLabels={mobileStepLabels}
        onSave={openStep > 0 ? handleSaveQuote : undefined}
        onStepClick={handleRailStepClick}
      />

      <div className="flex bg-surface-panel min-h-screen">
        {/* Left Rail Navigation - tablet+ */}
        <StepRail steps={railSteps} onStepClick={handleRailStepClick} onSave={openStep > 0 ? handleSaveQuote : undefined} />

        {/* Main content area */}
        <div className="flex-1 min-w-0 flex flex-col bg-surface-panel">
          <div className="flex-1 overflow-y-auto">
          <div className="max-w-content mx-auto px-4 tablet:px-6 desktop:px-8 py-6 tablet:py-8 pb-24 w-full">
            {/* Quote Reference */}
            {quoteReference && (
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-brand-lime/15 border border-brand-lime/30 rounded-full">
                <span className="text-sm font-semibold text-brand-green">
                  Quote: {quoteReference}
                </span>
              </div>
            )}

            {purchasedOrder && (
              <div className="mb-4 bg-teal-50 border border-teal-200 rounded-card p-4 flex items-center gap-3">
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

            {/* Step heading */}
            <div className="mb-6">
              <div className="flex items-center gap-0">
                <h1 className="text-heading font-extrabold text-brand-green leading-tight">
                  {steps[openStep]?.title}
                </h1>
                {STEP_HELP_CONTENT[openStep] && (
                  <HelpPopover content={STEP_HELP_CONTENT[openStep]} />
                )}
              </div>
              <p className="mt-1 text-text-muted text-base">
                {steps[openStep]?.subtitle}
              </p>
            </div>

            {/* Sketch applied banner */}
            {openStep === 2 && sketchAppliedBanner && (
              <div className="mb-4 flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-card">
                <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-emerald-800">Your sketch measurements have been applied. Please review them below, then continue.</p>
                <button onClick={() => setSketchAppliedBanner(false)} className="ml-auto text-emerald-600 hover:text-emerald-800 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Step content */}
              <div className="min-w-0">
                {ActiveStepComponent && (
                  <ActiveStepComponent
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
                    nextStepTitle={getNextStepTitle(openStep)}
                    showBackButton={shouldShowBackButton(openStep)}
                    isMobile={isMobile}
                    isStepOpen={true}
                    setHighlightedMeasurement={setHighlightedMeasurement}
                    highlightedMeasurement={highlightedMeasurement}
                    highlightedCorner={highlightedCorner}
                    setHighlightedCorner={setHighlightedCorner}
                    canvasRef={canvasRef}
                    measureGuideDismissRef={measureGuideDismissRef}
                    onMeasureGuideVisibilityChange={setIsMeasureGuideVisible}
                    skipMeasureGuide={skipMeasureGuideRef}
                    ref={openStep === 7 ? reviewContentRef : undefined}
                    fabrics={FABRICS}
                    loading={loading}
                    setLoading={setLoading}
                    setShowLoadingOverlay={setShowLoadingOverlay}
                    onSaveQuote={openStep > 0 ? handleSaveQuote : undefined}
                    onSwitchToCustom={(keepMeasurements: boolean) => {
                      const corners = config.corners || (config.fixedShapeType === 'triangle' || config.fixedShapeType === 'right-angle-triangle' ? 3 : 4);
                      const resetFields = { cornerHardware: {}, fixingTypes: undefined, eyeOrientations: undefined };
                      if (keepMeasurements) {
                        updateConfig({ shapeMode: 'custom', fixedShapeType: null, corners, measurementOption: 'adjust', hardwareSelectionMode: undefined, ...resetFields });
                      } else {
                        updateConfig({ shapeMode: 'custom', fixedShapeType: null, corners, measurementOption: 'adjust', hardwareSelectionMode: undefined, measurements: {}, points: generateRegularPolygonPoints(corners), fixingHeights: Array(corners).fill(0), ...resetFields });
                      }
                      setOpenStep(2);
                      setConfig(prev => ({ ...prev, step: Math.max(prev.step, 2) }));
                      setTimeout(() => smoothScrollToStep(2), 150);
                    }}
                    onSwitchToFixed={openStep === 2 ? (shape: import('../types').FixedShapeType, keepMeasurements: boolean) => {
                      const corners = shape === 'triangle' || shape === 'right-angle-triangle' ? 3 : 4;
                      if (keepMeasurements) {
                        const edgeA = config.measurements['AB'] || 0;
                        const edgeB = shape === 'rectangle' ? (config.measurements['BC'] || 0) : shape === 'right-angle-triangle' ? (config.measurements['CA'] || 0) : edgeA;
                        const newMeasurements = computeFixedShapeMeasurements(shape, edgeA, edgeB);
                        const points = generateFixedShapePoints(shape, newMeasurements);
                        updateConfig({ shapeMode: 'fixed', fixedShapeType: shape, corners, measurements: newMeasurements, points, measurementOption: 'exact', hardwareSelectionMode: 'standard' });
                      } else {
                        updateConfig({ shapeMode: 'fixed', fixedShapeType: shape, corners, measurements: {}, points: generateFixedShapePoints(shape, {}), measurementOption: 'exact', hardwareSelectionMode: 'standard', fixingHeights: Array(corners).fill(0) });
                      }
                      setOpenStep(3);
                      setConfig(prev => ({ ...prev, step: Math.max(prev.step, 3) }));
                    } : undefined}
                    onSketchApply={openStep === 2 ? handleSketchApply : undefined}
                    quoteReference={quoteReference}
                    viewMode={openStep === 7 ? desktopViewMode : undefined}
                    onViewModeChange={openStep === 7 ? handleDesktopViewModeChange : undefined}
                    navigateToHeights={openStep === 2 ? navigateToHeights : undefined}
                    setNavigateToHeights={openStep === 2 ? setNavigateToHeights : undefined}
                    navigateToDiagonals={openStep === 2 ? navigateToDiagonals : undefined}
                    setNavigateToDiagonals={openStep === 2 ? setNavigateToDiagonals : undefined}
                    onHeightsSectionChange={openStep === 2 ? setIsHeightsSectionOpen : undefined}
                    device3DTier={device3DTier}
                    mobileViewMode={mobileViewMode}
                    onMobileViewModeChange={handleMobileViewModeChange}
                    pricingSettingsMap={activePricingMap}
                    adminMode={adminMode}
                  />
                )}
              </div>
          </div>
          </div>

          {/* Global sticky bottom bar */}
          <StepNavigationFooter
            onNext={isReviewStep ? handleAddToCartFromConfigurator : () => {
              if (measureGuideDismissRef.current) {
                measureGuideDismissRef.current();
                return;
              }
              nextStep();
            }}
            onPrev={prevStep}
            showBack={shouldShowBackButton(openStep)}
            nextLabel={footerNextLabel}
            disableNext={footerDisableNext}
            disabledHint={footerDisabledHint}
            priceDisplay={footerPriceDisplay}
            isReview={isReviewStep}
            isMobile={isMobile}
          />

          <LoadingOverlay
            isVisible={showLoadingOverlay}
            currentStep={loadingStep.text}
            progress={loadingStep.progress}
          />
        </div>

        {/* Right summary panel - desktop only, DIRECT SIBLING */}
        {!isMobile && (
          <>
            <div
              onMouseDown={handleResizeStart}
              className="hidden desktop:flex w-[6px] flex-shrink-0 cursor-col-resize items-center justify-center sticky top-0 h-screen bg-transparent hover:bg-border-card/50 active:bg-border-card transition-colors group z-10"
            >
              <div className="w-[2px] h-8 rounded-full bg-border-card group-hover:bg-brand-green/30 group-active:bg-brand-green/50 transition-colors" />
            </div>
            <aside
              className="hidden desktop:block flex-shrink-0 bg-white sticky top-0 h-screen overflow-y-auto"
              style={{ width: summaryWidth }}
            >
            <div className="p-[28px_24px] flex flex-col gap-4 min-h-full">
                    {/* Sail diagram viewer - always shown */}
                    {isReviewStep ? (
                      <PriceSummaryDisplay
                        config={config}
                        calculations={calculations}
                        onSaveQuote={handleSaveQuote}
                        allAcknowledgmentsChecked={allAcknowledgmentsChecked}
                        canAddToCart={canAddToCart}
                        handleAddToCart={handleAddToCartFromConfigurator}
                        loading={loading}
                        fabrics={FABRICS}
                        isEmailMode={hasAllEdgeMeasurements}
                        adminMode={adminMode}
                      />
                    ) : (
                      <>
                        {/* Your sail viewer card */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-extrabold text-[16px] text-brand-green">Your sail</h4>
                            {config.corners >= 3 && (() => {
                              const desktop3DAvailable = supports3DForCorners(config.corners);
                              if (!desktop3DAvailable) return null;
                              const effectiveDesktopView = desktop3DAvailable ? desktopViewMode : 'plan';
                              return (
                                <div className="flex border-2 border-brand-green rounded-[10px] overflow-hidden">
                                  <button
                                    onClick={() => handleDesktopViewModeChange('plan')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold transition-all ${
                                      effectiveDesktopView === 'plan'
                                        ? 'bg-brand-green text-white'
                                        : 'text-brand-green hover:bg-surface-soft'
                                    }`}
                                  >
                                    Plan
                                  </button>
                                  <button
                                    onClick={() => handleDesktopViewModeChange('3d')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold transition-all ${
                                      effectiveDesktopView === '3d'
                                        ? 'bg-brand-green text-white'
                                        : 'text-brand-green hover:bg-surface-soft'
                                    }`}
                                  >
                                    3D
                                  </button>
                                </div>
                              );
                            })()}
                          </div>

                          {config.corners >= 3 ? (() => {
                            const desktopShapeAccuracy = getShapeAccuracy(config.measurements, config.corners);
                            const desktopDiagonalKeys = config.corners >= 4 ? getDiagonalKeysForCorners(config.corners) : [];
                            const desktopMinDiagonals = config.corners >= 4 ? config.corners - 3 : 0;
                            const desktopProvidedDiagonals = desktopDiagonalKeys.filter(key => config.measurements[key] && config.measurements[key] > 0).length;
                            const desktopHasEnoughDiagonals = desktopProvidedDiagonals >= desktopMinDiagonals && desktopMinDiagonals > 0;
                            const desktop3DAvailable = supports3DForCorners(config.corners);
                            const effectiveDesktopView = desktop3DAvailable ? desktopViewMode : 'plan';

                            return (
                              <div className="bg-surface-panel rounded-card p-[14px]">
                                {(openStep === 5 || openStep === 6) && effectiveDesktopView === 'plan' && (
                                  <p className="text-sm text-text-muted mb-3">
                                    Hover over a corner below to see which corner you are configuring.
                                  </p>
                                )}

                                {effectiveDesktopView === 'plan' ? (
                                  isDiagramStep ? (
                                    <div>
                                      <ShapeCanvas
                                        config={config}
                                        updateConfig={updateConfig}
                                        readonly={openStep !== 2 && openStep !== 3}
                                        snapToGrid={true}
                                        highlightedMeasurement={highlightedMeasurement}
                                        highlightedCorner={highlightedCorner}
                                        highlightedEdgeKeys={fixedEdgeKeys}
                                        isMobile={isMobile}
                                        measurementOption={config.measurementOption}
                                        unit={config.unit}
                                      />
                                      {(openStep === 2 || openStep === 3) && config.corners >= 4 && (
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
                                      highlightedEdgeKeys={fixedEdgeKeys}
                                      isMobile={isMobile}
                                      measurementOption={config.measurementOption}
                                      unit={config.unit}
                                    />
                                  )
                                ) : (
                                  <div className="h-[400px] relative group/viewer3d">
                                    <Suspense fallback={
                                      <div className="flex items-center justify-center h-full bg-surface-panel rounded-lg border border-border-card">
                                        <div className="text-center">
                                          <div className="animate-spin w-8 h-8 border-3 border-border-card border-t-brand-green rounded-full mx-auto mb-3"></div>
                                          <p className="text-sm text-text-muted">Loading 3D viewer...</p>
                                        </div>
                                      </div>
                                    }>
                                      <ShadeSail3DViewer
                                        ref={viewer3DRef}
                                        config={config}
                                        highlightedMeasurement={highlightedMeasurement}
                                        highlightedCorner={highlightedCorner}
                                        activeSection={(openStep === 5 || openStep === 6) ? 'hardware' : isHeightsSectionOpen ? 'heights' : 'dimensions'}
                                      />
                                    </Suspense>
                                    <button
                                      onClick={() => setIs3DExpanded(true)}
                                      className="absolute bottom-3 right-3 p-2 bg-white/90 hover:bg-white rounded-lg shadow-md border border-border-card text-text-muted hover:text-brand-green transition-all duration-150 sm:opacity-0 sm:group-hover/viewer3d:opacity-100 sm:focus:opacity-100 z-10"
                                      title="Expand 3D viewer"
                                    >
                                      <Maximize2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })() : (
                            <SailBuildPlaceholder />
                          )}
                        </div>

                        {/* Price card */}
                        <div className="bg-brand-green rounded-card p-[18px_20px]">
                          {calculations.totalPrice > 0 ? (
                            <>
                              <div className="text-[12px] font-bold text-[#9fc4ad] uppercase tracking-wide">Estimated total</div>
                              <div className="text-[32px] font-extrabold text-brand-lime leading-none mt-0.5" style={{ letterSpacing: '-0.03em' }}>
                                {formatCurrency(calculations.totalPrice, config.currency)}
                              </div>
                              <div className="mt-1 text-[13px] text-[#cfe3d4]">All-inclusive to your door. Updates as you go.</div>
                              {calculations.hardwareBreakdown?.hardwareOnlyLivePrice > 0 && (
                                <div className="mt-2 text-[13px] text-[#cfe3d4]">
                                  Includes {formatCurrency(calculations.hardwareBreakdown.hardwareOnlyLivePrice, config.currency)} hardware
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="text-[12px] font-bold text-[#9fc4ad] uppercase tracking-wide">Estimated total</div>
                              <div className="text-[14px] text-[#cfe3d4] mt-1">
                                Price appears after sizing
                              </div>
                            </>
                          )}
                        </div>

                        {/* Selections summary */}
                        <div className="flex flex-col">
                          {[
                            { label: 'Fabric', value: config.fabricType ? FABRICS.find(f => f.id === config.fabricType)?.label : '\u2014' },
                            { label: 'Color', value: config.fabricColor || '\u2014' },
                            { label: 'Shape', value: config.shapeMode ? (config.shapeMode === 'fixed' && config.fixedShapeType ? config.fixedShapeType.replace(/-/g, ' ') : config.shapeMode === 'custom' && config.corners >= 3 ? `Custom ${config.corners}-point` : config.shapeMode) : '\u2014' },
                            { label: 'Edge', value: config.edgeType ? config.edgeType : '\u2014' },
                            { label: 'Hardware', value: config.hardwareSelectionMode ? (config.hardwareSelectionMode === 'standard' ? 'Hardware kit' : config.hardwareSelectionMode === 'manual' ? 'Manual' : 'None') : '\u2014' },
                          ].map((row) => (
                            <div key={row.label} className="flex justify-between gap-3 text-[14px] py-[9px] border-b border-[#eef2ee]">
                              <span className="text-text-muted">{row.label}</span>
                              <span className="font-bold text-right capitalize">{row.value}</span>
                            </div>
                          ))}
                        </div>

                        {/* Fit Guarantee note */}
                        {config.shapeMode === 'custom' && (
                          <div className="text-[13px] text-[#23503f] bg-surface-soft rounded-xl p-[12px_14px] leading-relaxed">
                            <strong>Fit Guarantee.</strong> Doesn&rsquo;t fit the space you measured? We remake it free.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </aside>
              </>
            )}
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
          existingCustomerDetails={capturedCustomerDetails ?? undefined}
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
          totalSteps={steps.filter((_, i) => !shouldSkipStep(i)).length}
          shouldShowEmailOption={openStep === 7 && hasAllEdgeMeasurements}
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
          initialCustomerDetails={capturedCustomerDetails}
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

      {is3DExpanded && (
        <Suspense fallback={null}>
          <Expanded3DViewerModal
            isOpen={is3DExpanded}
            onClose={() => setIs3DExpanded(false)}
            config={config}
            highlightedMeasurement={highlightedMeasurement}
            highlightedCorner={highlightedCorner}
            activeSection={(openStep === 5 || openStep === 6) ? 'hardware' : isHeightsSectionOpen ? 'heights' : 'dimensions'}
          />
        </Suspense>
      )}
    </>
  );
}