import React from 'react';
import ReactDOM from 'react-dom/client';
// IMPORT THE NEW VERSION (DS.) instead of the old one
import App from './DS.App.jsx';  // ← This loads your new version!
// If you had other imports in main.jsx, copy them here

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);