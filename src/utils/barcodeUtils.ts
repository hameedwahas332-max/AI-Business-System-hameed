/**
 * Barcode Scanner Utility Helpers
 * Normalizes barcode input from physical USB/Bluetooth HID scanners,
 * converts Arabic-Indic digits to standard English numerals,
 * and provides responsive audio feedback via Web Audio API.
 */

/**
 * Normalizes scanned barcode strings:
 * - Converts Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) to standard English ASCII digits (0-9).
 * - Converts Eastern Persian/Urdu numerals (۰۱۲۳۴۵۶۷۸۹) to standard English ASCII digits (0-9).
 * - Removes non-printable ASCII control characters.
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
  // Some barcode scanners under Arabic Windows keyboard might emit arabic letters instead of digits/letters
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

  // If string contains non-digit Arabic letters and no latin/digits, check if it's a shifted keyboard layout
  // But preserve Arabic product names if someone is searching by text.
  // We only replace if it's purely Arabic letters without spaces and looks like an encoded barcode
  // Standard Arabic-Indic digits are already mapped above.

  // Strip non-printable ASCII control characters (0x00 - 0x1F, 0x7F)
  str = str.replace(/[\x00-\x1F\x7F]/g, '');

  return str.trim();
}

/**
 * Plays a clean POS scanner beep using Web Audio API
 * Works completely offline in Tauri desktop and Web without external assets.
 */
export function playBarcodeBeep(type: 'success' | 'warning' | 'error' = 'success'): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      // Crisp 1400Hz -> 1800Hz POS confirmation beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
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
        gain.gain.setValueAtTime(0.15, now + offset);
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
