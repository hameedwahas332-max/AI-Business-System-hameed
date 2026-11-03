/**
 * Barcode Scanner Utility Engine & Hardware Normalizer
 * 
 * Supports physical USB HID barcode scanners, wireless Bluetooth scanners,
 * and mobile barcode scanner apps (Android/iOS virtual keyboards & clipboards).
 * 
 * Features:
 * - Instant auto-submit on burst completion (<65ms keystroke interval + 80ms debounce) WITHOUT waiting for Enter!
 * - Instant Enter / Tab immediate submission.
 * - Arabic-Indic digits (٠-٩) and Persian numerals (۰-۹) normalization.
 * - Arabic keyboard layout character correction when scanner operates under Arabic language mode.
 * - Event interception for keydown, input, and paste events (Bluetooth & Mobile scanner wedges).
 * - Offline Web Audio API auditory feedback (Success, Warning, Error beeps).
 */

/**
 * Normalizes scanned barcode strings:
 * - Converts Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) to standard English ASCII digits (0-9).
 * - Converts Eastern Persian/Urdu numerals (۰۱۲۳۴۵۶۷۸۹) to standard English ASCII digits (0-9).
 * - Converts Arabic keyboard layout keycodes to English equivalents if a scanner types while keyboard is set to Arabic.
 * - Strips non-printable ASCII control characters.
 * - Trims whitespace and ensures clean lookup format.
 */
export function normalizeScannedBarcode(raw: string | null | undefined): string {
  if (!raw) return '';
  let str = String(raw).trim();

  // Replace Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩)
  const arabicIndicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  for (let i = 0; i < arabicIndicDigits.length; i++) {
    str = str.split(arabicIndicDigits[i]).join(String(i));
  }

  // Replace Eastern Persian/Urdu numerals (۰۱۲۳۴۵۶۷۸۹)
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  for (let i = 0; i < persianDigits.length; i++) {
    str = str.split(persianDigits[i]).join(String(i));
  }

  // Common Arabic keyboard character mapping corrections if scanner typed Arabic keys
  // Some barcode scanners under Arabic Windows keyboard emit Arabic letters instead of Latin/digits
  const arabicToEnglishKeyMap: Record<string, string> = {
    'ذ': '`',
    'ض': 'q',
    'ص': 'w',
    'ث': 'e',
    'ق': 'r',
    'ف': 't',
    'غ': 'y',
    'ع': 'u',
    'ه': 'i',
    'خ': 'o',
    'ح': 'p',
    'ش': 'a',
    'س': 's',
    'ي': 'd',
    'ب': 'f',
    'ل': 'g',
    'ا': 'h',
    'ت': 'j',
    'ن': 'k',
    'م': 'l',
    'ئ': 'z',
    'ء': 'x',
    'ؤ': 'c',
    'ر': 'v',
    'لا': 'b',
    'ى': 'n',
    'ة': 'm',
  };

  // If the scanned string looks like an Arabic-keyboard-mapped barcode (purely Arabic letters, no spaces, length >= 4)
  // and has no standard Arabic digits or names, translate keyboard mapping
  if (/^[\u0600-\u06FF]{4,}$/.test(str) && !str.includes(' ')) {
    let converted = '';
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      converted += arabicToEnglishKeyMap[ch] !== undefined ? arabicToEnglishKeyMap[ch] : ch;
    }
    // Only accept conversion if it produced valid barcode characters (alphanumeric/punctuation)
    if (/^[a-zA-Z0-9_\-\.\/]+$/.test(converted)) {
      str = converted;
    }
  }

  // Strip non-printable ASCII control characters (0x00 - 0x1F, 0x7F)
  str = str.replace(/[\x00-\x1F\x7F]/g, '');

  return str.trim();
}

/**
 * Plays a clean POS scanner beep using Web Audio API.
 * Works completely offline in Tauri desktop and Web without external assets.
 */
