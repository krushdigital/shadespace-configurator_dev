import React, { useEffect, useState } from 'react';
import { ShadeConfigurator } from './components/ShadeConfigurator';
import './index.css';

const App = () => {
  const [currency, setCurrency] = useState(null)
  console.log('currency: ', currency);

  console.log('🚀 App component is rendering - this should appear in console');

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <ShadeConfigurator />
    </div>
  );
}

export default App;