declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export interface GAEventProperties {
  [key: string]: string | number | boolean | undefined;
}

export const trackEvent = (eventName: string, properties?: GAEventProperties): void => {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('event', eventName, properties);
    console.log('📊 GA Event:', eventName, properties);
  } else {
    console.warn('⚠️ Google Analytics not initialized. Event:', eventName, properties);
  }
};

export const trackPageView = (pagePath: string, pageTitle?: string): void => {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
};

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

  fixingPointsSelected: (corners: number, shapeDescription: string) => {
    trackEvent('fixing_points_selected', {
      corners: corners,
      shape_description: shapeDescription,
    });
  },

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
};
