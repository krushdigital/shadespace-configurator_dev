import React, { useEffect, useState } from 'react';
import { ShadeConfigurator } from './components/ShadeConfigurator';
import { Admin } from './pages/Admin';
import { SetupPassword } from './pages/SetupPassword';
import { installLocalizationFormInterceptor } from './utils/currencyDetection';
import { forceReleaseLock } from './hooks/useBodyScrollLock';
import './index.css';

type AppRoute = 'configurator' | 'admin' | 'setup-password';

const App = () => {
  const [currency, setCurrency] = useState(null)
  const [route, setRoute] = useState<AppRoute>('configurator');

  // Safety net: periodically check if scroll got stuck locked with no modal open
  useEffect(() => {
    const check = () => {
      const html = document.documentElement;
      if (html.style.overflow === 'hidden') {
        const hasOpenModal = document.querySelector('.fixed.inset-0, [role="dialog"]');
        if (!hasOpenModal) {
          forceReleaseLock();
        }
      }
    };
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    installLocalizationFormInterceptor();
    const path = window.location.pathname;
    const search = window.location.search;

    if (search.includes('setup-password=true')) {
      setRoute('setup-password');
      return;
    }

    if (path.includes('/admin') || search.includes('admin=true')) {
      setRoute('admin');
      return;
    }

    const root = document.getElementById("SHADE_SPACE");
    if (root) {
      const settingsData = root.getAttribute("data-shop-currency");
      if (settingsData) {
        try {
          setCurrency(JSON.parse(settingsData));
        } catch (error) {
          console.log(error);
        }
      }
    }
  }, []);

  if (route === 'setup-password') {
    return <SetupPassword />;
  }

  if (route === 'admin') {
    return <Admin />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <ShadeConfigurator />
    </div>
  );
}

export default App;