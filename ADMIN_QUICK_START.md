# Admin Dashboard - Quick Start Guide

## Access the Dashboard

### Step 1: Set Admin Password

Add this to your `.env` file:
```bash
VITE_ADMIN_PASSWORD=your_secure_password
```

Default password is `admin123` if not set.

### Step 2: Access the Admin URL

**Option A: Query Parameter** (Works immediately)
```
https://your-app-url.com/?admin=true
```

**Option B: Direct Path** (If hosting supports routing)
```
https://your-app-url.com/admin
```

### Step 3: Login

Enter your admin password to access the dashboard.

## What You Can See

### Overview Tab
- 📊 Total quotes, customers, events
- 💰 Revenue metrics
- 📈 Event timeline charts
- 🎯 Conversion rates

### Saved Quotes Tab
- All customer quotes with full details
- Search by name, email, or reference
- Filter by status (in_progress, quote_ready, completed)
- Click quote references to view full configuration
- Export to CSV

### User Events Tab
- PDF downloads
- Email summaries sent
- Add to cart actions
- Success/failure tracking
- Device type breakdown
- Export to CSV

### Data Export Tab
- Download all quotes (CSV)
- Download all events (CSV)
- Export analytics reports (JSON)

## Quick Actions

### View a Specific Quote
1. Go to "Saved Quotes" tab
2. Search for customer email or quote reference
3. Click the quote reference link
4. Modal shows full configuration and customer details

### Track PDF Downloads
1. Go to "User Events" tab
2. Filter by "PDF Downloads" event type
3. See all PDF generation attempts with success rates

### Export Customer Emails
1. Go to "Saved Quotes" tab
2. Click "Export CSV"
3. Open CSV file and extract email column
4. Use for email marketing campaigns

### Monitor Add to Cart Conversions
1. Go to "Overview" tab
2. Check "Add to Cart" metric
3. Go to "User Events" tab
4. Filter by "Add to Cart" to see details

## Date Range Filtering

All data can be filtered by date range:
- Click the date inputs at the top
- Select start and end dates
- Click "Apply" to refresh data

Common ranges:
- Last 7 days: Quick recent activity view
- Last 30 days: Monthly overview
- Last 90 days: Quarterly analysis
- Custom: Any specific date range

## Understanding Quote Statuses

- **in_progress**: User started but didn't complete configuration
- **quote_ready**: User completed configuration but didn't add to cart
- **completed**: User added to cart (potential conversion)
- **expired**: Quote is older than 30 days

## Key Metrics Explained

**Total Quote Value**: Sum of all quote prices in the selected period
**Average Quote Value**: Mean quote price
**Conversion Rate**: (Completed quotes / Total quotes) × 100
**Unique Customers**: Count of distinct email addresses

## Troubleshooting

**Can't access dashboard**: Verify `?admin=true` is in the URL

**No data showing**: Check date range, may need to expand it

**Password not working**:
- Verify `VITE_ADMIN_PASSWORD` in `.env`
- Rebuild app: `npm run build`
- Clear browser cache

**Export downloads empty file**: No data matches current filters

## Security Notes

⚠️ **Important**:
- Change default password in production
- Don't share admin URL publicly
- Session expires when browser closes
- Consider IP whitelisting for extra security

## Need More Details?

See [ADMIN_DASHBOARD_GUIDE.md](./ADMIN_DASHBOARD_GUIDE.md) for comprehensive documentation.
