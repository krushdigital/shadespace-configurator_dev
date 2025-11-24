import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SavedQuotesTable } from '../components/admin/SavedQuotesTable';
import { EventsTable } from '../components/admin/EventsTable';
import { AnalyticsSummary } from '../components/admin/AnalyticsSummary';
import { EventsChart } from '../components/admin/EventsChart';

interface AdminDashboardProps {
  onLogout: () => void;
}

type TabType = 'overview' | 'quotes' | 'events' | 'exports';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'quotes', label: 'Saved Quotes' },
    { id: 'events', label: 'User Events' },
    { id: 'exports', label: 'Data Export' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-forest-900">ShadeSpace Admin</h1>
              <span className="text-sm text-gray-500">Analytics Dashboard</span>
            </div>
            <Button onClick={onLogout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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

      {/* Date Range Filter */}
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

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <AnalyticsSummary dateRange={dateRange} />
            <EventsChart dateRange={dateRange} />
          </div>
        )}

        {activeTab === 'quotes' && <SavedQuotesTable dateRange={dateRange} />}

        {activeTab === 'events' && <EventsTable dateRange={dateRange} />}

        {activeTab === 'exports' && (
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Data Export</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded">
                <div>
                  <h3 className="font-medium text-gray-900">Export All Quotes</h3>
                  <p className="text-sm text-gray-500">Download all saved quotes as CSV</p>
                </div>
                <Button size="sm">Download CSV</Button>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded">
                <div>
                  <h3 className="font-medium text-gray-900">Export User Events</h3>
                  <p className="text-sm text-gray-500">Download all tracked events as CSV</p>
                </div>
                <Button size="sm">Download CSV</Button>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded">
                <div>
                  <h3 className="font-medium text-gray-900">Export Analytics Report</h3>
                  <p className="text-sm text-gray-500">Generate comprehensive report (JSON)</p>
                </div>
                <Button size="sm">Download JSON</Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
