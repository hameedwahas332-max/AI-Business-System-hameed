import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// =========================================================================
// 1. GLOBAL ENGLISH NUMERALS (0123456789) ENFORCEMENT
// =========================================================================
// Ensures all numbers, dates, currency, and timestamps render with Latin digits (0-9)
// regardless of browser locale, while preserving full Arabic typography and labels.

const arabicToEnglishDigits = (str: string): string => {
  return str.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
};

const origNumberToLocaleString = Number.prototype.toLocaleString;
Number.prototype.toLocaleString = function (locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions): string {
  try {
    const formatted = origNumberToLocaleString.call(this, 'en-US', options);
    return arabicToEnglishDigits(formatted);
  } catch {
    return String(this);
  }
};

const origDateToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions): string {
  try {
    const formatted = origDateToLocaleDateString.call(this, 'en-GB', options);
    return arabicToEnglishDigits(formatted);
  } catch {
    return String(this);
  }
};

const origDateToLocaleString = Date.prototype.toLocaleString;
Date.prototype.toLocaleString = function (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions): string {
  try {
    const formatted = origDateToLocaleString.call(this, 'en-GB', options);
    return arabicToEnglishDigits(formatted);
  } catch {
    return String(this);
  }
};

import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
