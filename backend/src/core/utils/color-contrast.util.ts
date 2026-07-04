/**
 * WCAG color contrast utilities for deriving theme-safe color variants
 * from a single AI-generated hex color.
 *
 * The app has two themes with nearly-opposite backgrounds (dark #080D1A,
 * light #F0F4F8). A single hex value cannot pass AA (4.5:1) on both.
 * This utility preserves the original hue/saturation and adjusts only
 * lightness until the contrast ratio meets the required minimum.
 */

/* ── Theme background constants ─────────────────────────────────── */

export const DARK_BG = '#080D1A';
export const LIGHT_BG = '#F0F4F8';
export const MIN_CONTRAST_RATIO = 4.5; // WCAG AA normal text

/* ── Hex ↔ HSL conversions ─────────────────────────────────────── */

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
    };
}

export function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const { r, g, b } = hexToRgb(hex);
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;

    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    const l = (max + min) / 2;

    if (d === 0) {
        return { h: 0, s: 0, l: Math.round(l * 100) };
    }

    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === rn) {
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    } else if (max === gn) {
        h = ((bn - rn) / d + 2) / 6;
    } else {
        h = ((rn - gn) / d + 4) / 6;
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h: number, s: number, l: number): string {
    const sn = s / 100;
    const ln = l / 100;
    const c = (1 - Math.abs(2 * ln - 1)) * sn;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = ln - c / 2;

    let rn = 0;
    let gn = 0;
    let bn = 0;

    if (h < 60) { rn = c; gn = x; }
    else if (h < 120) { rn = x; gn = c; }
    else if (h < 180) { gn = c; bn = x; }
    else if (h < 240) { gn = x; bn = c; }
    else if (h < 300) { rn = x; bn = c; }
    else { rn = c; bn = x; }

    return rgbToHex(
        Math.round((rn + m) * 255),
        Math.round((gn + m) * 255),
        Math.round((bn + m) * 255),
    );
}

/* ── WCAG contrast ratio ───────────────────────────────────────── */

function relativeLuminance(hex: string): number {
    const { r, g, b } = hexToRgb(hex);
    const [rn, gn, bn] = [r, g, b].map((ch) => {
        const s = ch / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;
}

export function contrastRatio(hex1: string, hex2: string): number {
    const l1 = relativeLuminance(hex1);
    const l2 = relativeLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

/* ── Lightness adjustment ──────────────────────────────────────── */

/**
 * Adjusts only the lightness of `hex` (preserving hue + saturation)
 * until the contrast ratio against `bgHex` meets `minRatio`.
 *
 * Uses binary search on the lightness channel (0–100).
 * If the color already passes, returns it unchanged.
 */
export function adjustLightnessForContrast(
    hex: string,
    bgHex: string,
    minRatio: number = MIN_CONTRAST_RATIO,
): string {
    const currentRatio = contrastRatio(hex, bgHex);
    if (currentRatio >= minRatio) {
        return hex;
    }

    const { h, s } = hexToHsl(hex);

    const darkerResult = searchLightness(h, s, bgHex, minRatio, 0, 50);
    const lighterResult = searchLightness(h, s, bgHex, minRatio, 50, 100);

    if (darkerResult !== null && lighterResult !== null) {
        return darkerResult;
    }
    return darkerResult ?? lighterResult ?? hex;
}

function searchLightness(
    h: number,
    s: number,
    bgHex: string,
    minRatio: number,
    low: number,
    high: number,
): string | null {
    let best: string | null = null;
    let bestDist = Infinity;

    for (let i = 0; i < 50; i++) {
        const mid = Math.round((low + high) / 2);
        const candidate = hslToHex(h, s, mid);
        const ratio = contrastRatio(candidate, bgHex);

        if (ratio >= minRatio) {
            const dist = Math.abs(mid - 50); // prefer values closer to mid-range
            if (dist < bestDist) {
                bestDist = dist;
                best = candidate;
            }
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }

    return best;
}

/**
 * Returns both theme-safe color variants for a given AI-generated color.
 */
export function deriveThemeColors(color: string): {
    colorDark: string;
    colorLight: string;
} {
    return {
        colorDark: adjustLightnessForContrast(color, DARK_BG, MIN_CONTRAST_RATIO),
        colorLight: adjustLightnessForContrast(color, LIGHT_BG, MIN_CONTRAST_RATIO),
    };
}
