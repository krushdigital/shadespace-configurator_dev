import { useEffect, useState } from 'react';
import { ShadeConfigurator } from './components/ShadeConfigurator';
import { Admin } from './pages/Admin';
import { SetupPassword } from './pages/SetupPassword';
import { installLocalizationFormInterceptor } from './utils/currencyDetection';
import './index.css';

type AppRoute = 'configurator' | 'admin' | 'setup-password';

const App = () => {
  const [currency, setCurrency] = useState(null)
  const [route, setRoute] = useState<AppRoute>('configurator');

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