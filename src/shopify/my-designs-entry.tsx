import React from 'react';
import ReactDOM from 'react-dom/client';
import { MyDesignsPortal } from '../nodes/mydesigns.node';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { applyAppScope } from '../utils/appScope';
import { installGlobalErrorReporting } from '../utils/errorReporter';

if (document.querySelector('#MY_DESIGNS_ROOT')) {
  installGlobalErrorReporting();
  applyAppScope();
  const mountNode = document.createElement('div');
  document.body.appendChild(mountNode);

  ReactDOM.createRoot(mountNode).render(
    <React.StrictMode>
      <ErrorBoundary>
        <MyDesignsPortal />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
