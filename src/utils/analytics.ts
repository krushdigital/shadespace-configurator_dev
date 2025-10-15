declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export interface GAEventProperties {
  [key: string]: string | number | boolean | undefined;
}

/**
 * GOOGLE ANALYTICS EVENT TRACKING
 *
 * This file contains 100+ event tracking functions for the Shade Configurator.
 * All events are sent to Google Analytics 4 (GA4) via the gtag.js library.
 *
 * EVENT CATEGORIES:
 *
 * 1. SESSION & INITIALIZATION (5 events)
 *    - configurator_loaded, configurator_session_start, configurator_timeout
 *    - form_abandoned, mobile_view_detected
 *
 * 2. STEP NAVIGATION (11 events)
 *    - step_[N]_viewed, step_[N]_completed, step_[N]_validation_error
 *    - step_opened, step_closed, next_button_clicked, back_button_clicked
 *    - step_navigation_error, step_auto_scrolled, mobile_step_navigation
 *
 * 3. FABRIC SELECTION (4 events)
 *    - fabric_type_selected, fabric_color_selected
 *    - fabric_details_viewed, fabric_link_clicked
 *
 * 4. EDGE TYPE (2 events)
 *    - edge_type_selected, edge_type_details_viewed
 *
 * 5. FIXING POINTS & SHAPE (1 event)
 *    - fixing_points_selected
 *
 * 6. MEASUREMENT (8 events)
 *    - unit_selected, measurement_option_selected, measurement_option_tooltip_viewed
 *    - edge_measurement_entered, diagonal_measurement_entered
 *    - measurement_field_focused, measurement_field_highlighted
 *
 * 7. TYPO DETECTION & SUGGESTIONS (3 events)
 *    - typo_suggestion_shown, typo_suggestion_accepted, typo_suggestion_dismissed
 *
 * 8. VALIDATION (3 events)
 *    - perimeter_limit_exceeded, diagonal_validation_error
 *    - validation_error_displayed, error_field_scrolled
 *
 * 9. HARDWARE & FIXING (8 events)
 *    - hardware_info_viewed, hardware_link_clicked
 *    - anchor_height_entered, fixing_type_selected, eye_orientation_selected
 *    - anchor_height_typo_suggestion_shown, anchor_height_typo_accepted
 *    - anchor_height_typo_dismissed
 *
 * 10. CANVAS INTERACTION (8 events)
 *     - canvas_rendered, canvas_point_hover, canvas_edge_hover
 *     - canvas_point_dragged, canvas_snap_to_grid, canvas_svg_exported
 *
 * 11. CALCULATION (4 events)
 *     - price_calculated, area_calculated
 *     - perimeter_calculated, wire_thickness_calculated
 *
 * 12. PRICE SUMMARY & CURRENCY (2 events)
 *     - price_summary_viewed, currency_changed
 *
 * 13. ACKNOWLEDGMENT (3 events)
 *     - acknowledgment_checked, acknowledgment_unchecked
 *     - all_acknowledgments_completed
 *
 * 14. PDF GENERATION (3 events)
 *     - pdf_quote_clicked, pdf_generated_success, pdf_generation_failed
 *
 * 15. EMAIL (6 events)
 *     - email_summary_button_clicked, email_address_entered
 *     - email_summary_sent, email_send_failed, email_input_cancelled
 *     - email_summary_sent_with_shopify
 *
 * 16. CART & PRODUCT (10 events)
 *     - add_to_cart_clicked, add_to_cart_blocked
 *     - product_creation_started, product_created_success, product_creation_failed
 *     - cart_add_started, cart_add_success, cart_add_failed, redirect_to_cart
 *
 * 17. QUOTE SAVE MODAL (8 events)
 *     - quote_save_modal_opened, quote_save_method_selected
 *     - quote_save_email_entered, quote_save_success, quote_save_failed
 *     - quote_save_modal_cancelled, quote_link_generated, quote_link_copied
 *     - quote_save_completed
 *
 * 18. QUOTE LOADING (3 events)
 *     - quote_load_attempted, quote_load_success, quote_load_failed
 *
 * 19. QUOTE SEARCH & MANAGEMENT (3 events)
 *     - quote_search_modal_opened, quote_search_performed
 *     - quote_search_modal_closed
 *
 * 20. SHOPIFY INTEGRATION (3 events)
 *     - shopify_customer_created, shopify_customer_creation_failed
 *     - shopify_customer_updated
 *
 * 21. CONVERSION TRACKING (1 event)
 *     - quote_converted_to_cart
 *
 * 22. ERROR TRACKING (1 event)
 *     - error_occurred (via trackError function)
 *
 * TOTAL: 100+ distinct event types
 *
 * USAGE:
 * Import the analytics object and call methods directly:
 *   import { analytics } from '@/utils/analytics';
 *   analytics.fabricTypeSelected('sunbrella', 'Sunbrella Premium');
 */

