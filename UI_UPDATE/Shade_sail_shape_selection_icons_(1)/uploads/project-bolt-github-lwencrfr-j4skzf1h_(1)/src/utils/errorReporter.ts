import { supabase } from '../lib/supabase';

export type ClientErrorSource =
  | 'error_boundary'
  | 'window_error'
  | 'unhandled_rejection'
  | 'quote_load'
  | 'unknown';

interface ReportInput {
  message: string;
  stack?: string | null;
  source: ClientErrorSource;
}

function currentAppVersion(): string | null {
  try {
    // Defined by vite.config.ts; may be absent in the Shopify lib build.
    return typeof __BUILD_VERSION__ === 'string' ? __BUILD_VERSION__ : null;
  } catch {
    return null;
  }
}

function isQuoteLink(): boolean {
  try {
    const search = window.location.search || '';
    return /(\?|&)(quote|quote_id|token)=/.test(search);
  } catch {
    return false;
  }
}

const reported = new Set<string>();

/**
 * Best-effort telemetry write. NEVER throws — a failure to log must not add a
 * second failure on top of the one we are trying to record.
 */
export async function reportClientError({ message, stack, source }: ReportInput): Promise<void> {
  try {
    const dedupeKey = `${source}::${message}`;
    if (reported.has(dedupeKey)) return;
    reported.add(dedupeKey);

    await supabase.from('client_error_logs').insert({
      message: message.slice(0, 2000),
      stack: stack ? stack.slice(0, 8000) : null,
      source,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      is_quote_link: isQuoteLink(),
      app_version: currentAppVersion(),
    });
  } catch {
    // Swallow — telemetry is best-effort.
  }
}

let installed = false;

/**
 * Global safety net: records uncaught errors and unhandled promise rejections
 * so blank-screen failures that happen outside React's render tree are still
 * captured.
 */
export function installGlobalErrorReporting(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (event) => {
    const err = event.error;
    reportClientError({
      message: err?.message || event.message || 'Uncaught error',
      stack: err?.stack ?? null,
      source: 'window_error',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason: any = event.reason;
    reportClientError({
      message: reason?.message || String(reason) || 'Unhandled promise rejection',
      stack: reason?.stack ?? null,
      source: 'unhandled_rejection',
    });
  });
}

declare const __BUILD_VERSION__: string;
