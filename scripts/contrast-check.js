#!/usr/bin/env node
// Quick WCAG AA contrast check for our theme tokens
// Calculates contrast ratio for common pairs in light and dark themes

function hexToRgb(hex) {
  const m = hex.replace('#','');
  const bigint = parseInt(m, 16);
  if (m.length === 6) {
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  }
  throw new Error('Only 6-char hex supported');
}

function luminance({ r, g, b }) {
  const srgb = [r, g, b].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(fg, bg) {
  const L1 = luminance(hexToRgb(fg));
  const L2 = luminance(hexToRgb(bg));
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function check(label, fg, bg, threshold) {
  const ratio = contrastRatio(fg, bg);
  const ok = ratio >= threshold;
  return { label, fg, bg, ratio: +ratio.toFixed(2), ok };
}

const light = {
  background: '#ffffff',
  card: '#f7f7f7',
  text: '#111111',
  muted: '#6b7280',
  primary: '#0a84ff',
  border: '#e5e7eb',
  surface: '#ffffff',
  surfaceVariant: '#f3f4f6',
  outline: '#e5e7eb',
  onSurface: '#111111',
  onPrimary: '#000000',
  onEmphasis: '#ffffff',
};

const dark = {
  background: '#0b0b0b',
  card: '#151515',
  text: '#f5f5f5',
  muted: '#9ca3af',
  primary: '#0a84ff',
  border: '#27272a',
  surface: '#0b0b0b',
  surfaceVariant: '#111113',
  outline: '#27272a',
  onSurface: '#f5f5f5',
  onPrimary: '#000000',
  onEmphasis: '#000000',
};

const NORMAL = 4.5; // body/small

function runTheme(themeName, t) {
  const results = [];
  results.push(check(`${themeName}: onSurface vs surface`, t.onSurface, t.surface, NORMAL));
  results.push(check(`${themeName}: onSurface vs card`, t.onSurface, t.card, NORMAL));
  results.push(check(`${themeName}: onSurface vs surfaceVariant`, t.onSurface, t.surfaceVariant, NORMAL));
  results.push(check(`${themeName}: text vs background`, t.text, t.background, NORMAL));
  results.push(check(`${themeName}: muted vs background (info)`, t.muted, t.background, 3.0));
  results.push(check(`${themeName}: onPrimary vs primary`, t.onPrimary, t.primary, NORMAL));
  results.push(check(`${themeName}: onEmphasis vs text`, t.onEmphasis, t.text, NORMAL));
  return results;
}

const all = [...runTheme('light', light), ...runTheme('dark', dark)];

let pass = true;
for (const r of all) {
  const status = r.ok ? 'PASS' : 'FAIL';
  if (!r.ok) pass = false;
  console.log(`${status} ${r.label}: ${r.fg} on ${r.bg} -> ${r.ratio}:1`);
}

if (!pass) {
  process.exitCode = 1;
}
