# ShadeSpace Admin Analytics Dashboard

## Overview

The ShadeSpace Admin Dashboard provides comprehensive analytics and insights into user interactions with the shade configurator. Track quotes, PDF downloads, email summaries, add-to-cart events, and more.

## Features

### 1. Analytics Summary
- **Total Quotes**: Number of quotes created in the selected date range
- **Unique Customers**: Number of unique email addresses
- **PDF Downloads**: Total PDF quote downloads
- **Email Summaries**: Email summary requests sent
- **Add to Cart**: Number of add-to-cart actions
- **Total Quote Value**: Sum of all quote prices
- **Average Quote Value**: Mean quote price
- **Conversion Rate**: Percentage of quotes that converted to completed

### 2. Saved Quotes Management
- View all saved quotes with detailed information
- Search by quote name, reference, email, or customer reference
- Filter by status (in_progress, quote_ready, completed, expired)
- Click quote reference to view full configuration details
- Export quotes to CSV with one click
- View customer email addresses for follow-up

### 3. User Events Tracking
- Track all user interactions: PDF downloads, email sends, cart additions
- Filter by event type
- View success/failure status
- See device type (mobile, tablet, desktop)
- Export events to CSV

### 4. Event Timeline Charts
- Visual timeline of events over selected date range
- Filter by specific event types
- View daily aggregated data
- See peak usage days and averages

### 5. Data Export
- Export all quotes as CSV
- Export user events as CSV
- Download comprehensive analytics reports as JSON

## Accessing the Dashboard

### Method 1: Query Parameter (Recommended)
Add `?admin=true` to your application URL:
```
https://yourdomain.com/?admin=true
```

### Method 2: URL Path
If your hosting setup supports it, access directly:
```
https://yourdomain.com/admin
```

## Authentication

The dashboard uses a simple password-based authentication system:

1. Default password: `admin123` (configured in `.env`)
2. Change the password by updating `VITE_ADMIN_PASSWORD` in your `.env` file
3. Session-based authentication (expires when browser is closed)

**Important**: For production use, consider implementing proper admin user authentication using Supabase Auth.

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Admin Dashboard Password
VITE_ADMIN_PASSWORD=your_secure_password_here

# Supabase Configuration (required for analytics)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Database Setup

The admin dashboard requires the following database infrastructure (already migrated if you ran the migrations):

1. **admin_users** table - For future multi-admin support
2. **user_events** table - Stores all tracked events
3. **analytics_cache** table - Pre-computed analytics for fast loading

### Edge Functions

The `track-event` Edge Function is deployed to capture user events:
- PDF downloads
- Email summary requests
- Add to cart actions
- Quote saves

## Usage Guide

### Viewing Analytics

1. **Select Date Range**: Use the date picker to filter data by time period
2. **View Summary Metrics**: See key metrics at the top of the Overview tab
3. **Analyze Trends**: Review the event timeline chart to identify patterns

### Managing Quotes

1. **Navigate to Quotes Tab**: Click "Saved Quotes" in the navigation
2. **Search**: Use the search box to find specific quotes
3. **Filter by Status**: Use the dropdown to filter by quote status
4. **View Details**: Click on a quote reference to see full configuration
5. **Export**: Click "Export CSV" to download quote data

### Tracking Events

1. **Navigate to Events Tab**: Click "User Events" in the navigation
2. **Filter by Type**: Select specific event types (PDF, Email, Cart)
3. **View Success Rate**: Monitor success/failure status of events
4. **Export Data**: Download event data as CSV for further analysis

### Exporting Data

1. **Navigate to Exports Tab**: Click "Data Export" in the navigation
2. **Choose Export Type**:
   - **All Quotes CSV**: Complete quote database
   - **User Events CSV**: All tracked events
   - **Analytics Report JSON**: Comprehensive analytics data
3. **Download**: Click the corresponding download button

## Event Tracking

The dashboard automatically tracks the following events:

### PDF Downloads
- Triggered when user generates a PDF quote
- Captures: quote ID, customer email, total price, currency
- Success/failure status

### Email Summaries
- Triggered when user requests email summary
- Captures: recipient email, quote details, Shopify customer creation
- Delivery status

### Add to Cart
- Triggered when user clicks "Add to Cart"
- Captures: quote ID, customer email, product details, cart value
- Success/failure status

### Quote Saves
- Triggered when user saves a quote
- Captures: quote reference, configuration details, customer info
- Save method (email or anonymous link)

## Integration with Existing Analytics

The admin dashboard complements your existing Google Analytics 4 tracking:

- **GA4**: Tracks user behavior, page views, and conversions
- **Admin Dashboard**: Tracks specific configurator events with detailed data
- **Supabase**: Stores all event data for long-term analysis

Both systems run simultaneously, giving you:
- Real-time GA4 insights in Google Analytics
- Detailed event data and quote management in the admin dashboard

## Security Considerations

### Current Implementation (Development)
- Simple password authentication
- Session-based authorization
- Query parameter access

### Production Recommendations

1. **Use Supabase Auth**
   - Implement proper admin user authentication
   - Use Row Level Security (RLS) policies
   - Enable email verification for admin accounts

2. **Secure the Admin Route**
   - Use server-side route protection
   - Implement IP whitelisting if needed
   - Add two-factor authentication

3. **Audit Logging**
   - Log all admin actions (who viewed what, when)
   - Monitor unusual access patterns
   - Set up alerts for unauthorized access attempts

4. **Password Best Practices**
   - Use strong, unique passwords
   - Rotate passwords regularly
   - Never commit passwords to version control

## Troubleshooting

### Dashboard Not Loading
**Problem**: Admin dashboard shows loading indefinitely
**Solution**:
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Check browser console for errors
- Ensure migrations have been applied

### No Data Showing
**Problem**: Dashboard loads but shows no data
**Solution**:
- Verify date range is correct
- Check that events are being tracked (look at user_events table)
- Ensure RLS policies allow reading data

### Authentication Issues
**Problem**: Password not working
**Solution**:
- Verify `VITE_ADMIN_PASSWORD` is set in `.env`
- Clear browser cache and session storage
- Try in an incognito window

### Export Not Working
**Problem**: CSV export downloads empty file
**Solution**:
- Ensure data exists for the selected filters
- Check browser console for errors
- Try exporting with different filters

## Future Enhancements

Planned features for future releases:

1. **Real-time Dashboard Updates**: WebSocket integration for live data
2. **Advanced Filtering**: More granular filters and search options
3. **Email Campaign Integration**: Bulk email capabilities for follow-ups
4. **Custom Reports**: Scheduled report generation and email delivery
5. **User Journey Mapping**: Visual representation of customer paths
6. **Conversion Funnel Analysis**: Detailed dropoff analysis
7. **A/B Testing Dashboard**: Track experiments and their results
8. **API Access**: REST API for programmatic data access

## Support

For questions or issues:
- Check the main [README.md](./README.md) for general setup
- Review [DEVELOPER_SETUP_GUIDE.md](./DEVELOPER_SETUP_GUIDE.md) for technical details
- Consult Supabase documentation: https://supabase.com/docs

## License

Part of the ShadeSpace Configurator project.
