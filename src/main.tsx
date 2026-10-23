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
  if (!str) return '';
  return str
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[\u066B\u060C]/g, '.');
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

// =========================================================================
// 2. GLOBAL ARABIC DIGITS KEYBOARD INTERCEPTOR (CAPTURE PHASE)
// =========================================================================
// Converts typing from Arabic keyboard layout (٠-٩ / ۰-۹) into standard English digits (0-9)
if (typeof window !== 'undefined') {
  const setNativeInputValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
  };

  // Intercept beforeinput (modern browsers)
  window.addEventListener(
    'beforeinput',
    (e: InputEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!target || !(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.data && /[\u0660-\u0669\u06F0-\u06F9\u066B\u060C]/.test(e.data)) {
        e.preventDefault();
        const converted = arabicToEnglishDigits(e.data);
        const start = target.selectionStart ?? target.value.length;
        const end = target.selectionEnd ?? target.value.length;
        const currentVal = target.value;
        const newVal = currentVal.slice(0, start) + converted + currentVal.slice(end);
        setNativeInputValue(target, newVal);
        const newCursor = start + converted.length;
        target.setSelectionRange?.(newCursor, newCursor);
      }
    },
    { capture: true }
  );

  // Fallback for input event
  window.addEventListener(
    'input',
    (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!target || !(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (/[\u0660-\u0669\u06F0-\u06F9\u066B\u060C]/.test(target.value)) {
        const cursor = target.selectionStart;
        const converted = arabicToEnglishDigits(target.value);
        setNativeInputValue(target, converted);
        if (cursor !== null) {
          target.setSelectionRange?.(cursor, cursor);
        }
      }
    },
    { capture: true }
  );
}

import { AuthProvider } from './context/AuthContext';
import { ModuleSettingsProvider } from './context/ModuleSettingsContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ModuleSettingsProvider>
        <App />
      </ModuleSettingsProvider>
    </AuthProvider>
  </React.StrictMode>
);
