import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { getAdminAuthHeaders } from '../../utils/adminAuth';

interface EventsTableProps {
  dateRange: { start: string; end: string };
}

interface UserEvent {
  id: string;
  event_type: string;
  event_data: Record<string, any>;
  customer_email: string | null;
  customer_ip: string | null;
  customer_country: string | null;
  customer_country_code: string | null;
  device_type: string;
  success: boolean;
  error_message: string | null;
  is_excluded: boolean;
  created_at: string;
}

export const EventsTable: React.FC<EventsTableProps & { excludeInternal?: boolean; timezone?: string }> = ({ dateRange, excludeInternal, timezone = 'UTC' }) => {
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [dateRange, eventTypeFilter, excludeInternal]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      let query = `${supabaseUrl}/rest/v1/user_events?select=id,event_type,event_data,customer_email,customer_ip,customer_country,customer_country_code,device_type,success,error_message,is_excluded,created_at&created_at=gte.${dateRange.start}T00:00:00&created_at=lte.${dateRange.end}T23:59:59&order=created_at.desc&limit=200`;

      if (eventTypeFilter !== 'all') {
        query += `&event_type=eq.${eventTypeFilter}`;
      }

      if (excludeInternal) {
        query += '&is_excluded=eq.false';
      }

      const headers = await getAdminAuthHeaders();
      const response = await fetch(query, { headers });

      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event) => {
    const searchLower = search.toLowerCase();
    const customerName = event.event_data?.customerName?.toLowerCase() || '';
    return (
      event.event_type?.toLowerCase().includes(searchLower) ||
      event.customer_email?.toLowerCase().includes(searchLower) ||
      customerName.includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      timeZone: timezone,
    });
  };

  const getEventTypeBadge = (eventType: string) => {
    const eventStyles: Record<string, string> = {
      pdf_download: 'bg-blue-100 text-blue-800',
      email_summary: 'bg-orange-100 text-orange-800',
      add_to_cart: 'bg-red-100 text-red-800',
      quote_save: 'bg-green-100 text-green-800',
      step_change: 'bg-teal-100 text-teal-800',
      option_selected: 'bg-cyan-100 text-cyan-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${eventStyles[eventType] || 'bg-gray-100 text-gray-800'}`}>
        {eventType.replace(/_/g, ' ')}
      </span>
    );
  };

  const getEventDetail = (event: UserEvent) => {
    const d = event.event_data;
    if (!d) return null;
    if (event.event_type === 'add_to_cart' || event.event_type === 'pdf_download' || event.event_type === 'email_summary') {
      const price = d.totalPrice ? `${d.currency || ''}${Number(d.totalPrice).toFixed(2)}` : null;
      return price;
    }
    if (event.event_type === 'step_change') {
      return d.stepName ? `${d.direction || ''} -> ${d.stepName}` : null;
    }
    if (event.event_type === 'option_selected') {
      return `${d.optionType}: ${d.optionValue}`;
    }
    return null;
  };

  const getCustomerDisplay = (event: UserEvent) => {
    const name = event.event_data?.customerName;
    if (name && event.customer_email) return <><div className="font-medium text-gray-900 text-xs">{name}</div><div className="text-xs text-gray-500">{event.customer_email}</div></>;
    if (name) return <span className="text-xs text-gray-900">{name}</span>;
    if (event.customer_email) return <span className="text-xs text-gray-600">{event.customer_email}</span>;
    return <span className="text-xs text-gray-400">Anonymous</span>;
  };

  const exportToCSV = () => {
    const csvHeaders = [
      'Event Type', 'Customer Email', 'Customer Name', 'IP Address', 'Country',
      'Device Type', 'Success', 'Internal', 'Detail', 'Event Data', 'Created At',
    ];
    const rows = filteredEvents.map(e => [
      e.event_type,
      e.customer_email || '',
      e.event_data?.customerName || '',
      e.customer_ip || '',
      e.customer_country || '',
      e.device_type,
      e.success ? 'Success' : 'Failed',
      e.is_excluded ? 'Yes' : 'No',
      getEventDetail(e) || '',
      JSON.stringify(e.event_data || {}),
      e.created_at,
    ]);

    const csv = [csvHeaders, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shadespace-events-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex-1 flex gap-4">
          <Input placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
          <select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-2">
            <option value="all">All Event Types</option>
            <option value="pdf_download">PDF Downloads</option>
            <option value="email_summary">Email Summaries</option>
            <option value="add_to_cart">Add to Cart</option>
            <option value="quote_save">Quote Saves</option>
            <option value="step_change">Step Changes</option>
            <option value="option_selected">Option Selected</option>
          </select>
        </div>
        <Button onClick={exportToCSV} size="sm" variant="outline">Export CSV</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="px-4 pb-3 text-sm font-semibold text-gray-700">Event Type</th>
              <th className="px-4 pb-3 text-sm font-semibold text-gray-700">Customer</th>
              <th className="px-4 pb-3 text-sm font-semibold text-gray-700">IP / Country</th>
              <th className="px-4 pb-3 text-sm font-semibold text-gray-700">Device</th>
              <th className="px-4 pb-3 text-sm font-semibold text-gray-700">Detail</th>
              <th className="px-4 pb-3 text-sm font-semibold text-gray-700">Status</th>
              <th className="px-4 pb-3 text-sm font-semibold text-gray-700">Created</th>
              <th className="px-4 pb-3 text-sm font-semibold text-gray-700 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No events found</td></tr>
            ) : (
              filteredEvents.map((event) => (
                <React.Fragment key={event.id}>
                  <tr className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${event.is_excluded ? 'opacity-50' : ''}`} onClick={() => setExpandedRow(expandedRow === event.id ? null : event.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {getEventTypeBadge(event.event_type)}
                        {event.is_excluded && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-600">INT</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getCustomerDisplay(event)}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-mono text-gray-600">{event.customer_ip && event.customer_ip !== 'unknown' ? event.customer_ip.split(',')[0].trim() : '-'}</div>
                      {event.customer_country && (
                        <div className="text-xs text-gray-500">{event.customer_country_code ? `${event.customer_country_code} - ` : ''}{event.customer_country}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">{event.device_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{getEventDetail(event) || '-'}</td>
                    <td className="px-4 py-3">
                      {event.success ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Success</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Failed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(event.created_at)}</td>
                    <td className="px-4 py-3 text-gray-400">
                      <svg className={`w-4 h-4 transition-transform ${expandedRow === event.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </td>
                  </tr>
                  {expandedRow === event.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="text-xs font-mono bg-white border border-gray-200 rounded p-3 max-h-48 overflow-auto">
                          <pre className="whitespace-pre-wrap break-all text-gray-700">
                            {JSON.stringify(event.event_data, null, 2)}
                          </pre>
                        </div>
                        {event.error_message && (
                          <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                            Error: {event.error_message}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600">Showing {filteredEvents.length} of {events.length} events</div>
    </Card>
  );
};
