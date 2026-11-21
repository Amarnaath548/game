const urlCache = new Map();
const createdUrls = [];

function revokeAllUrls() {
  createdUrls.forEach((url) => {
    try { URL.revokeObjectURL(url); } catch (_) {}
  });
}
window.addEventListener('pagehide', revokeAllUrls);
window.addEventListener('beforeunload', revokeAllUrls);

export async function trimHeroImage(img, fallbackSrc) {
  try {
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return fallbackSrc;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return fallbackSrc;

    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        if (data[(rowOffset + x) * 4 + 3] >= 20) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return fallbackSrc;

    const figH = maxY - minY + 1;
    const figW = maxX - minX + 1;
    const rowStart = Math.floor(minY + figH * 0.38);
    const rowEnd = Math.floor(minY + figH * 0.60);

    let maxRunLength = -1;
    let bodyCenter = (minX + maxX) / 2;

    for (let y = rowStart; y <= rowEnd; y++) {
      const rowOffset = y * width;
      let runStart = -1;
      for (let x = minX; x <= maxX + 1; x++) {
        const isOpaque = x <= maxX && data[(rowOffset + x) * 4 + 3] >= 20;
        if (isOpaque) {
          if (runStart === -1) runStart = x;
        } else if (runStart !== -1) {
          const runLength = x - runStart;
          if (runLength > maxRunLength) {
            maxRunLength = runLength;
            bodyCenter = (runStart + (x - 1)) / 2;
          }
          runStart = -1;
        }
      }
    }

    const halfW = Math.max(bodyCenter - minX, maxX - bodyCenter);
    const trimmedW = Math.max(1, Math.ceil(halfW * 2));
    const trimmedH = figH;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = trimmedW;
    outCanvas.height = trimmedH;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return fallbackSrc;

    const dx = Math.round(trimmedW / 2 - (bodyCenter - minX));
    outCtx.drawImage(canvas, minX, minY, figW, figH, dx, 0, figW, figH);

    const blob = await new Promise((resolve) => outCanvas.toBlob(resolve, 'image/png'));
    if (!blob) return fallbackSrc;

    const objectUrl = URL.createObjectURL(blob);
    createdUrls.push(objectUrl);
    return objectUrl;
  } catch (err) {
    console.warn('HeroImageTrim failed, using fallback:', err);
    return fallbackSrc;
  }
}

export async function loadAndTrimHero(heroId, fileName) {
  if (urlCache.has(heroId)) return urlCache.get(heroId);
  const src = `./lobby/${fileName}`;
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });
    const trimmedUrl = await trimHeroImage(img, src);
    urlCache.set(heroId, trimmedUrl);
    return trimmedUrl;
  } catch (err) {
    console.warn(`Failed to trim hero ${heroId}, using fallback:`, err);
    urlCache.set(heroId, src);
    return src;
  }
}

export function getHeroSrc(heroId, fileName) {
  return urlCache.get(heroId) || `./lobby/${fileName}`;
}
