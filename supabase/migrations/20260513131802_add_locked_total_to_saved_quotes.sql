/*
  # Persist locked totals on saved quotes

  1. Modified Tables
    - `saved_quotes`
      - Add `locked_total` (numeric) - the authoritative total in the displayed currency
        captured at save time. Restored verbatim on resume while pricing is locked.
      - Add `locked_total_currency` (text) - the currency the locked_total was captured in.
      - Add `locked_total_base_nzd` (numeric) - canonical base-currency (NZD) amount that
        the displayed total was derived from. Sent downstream to Shopify so cart layers
        can anchor on a non-FX-converted figure.
      - Add `locked_fx_rate` (numeric) - FX rate from NZD to displayed currency at save time.
      - Add `locked_market_markup` (numeric) - market markup factor at save time.
      - Add `locked_zonos_dhl_markup` (numeric) - Zonos/DHL markup factor at save time.
      - Add `locked_at` (timestamptz, default now()) - when the locked total was captured.

  2. Backfill
    - For existing rows where `locked_total` is null, hydrate from the
      `calculations_data` jsonb (`totalPrice`) and `config_data.currency` so previously
      saved customer links restore their original on-screen total verbatim.
    - Hydrate `locked_total_base_nzd` from `calculations_data.hardwareBreakdown.sailOnlyPriceNzd`
      plus `hardwareOnlyPriceNzd` when available.
    - Hydrate FX/markup factors from the saved `pricing_snapshot` keyed by the quote currency.

  3. Notes
    - This is purely additive. No existing columns are altered or removed.
    - On resume, if `locked_total` is present and `pricing_locked_until > now()`, the
      configurator MUST restore this value verbatim and skip the pricing engine.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_quotes' AND column_name = 'locked_total') THEN
    ALTER TABLE public.saved_quotes ADD COLUMN locked_total numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_quotes' AND column_name = 'locked_total_currency') THEN
    ALTER TABLE public.saved_quotes ADD COLUMN locked_total_currency text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_quotes' AND column_name = 'locked_total_base_nzd') THEN
    ALTER TABLE public.saved_quotes ADD COLUMN locked_total_base_nzd numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_quotes' AND column_name = 'locked_fx_rate') THEN
    ALTER TABLE public.saved_quotes ADD COLUMN locked_fx_rate numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_quotes' AND column_name = 'locked_market_markup') THEN
    ALTER TABLE public.saved_quotes ADD COLUMN locked_market_markup numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_quotes' AND column_name = 'locked_zonos_dhl_markup') THEN
    ALTER TABLE public.saved_quotes ADD COLUMN locked_zonos_dhl_markup numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_quotes' AND column_name = 'locked_at') THEN
    ALTER TABLE public.saved_quotes ADD COLUMN locked_at timestamptz DEFAULT now();
  END IF;
END $$;

UPDATE public.saved_quotes
SET
  locked_total = COALESCE(locked_total, NULLIF((calculations_data->>'totalPrice'), '')::numeric),
  locked_total_currency = COALESCE(locked_total_currency, NULLIF(config_data->>'currency', '')),
  locked_total_base_nzd = COALESCE(
    locked_total_base_nzd,
    (
      COALESCE(NULLIF((calculations_data->'hardwareBreakdown'->>'sailOnlyPriceNzd'), '')::numeric, 0)
      + COALESCE(NULLIF((calculations_data->'hardwareBreakdown'->>'hardwareOnlyPriceNzd'), '')::numeric, 0)
    )
  ),
  locked_fx_rate = COALESCE(
    locked_fx_rate,
    NULLIF(
      (pricing_snapshot -> (config_data->>'currency') ->> 'exchange_rate'),
      ''
    )::numeric
  ),
  locked_market_markup = COALESCE(
    locked_market_markup,
    NULLIF(
      (pricing_snapshot -> (config_data->>'currency') ->> 'market_markup'),
      ''
    )::numeric
  ),
  locked_zonos_dhl_markup = COALESCE(
    locked_zonos_dhl_markup,
    NULLIF(
      (pricing_snapshot -> (config_data->>'currency') ->> 'zonos_dhl_markup'),
      ''
    )::numeric
  ),
  locked_at = COALESCE(locked_at, created_at)
WHERE locked_total IS NULL;
