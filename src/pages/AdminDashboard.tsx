import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SavedQuotesTable } from '../components/admin/SavedQuotesTable';
import { EventsTable } from '../components/admin/EventsTable';
import { AnalyticsSummary } from '../components/admin/AnalyticsSummary';
import { EventsChart } from '../components/admin/EventsChart';
import { PricingManager } from '../components/admin/PricingManager';
import { BasePricingManager } from '../components/admin/BasePricingManager';
import { ChangePasswordModal } from '../components/admin/ChangePasswordModal';
import { FunnelAnalysis } from '../components/admin/FunnelAnalysis';
import { DataExport } from '../components/admin/DataExport';

interface AdminDashboardProps {
  onLogout: () => void;
}

type TabType = 'overview' | 'quotes' | 'events' | 'funnel' | 'pricing' | 'base-pricing' | 'exports';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'quotes', label: 'Saved Quotes' },
    { id: 'events', label: 'User Events' },
    { id: 'funnel', label: 'Funnel & Insights' },
    { id: 'pricing', label: 'Currency Pricing' },
    { id: 'base-pricing', label: 'Base Pricing' },
    { id: 'exports', label: 'Data Export' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-forest-900">ShadeSpace Admin</h1>
              <span className="text-sm text-gray-500">Analytics Dashboard</span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowChangePassword(true)} variant="outline" size="sm">
                Change Password
              </Button>
              <Button onClick={onLogout} variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-lime-500 text-lime-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="mb-6 border border-gray-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm font-semibold text-gray-700">Date Range:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-colors"
            />
            <span className="text-gray-500 font-medium">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-colors"
            />
            <Button size="sm" className="bg-lime-600 hover:bg-lime-700 text-white">Apply</Button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setDateRange({
                start: new Date().toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}>Today</Button>
              <Button size="sm" variant="outline" onClick={() => setDateRange({
                start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}>Last 7 Days</Button>
              <Button size="sm" variant="outline" onClick={() => setDateRange({
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}>Last 30 Days</Button>
            </div>
          </div>
        </Card>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <AnalyticsSummary dateRange={dateRange} />
            <EventsChart dateRange={dateRange} />
          </div>
        )}

        {activeTab === 'quotes' && <SavedQuotesTable dateRange={dateRange} />}

        {activeTab === 'events' && <EventsTable dateRange={dateRange} />}

        {activeTab === 'funnel' && <FunnelAnalysis dateRange={dateRange} />}

        {activeTab === 'pricing' && <PricingManager />}

        {activeTab === 'base-pricing' && <BasePricingManager />}

        {activeTab === 'exports' && <DataExport dateRange={dateRange} />}
      </div>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
};