export function playBarcodeBeep(type: 'success' | 'warning' | 'error' = 'success'): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      // Crisp 1400Hz -> 1800Hz POS confirmation beep (duration: 75ms)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.075);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.075);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.075);
    } else if (type === 'warning') {
      // Attention beep (600Hz -> 450Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(450, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } else {
      // Low double buzz for error / item not found
      const now = ctx.currentTime;
      [0, 0.12].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now + offset);
        gain.gain.setValueAtTime(0.18, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.08);
      });
    }
  } catch {
    // Ignore audio permission/context errors silently
  }
}

export interface BarcodeMatchResult {
  product: any;
  unit: 'base' | 'sub' | 'major';
  matchField: 'barcode' | 'subUnitBarcode' | 'majorUnitBarcode' | 'sku' | 'itemCode' | 'partNumber' | 'name';
}

/**
 * Searches a product catalog by scanned barcode or item code with prioritized exact matching.
 * Checks:
 * 1. Base barcode
 * 2. Sub-unit barcode
 * 3. Major-unit barcode
 * 4. SKU
 * 5. Item Code
 * 6. Part Number
 * 7. Name (exact match)
 */
export function findProductByBarcode(products: any[], rawBarcode: string | null | undefined): BarcodeMatchResult | null {
  if (!rawBarcode || !Array.isArray(products) || products.length === 0) return null;
  const term = normalizeScannedBarcode(rawBarcode).toLowerCase().trim();
  if (!term || term.length < 2) return null;

  // 1. Exact match on Base Barcode
  for (const p of products) {
    if (!p) continue;
    if (p.barcode && normalizeScannedBarcode(p.barcode).toLowerCase() === term) {
      return { product: p, unit: 'base', matchField: 'barcode' };
    }
  }

  // 2. Exact match on Sub-Unit Barcode
  for (const p of products) {
    if (!p) continue;
    if (p.subUnitBarcode && normalizeScannedBarcode(p.subUnitBarcode).toLowerCase() === term) {
      return { product: p, unit: 'sub', matchField: 'subUnitBarcode' };
    }
  }

  // 3. Exact match on Major-Unit Barcode
  for (const p of products) {
    if (!p) continue;
    if (p.majorUnitBarcode && normalizeScannedBarcode(p.majorUnitBarcode).toLowerCase() === term) {
      return { product: p, unit: 'major', matchField: 'majorUnitBarcode' };
    }
  }

  // 4. Exact match on SKU / ItemCode / PartNumber
  for (const p of products) {
    if (!p) continue;
    if (p.sku && normalizeScannedBarcode(p.sku).toLowerCase() === term) {
      return { product: p, unit: 'base', matchField: 'sku' };
    }
    if (p.itemCode && normalizeScannedBarcode(p.itemCode).toLowerCase() === term) {
      return { product: p, unit: 'base', matchField: 'itemCode' };
    }
    if (p.partNumber && normalizeScannedBarcode(p.partNumber).toLowerCase() === term) {
      return { product: p, unit: 'base', matchField: 'partNumber' };
    }
  }

  // 5. Exact match on Product Name (if term is at least 3 characters)
  if (term.length >= 3) {
    for (const p of products) {
      if (!p) continue;
      if (p.name && p.name.trim().toLowerCase() === term) {
        return { product: p, unit: 'base', matchField: 'name' };
      }
    }
  }

  return null;
}

export interface BarcodeScannerListenerOptions {
  onScan: (barcode: string) => void;
  shouldIgnore?: (event: KeyboardEvent | Event) => boolean;
  minBarcodeLength?: number;
  burstMaxIntervalMs?: number;
  endDebounceMs?: number;
}

/**
 * Attaches a high-performance global barcode scanner listener to the window:
 * - Detects rapid USB HID scanner bursts (<65ms intervals).
 * - Automatically finalizes and submits on burst completion without requiring Enter (80ms debounce)!
 * - Immediately finalizes if Enter or Tab arrives.
 * - Handles Bluetooth HID & mobile clipboard paste / input wedge events.
 */
