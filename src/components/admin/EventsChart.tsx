import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';

interface EventsChartProps {
  dateRange: { start: string; end: string };
}

interface TimelineData {
  period: string;
  event_count: number;
}

export const EventsChart: React.FC<EventsChartProps> = ({ dateRange }) => {
  const [timelineData, setTimelineData] = useState<Record<string, TimelineData[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState<string>('all');

  useEffect(() => {
    fetchTimelineData();
  }, [dateRange]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase credentials not found');
        return;
      }

      const eventTypes = ['pdf_download', 'email_summary', 'add_to_cart', 'quote_save'];
      const data: Record<string, TimelineData[]> = {};

      // Fetch timeline for each event type
      for (const eventType of eventTypes) {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_event_timeline`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
          },
          body: JSON.stringify({
            p_event_type: eventType,
            p_start_date: new Date(dateRange.start).toISOString(),
            p_end_date: new Date(dateRange.end + 'T23:59:59').toISOString(),
            p_interval: 'day',
          }),
        });

        if (response.ok) {
          data[eventType] = await response.json();
        }
      }

      setTimelineData(data);
    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
      </Card>
    );
  }

  const eventTypes = [
    { value: 'all', label: 'All Events', color: 'bg-blue-500' },
    { value: 'pdf_download', label: 'PDF Downloads', color: 'bg-purple-500' },
    { value: 'email_summary', label: 'Email Summaries', color: 'bg-orange-500' },
    { value: 'add_to_cart', label: 'Add to Cart', color: 'bg-red-500' },
    { value: 'quote_save', label: 'Quote Saves', color: 'bg-green-500' },
  ];

  // Aggregate data for "all" view
  const allData: TimelineData[] = [];
  if (selectedEventType === 'all') {
    const dateMap = new Map<string, number>();
    Object.values(timelineData).forEach((data) => {
      data.forEach((item) => {
        const date = new Date(item.period).toISOString().split('T')[0];
        dateMap.set(date, (dateMap.get(date) || 0) + item.event_count);
      });
    });
    dateMap.forEach((count, date) => {
      allData.push({ period: date, event_count: count });
    });
    allData.sort((a, b) => a.period.localeCompare(b.period));
  }

  const chartData = selectedEventType === 'all' ? allData : (timelineData[selectedEventType] || []);
  const maxCount = Math.max(...chartData.map(d => d.event_count), 1);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Event Timeline</h2>
        <div className="flex gap-2 flex-wrap">
          {eventTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedEventType(type.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedEventType === type.value
                  ? 'bg-lime-100 text-lime-900 border border-lime-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No data available for selected period
        </div>
      ) : (
        <div className="space-y-2">
          {chartData.map((item, index) => {
            const barWidth = (item.event_count / maxCount) * 100;
            const date = new Date(item.period).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div key={index} className="flex items-center gap-4">
                <div className="w-16 text-sm text-gray-600 text-right">{date}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                  <div
                    className="bg-lime-500 h-full rounded-full transition-all duration-300 flex items-center justify-end pr-3"
                    style={{ width: `${barWidth}%` }}
                  >
                    {item.event_count > 0 && (
                      <span className="text-sm font-medium text-white">{item.event_count}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Events</p>
            <p className="text-2xl font-bold text-gray-900">
              {chartData.reduce((sum, item) => sum + item.event_count, 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Average per Day</p>
            <p className="text-2xl font-bold text-gray-900">
              {chartData.length > 0
                ? Math.round(chartData.reduce((sum, item) => sum + item.event_count, 0) / chartData.length)
                : 0}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Peak Day</p>
            <p className="text-2xl font-bold text-gray-900">{maxCount}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Days Tracked</p>
            <p className="text-2xl font-bold text-gray-900">{chartData.length}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
