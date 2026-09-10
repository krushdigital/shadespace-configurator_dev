import { useEffect, useState } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface MyDesignsProps {
  email: string;
  name: string;
  isLoggedIn: boolean;
}

interface SavedDesign {
  id: string;
  quote_reference: string;
  quote_name: string;
  customer_reference: string | null;
  status: string;
  current_step: number | null;
  total_steps: number | null;
  locked_total: number | null;
  locked_total_currency: string | null;
  pricing_locked_until: string | null;
  created_at: string;
  access_token: string;
  diagram_public_url: string | null;
  config_data: Record<string, unknown>;
  shopify_order_number: string | null;
  purchased_at: string | null;
}

const DOMAIN_MAP: Record<string, string> = {
  AUD: 'shadespace.com.au',
  NZD: 'shadespace.com.au',
  USD: 'shadespace.com',
  CAD: 'shadespace.com',
  GBP: 'shadespace.com',
  EUR: 'shadespace.com',
};

function buildResumeUrl(quoteId: string, token: string, currency?: string): string {
  const domain = (currency && DOMAIN_MAP[currency.toUpperCase()]) || 'shadespace.com.au';
  const safeId = encodeURIComponent(quoteId);
  const safeToken = encodeURIComponent(token);
  return `https://${domain}/pages/shade-sail-configurator?quote=${safeId}&token=${safeToken}&_ab=0&_fd=0#quote=${safeId}&token=${safeToken}`;
}

function formatPrice(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    NZD: '$', AUD: '$', USD: '$', CAD: '$', GBP: '\u00a3', EUR: '\u20ac',
  };
  const symbol = symbols[currency.toUpperCase()] || '$';
  return `${symbol}${amount.toFixed(2)} ${currency.toUpperCase()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function getProgressText(step: number | null, total: number | null): string {
  if (step == null) return 'Just started';
  return `Step ${step + 1} of ${total || 7}`;
}

function trackEvent(eventType: string, eventData: Record<string, unknown>, customerEmail: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  fetch(`${SUPABASE_URL}/rest/v1/user_events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      event_type: eventType,
      event_data: eventData,
      customer_email: customerEmail,
      success: true,
      device_type: /mobile|android|iphone|ipod/i.test(navigator.userAgent) ? 'mobile' : /ipad|tablet/i.test(navigator.userAgent) ? 'tablet' : 'desktop',
      user_agent: navigator.userAgent,
    }),
  }).catch(() => {});
}

// -- Styles --

const styles = {
  container: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '40px 24px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  } as React.CSSProperties,
  heading: {
    color: '#01312D',
    fontSize: '28px',
    fontWeight: 800,
    margin: '0 0 6px 0',
    lineHeight: 1.2,
  } as React.CSSProperties,
  subtitle: {
    color: '#64748B',
    fontSize: '14px',
    margin: '0 0 32px 0',
  } as React.CSSProperties,
  sectionTitle: {
    color: '#01312D',
    fontSize: '18px',
    fontWeight: 700,
    margin: '0 0 16px 0',
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  } as React.CSSProperties,
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  } as React.CSSProperties,
  thumbnail: {
    width: '100%',
    height: '140px',
    objectFit: 'contain' as const,
    borderRadius: '8px',
    background: '#f1f5f9',
    marginBottom: '14px',
  } as React.CSSProperties,
  thumbnailPlaceholder: {
    width: '100%',
    height: '140px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '14px',
  } as React.CSSProperties,
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  } as React.CSSProperties,
  badge: (bg: string, color: string) => ({
    display: 'inline-block',
    background: bg,
    color: color,
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '999px',
  } as React.CSSProperties),
  quoteName: {
    margin: '8px 0 2px 0',
    fontSize: '16px',
    fontWeight: 700,
    color: '#01312D',
    lineHeight: 1.3,
  } as React.CSSProperties,
  reference: {
    fontSize: '11px',
    color: '#64748B',
    fontFamily: "'Courier New', monospace",
  } as React.CSSProperties,
  customerRef: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px',
  } as React.CSSProperties,
  price: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#01312D',
    margin: '10px 0 4px 0',
  } as React.CSSProperties,
  priceSubtext: {
    fontSize: '11px',
    color: '#64748B',
  } as React.CSSProperties,
  progress: {
    fontSize: '13px',
    color: '#64748B',
    margin: '10px 0 4px 0',
  } as React.CSSProperties,
  savedDate: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '4px',
  } as React.CSSProperties,
  btnPrimary: {
    display: 'block',
    textAlign: 'center' as const,
    background: '#307C31',
    color: '#ffffff',
    textDecoration: 'none',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    marginTop: '16px',
    border: 'none',
    cursor: 'pointer',
  } as React.CSSProperties,
  btnOutline: {
    flex: 1,
    display: 'block',
    textAlign: 'center' as const,
    background: '#ffffff',
    color: '#307C31',
    border: '2px solid #307C31',
    textDecoration: 'none',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,
  btnView: {
    display: 'block',
    textAlign: 'center' as const,
    background: '#ffffff',
    color: '#01312D',
    border: '2px solid #01312D',
    textDecoration: 'none',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    marginTop: '16px',
    cursor: 'pointer',
  } as React.CSSProperties,
  btnRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
  } as React.CSSProperties,
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
  } as React.CSSProperties,
  signInState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    maxWidth: '400px',
    margin: '0 auto',
  } as React.CSSProperties,
  footer: {
    textAlign: 'center' as const,
    marginTop: '40px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  } as React.CSSProperties,
  spinner: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#64748B',
    fontSize: '14px',
  } as React.CSSProperties,
  corners: {
    fontSize: '11px',
    color: '#94a3b8',
  } as React.CSSProperties,
};

