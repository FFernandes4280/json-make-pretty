import React from 'react';
import ReactDOM from 'react-dom/client';
import JsonMakePretty from './JsonMakePretty';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <JsonMakePretty />
  </React.StrictMode>
);
