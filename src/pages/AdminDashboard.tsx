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
import { ExclusionManager } from '../components/admin/ExclusionManager';
import { FabricColorManager } from '../components/admin/FabricColorManager';
import { EmailStudio } from '../components/admin/EmailStudio';
import { HardwareSyncCard } from '../components/admin/HardwareSyncCard';
import { HardwareCatalogManager } from '../components/admin/HardwareCatalogManager';
import { PdfStudio } from '../components/admin/PdfStudio';
import { MyDesignsAnalytics } from '../components/admin/MyDesignsAnalytics';
import type { AdminProfile } from '../hooks/useAdminProfile';
import { useTabPermissions } from '../hooks/useTabPermissions';
import { UserManagement } from '../components/admin/UserManagement';
import { AdminQuoteBuilder } from '../components/admin/AdminQuoteBuilder';

interface AdminDashboardProps {
  onLogout: () => void;
  profile: AdminProfile;
}

type TabType = 'overview' | 'quotes' | 'quote-builder' | 'events' | 'funnel' | 'fabrics' | 'hardware' | 'pricing' | 'base-pricing' | 'exports' | 'exclusions' | 'email' | 'pdf' | 'team';

const detectTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, profile }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { isTabAllowed, permissions, refresh: refreshPermissions } = useTabPermissions();
  const [excludeInternal, setExcludeInternal] = useState(() => {
    try { return localStorage.getItem('admin_exclude_internal') === 'true'; } catch { return false; }
  });
  const timezone = detectTimezone();
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const handleToggleExclude = () => {
    const next = !excludeInternal;
    setExcludeInternal(next);
    try { localStorage.setItem('admin_exclude_internal', String(next)); } catch { /* noop */ }
  };

  const allTabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'quotes', label: 'Saved Quotes' },
    { id: 'quote-builder', label: 'Quote Builder' },
    { id: 'events', label: 'User Events' },
    { id: 'funnel', label: 'Funnel & Insights' },
    { id: 'fabrics', label: 'Fabrics & Colors' },
    { id: 'hardware', label: 'Hardware Catalog' },
    { id: 'pricing', label: 'Currency Pricing' },
    { id: 'base-pricing', label: 'Base Pricing' },
    { id: 'exports', label: 'Data Export' },
    { id: 'email', label: 'Email Studio' },
    { id: 'pdf', label: 'PDF Studio' },
    { id: 'team', label: 'User Management' },
    { id: 'exclusions', label: 'Exclusion Settings' },
  ];

  const tabs = allTabs.filter(t => isTabAllowed(t.id, profile.role));

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
              <span className="hidden sm:inline text-xs text-gray-600">
                {profile.email}
                <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-semibold ${profile.role === 'super_admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                  {profile.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN'}
                </span>
              </span>
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
          <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Date Range:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-colors"
            />
            <span className="text-gray-500 font-medium">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-colors"
            />

            <div className="hidden sm:block h-8 w-px bg-gray-300"></div>

            <button
              onClick={handleToggleExclude}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border whitespace-nowrap ${
                excludeInternal
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-4 rounded-full relative transition-colors ${excludeInternal ? 'bg-amber-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${excludeInternal ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              Exclude Internal
            </button>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="whitespace-nowrap" onClick={() => setDateRange({
                start: new Date().toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}>Today</Button>
              <Button size="sm" variant="outline" className="whitespace-nowrap" onClick={() => setDateRange({
                start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}>Last 7 Days</Button>
              <Button size="sm" variant="outline" className="whitespace-nowrap" onClick={() => setDateRange({
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}>Last 30 Days</Button>
            </div>
          </div>
        </Card>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <AnalyticsSummary dateRange={dateRange} excludeInternal={excludeInternal} />
            <EventsChart dateRange={dateRange} excludeInternal={excludeInternal} timezone={timezone} />
            <MyDesignsAnalytics dateRange={dateRange} excludeInternal={excludeInternal} />
          </div>
        )}

        {activeTab === 'quotes' && <SavedQuotesTable dateRange={dateRange} excludeInternal={excludeInternal} timezone={timezone} />}

        {activeTab === 'quote-builder' && <AdminQuoteBuilder profile={profile} />}

        {activeTab === 'events' && <EventsTable dateRange={dateRange} excludeInternal={excludeInternal} timezone={timezone} />}

        {activeTab === 'funnel' && <FunnelAnalysis dateRange={dateRange} excludeInternal={excludeInternal} />}

        {activeTab === 'fabrics' && <FabricColorManager />}

        {activeTab === 'hardware' && (
          <div className="space-y-6">
            <HardwareSyncCard />
            <HardwareCatalogManager />
          </div>
        )}

        {activeTab === 'pricing' && <PricingManager />}

        {activeTab === 'base-pricing' && <BasePricingManager />}

        {activeTab === 'exports' && <DataExport dateRange={dateRange} excludeInternal={excludeInternal} timezone={timezone} />}

        {activeTab === 'email' && <EmailStudio dateRange={dateRange} excludeInternal={excludeInternal} timezone={timezone} isSuperAdmin={profile.role === 'super_admin'} onOpenPdfStudio={() => setActiveTab('pdf')} />}

        {activeTab === 'pdf' && <PdfStudio />}

        {activeTab === 'team' && <UserManagement currentProfile={profile} tabPermissions={permissions} onPermissionsChange={refreshPermissions} />}

        {activeTab === 'exclusions' && <ExclusionManager />}
      </div>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
};
