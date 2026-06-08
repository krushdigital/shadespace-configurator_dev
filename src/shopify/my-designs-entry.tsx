import React from 'react';
import ReactDOM from 'react-dom/client';
import MyDesigns from './MyDesigns';

document.querySelectorAll<HTMLElement>('.shade-space-my-designs').forEach((container) => {
  const { customerEmail, customerName, loggedIn } = container.dataset;

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <MyDesigns
        email={customerEmail || ''}
        name={customerName || ''}
        isLoggedIn={loggedIn === 'true'}
      />
    </React.StrictMode>
  );
});
