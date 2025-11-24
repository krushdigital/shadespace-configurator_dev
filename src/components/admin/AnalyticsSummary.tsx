import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';

interface AnalyticsSummaryProps {
  dateRange: { start: string; end: string };
}

interface Analytics {
  total_quotes: number;
  total_events: number;
  pdf_downloads: number;
  email_summaries: number;
  add_to_cart: number;
  unique_customers: number;
  total_quote_value: number;
  avg_quote_value: number;
  conversion_rate: number;
}

export const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({ dateRange }) => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase credentials not found');
        return;
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_analytics_summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          p_start_date: new Date(dateRange.start).toISOString(),
          p_end_date: new Date(dateRange.end + 'T23:59:59').toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-24 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <p className="text-gray-500 text-center py-8">Failed to load analytics data</p>
      </Card>
    );
  }

  const metrics = [
    {
      label: 'Total Quotes',
      value: analytics.total_quotes.toLocaleString(),
      icon: '📋',
      color: 'text-blue-600',
    },
    {
      label: 'Unique Customers',
      value: analytics.unique_customers.toLocaleString(),
      icon: '👥',
      color: 'text-green-600',
    },
    {
      label: 'PDF Downloads',
      value: analytics.pdf_downloads.toLocaleString(),
      icon: '📄',
      color: 'text-purple-600',
    },
    {
      label: 'Email Summaries',
      value: analytics.email_summaries.toLocaleString(),
      icon: '📧',
      color: 'text-orange-600',
    },
    {
      label: 'Add to Cart',
      value: analytics.add_to_cart.toLocaleString(),
      icon: '🛒',
      color: 'text-red-600',
    },
    {
      label: 'Total Quote Value',
      value: `$${analytics.total_quote_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: '💰',
      color: 'text-lime-600',
    },
    {
      label: 'Avg Quote Value',
      value: `$${analytics.avg_quote_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: '📊',
      color: 'text-teal-600',
    },
    {
      label: 'Conversion Rate',
      value: `${analytics.conversion_rate}%`,
      icon: '🎯',
      color: 'text-indigo-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{metric.label}</p>
              <p className={`text-3xl font-bold ${metric.color}`}>{metric.value}</p>
            </div>
            <span className="text-3xl">{metric.icon}</span>
          </div>
        </Card>
      ))}
    </div>
  );
};