/**
 * Core function to send events to Google Analytics
 */
export const trackEvent = (eventName: string, properties?: GAEventProperties): void => {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('event', eventName, properties);
    console.log('📊 GA Event:', eventName, properties);
  } else {
    console.warn('⚠️ Google Analytics not initialized. Event:', eventName, properties);
  }
};

/**
 * Track page view changes
 */
export const trackPageView = (pagePath: string, pageTitle?: string): void => {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('config', 'G-V8131RB72K', {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
};

/**
 * Track timing/performance metrics
 */
export const trackTiming = (
  name: string,
  value: number,
  category?: string,
  label?: string
): void => {
  trackEvent('timing_complete', {
    name,
    value,
    event_category: category,
    event_label: label,
  });
};

/**
 * Track errors that occur in the application
 */
export const trackError = (
  errorMessage: string,
  errorType: string,
  fatal: boolean = false
): void => {
  trackEvent('error_occurred', {
    error_message: errorMessage,
    error_type: errorType,
    fatal: fatal ? 'true' : 'false',
  });
};

export const analytics = {
  // ============================================================================
  // SESSION & INITIALIZATION EVENTS
  // ============================================================================

  configuratorLoaded: (properties?: GAEventProperties) => {
    trackEvent('configurator_loaded', {
      timestamp: new Date().toISOString(),
      ...properties,
    });
  },

  sessionStart: (sessionId: string) => {
    trackEvent('configurator_session_start', {
      session_id: sessionId,
      entry_point: window.location.href,
    });
  },

  // ============================================================================
  // STEP NAVIGATION EVENTS
  // ============================================================================

  stepViewed: (stepNumber: number, stepName: string) => {
    trackEvent(`step_${stepNumber}_viewed`, {
      step_number: stepNumber,
      step_name: stepName,
    });
  },

  stepCompleted: (stepNumber: number, stepName: string, timeSpent: number, data?: GAEventProperties) => {
    trackEvent(`step_${stepNumber}_completed`, {
      step_number: stepNumber,
      step_name: stepName,
      time_spent_seconds: timeSpent,
      ...data,
    });
  },

  stepValidationError: (stepNumber: number, errorType: string, errorMessage: string) => {
    trackEvent(`step_${stepNumber}_validation_error`, {
      step_number: stepNumber,
      error_type: errorType,
      error_message: errorMessage,
    });
  },

  // ============================================================================
  // FABRIC SELECTION EVENTS
  // ============================================================================

  fabricTypeSelected: (fabricType: string, fabricLabel: string) => {
    trackEvent('fabric_type_selected', {
      fabric_type: fabricType,
      fabric_label: fabricLabel,
    });
  },

  fabricColorSelected: (fabricType: string, fabricColor: string, shadeFactor?: number) => {
    trackEvent('fabric_color_selected', {
      fabric_type: fabricType,
      fabric_color: fabricColor,
      shade_factor: shadeFactor,
    });
  },

  fabricDetailsViewed: (fabricType: string) => {
    trackEvent('fabric_details_viewed', {
      fabric_type: fabricType,
      action: 'view_details',
    });
  },

  fabricLinkClicked: (fabricType: string, linkUrl: string) => {
    trackEvent('fabric_link_clicked', {
      fabric_type: fabricType,
      link_url: linkUrl,
    });
  },

  // ============================================================================
  // EDGE TYPE EVENTS
  // ============================================================================

  edgeTypeSelected: (edgeType: string) => {
    trackEvent('edge_type_selected', {
      edge_type: edgeType,
    });
  },

  edgeTypeDetailsViewed: (edgeType: string) => {
    trackEvent('edge_type_details_viewed', {
      edge_type: edgeType,
      action: 'view_tooltip',
    });
  },

  // ============================================================================
  // FIXING POINTS & SHAPE EVENTS
  // ============================================================================

  fixingPointsSelected: (corners: number, shapeDescription: string) => {
    trackEvent('fixing_points_selected', {
      corners: corners,
      shape_description: shapeDescription,
    });
  },

  // ============================================================================
  // MEASUREMENT EVENTS
  // ============================================================================

  unitSelected: (unit: string) => {
    trackEvent('unit_selected', {
      unit: unit,
    });
  },

  measurementOptionSelected: (option: string, optionLabel: string) => {
    trackEvent('measurement_option_selected', {
      measurement_option: option,
      option_label: optionLabel,
    });
  },

  measurementOptionTooltipViewed: (option: string, tooltipType: string) => {
    trackEvent('measurement_option_tooltip_viewed', {
      measurement_option: option,
      tooltip_type: tooltipType,
    });
  },

  hardwareInfoViewed: (corners: number) => {
    trackEvent('hardware_info_viewed', {
      corners: corners,
      action: 'view_hardware_info',
    });
  },

  hardwareLinkClicked: (linkUrl: string, corners: number) => {
    trackEvent('hardware_link_clicked', {
      link_url: linkUrl,
      corners: corners,
    });
  },

  edgeMeasurementEntered: (edgeKey: string, value: number, unit: string, corners: number) => {
    trackEvent('edge_measurement_entered', {
      edge_key: edgeKey,
      measurement_value: value,
      unit: unit,
      corners: corners,
    });
  },

  diagonalMeasurementEntered: (diagonalKey: string, value: number, unit: string, corners: number) => {
    trackEvent('diagonal_measurement_entered', {
      diagonal_key: diagonalKey,
      measurement_value: value,
      unit: unit,
      corners: corners,
    });
  },

  measurementFieldFocused: (measurementKey: string, measurementType: string) => {
    trackEvent('measurement_field_focused', {
      measurement_key: measurementKey,
      measurement_type: measurementType,
    });
  },

  measurementFieldHighlighted: (measurementKey: string) => {
    trackEvent('measurement_field_highlighted', {
      measurement_key: measurementKey,
    });
  },

  canvasPointDragged: (pointLabel: string, newX: number, newY: number) => {
    trackEvent('canvas_point_dragged', {
      point_label: pointLabel,
      new_x: newX,
      new_y: newY,
    });
  },

  // ============================================================================
  // TYPO DETECTION & SUGGESTION EVENTS
  // ============================================================================

  typoSuggestionShown: (measurementKey: string, currentValue: number, suggestedValue: number, reason: string) => {
    trackEvent('typo_suggestion_shown', {
      measurement_key: measurementKey,
      current_value: currentValue,
      suggested_value: suggestedValue,
      reason: reason,
    });
  },

  typoSuggestionAccepted: (measurementKey: string, oldValue: number, newValue: number) => {
    trackEvent('typo_suggestion_accepted', {
      measurement_key: measurementKey,
      old_value: oldValue,
      new_value: newValue,
    });
  },

  typoSuggestionDismissed: (measurementKey: string, dismissedValue: number) => {
    trackEvent('typo_suggestion_dismissed', {
      measurement_key: measurementKey,
      dismissed_value: dismissedValue,
    });
  },

  // ============================================================================
  // VALIDATION EVENTS
  // ============================================================================

  perimeterLimitExceeded: (calculatedPerimeter: number, unit: string, maxPerimeter: number) => {
    trackEvent('perimeter_limit_exceeded', {
      calculated_perimeter: calculatedPerimeter,
      unit: unit,
      max_perimeter: maxPerimeter,
    });
  },

  diagonalValidationError: (corners: number, errorDetails: string) => {
    trackEvent('diagonal_validation_error', {
      corners: corners,
      error_details: errorDetails,
    });
  },

  // ============================================================================
  // HARDWARE & FIXING EVENTS
  // ============================================================================

  anchorHeightEntered: (anchorPoint: string, heightValue: number, unit: string) => {
    trackEvent('anchor_height_entered', {
      anchor_point: anchorPoint,
      height_value: heightValue,
      unit: unit,
    });
  },

  fixingTypeSelected: (anchorPoint: string, fixingType: string) => {
    trackEvent('fixing_type_selected', {
      anchor_point: anchorPoint,
      fixing_type: fixingType,
    });
  },

  eyeOrientationSelected: (anchorPoint: string, orientation: string) => {
    trackEvent('eye_orientation_selected', {
      anchor_point: anchorPoint,
      orientation: orientation,
    });
  },

  anchorHeightTypoShown: (anchorPoint: string, currentValue: number, suggestedValue: number) => {
    trackEvent('anchor_height_typo_suggestion_shown', {
      anchor_point: anchorPoint,
      current_value: currentValue,
      suggested_value: suggestedValue,
    });
  },

  anchorHeightTypoAccepted: (anchorPoint: string, oldValue: number, newValue: number) => {
    trackEvent('anchor_height_typo_accepted', {
      anchor_point: anchorPoint,
      old_value: oldValue,
      new_value: newValue,
    });
  },

  anchorHeightTypoDismissed: (anchorPoint: string, dismissedValue: number) => {
    trackEvent('anchor_height_typo_dismissed', {
      anchor_point: anchorPoint,
      dismissed_value: dismissedValue,
    });
  },

  // ============================================================================
  // PRICE SUMMARY & CURRENCY EVENTS
  // ============================================================================

  priceSummaryViewed: (data: GAEventProperties) => {
    trackEvent('price_summary_viewed', data);
  },

  currencyChanged: (oldCurrency: string, newCurrency: string, priceChange: number) => {
    trackEvent('currency_changed', {
      old_currency: oldCurrency,
      new_currency: newCurrency,
      price_change: priceChange,
    });
  },

  // ============================================================================
  // ACKNOWLEDGMENT EVENTS
  // ============================================================================

  acknowledgmentChecked: (acknowledgmentType: string) => {
    trackEvent('acknowledgment_checked', {
      acknowledgment_type: acknowledgmentType,
    });
  },

  acknowledgmentUnchecked: (acknowledgmentType: string) => {
    trackEvent('acknowledgment_unchecked', {
      acknowledgment_type: acknowledgmentType,
    });
  },

  allAcknowledgmentsCompleted: (timeToComplete: number) => {
    trackEvent('all_acknowledgments_completed', {
      time_to_complete_seconds: timeToComplete,
    });
  },

  // ============================================================================
  // PDF GENERATION EVENTS
  // ============================================================================

  pdfQuoteClicked: (totalPrice: number, currency: string, hasEmail: boolean) => {
    trackEvent('pdf_quote_clicked', {
      total_price: totalPrice,
      currency: currency,
      has_email: hasEmail,
    });
  },

  pdfGeneratedSuccess: (fileSizeKb: number, generationTimeMs: number, includesCanvas: boolean) => {
    trackEvent('pdf_generated_success', {
      file_size_kb: fileSizeKb,
      generation_time_ms: generationTimeMs,
      includes_canvas_image: includesCanvas,
    });
  },

  pdfGenerationFailed: (errorMessage: string, errorType: string) => {
    trackEvent('pdf_generation_failed', {
      error_message: errorMessage,
      error_type: errorType,
    });
  },

  // ============================================================================
  // EMAIL EVENTS
  // ============================================================================

  emailSummaryButtonClicked: () => {
    trackEvent('email_summary_button_clicked', {
      action: 'show_email_input',
    });
  },

  emailAddressEntered: (emailDomain: string, hasValue: boolean) => {
    trackEvent('email_address_entered', {
      email_domain: emailDomain,
      has_value: hasValue,
    });
  },

  emailSummarySent: (emailDomain: string, includesPdf: boolean, includesCanvas: boolean, totalPrice: number, currency: string) => {
    trackEvent('email_summary_sent', {
      email_domain: emailDomain,
      includes_pdf: includesPdf,
      includes_canvas_image: includesCanvas,
      total_price: totalPrice,
      currency: currency,
    });
  },

  emailSendFailed: (errorMessage: string, errorType: string) => {
    trackEvent('email_send_failed', {
      error_message: errorMessage,
      error_type: errorType,
    });
  },

  emailInputCancelled: (hadEmailEntered: boolean) => {
    trackEvent('email_input_cancelled', {
      had_email_entered: hadEmailEntered,
    });
  },

  // ============================================================================
  // CART & PRODUCT EVENTS
  // ============================================================================

  addToCartClicked: (data: GAEventProperties) => {
    trackEvent('add_to_cart_clicked', data);
  },

  addToCartBlocked: (reason: string, diagonalsEntered: boolean, acknowledgementsChecked: boolean) => {
    trackEvent('add_to_cart_blocked', {
      reason: reason,
      diagonals_entered: diagonalsEntered,
      acknowledgments_checked: acknowledgementsChecked,
    });
  },

  productCreationStarted: (loadingStep: string, progress: number) => {
    trackEvent('product_creation_started', {
      loading_step: loadingStep,
      progress: progress,
    });
  },

  productCreatedSuccess: (productId: string, variantId: string, creationTimeMs: number) => {
    trackEvent('product_created_success', {
      product_id: productId,
      variant_id: variantId,
      creation_time_ms: creationTimeMs,
    });
  },

  productCreationFailed: (errorMessage: string, errorType: string) => {
    trackEvent('product_creation_failed', {
      error_message: errorMessage,
      error_type: errorType,
    });
  },

  cartAddStarted: (loadingStep: string, progress: number) => {
    trackEvent('cart_add_started', {
      loading_step: loadingStep,
      progress: progress,
    });
  },

  cartAddSuccess: (productId: string, variantId: string, quantity: number, totalTimeMs: number) => {
    trackEvent('cart_add_success', {
      product_id: productId,
      variant_id: variantId,
      quantity: quantity,
      total_time_ms: totalTimeMs,
    });
  },

  cartAddFailed: (errorMessage: string, errorType: string) => {
    trackEvent('cart_add_failed', {
      error_message: errorMessage,
      error_type: errorType,
    });
  },

  redirectToCart: (progress: number, totalConfiguratorTime: number) => {
    trackEvent('redirect_to_cart', {
      progress: progress,
      total_configurator_time_seconds: totalConfiguratorTime,
    });
  },

  // ============================================================================
  // ADDITIONAL STEP NAVIGATION EVENTS
  // ============================================================================

  stepOpened: (stepNumber: number, stepName: string, fromStep: number) => {
    trackEvent('step_opened', {
      step_number: stepNumber,
      step_name: stepName,
      from_step: fromStep,
    });
  },

  stepClosed: (stepNumber: number, stepName: string) => {
    trackEvent('step_closed', {
      step_number: stepNumber,
      step_name: stepName,
    });
  },

  nextButtonClicked: (currentStep: number, nextStep: number, isValid: boolean) => {
    trackEvent('next_button_clicked', {
      current_step: currentStep,
      next_step: nextStep,
      is_valid: isValid,
    });
  },

  backButtonClicked: (currentStep: number, previousStep: number) => {
    trackEvent('back_button_clicked', {
      current_step: currentStep,
      previous_step: previousStep,
    });
  },

  stepNavigationError: (attemptedStep: number, currentStep: number, validationErrorsCount: number) => {
    trackEvent('step_navigation_error', {
      attempted_step: attemptedStep,
      current_step: currentStep,
      validation_errors_count: validationErrorsCount,
    });
  },

  stepAutoScrolled: (targetStep: number, scrollOffset: number) => {
    trackEvent('step_auto_scrolled', {
      target_step: targetStep,
      scroll_offset: scrollOffset,
    });
  },

  // ============================================================================
  // CANVAS INTERACTION EVENTS
  // ============================================================================

  canvasRendered: (corners: number, canvasType: string, width: number, height: number) => {
    trackEvent('canvas_rendered', {
      corners: corners,
      canvas_type: canvasType,
      width: width,
      height: height,
    });
  },

  canvasPointHover: (pointLabel: string, x: number, y: number) => {
    trackEvent('canvas_point_hover', {
      point_label: pointLabel,
      x: x,
      y: y,
    });
  },

  canvasEdgeHover: (edgeKey: string, measurementValue?: number) => {
    trackEvent('canvas_edge_hover', {
      edge_key: edgeKey,
      measurement_value: measurementValue,
    });
  },

  canvasSnapToGrid: (pointLabel: string, snappedX: number, snappedY: number) => {
    trackEvent('canvas_snap_to_grid', {
      point_label: pointLabel,
      snapped_x: snappedX,
      snapped_y: snappedY,
    });
  },

  canvasSvgExported: (purpose: string, width: number, height: number) => {
    trackEvent('canvas_svg_exported', {
      purpose: purpose,
      width: width,
      height: height,
    });
  },

  // ============================================================================
  // ADDITIONAL VALIDATION EVENTS
  // ============================================================================

  validationErrorDisplayed: (stepNumber: number, errorType: string, errorCount: number) => {
    trackEvent('validation_error_displayed', {
      step_number: stepNumber,
      error_type: errorType,
      error_count: errorCount,
    });
  },

  errorFieldScrolled: (fieldKey: string, errorType: string, isTypoSuggestion: boolean) => {
    trackEvent('error_field_scrolled', {
      field_key: fieldKey,
      error_type: errorType,
      is_typo_suggestion: isTypoSuggestion,
    });
  },

  // ============================================================================
  // ADDITIONAL SESSION & INITIALIZATION EVENTS
  // ============================================================================

  formAbandoned: (lastCompletedStep: number, totalTimeSeconds: number, furthestStepReached: number) => {
    trackEvent('form_abandoned', {
      last_completed_step: lastCompletedStep,
      total_time_seconds: totalTimeSeconds,
      furthest_step_reached: furthestStepReached,
    });
  },

  configuratorTimeout: (lastActiveStep: number, sessionDurationSeconds: number) => {
    trackEvent('configurator_timeout', {
      last_active_step: lastActiveStep,
      session_duration_seconds: sessionDurationSeconds,
    });
  },

  // ============================================================================
  // CALCULATION EVENTS
  // ============================================================================

  priceCalculated: (data: GAEventProperties) => {
    trackEvent('price_calculated', data);
  },

  areaCalculated: (areaSqm: number, areaFormatted: string, corners: number, unit: string) => {
    trackEvent('area_calculated', {
      area_sqm: areaSqm,
      area_formatted: areaFormatted,
      corners: corners,
      unit: unit,
    });
  },

  perimeterCalculated: (perimeterM: number, perimeterFormatted: string, corners: number, unit: string) => {
    trackEvent('perimeter_calculated', {
      perimeter_m: perimeterM,
      perimeter_formatted: perimeterFormatted,
      corners: corners,
      unit: unit,
    });
  },

  wireThicknessCalculated: (wireThicknessMm: number, perimeter: number, corners: number) => {
    trackEvent('wire_thickness_calculated', {
      wire_thickness_mm: wireThicknessMm,
      perimeter: perimeter,
      corners: corners,
    });
  },

  // ============================================================================
  // MOBILE EVENTS
  // ============================================================================

  mobileViewDetected: (screenWidth: number, screenHeight: number, deviceType: string) => {
    trackEvent('mobile_view_detected', {
      screen_width: screenWidth,
      screen_height: screenHeight,
      device_type: deviceType,
    });
  },

  mobileStepNavigation: (currentStep: number, interactionType: string, viewportSize: string) => {
    trackEvent('mobile_step_navigation', {
      current_step: currentStep,
      interaction_type: interactionType,
      viewport_size: viewportSize,
    });
  },

  // ============================================================================
  // QUOTE SAVE MODAL EVENTS
  // ============================================================================
  quoteSaveModalOpened: (data: {
    source: string;
    device_type: string;
    total_price: number;
    currency: string;
    corners: number;
    fabric_type: string;
  }) => {
    trackEvent('quote_save_modal_opened', data);
  },

  quoteSaveMethodSelected: (data: {
    method: string;
    total_price: number;
    currency: string;
    time_to_select_seconds: number;
  }) => {
    trackEvent('quote_save_method_selected', data);
  },

  quoteSaveEmailEntered: (data: {
    email_domain: string;
    time_spent_on_email_field_seconds: number;
  }) => {
    trackEvent('quote_save_email_entered', data);
  },

  quoteSaveSuccess: (data: {
    quote_reference: string;
    save_method: string;
    email_domain: string | null;
    total_price: number;
    currency: string;
    corners: number;
    fabric_type: string;
    edge_type: string;
    hardware_included: boolean;
    area_sqm: number;
    perimeter_m: number;
    modal_duration_seconds: number;
    has_shopify_customer: boolean;
    shopify_customer_id?: string;
  }) => {
    trackEvent('quote_save_success', data);
  },

  quoteSaveFailed: (data: {
    error_message: string;
    error_type: string;
    save_method: string;
    total_price: number;
    currency: string;
  }) => {
    trackEvent('quote_save_failed', data);
  },

  quoteSaveModalCancelled: (data: {
    modal_duration_seconds: number;
    had_selected_method: boolean;
    had_entered_email: boolean;
  }) => {
    trackEvent('quote_save_modal_cancelled', data);
  },

  quoteLinkGenerated: (data: {
    quote_reference: string;
    expires_at: string;
    days_until_expiration: number;
  }) => {
    trackEvent('quote_link_generated', data);
  },

  quoteLinkCopied: (data: {
    quote_reference: string;
    copy_successful: boolean;
  }) => {
    trackEvent('quote_link_copied', data);
  },

  quoteSaveCompleted: (data: {
    quote_reference: string;
    action: string;
    total_duration_seconds: number;
  }) => {
    trackEvent('quote_save_completed', data);
  },

  // ============================================================================
  // QUOTE LOADING EVENTS
  // ============================================================================
  quoteLoadAttempted: (data: {
    quote_id: string;
    source: string;
  }) => {
    trackEvent('quote_load_attempted', data);
  },

  quoteLoadSuccess: (data: {
    quote_reference: string;
    quote_age_hours: number;
    landing_step: number;
    had_email: boolean;
    total_price: number;
    currency: string;
  }) => {
    trackEvent('quote_load_success', data);
  },

  quoteLoadFailed: (data: {
    quote_id: string;
    error_message: string;
    error_type: string;
  }) => {
    trackEvent('quote_load_failed', data);
  },

  // ============================================================================
  // SHOPIFY INTEGRATION EVENTS
  // ============================================================================
  shopifyCustomerCreated: (data: {
    customer_id: string;
    email_domain: string;
    source: string;
    tags: string[];
    total_quote_value: number;
    currency: string;
  }) => {
    trackEvent('shopify_customer_created', data);
  },

  shopifyCustomerCreationFailed: (data: {
    email_domain: string;
    error_message: string;
    source: string;
  }) => {
    trackEvent('shopify_customer_creation_failed', data);
  },

  shopifyCustomerUpdated: (data: {
    customer_id: string;
    email_domain: string;
    update_type: string;
  }) => {
    trackEvent('shopify_customer_updated', data);
  },

  // ============================================================================
  // CONVERSION TRACKING EVENTS
  // ============================================================================
  quoteConvertedToCart: (data: {
    quote_reference: string;
    quote_age_hours: number;
    time_from_save_to_cart_hours: number;
    total_price: number;
    currency: string;
    conversion_source: string;
  }) => {
    trackEvent('quote_converted_to_cart', data);
  },

  // ============================================================================
  // ENHANCED EMAIL SUMMARY EVENTS
  // ============================================================================
  emailSummaryWithShopify: (data: {
    email_domain: string;
    includes_pdf: boolean;
    includes_canvas: boolean;
    total_price: number;
    currency: string;
    shopify_customer_created: boolean;
    shopify_customer_id?: string;
  }) => {
    trackEvent('email_summary_sent_with_shopify', data);
  },

  // ============================================================================
  // QUOTE SEARCH & MANAGEMENT EVENTS
  // ============================================================================
  quoteSearchModalOpened: (data: {
    email_domain: string;
  }) => {
    trackEvent('quote_search_modal_opened', data);
  },

  quoteSearchPerformed: (data: {
    email_domain: string;
    search_text: string | null;
    status_filter: string;
    fabric_filter: string | null;
    corner_filter: number | null;
    sort_by: string;
    sort_order: string;
    results_count: number;
    total_results: number;
  }) => {
    trackEvent('quote_search_performed', data);
  },

  quoteSearchModalClosed: (data: {
    email_domain: string;
    quotes_viewed: number;
    had_selected_quote: boolean;
  }) => {
    trackEvent('quote_search_modal_closed', data);
  },
};
