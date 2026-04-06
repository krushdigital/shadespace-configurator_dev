import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { getAdminAuthHeaders } from '../../utils/adminAuth';

interface FunnelAnalysisProps {
  dateRange: { start: string; end: string };
}

interface StepData {
  name: string;
  count: number;
  dropOff: number;
  dropOffRate: number;
}

interface PopularOption {
  value: string;
  count: number;
  percentage: number;
}

export const FunnelAnalysis: React.FC<FunnelAnalysisProps> = ({ dateRange }) => {
  const [loading, setLoading] = useState(true);
  const [funnelSteps, setFunnelSteps] = useState<StepData[]>([]);
  const [popularFabrics, setPopularFabrics] = useState<PopularOption[]>([]);
  const [popularColors, setPopularColors] = useState<PopularOption[]>([]);
  const [popularCorners, setPopularCorners] = useState<PopularOption[]>([]);
  const [popularCurrencies, setPopularCurrencies] = useState<PopularOption[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<PopularOption[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const headers = await getAdminAuthHeaders();

      const [eventsRes, quotesRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/user_events?created_at=gte.${dateRange.start}T00:00:00&created_at=lte.${dateRange.end}T23:59:59&order=created_at.desc&limit=2000`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/saved_quotes?select=config_data,calculations_data,status,created_at&created_at=gte.${dateRange.start}T00:00:00&created_at=lte.${dateRange.end}T23:59:59&limit=1000`, { headers }),
      ]);

      const events = eventsRes.ok ? await eventsRes.json() : [];
      const quotes = quotesRes.ok ? await quotesRes.json() : [];

      buildFunnelData(events, quotes);
      buildPopularOptions(quotes);
      buildDeviceBreakdown(events);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildFunnelData = (events: any[], quotes: any[]) => {
    const stepNames = ['Fabric & Color', 'Style', 'Fixing Points', 'Measurement Options', 'Dimensions', 'Heights & Anchors', 'Review & Purchase'];

    const stepCounts: Record<number, Set<string>> = {};
    for (let i = 0; i < 7; i++) stepCounts[i] = new Set();

    events.filter(e => e.event_type === 'step_change').forEach(event => {
      const stepIndex = event.event_data?.stepIndex;
      const sessionId = event.customer_email || event.id;
      if (stepIndex != null && stepIndex >= 0 && stepIndex < 7) {
        for (let i = 0; i <= stepIndex; i++) {
          stepCounts[i].add(sessionId);
        }
      }
    });

    const totalQuotes = quotes.length;
    const pdfEvents = events.filter(e => e.event_type === 'pdf_download').length;
    const emailEvents = events.filter(e => e.event_type === 'email_summary').length;
    const cartEvents = events.filter(e => e.event_type === 'add_to_cart' && e.success).length;

    const hasStepData = Object.values(stepCounts).some(s => s.size > 0);

    const steps: StepData[] = stepNames.map((name, i) => ({
      name,
      count: hasStepData ? stepCounts[i].size : 0,
      dropOff: 0,
      dropOffRate: 0,
    }));

    steps.push({ name: 'Quote Saved', count: totalQuotes, dropOff: 0, dropOffRate: 0 });
    steps.push({ name: 'PDF Downloaded', count: pdfEvents, dropOff: 0, dropOffRate: 0 });
    steps.push({ name: 'Added to Cart', count: cartEvents, dropOff: 0, dropOffRate: 0 });

    for (let i = 1; i < steps.length; i++) {
      if (steps[i - 1].count > 0) {
        steps[i].dropOff = steps[i - 1].count - steps[i].count;
        steps[i].dropOffRate = ((steps[i - 1].count - steps[i].count) / steps[i - 1].count) * 100;
      }
    }

    setFunnelSteps(steps);
  };

  const buildPopularOptions = (quotes: any[]) => {
    const fabricCounts: Record<string, number> = {};
    const colorCounts: Record<string, number> = {};
    const cornerCounts: Record<string, number> = {};
    const currencyCounts: Record<string, number> = {};

    quotes.forEach((q: any) => {
      const cfg = q.config_data;
      if (!cfg) return;
      if (cfg.fabricType) fabricCounts[cfg.fabricType] = (fabricCounts[cfg.fabricType] || 0) + 1;
      if (cfg.fabricColor) colorCounts[cfg.fabricColor] = (colorCounts[cfg.fabricColor] || 0) + 1;
      if (cfg.corners) cornerCounts[`${cfg.corners} corners`] = (cornerCounts[`${cfg.corners} corners`] || 0) + 1;
      if (cfg.currency) currencyCounts[cfg.currency] = (currencyCounts[cfg.currency] || 0) + 1;
    });

    const toSorted = (counts: Record<string, number>): PopularOption[] => {
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([value, count]) => ({ value, count, percentage: total > 0 ? (count / total) * 100 : 0 }));
    };

    setPopularFabrics(toSorted(fabricCounts));
    setPopularColors(toSorted(colorCounts));
    setPopularCorners(toSorted(cornerCounts));
    setPopularCurrencies(toSorted(currencyCounts));
  };

  const buildDeviceBreakdown = (events: any[]) => {
    const deviceCounts: Record<string, number> = {};
    events.forEach(e => {
      const device = e.device_type || 'unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });
    const total = Object.values(deviceCounts).reduce((a, b) => a + b, 0);
    setDeviceBreakdown(
      Object.entries(deviceCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([value, count]) => ({ value, count, percentage: total > 0 ? (count / total) * 100 : 0 }))
    );
  };

  const getDropOffColor = (rate: number) => {
    if (rate > 50) return 'text-red-600';
    if (rate > 30) return 'text-orange-600';
    if (rate > 15) return 'text-yellow-600';
    return 'text-green-600';
  };

  const exportFunnelCSV = () => {
    const csvHeaders = ['Step', 'Count', 'Drop Off', 'Drop Off Rate %'];
    const rows = funnelSteps.map(s => [s.name, s.count, s.dropOff, s.dropOffRate.toFixed(1)]);
    const csv = [csvHeaders, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shadespace-funnel-${dateRange.start}-to-${dateRange.end}.csv`;
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

  const maxCount = Math.max(...funnelSteps.map(s => s.count), 1);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Configurator Funnel</h2>
          <Button onClick={exportFunnelCSV} size="sm" variant="outline">Export CSV</Button>
        </div>

        <div className="space-y-3">
          {funnelSteps.map((step, i) => (
            <div key={step.name} className="flex items-center gap-4">
              <div className="w-44 text-sm font-medium text-gray-700 flex-shrink-0">
                {i < 7 && <span className="text-gray-400 mr-1">{i + 1}.</span>}
                {step.name}
              </div>
              <div className="flex-1">
                <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      i < 7 ? 'bg-lime-500' : i === 7 ? 'bg-green-500' : i === 8 ? 'bg-blue-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${maxCount > 0 ? (step.count / maxCount) * 100 : 0}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-gray-800">
                    {step.count}
                  </span>
                </div>
              </div>
              <div className="w-28 text-right flex-shrink-0">
                {i > 0 && step.dropOffRate > 0 && (
                  <span className={`text-xs font-medium ${getDropOffColor(step.dropOffRate)}`}>
                    -{step.dropOff} ({step.dropOffRate.toFixed(0)}% drop)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <OptionBreakdown title="Popular Fabrics" options={popularFabrics} color="bg-lime-500" />
        <OptionBreakdown title="Popular Colors" options={popularColors} color="bg-teal-500" />
        <OptionBreakdown title="Corner Configurations" options={popularCorners} color="bg-blue-500" />
        <OptionBreakdown title="Currencies" options={popularCurrencies} color="bg-orange-500" />
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h3>
        <div className="flex gap-6">
          {deviceBreakdown.map(d => (
            <div key={d.value} className="flex-1 text-center">
              <div className="text-2xl font-bold text-gray-900">{d.count}</div>
              <div className="text-sm text-gray-600 capitalize">{d.value}</div>
              <div className="text-xs text-gray-400">{d.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const OptionBreakdown: React.FC<{ title: string; options: PopularOption[]; color: string }> = ({ title, options, color }) => {
  if (options.length === 0) return null;
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {options.map(opt => (
          <div key={opt.value} className="flex items-center gap-3">
            <span className="w-28 text-sm text-gray-700 truncate flex-shrink-0">{opt.value}</span>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full`} style={{ width: `${opt.percentage}%` }} />
            </div>
            <span className="text-sm text-gray-600 w-16 text-right flex-shrink-0">{opt.count} ({opt.percentage.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

interface PopularOption {
  value: string;
  count: number;
  percentage: number;
}
