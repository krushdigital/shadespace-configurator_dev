import React, { useEffect, useState } from 'react';
import { ShadeConfigurator } from './components/ShadeConfigurator';
import { Admin } from './pages/Admin';
import './index.css';

const App = () => {
  const [currency, setCurrency] = useState(null)
  const [isAdminRoute, setIsAdminRoute] = useState(false);

  console.log('currency: ', currency);
  console.log('🚀 App component is rendering - this should appear in console');


  useEffect(() => {
    // Check if current URL is the admin route
    const path = window.location.pathname;
    if (path.includes('/admin') || window.location.search.includes('admin=true')) {
      setIsAdminRoute(true);
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

  // Render admin dashboard if admin route
  if (isAdminRoute) {
    return <Admin />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <ShadeConfigurator />
    </div>
  );
}

export default App;