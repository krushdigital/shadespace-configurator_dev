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
    console.log('GA Event:', eventName, properties);
  } else {
    console.warn('Google Analytics not initialized. Event:', eventName, properties);
  }
};

export const analytics = {
  // STEP NAVIGATION
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

  // FABRIC SELECTION
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

  // MEASUREMENT
  unitAutoSelected: (unit: string, currency: string, source: string, confidence: string) => {
    trackEvent('unit_auto_selected', {
      unit: unit,
      currency: currency,
      selection_source: source,
      confidence_level: confidence,
    });
  },

  unitManuallyChanged: (fromUnit: string, toUnit: string, currency: string, wasAutoSelected: boolean) => {
    trackEvent('unit_manually_changed', {
      from_unit: fromUnit,
      to_unit: toUnit,
      currency: currency,
      was_auto_selected: wasAutoSelected,
    });
  },

  // EMAIL
  emailSendFailed: (payload: { error_message: string; error_type?: string }) => {
    trackEvent('email_send_failed', {
      error_message: payload.error_message,
      error_type: payload.error_type || 'EmailSendError',
    });
  },

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

  // SHOPIFY INTEGRATION
  shopifyCustomerCreated: (data: {
    customer_id: string;
    email_domain: string;
    source: string;
    tags: string[];
    total_quote_value: number;
    currency: string;
  }) => {
    const { tags, ...rest } = data;
    trackEvent('shopify_customer_created', {
      ...rest,
      tags: tags.join(','),
    });
  },

  // QUOTE LOADING
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

  // CONVERSION TRACKING
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

  // QUOTE SAVE MODAL
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

  quoteSaveSuccess: (data: GAEventProperties) => {
    const safeData = { ...data };
    if (safeData.email_domain === null) {
      safeData.email_domain = undefined;
    }
    if (safeData.shopify_customer_id === null) {
      safeData.shopify_customer_id = undefined;
    }
    trackEvent('quote_save_success', safeData);
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

  // ORDER READY - fires when all diagonal dimensions are entered (4+ corner sails)
  // or when a 3-corner sail reaches review with all edges complete.
  // This is a high-value secondary conversion signal for GA4/Google Ads.
  orderReady: (data: {
    corners: number;
    fabric_type: string;
    fabric_color: string;
    edge_type: string;
    total_price: number;
    currency: string;
    area_sqm: number;
    perimeter_m: number;
    diagonal_count: number;
    measurement_unit: string;
  }) => {
    trackEvent('order_ready', data);
  },
};
