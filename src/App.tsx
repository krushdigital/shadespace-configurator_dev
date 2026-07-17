import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShadeConfigurator } from './components/ShadeConfigurator';
import { Admin } from './pages/Admin';
import { SetupPassword } from './pages/SetupPassword';
import { MyDesignsPortal } from './nodes/mydesigns.node';
import { installLocalizationFormInterceptor } from './utils/currencyDetection';
import './index.css';

type AppRoute = 'configurator' | 'admin' | 'setup-password';

function resolveConfiguratorRoot(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('#CONFIGURATOR_ROOT') ||
    document.querySelector<HTMLElement>('#SHADESAIL_ROOT')
  );
}

const App = () => {
  const [currency, setCurrency] = useState(null)
  const [route, setRoute] = useState<AppRoute>('configurator');
  const [configuratorRoot, setConfiguratorRoot] = useState<HTMLElement | null>(
    () => resolveConfiguratorRoot()
  );

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

  // Shopify themes may inject the container after React first mounts. Resolve
  // the portal target reactively so a late-appearing #CONFIGURATOR_ROOT still
  // renders instead of leaving a blank screen.
  useEffect(() => {
    if (configuratorRoot && document.body.contains(configuratorRoot)) return;

    const found = resolveConfiguratorRoot();
    if (found) {
      setConfiguratorRoot(found);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = resolveConfiguratorRoot();
      if (el) {
        setConfiguratorRoot(el);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [configuratorRoot]);

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