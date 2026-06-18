import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { DialogProvider } from './components/shared/Dialog.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <DialogProvider>
          <App />
        </DialogProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
