import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface EventsTableProps {
  dateRange: { start: string; end: string };
}

interface UserEvent {
  id: string;
  event_type: string;
  event_data: Record<string, any>;
  customer_email: string | null;
  device_type: string;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export const EventsTable: React.FC<EventsTableProps> = ({ dateRange }) => {
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchEvents();
  }, [dateRange, eventTypeFilter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase credentials not found');
        return;
      }

      let query = `${supabaseUrl}/rest/v1/user_events?created_at=gte.${dateRange.start}T00:00:00&created_at=lte.${dateRange.end}T23:59:59&order=created_at.desc&limit=200`;

      if (eventTypeFilter !== 'all') {
        query += `&event_type=eq.${eventTypeFilter}`;
      }

      const response = await fetch(query, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
      });

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
    return (
      event.event_type?.toLowerCase().includes(searchLower) ||
      event.customer_email?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventTypeBadge = (eventType: string) => {
    const eventStyles: Record<string, string> = {
      pdf_download: 'bg-purple-100 text-purple-800',
      email_summary: 'bg-orange-100 text-orange-800',
      add_to_cart: 'bg-red-100 text-red-800',
      quote_save: 'bg-green-100 text-green-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${eventStyles[eventType] || 'bg-gray-100 text-gray-800'}`}>
        {eventType.replace('_', ' ')}
      </span>
    );
  };

  const getSuccessBadge = (success: boolean) => {
    return success ? (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Success</span>
    ) : (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">✗ Failed</span>
    );
  };

  const exportToCSV = () => {
    const headers = ['Event Type', 'Customer Email', 'Device Type', 'Success', 'Created At'];
    const rows = filteredEvents.map(e => [
      e.event_type,
      e.customer_email || '',
      e.device_type,
      e.success ? 'Success' : 'Failed',
      e.created_at,
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
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
      <Card>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex-1 flex gap-4">
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="all">All Event Types</option>
            <option value="pdf_download">PDF Downloads</option>
            <option value="email_summary">Email Summaries</option>
            <option value="add_to_cart">Add to Cart</option>
            <option value="quote_save">Quote Saves</option>
          </select>
        </div>
        <Button onClick={exportToCSV} size="sm" variant="outline">
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-3 text-sm font-semibold text-gray-700">Event Type</th>
              <th className="pb-3 text-sm font-semibold text-gray-700">Customer Email</th>
              <th className="pb-3 text-sm font-semibold text-gray-700">Device</th>
              <th className="pb-3 text-sm font-semibold text-gray-700">Status</th>
              <th className="pb-3 text-sm font-semibold text-gray-700">Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No events found
                </td>
              </tr>
            ) : (
              filteredEvents.map((event) => (
                <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4">{getEventTypeBadge(event.event_type)}</td>
                  <td className="py-4 text-sm text-gray-600">
                    {event.customer_email || <span className="text-gray-400">Anonymous</span>}
                  </td>
                  <td className="py-4 text-sm text-gray-900 capitalize">{event.device_type}</td>
                  <td className="py-4">{getSuccessBadge(event.success)}</td>
                  <td className="py-4 text-sm text-gray-600">{formatDate(event.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredEvents.length} of {events.length} events
      </div>
    </Card>
  );
};
