/** Curated accents for expense categories — readable on warm LedgerBloom surfaces. */
export const CATEGORY_COLOR_PALETTE = [
  { id: 'coral', hex: '#C45C3E', label: 'Coral' },
  { id: 'amber', hex: '#C47A2E', label: 'Amber' },
  { id: 'gold', hex: '#A8891A', label: 'Gold' },
  { id: 'olive', hex: '#5C7A4A', label: 'Olive' },
  { id: 'teal', hex: '#2A7A62', label: 'Teal' },
  { id: 'ocean', hex: '#3D6E9E', label: 'Ocean' },
  { id: 'slate', hex: '#4A6B7C', label: 'Slate' },
  { id: 'rose', hex: '#A85A6E', label: 'Rose' },
  { id: 'terracotta', hex: '#B05A3C', label: 'Terracotta' },
  { id: 'forest', hex: '#3F6B4F', label: 'Forest' },
] as const

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/

export function isCategoryColorHex(value: string | null | undefined): value is string {
  return typeof value === 'string' && HEX_PATTERN.test(value.trim())
}

function hashName(name: string): number {
  let hash = 0
  const normalized = name.trim().toLowerCase()
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0
  }
  return hash
}

/** Soft wash behind icons/rows (~18% mix toward white). */
export function softColorFromHex(hex: string): string {
  const raw = hex.replace('#', '')
  const r = Number.parseInt(raw.slice(0, 2), 16)
  const g = Number.parseInt(raw.slice(2, 4), 16)
  const b = Number.parseInt(raw.slice(4, 6), 16)
  const mix = (channel: number) => Math.round(channel + (255 - channel) * 0.82)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

/**
 * Prefer an explicit category color; otherwise pick a stable palette color from the name
 * so lists stay colorful before the user customizes anything.
 */
export function resolveCategoryColor(
  categoryName: string,
  storedColor?: string | null,
): string {
  if (isCategoryColorHex(storedColor)) {
    return storedColor.trim().toUpperCase()
  }
  const index = hashName(categoryName || 'category') % CATEGORY_COLOR_PALETTE.length
  return CATEGORY_COLOR_PALETTE[index].hex
}
