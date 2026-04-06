import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { getAdminAuthHeaders } from '../../utils/adminAuth';

interface DataExportProps {
  dateRange: { start: string; end: string };
}

export const DataExport: React.FC<DataExportProps> = ({ dateRange }) => {
  const [exporting, setExporting] = useState<string | null>(null);

  const downloadCSV = (filename: string, csv: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const escapeCsv = (val: unknown) => {
    const str = String(val ?? '');
    return `"${str.replace(/"/g, '""')}"`;
  };

  const exportQuotes = async () => {
    try {
      setExporting('quotes');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const headers = await getAdminAuthHeaders();
      const res = await fetch(
        `${supabaseUrl}/rest/v1/saved_quotes?created_at=gte.${dateRange.start}T00:00:00&created_at=lte.${dateRange.end}T23:59:59&order=created_at.desc&limit=5000`,
        { headers }
      );
      if (!res.ok) return;
      const quotes = await res.json();

      const csvHeaders = [
        'Quote Reference', 'Quote Name', 'First Name', 'Last Name', 'Email',
        'Customer Reference', 'Status', 'Currency', 'Total Price', 'Fabric Cost',
        'Edge Cost', 'Hardware Cost', 'Area (m2)', 'Perimeter (m)',
        'Corners', 'Fabric Type', 'Fabric Color', 'Edge Type',
        'Measurement Option', 'Units', 'Step Progress',
        'Created At',
      ];

      const rows = quotes.map((q: any) => {
        const cfg = q.config_data || {};
        const calc = q.calculations_data || {};
        return [
          q.quote_reference, q.quote_name, q.customer_first_name || '', q.customer_last_name || '',
          q.customer_email || '', q.customer_reference || '', q.status,
          cfg.currency || '', calc.totalPrice || 0, calc.fabricCost || 0,
          calc.edgeCost || 0, calc.hardwareCost || 0, calc.area || 0, calc.perimeter || 0,
          cfg.corners || '', cfg.fabricType || '', cfg.fabricColor || '', cfg.edgeType || '',
          cfg.measurementOption || '', cfg.unit || '',
          q.current_step != null && q.total_steps ? `${q.current_step + 1}/${q.total_steps}` : '',
          q.created_at,
        ].map(escapeCsv).join(',');
      });

      downloadCSV(
        `shadespace-quotes-full-${dateRange.start}-to-${dateRange.end}.csv`,
        [csvHeaders.map(escapeCsv).join(','), ...rows].join('\n')
      );
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  const exportEvents = async () => {
    try {
      setExporting('events');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const headers = await getAdminAuthHeaders();
      const res = await fetch(
        `${supabaseUrl}/rest/v1/user_events?created_at=gte.${dateRange.start}T00:00:00&created_at=lte.${dateRange.end}T23:59:59&order=created_at.desc&limit=5000`,
        { headers }
      );
      if (!res.ok) return;
      const events = await res.json();

      const csvHeaders = [
        'Event Type', 'Customer Email', 'Customer Name', 'Device Type',
        'Success', 'Error Message', 'Quote ID', 'Event Data JSON', 'Created At',
      ];

      const rows = events.map((e: any) => [
        e.event_type, e.customer_email || '', e.event_data?.customerName || '',
        e.device_type, e.success ? 'true' : 'false', e.error_message || '',
        e.quote_id || '', JSON.stringify(e.event_data || {}), e.created_at,
      ].map(escapeCsv).join(','));

      downloadCSV(
        `shadespace-events-full-${dateRange.start}-to-${dateRange.end}.csv`,
        [csvHeaders.map(escapeCsv).join(','), ...rows].join('\n')
      );
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  const exportCustomerSummary = async () => {
    try {
      setExporting('customers');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const headers = await getAdminAuthHeaders();
      const [quotesRes, eventsRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/saved_quotes?created_at=gte.${dateRange.start}T00:00:00&created_at=lte.${dateRange.end}T23:59:59&limit=5000`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/user_events?created_at=gte.${dateRange.start}T00:00:00&created_at=lte.${dateRange.end}T23:59:59&limit=5000`, { headers }),
      ]);

      const quotes = quotesRes.ok ? await quotesRes.json() : [];
      const events = eventsRes.ok ? await eventsRes.json() : [];

      const customers: Record<string, {
        email: string; name: string; quoteCount: number; cartCount: number;
        pdfCount: number; emailCount: number; totalValue: number; currencies: Set<string>;
        firstSeen: string; lastSeen: string;
      }> = {};

      quotes.forEach((q: any) => {
        if (!q.customer_email) return;
        const key = q.customer_email.toLowerCase();
        if (!customers[key]) {
          customers[key] = {
            email: q.customer_email,
            name: [q.customer_first_name, q.customer_last_name].filter(Boolean).join(' '),
            quoteCount: 0, cartCount: 0, pdfCount: 0, emailCount: 0, totalValue: 0,
            currencies: new Set(), firstSeen: q.created_at, lastSeen: q.created_at,
          };
        }
        customers[key].quoteCount++;
        customers[key].totalValue += q.calculations_data?.totalPrice || 0;
        if (q.config_data?.currency) customers[key].currencies.add(q.config_data.currency);
        if (q.created_at < customers[key].firstSeen) customers[key].firstSeen = q.created_at;
        if (q.created_at > customers[key].lastSeen) customers[key].lastSeen = q.created_at;
      });

      events.forEach((e: any) => {
        if (!e.customer_email) return;
        const key = e.customer_email.toLowerCase();
        if (!customers[key]) {
          customers[key] = {
            email: e.customer_email, name: e.event_data?.customerName || '',
            quoteCount: 0, cartCount: 0, pdfCount: 0, emailCount: 0, totalValue: 0,
            currencies: new Set(), firstSeen: e.created_at, lastSeen: e.created_at,
          };
        }
        if (e.event_type === 'add_to_cart') customers[key].cartCount++;
        if (e.event_type === 'pdf_download') customers[key].pdfCount++;
        if (e.event_type === 'email_summary') customers[key].emailCount++;
        if (e.created_at > customers[key].lastSeen) customers[key].lastSeen = e.created_at;
      });

      const csvHeaders = [
        'Email', 'Name', 'Quotes Saved', 'Add to Carts', 'PDFs Downloaded',
        'Emails Sent', 'Total Quote Value', 'Currencies', 'First Seen', 'Last Seen',
      ];

      const rows = Object.values(customers)
        .sort((a, b) => b.totalValue - a.totalValue)
        .map(c => [
          c.email, c.name, c.quoteCount, c.cartCount, c.pdfCount,
          c.emailCount, c.totalValue.toFixed(2), Array.from(c.currencies).join('; '),
          c.firstSeen, c.lastSeen,
        ].map(escapeCsv).join(','));

      downloadCSV(
        `shadespace-customers-${dateRange.start}-to-${dateRange.end}.csv`,
        [csvHeaders.map(escapeCsv).join(','), ...rows].join('\n')
      );
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  const exports = [
    { id: 'quotes', title: 'Full Quotes Export', desc: 'All saved quotes with configuration details, measurements, pricing, and customer info', action: exportQuotes },
    { id: 'events', title: 'Full Events Export', desc: 'Every tracked user interaction including step changes, option selections, and conversions', action: exportEvents },
    { id: 'customers', title: 'Customer Summary', desc: 'Aggregated customer activity: quotes saved, carts, PDFs, total value, and engagement timeline', action: exportCustomerSummary },
  ];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Data Export</h2>
      <div className="space-y-4">
        {exports.map(exp => (
          <div key={exp.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="font-medium text-gray-900">{exp.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{exp.desc}</p>
            </div>
            <Button onClick={exp.action} size="sm" disabled={exporting !== null}>
              {exporting === exp.id ? 'Exporting...' : 'Download CSV'}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
