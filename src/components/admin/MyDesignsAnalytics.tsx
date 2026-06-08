import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { getAdminAuthHeaders } from '../../utils/adminAuth';

interface MyDesignsAnalyticsProps {
  dateRange: { start: string; end: string };
  excludeInternal?: boolean;
}

interface EngagementData {
  pageViews: number;
  uniqueViewers: number;
  resumeClicks: number;
  addToCartClicks: number;
  viewClicks: number;
}

export const MyDesignsAnalytics: React.FC<MyDesignsAnalyticsProps> = ({ dateRange, excludeInternal }) => {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange, excludeInternal]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const headers = await getAdminAuthHeaders();
      const exclusionFilter = excludeInternal ? '&is_excluded=eq.false' : '';

      const [viewsRes, clicksRes] = await Promise.all([
        fetch(
          `${supabaseUrl}/rest/v1/user_events?select=customer_email&event_type=eq.my_designs_page_view&created_at=gte.${dateRange.start}T00:00:00&created_at=lte.${dateRange.end}T23:59:59${exclusionFilter}&limit=2000`,
          { headers }
        ),
        fetch(
          `${supabaseUrl}/rest/v1/user_events?select=event_data&event_type=eq.my_designs_resume_click&created_at=gte.${dateRange.start}T00:00:00&created_at=lte.${dateRange.end}T23:59:59${exclusionFilter}&limit=2000`,
          { headers }
        ),
      ]);

      const views = viewsRes.ok ? await viewsRes.json() : [];
      const clicks = clicksRes.ok ? await clicksRes.json() : [];

      const uniqueEmails = new Set(views.map((v: { customer_email: string }) => v.customer_email).filter(Boolean));

      let resumeClicks = 0;
      let addToCartClicks = 0;
      let viewClicks = 0;
      for (const c of clicks) {
        const action = c.event_data?.action;
        if (action === 'add_to_cart') addToCartClicks++;
        else if (action === 'view') viewClicks++;
        else resumeClicks++;
      }

      setData({
        pageViews: views.length,
        uniqueViewers: uniqueEmails.size,
        resumeClicks,
        addToCartClicks,
        viewClicks,
      });
    } catch (err) {
      console.error('Failed to fetch My Designs analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded"></div>
      </Card>
    );
  }

  if (!data || (data.pageViews === 0 && data.resumeClicks === 0)) {
    return null;
  }

  const totalClicks = data.resumeClicks + data.addToCartClicks + data.viewClicks;

  return (
    <Card className="p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#0d9488" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Shopify Account Page</h3>
          <p className="text-xs text-gray-500">"My Designs" engagement from Shopify customer accounts</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">{data.pageViews}</div>
          <div className="text-xs text-gray-500 mt-1">Page Views</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">{data.uniqueViewers}</div>
          <div className="text-xs text-gray-500 mt-1">Unique Customers</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">{totalClicks}</div>
          <div className="text-xs text-gray-500 mt-1">Resume Clicks</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-teal-700">{data.addToCartClicks}</div>
          <div className="text-xs text-gray-500 mt-1">Add to Cart</div>
        </div>
      </div>

      {totalClicks > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex gap-4 text-xs text-gray-500">
            <span>Continue: <strong className="text-gray-700">{data.resumeClicks}</strong></span>
            <span>Add to Cart: <strong className="text-teal-700">{data.addToCartClicks}</strong></span>
            <span>View: <strong className="text-gray-700">{data.viewClicks}</strong></span>
          </div>
        </div>
      )}
    </Card>
  );
};