export function attachGlobalBarcodeScannerListener(options: BarcodeScannerListenerOptions): () => void {
  if (typeof window === 'undefined') return () => {};

  const minLength = options.minBarcodeLength ?? 4;
  const burstInterval = options.burstMaxIntervalMs ?? 65;
  const endDebounce = options.endDebounceMs ?? 80;

  let buffer = '';
  let lastKeyTime = 0;
  let burstCharCount = 0;
  let debounceTimer: any = null;

  const finalizeBuffer = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    const current = buffer.trim();
    buffer = '';
    burstCharCount = 0;
    lastKeyTime = 0;

    const normalized = normalizeScannedBarcode(current);
    if (normalized.length >= minLength) {
      options.onScan(normalized);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Check if caller requested to ignore
    if (options.shouldIgnore && options.shouldIgnore(e)) {
      buffer = '';
      burstCharCount = 0;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      return;
    }

    // Ignore standalone modifier keys
    if (['Control', 'Alt', 'Meta', 'Shift', 'CapsLock', 'Escape'].includes(e.key)) {
      return;
    }

    // If Enter or Tab arrives, immediately finalize the buffer
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (buffer.length >= minLength && burstCharCount >= 2) {
        e.preventDefault();
        e.stopPropagation();
        finalizeBuffer();
        return;
      }
      // If buffer is too short, simply clear
      buffer = '';
      burstCharCount = 0;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      return;
    }

    // Single printable character
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const now = Date.now();
      const timeDiff = now - lastKeyTime;
      lastKeyTime = now;

      if (timeDiff <= burstInterval) {
        // High-speed keystroke from barcode reader
        buffer += e.key;
        burstCharCount++;
      } else {
        // Normal human typing gap: reset buffer to start a new potential scan
        buffer = e.key;
        burstCharCount = 1;
      }

      // Clear any pending debounce timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      // If a rapid burst of characters is detected (burst count >= 3 or buffer >= minLength):
      // Start the endDebounce (80ms) timer so we auto-submit without needing Enter!
      if (burstCharCount >= 3 || buffer.length >= minLength) {
        debounceTimer = setTimeout(() => {
          if (burstCharCount >= 3 || buffer.length >= minLength) {
            finalizeBuffer();
          } else {
            buffer = '';
            burstCharCount = 0;
          }
        }, endDebounce);
      }
    }
  };

  // Support Bluetooth HID and mobile barcode scanner apps that paste the barcode
  const handlePaste = (e: ClipboardEvent) => {
    if (options.shouldIgnore && options.shouldIgnore(e)) return;

    try {
      const text = e.clipboardData?.getData('text') || '';
      const normalized = normalizeScannedBarcode(text).trim();
      // If pasted content looks like a barcode (>= minLength, no spaces or special control chars)
      if (normalized.length >= minLength && /^[a-zA-Z0-9_\-\.\/]+$/.test(normalized)) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        buffer = '';
        burstCharCount = 0;
        options.onScan(normalized);
      }
    } catch {}
  };

  // Support mobile/virtual keyboard input events that inject full strings at once
  const handleInput = (e: Event) => {
    if (options.shouldIgnore && options.shouldIgnore(e)) return;
    const inputEvt = e as InputEvent;
    if (inputEvt.inputType === 'insertFromPaste' || (inputEvt.data && inputEvt.data.length >= minLength)) {
      const raw = inputEvt.data || '';
      const normalized = normalizeScannedBarcode(raw).trim();
      if (normalized.length >= minLength && /^[a-zA-Z0-9_\-\.\/]+$/.test(normalized)) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        buffer = '';
        burstCharCount = 0;
        options.onScan(normalized);
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('paste', handlePaste as EventListener, true);
  window.addEventListener('input', handleInput, true);

  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('paste', handlePaste as EventListener, true);
    window.removeEventListener('input', handleInput, true);
  };
}
