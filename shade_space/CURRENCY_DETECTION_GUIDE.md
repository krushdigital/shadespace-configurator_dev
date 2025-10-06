# IP-Based Currency Detection System

## Overview
This system automatically detects a user's currency based on their IP address using a three-layer caching strategy for optimal performance.

## Architecture

### Components

1. **Supabase Database Tables**
   - `user_sessions` - Caches IP-to-currency mappings (24-hour expiration)
   - `currency_detection_logs` - Logs all detection attempts for analytics
   - `rate_limit_counters` - Prevents API abuse (10 requests per hour per IP)

2. **Supabase Edge Function** (`detect-currency`)
   - Handles IP geolocation lookup
   - Implements rate limiting
   - Manages database caching
   - Falls back to multiple APIs (ipapi.co, ip-api.com)

3. **Frontend Utilities**
   - `src/utils/currencyDetection.ts` - Core detection logic
   - `src/hooks/useCurrencyDetection.ts` - React hook for state management
   - Three-layer caching strategy

## Caching Strategy

### Layer 1: Browser LocalStorage (7-day cache)
- Fastest option
- Checked first on every page load
- Stores: `{ currency, country_code, country_name, timestamp }`
- Key: `shade_space_currency`

### Layer 2: Supabase Database (24-hour cache)
- Checked if localStorage cache miss
- Shared across devices for same IP
- Automatically updates `last_accessed` timestamp

### Layer 3: External API Call
- Only if both caches miss
- Uses ipapi.co as primary
- Falls back to ip-api.com
- Results saved to both cache layers

## Supported Currencies

The system supports the following currencies (defined in `src/data/pricing.ts`):
- NZD (New Zealand Dollar) - Base currency
- USD (US Dollar)
- AUD (Australian Dollar)
- GBP (British Pound)
- EUR (Euro)
- CAD (Canadian Dollar)
- AED (UAE Dirham)

If a detected currency is not in this list, the system defaults to USD.

## How It Works

### 1. Initial Page Load
```typescript
// Automatically runs when ShadeConfigurator mounts
const { currency, isLoading, error, detectionMethod } = useCurrencyDetection();
```

### 2. Detection Flow
1. Check localStorage for cached currency
2. If cache miss, get user's IP address (via ipify.org)
3. Hash the IP address for privacy (SHA-256)
4. Check Supabase database for cached session
5. If database miss, call Supabase Edge Function
6. Edge Function checks rate limits
7. Edge Function calls geolocation API
8. Result stored in database and localStorage
9. Currency applied to configurator state

### 3. Cache Expiration
- **localStorage**: 7 days
- **Database**: 24 hours
- **Rate Limit Window**: 1 hour

## Rate Limiting

To prevent API abuse, the system implements:
- **10 requests per IP per hour**
- Tracked in `rate_limit_counters` table
- Returns 429 status when limit exceeded
- Window resets after 60 minutes

## Error Handling

The system gracefully degrades:
1. If localStorage fails → Try Supabase cache
2. If Supabase fails → Try Edge Function
3. If Edge Function fails → Try fallback API
4. If all fail → Default to USD

All errors are logged but never break the user experience.

## Testing

### Test Different Scenarios

1. **First-time visitor**: Clear localStorage and database cache
   ```javascript
   localStorage.removeItem('shade_space_currency');
   ```

2. **Returning visitor**: Currency should load instantly from localStorage

3. **Rate limiting**: Make 10+ requests within an hour from same IP

4. **Cache expiration**: Wait 7 days (localStorage) or 24 hours (database)

### Manual Testing
```javascript
// In browser console
import { detectCurrency, clearCurrencyCache } from './utils/currencyDetection';

// Clear all caches
clearCurrencyCache();

// Force new detection
const result = await detectCurrency();
console.log(result);
```

### Check Detection Logs
```sql
-- View recent detections
SELECT * FROM currency_detection_logs
ORDER BY created_at DESC
LIMIT 50;

-- View cache hit rates
SELECT
  detection_method,
  COUNT(*) as count,
  AVG(response_time_ms) as avg_response_time
FROM currency_detection_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY detection_method;
```

## Database Management

### Clean Up Old Data

The database includes automatic cleanup functions:

```sql
-- Clean expired sessions (run daily)
SELECT cleanup_expired_sessions();

-- Clean old logs (keeps last 30 days)
SELECT cleanup_old_logs();
```

Consider setting up a cron job or Supabase scheduled function to run these periodically.

### Monitor Performance

```sql
-- Average response times by method
SELECT
  detection_method,
  COUNT(*) as total_detections,
  AVG(response_time_ms) as avg_time,
  MAX(response_time_ms) as max_time
FROM currency_detection_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY detection_method;

-- Success rate
SELECT
  success,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM currency_detection_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY success;
```

## Privacy Considerations

- IP addresses are hashed (SHA-256) before storage
- No personally identifiable information is stored
- Cache entries automatically expire
- Compliant with GDPR/CCPA best practices

## Troubleshooting

### Currency Not Detected
1. Check browser console for errors
2. Verify Supabase credentials in `.env`
3. Check Edge Function logs in Supabase dashboard
4. Verify IP detection service is working

### Wrong Currency Detected
1. Check geolocation API accuracy
2. Verify currency is in `EXCHANGE_RATES` map
3. Test with VPN from different region

### Rate Limit Issues
1. Check `rate_limit_counters` table
2. Verify window_start timestamp
3. Consider increasing limit for production

## Performance Metrics

Expected performance:
- **localStorage hit**: <5ms
- **Database hit**: 50-150ms
- **API call**: 200-500ms
- **Cache hit rate**: >95% after initial traffic

## Future Enhancements

Potential improvements:
1. Add user preference override (manual currency selection)
2. Implement server-side edge location detection
3. Add currency conversion rates auto-update
4. Implement A/B testing for different APIs
5. Add webhooks for currency change notifications
