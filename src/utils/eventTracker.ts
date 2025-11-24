/**
 * Client-side event tracker for admin analytics
 * Sends events to both Google Analytics and Supabase for comprehensive tracking
 */

interface TrackEventParams {
  eventType: string;
  eventData?: Record<string, any>;
  quoteId?: string | null;
  customerEmail?: string | null;
  success?: boolean;
  errorMessage?: string | null;
}

const detectDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/mobile|android|iphone|ipod/i.test(ua)) {
    return 'mobile';
  }
  if (/ipad|tablet/i.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
};

const trackEventDirectly = async (params: TrackEventParams): Promise<void> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/user_events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        event_type: params.eventType,
        event_data: params.eventData || {},
        quote_id: params.quoteId || null,
        customer_email: params.customerEmail || null,
        success: params.success ?? true,
        error_message: params.errorMessage || null,
        device_type: detectDeviceType(),
        customer_ip: 'unknown',
        user_agent: navigator.userAgent,
      }),
    });

    if (!response.ok) {
      console.error('Direct event tracking failed:', await response.text());
    }
  } catch (error) {
    console.error('Direct event tracking error:', error);
  }
};

export const trackEvent = async (params: TrackEventParams): Promise<void> => {
  const {
    eventType,
    eventData = {},
    quoteId = null,
    customerEmail = null,
    success = true,
    errorMessage = null,
  } = params;

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const response = await fetch(`${supabaseUrl}/functions/v1/track-event`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType,
          eventData,
          quoteId,
          customerEmail,
          success,
          errorMessage,
        }),
      });

      if (!response.ok) {
        console.warn('Edge function tracking failed, using fallback');
        await trackEventDirectly(params);
      }
    }
  } catch (error) {
    console.warn('Edge function tracking error, using fallback:', error);
    await trackEventDirectly(params);
  }
};

// Convenience functions for common events
export const eventTrackers = {
  pdfDownload: (quoteId: string | null, email: string | null, totalPrice: number, currency: string) => {
    trackEvent({
      eventType: 'pdf_download',
      eventData: { totalPrice, currency },
      quoteId,
      customerEmail: email,
    });
  },

  emailSummary: (quoteId: string | null, email: string, totalPrice: number, currency: string, success: boolean) => {
    trackEvent({
      eventType: 'email_summary',
      eventData: { totalPrice, currency },
      quoteId,
      customerEmail: email,
      success,
    });
  },

  addToCart: (quoteId: string | null, email: string | null, totalPrice: number, currency: string, success: boolean) => {
    trackEvent({
      eventType: 'add_to_cart',
      eventData: { totalPrice, currency },
      quoteId,
      customerEmail: email,
      success,
    });
  },

  quoteSave: (quoteId: string, email: string | null, totalPrice: number, currency: string, quoteReference: string) => {
    trackEvent({
      eventType: 'quote_save',
      eventData: { totalPrice, currency, quoteReference },
      quoteId,
      customerEmail: email,
    });
  },
};
