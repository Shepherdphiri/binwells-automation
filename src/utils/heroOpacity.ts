export const HERO_OPACITY_CLASSES: Record<number, string> = {
  20: 'opacity-20',
  25: 'opacity-25',
  30: 'opacity-30',
  35: 'opacity-35',
  40: 'opacity-40',
  45: 'opacity-45',
  50: 'opacity-50',
  55: 'opacity-55',
  60: 'opacity-60',
  65: 'opacity-65',
  70: 'opacity-70',
  75: 'opacity-75',
  80: 'opacity-80',
  85: 'opacity-85',
  90: 'opacity-90',
  95: 'opacity-95',
};

export function clampHeroOpacity(value: unknown): number {
  const raw = typeof value === 'number' && Number.isFinite(value) ? value : 55;
  return Math.min(95, Math.max(20, Math.round(raw / 5) * 5));
}

export function getHeroOpacityClass(opacity?: number): string {
  const clamped = clampHeroOpacity(opacity);
  return HERO_OPACITY_CLASSES[clamped] || 'opacity-55';
}
