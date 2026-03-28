import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import SponsorsPage from './pages/SponsorsPage';
import LicensePage from './pages/LicensePage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import ChangelogPage from './pages/ChangelogPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<App />} />
        <Route path="/sponsors"  element={<SponsorsPage />} />
        <Route path="/license"   element={<LicensePage />} />
        <Route path="/privacy"   element={<PrivacyPage />} />
        <Route path="/terms"     element={<TermsPage />} />
        <Route path="/changelog" element={<ChangelogPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
