# Currency Detection Testing Guide

## Quick Test Steps

### 1. Clear All Caches (Fresh Start)
```javascript
// Open browser console and run:
localStorage.removeItem('shade_space_currency');
console.log('LocalStorage cleared');
```

### 2. Refresh the Page
The system should automatically detect your currency based on your IP address.

### 3. Check Console Logs
You should see messages like:
```
Currency detected: USD via api
Currency automatically set to: USD
```

### 4. Verify localStorage Cache
```javascript
// Check what's stored in localStorage:
const cached = localStorage.getItem('shade_space_currency');
console.log('Cached data:', JSON.parse(cached));
```

Expected output:
```json
{
  "currency": "USD",
  "country_code": "US",
  "country_name": "United States",
  "timestamp": 1234567890123
}
```

### 5. Test Cache Hit (Subsequent Page Loads)
```javascript
// Refresh the page
// You should see in console:
"Currency detected: USD via localStorage"
```

This should be instant (<5ms) because it's reading from cache.

## Test Different Scenarios

### Scenario 1: Returning User (7-Day Cache)
1. Load the page normally
2. Currency is detected and cached
3. Refresh the page multiple times
4. **Expected**: Every load uses localStorage cache (instant)

### Scenario 2: Cache Expired (After 7 Days)
1. Manually modify the timestamp in localStorage:
```javascript
const cached = JSON.parse(localStorage.getItem('shade_space_currency'));
cached.timestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
localStorage.setItem('shade_space_currency', JSON.stringify(cached));
```
2. Refresh the page
3. **Expected**: New detection via Supabase or API

### Scenario 3: Test Supabase Database Cache
1. Clear localStorage only:
```javascript
localStorage.removeItem('shade_space_currency');
```
2. Refresh the page within 24 hours of first visit
3. **Expected**: "Currency detected: USD via supabase"

### Scenario 4: Test Fallback to USD
1. Disconnect from internet (or block API calls)
2. Clear all caches
3. Refresh the page
4. **Expected**: "Currency detected: USD via fallback"

## Browser Console Testing

### Test the Detection Function Directly
```javascript
// Import and test manually (in dev tools)
import { detectCurrency, clearCurrencyCache } from './src/utils/currencyDetection.ts';

// Clear caches
clearCurrencyCache();

// Run detection
const result = await detectCurrency();
console.log('Detection result:', result);
```

### Check Current Currency
```javascript
// Get the currently cached currency
import { getCachedCurrency } from './src/utils/currencyDetection.ts';
console.log('Current currency:', getCachedCurrency());
```

## Verify in Supabase Dashboard

### 1. Check User Sessions Table
```sql
SELECT * FROM user_sessions
ORDER BY created_at DESC
LIMIT 10;
```

You should see:
- Your hashed IP address
- Detected currency code
- Country information
- Timestamps

### 2. Check Detection Logs
```sql
SELECT
  detected_currency,
  detection_method,
  api_provider,
  success,
  response_time_ms,
  created_at
FROM currency_detection_logs
ORDER BY created_at DESC
LIMIT 20;
```

Useful insights:
- Which detection method was used most
- Average response times
- Success vs. failure rate

### 3. Check Rate Limits
```sql
SELECT
  ip_address,
  request_count,
  window_start,
  updated_at
FROM rate_limit_counters
ORDER BY updated_at DESC;
```

### 4. Performance Analytics
```sql
-- Cache hit rate by method
SELECT
  detection_method,
  COUNT(*) as hits,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM currency_detection_logs), 2) as percentage
FROM currency_detection_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY detection_method
ORDER BY hits DESC;
```

## Common Issues and Solutions

### Issue: Currency is always USD
**Solution**: Check if your actual IP is being detected correctly
```javascript
fetch('https://api.ipify.org?format=json')
  .then(res => res.json())
  .then(data => console.log('Your IP:', data.ip));
```

### Issue: Rate limit exceeded
**Solution**: Wait 1 hour or clear rate limit counter in database
```sql
DELETE FROM rate_limit_counters WHERE ip_address = 'YOUR_HASHED_IP';
```

### Issue: Detection is slow
**Solution**: Check which method is being used
- localStorage should be <5ms
- Supabase should be <200ms
- API calls can be 200-500ms

Clear caches to test fresh detection speed.

### Issue: Wrong currency detected
**Solution**: Geolocation APIs aren't 100% accurate
- Test with VPN from different location
- Check if currency is supported in `EXCHANGE_RATES`
- Verify API response in Edge Function logs

## Integration Testing

### Test Currency Affects Pricing
1. Clear caches and load the page
2. Note the detected currency
3. Configure a shade sail completely
4. Verify pricing displays in detected currency
5. Check that prices are converted correctly using exchange rates

### Test Different Currencies
Use a VPN or proxy to test from different regions:
- **USA** → Should detect USD
- **UK** → Should detect GBP
- **Australia** → Should detect AUD
- **New Zealand** → Should detect NZD
- **UAE** → Should detect AED
- **Canada** → Should detect CAD
- **Europe** → Should detect EUR

## Monitoring in Production

### Set Up Alerts
Monitor these metrics:
1. Detection success rate (should be >95%)
2. Average response time (should be <300ms)
3. Cache hit rate (should be >90%)
4. Rate limit violations (should be low)

### Weekly Health Check
```sql
-- Weekly summary report
SELECT
  DATE(created_at) as date,
  detection_method,
  COUNT(*) as detections,
  AVG(response_time_ms) as avg_time,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successes,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failures
FROM currency_detection_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), detection_method
ORDER BY date DESC, detections DESC;
```

## Expected Behavior Summary

| Scenario | Expected Detection Method | Expected Time |
|----------|-------------------------|---------------|
| First visit | API call via Edge Function | 200-500ms |
| Returning user (<7 days) | localStorage | <5ms |
| After localStorage expires | Supabase database | 50-150ms |
| After database expires | API call via Edge Function | 200-500ms |
| API failure | Fallback to USD | <10ms |

## Success Criteria

✅ Currency detected automatically on first visit
✅ Subsequent visits use localStorage cache (instant load)
✅ Correct currency symbol displayed in pricing
✅ Prices converted using correct exchange rates
✅ No errors in browser console
✅ Cache persists across page refreshes
✅ Rate limiting prevents API abuse
✅ Graceful fallback to USD on errors
