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
    // Send to Supabase for admin dashboard
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      await fetch(`${supabaseUrl}/functions/v1/track-event`, {
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
    }
  } catch (error) {
    console.warn('Failed to track event:', error);
    // Don't throw - tracking failures shouldn't break app functionality
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
