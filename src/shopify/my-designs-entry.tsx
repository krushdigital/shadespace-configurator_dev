import React from 'react';
import ReactDOM from 'react-dom/client';
import { MyDesignsPortal } from '../nodes/mydesigns.node';

if (document.querySelector('#MY_DESIGNS_ROOT')) {
  const mountNode = document.createElement('div');
  document.body.appendChild(mountNode);

  ReactDOM.createRoot(mountNode).render(
    <React.StrictMode>
      <MyDesignsPortal />
    </React.StrictMode>
  );
}
