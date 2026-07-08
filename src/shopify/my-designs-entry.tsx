import React from 'react';
import ReactDOM from 'react-dom/client';
import { MyDesignsPortal } from '../nodes/mydesigns.node';
import { applyAppScope } from '../utils/appScope';

if (document.querySelector('#MY_DESIGNS_ROOT')) {
  applyAppScope();
  const mountNode = document.createElement('div');
  document.body.appendChild(mountNode);

  ReactDOM.createRoot(mountNode).render(
    <React.StrictMode>
      <MyDesignsPortal />
    </React.StrictMode>
  );
}
