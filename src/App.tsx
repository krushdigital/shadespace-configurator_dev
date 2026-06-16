import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShadeConfigurator } from './components/ShadeConfigurator';
import { Admin } from './pages/Admin';
import { SetupPassword } from './pages/SetupPassword';
import { MyDesignsPortal } from './nodes/mydesigns.node';
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

    const root = document.getElementById("SHADESAIL_ROOT");
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

  const configuratorRoot = document.querySelector("#CONFIGURATOR_ROOT");

  return (
    <>
      {configuratorRoot && route === 'setup-password' && createPortal(<SetupPassword />, configuratorRoot)}
      {configuratorRoot && route === 'admin' && createPortal(<Admin />, configuratorRoot)}
      {configuratorRoot && route === 'configurator' && createPortal(
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <ShadeConfigurator />
        </div>,
        configuratorRoot
      )}
      <MyDesignsPortal />
    </>
  );
}

export default App;