// -- Sub-components --

function PlaceholderIcon() {
  return (
    <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="1.5">
      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function DesignCard({ design, email }: { design: SavedDesign; email: string }) {
  const isPurchased = design.status === 'purchased';
  const isReady = design.status === 'quote_ready';
  const currency = design.locked_total_currency || (design.config_data?.currency as string) || 'NZD';
  const resumeUrl = buildResumeUrl(design.id, design.access_token, currency);
  const addToCartUrl = `${resumeUrl}&action=add-to-cart`;
  const corners = design.config_data?.corners ?? '?';

  const handleClick = (action: 'resume' | 'add_to_cart' | 'view') => {
    trackEvent('my_designs_resume_click', {
      quoteId: design.id,
      status: design.status,
      action,
    }, email);
  };

  let statusBadge: React.ReactNode;
  if (isPurchased) {
    const orderLabel = design.shopify_order_number ? ` \u2014 Order ${design.shopify_order_number}` : '';
    statusBadge = <span style={styles.badge('#01312D', '#ffffff')}>Purchased{orderLabel}</span>;
  } else if (isReady) {
    statusBadge = <span style={styles.badge('#dcfce7', '#166534')}>Ready to Purchase</span>;
  } else {
    statusBadge = <span style={styles.badge('#fef3c7', '#92400e')}>In Progress</span>;
  }

  let priceSection: React.ReactNode;
  if (isPurchased && design.locked_total) {
    priceSection = (
      <>
        <div style={styles.price}>{formatPrice(design.locked_total, currency)}</div>
        <div style={styles.priceSubtext}>
          Purchased {design.purchased_at ? formatDate(design.purchased_at) : ''}
        </div>
      </>
    );
  } else if (isReady && design.locked_total) {
    priceSection = (
      <>
        <div style={styles.price}>{formatPrice(design.locked_total, currency)}</div>
        {design.pricing_locked_until && (
          <div style={styles.priceSubtext}>Price locked until {formatDate(design.pricing_locked_until)}</div>
        )}
      </>
    );
  } else {
    priceSection = (
      <div style={styles.progress}>{getProgressText(design.current_step, design.total_steps)}</div>
    );
  }

  let actions: React.ReactNode;
  if (isPurchased) {
    actions = (
      <a href={resumeUrl} style={styles.btnView} onClick={() => handleClick('view')}>
        View Design
      </a>
    );
  } else if (isReady) {
    actions = (
      <div style={styles.btnRow}>
        <a href={resumeUrl} style={styles.btnOutline} onClick={() => handleClick('resume')}>
          Review
        </a>
        <a href={addToCartUrl} style={{ ...styles.btnPrimary, flex: 1, marginTop: 0 }} onClick={() => handleClick('add_to_cart')}>
          Add to Cart
        </a>
      </div>
    );
  } else {
    actions = (
      <a href={resumeUrl} style={styles.btnPrimary} onClick={() => handleClick('resume')}>
        Continue Designing
      </a>
    );
  }

  return (
    <div style={styles.card}>
      {design.diagram_public_url ? (
        <img src={design.diagram_public_url} alt="Shade sail diagram" style={styles.thumbnail} />
      ) : (
        <div style={styles.thumbnailPlaceholder}><PlaceholderIcon /></div>
      )}
      <div style={styles.badgeRow}>
        {statusBadge}
        <span style={styles.corners}>{String(corners)} corners</span>
      </div>
      <h3 style={styles.quoteName}>{design.quote_name}</h3>
      <div style={styles.reference}>{design.quote_reference}</div>
      {design.customer_reference && (
        <div style={styles.customerRef}>Ref: {design.customer_reference}</div>
      )}
      {priceSection}
      <div style={styles.savedDate}>Saved {formatDate(design.created_at)}</div>
      {actions}
    </div>
  );
}

function DesignsList({ designs, email }: { designs: SavedDesign[]; email: string }) {
  const purchased = designs.filter(d => d.status === 'purchased');
  const ready = designs.filter(d => d.status === 'quote_ready');
  const inProgress = designs.filter(d => d.status !== 'purchased' && d.status !== 'quote_ready');

  return (
    <>
      {purchased.length > 0 && (
        <div>
          <h2 style={styles.sectionTitle}>Purchased ({purchased.length})</h2>
          <div style={styles.grid}>
            {purchased.map(d => <DesignCard key={d.id} design={d} email={email} />)}
          </div>
        </div>
      )}
      {ready.length > 0 && (
        <div>
          <h2 style={styles.sectionTitle}>Ready to Purchase ({ready.length})</h2>
          <div style={styles.grid}>
            {ready.map(d => <DesignCard key={d.id} design={d} email={email} />)}
          </div>
        </div>
      )}
      {inProgress.length > 0 && (
        <div>
          <h2 style={styles.sectionTitle}>In Progress ({inProgress.length})</h2>
          <div style={styles.grid}>
            {inProgress.map(d => <DesignCard key={d.id} design={d} email={email} />)}
          </div>
        </div>
      )}
    </>
  );
}

// -- Main component --

export default function MyDesigns({ email, name, isLoggedIn }: MyDesignsProps) {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // resolvedLoggedIn stays false until server confirms a customer (handles NCA/mobile)
  const [resolvedLoggedIn, setResolvedLoggedIn] = useState(isLoggedIn);

  useEffect(() => {
    console.log('[MyDesigns] Props received from #MY_DESIGNS_ROOT data attributes:', {
      email,
      name,
      isLoggedIn,
    });

    // When DOM attributes are missing/wrong (common with NCA on mobile), fall back to
    // a server-side lookup — the App Proxy injects logged_in_customer_email for us.
    const url = email
      ? `/apps/shade_space/my-designs?format=json&customer_email=${encodeURIComponent(email)}`
      : `/apps/shade_space/my-designs?format=json`;

    if (!isLoggedIn && !email) {
      // No hint of a logged-in customer from DOM — try server-side probe anyway.
      console.warn('[MyDesigns] DOM says not logged in — trying server-side lookup.');
    }

    console.log('[MyDesigns] Fetching designs via app proxy, email from DOM:', email || '(none, server will resolve)');

    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(({ designs, customerEmail: serverEmail }: { designs: SavedDesign[]; customerEmail?: string }) => {
        const resolvedEmail = serverEmail || email;
        if (!resolvedEmail) {
          // Server also found no logged-in customer — show sign-in wall.
          console.log('[MyDesigns] No customer resolved server-side — showing sign-in state.');
          setResolvedLoggedIn(false);
          setLoading(false);
          return;
        }
        console.log('[MyDesigns] ✅ Designs loaded:', designs?.length ?? 0, 'for', resolvedEmail);
        setResolvedLoggedIn(true);
        setDesigns(designs || []);
        trackEvent('my_designs_page_view', {
          designCount: designs?.length || 0,
          source: 'shopify_account',
        }, resolvedEmail);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[MyDesigns] ❌ Failed to load designs:', err);
        setError('Failed to load your designs. Please try again.');
        setLoading(false);
      });
  }, [email, isLoggedIn]);

  if (!resolvedLoggedIn && !loading) {
    return (
      <div style={styles.signInState}>
        <h2 style={{ ...styles.heading, fontSize: '24px' }}>Sign in to view your designs</h2>
        <p style={{ color: '#64748B', fontSize: '14px', margin: '0 0 28px 0' }}>
          Sign in with your email to see all your saved shade sail configurations.
        </p>
        <a
          href="/account/login"
          style={{ ...styles.btnPrimary, display: 'inline-block', padding: '14px 36px', borderRadius: '999px', fontSize: '15px', fontWeight: 700 }}
        >
          Sign In
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.spinner}>
        <p>Loading your designs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.spinner}>
        <p style={{ color: '#ef4444' }}>{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
          style={{ ...styles.btnPrimary, display: 'inline-block', padding: '10px 24px', marginTop: '16px' }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={styles.heading}>My Shade Sail Designs</h1>
        <p style={styles.subtitle}>
          Hi {name || 'there'} &mdash; all your saved configurations in one place.
        </p>
      </div>

      {designs.length > 0 ? (
        <DesignsList designs={designs} email={email} />
      ) : (
        <div style={styles.emptyState}>
          <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" strokeWidth="1.5" style={{ margin: '0 auto 20px auto', display: 'block' }}>
            <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h2 style={{ ...styles.heading, fontSize: '20px' }}>No saved designs yet</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '0 0 24px 0' }}>
            Start designing your custom shade sail and save your progress at any time.
          </p>
          <a
            href="https://shadespace.com.au/pages/shade-sail-configurator"
            style={{ ...styles.btnPrimary, display: 'inline-block', padding: '14px 32px', borderRadius: '999px', fontSize: '15px', fontWeight: 700 }}
          >
            Start Designing
          </a>
        </div>
      )}

      <div style={styles.footer}>
        <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
          Need help? <a href="mailto:sails@shadespace.com" style={{ color: '#307C31', textDecoration: 'underline' }}>sails@shadespace.com</a>
        </p>
      </div>
    </div>
  );
}
