import { FastAverageColor } from "fast-average-color";

/**
 * Spotifast Dynamic Pastel Color Extraction
 * Extracts dominant color using fast-average-color, clamps HSL values into soft pastel range,
 * and sets the --ambient-rgb CSS variable.
 */

export const DEFAULT_AMBIENT_RGB: [number, number, number] = [210, 205, 245]; // Sweet lavender / soft gray fallback

const colorCache = new Map<string, [number, number, number]>();
const fac = new FastAverageColor();

/**
 * Converts RGB [0-255] to HSL [h: 0-360, s: 0-100, l: 0-100]
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h *= 60;
  }

  return [h, s * 100, l * 100];
}

/**
 * Converts HSL [h: 0-360, s: 0-100, l: 0-100] to RGB [0-255]
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hNorm = ((h % 360) + 360) % 360;
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const hp = hNorm / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hp >= 0 && hp < 1) {
    [r1, g1, b1] = [c, x, 0];
  } else if (hp >= 1 && hp < 2) {
    [r1, g1, b1] = [x, c, 0];
  } else if (hp >= 2 && hp < 3) {
    [r1, g1, b1] = [0, c, x];
  } else if (hp >= 3 && hp < 4) {
    [r1, g1, b1] = [0, x, c];
  } else if (hp >= 4 && hp < 5) {
    [r1, g1, b1] = [x, 0, c];
  } else if (hp >= 5 && hp < 6) {
    [r1, g1, b1] = [c, 0, x];
  }

  const m = lNorm - c / 2;
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);

  return [
    Math.min(255, Math.max(0, r)),
    Math.min(255, Math.max(0, g)),
    Math.min(255, Math.max(0, b)),
  ];
}

/**
 * Converts raw RGB to Spotifast soft pastel RGB:
 * - Hue: Preserved (0-360)
 * - Saturation: Clamped to 60% - 80%
 * - Lightness: Clamped to 78% - 85%
 */
export function toSoftPastelRgb(r: number, g: number, b: number): [number, number, number] {
  const [h, s, l] = rgbToHsl(r, g, b);

  // If the image is practically monochromatic, use a gentle soothing lavender hue (250)
  const adjustedHue = s < 8 ? 250 : h;
  const clampedS = Math.min(80, Math.max(60, s));
  const clampedL = Math.min(85, Math.max(78, l));

  return hslToRgb(adjustedHue, clampedS, clampedL);
}

/**
 * Extracts dominant color from image URL using fast-average-color,
 * applies pastel conversion and returns [r, g, b].
 */
export async function extractDominantColor(imageUrl: string): Promise<[number, number, number]> {
  if (!imageUrl) return DEFAULT_AMBIENT_RGB;

  if (colorCache.has(imageUrl)) {
    return colorCache.get(imageUrl)!;
  }

  return new Promise((resolve) => {
    // 2.5s safety timeout
    const timer = setTimeout(() => {
      resolve(DEFAULT_AMBIENT_RGB);
    }, 2500);

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = async () => {
      clearTimeout(timer);
      try {
        const result = await fac.getColorAsync(img, {
          algorithm: "dominant",
        });

        const [rawR, rawG, rawB] = result.value;
        const pastelRgb = toSoftPastelRgb(rawR, rawG, rawB);

        colorCache.set(imageUrl, pastelRgb);
        resolve(pastelRgb);
      } catch (err) {
        console.warn("[ColorExtractor] fast-average-color error, falling back:", err);
        colorCache.set(imageUrl, DEFAULT_AMBIENT_RGB);
        resolve(DEFAULT_AMBIENT_RGB);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      console.warn("[ColorExtractor] Image load failed / CORS blocked for:", imageUrl);
      colorCache.set(imageUrl, DEFAULT_AMBIENT_RGB);
      resolve(DEFAULT_AMBIENT_RGB);
    };

    // Cache-bust CORS requests to avoid Chromium's non-CORS disk cache collision
    const safeUrl = imageUrl.startsWith("http")
      ? imageUrl.includes("?")
        ? `${imageUrl}&cors=1`
        : `${imageUrl}?cors=1`
      : imageUrl;

    img.src = safeUrl;
  });
}

/**
 * Sets the --ambient-rgb CSS variable on the document root
 */
export function setAmbientColor(rgb: [number, number, number]): void {
  if (typeof document !== "undefined") {
    const formatted = `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
    document.documentElement.style.setProperty("--ambient-rgb", formatted);
    document.documentElement.style.setProperty("--ambient-color-raw", formatted);
  }
}
