/**
 * Shrink an image (a picked file or a canvas snapshot) to at most `maxSide`
 * pixels on its longest side and re-encode it as JPEG. Phone photos are often
 * 5–10 MB; this brings them to 100–250 KB before upload and strips EXIF data
 * such as GPS location. The size is what a profile card shows on a phone: every
 * extra pixel makes the upload, the checks and each later view of the photo slower.
 * Keep the quality: lower values smear fine detail and the blur check starts
 * refusing photos that are fine.
 */
export async function resizeImage(source: Blob | CanvasImageSource, maxSide = 1080, quality = 0.85) {
  const bitmap =
    source instanceof Blob ? await createImageBitmap(source, { imageOrientation: "from-image" }) : source;
  const { width, height } = sizeOf(bitmap);
  const scale = Math.min(1, maxSide / Math.max(width, height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (bitmap instanceof ImageBitmap) bitmap.close();

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))), "image/jpeg", quality),
  );
}

function sizeOf(source: CanvasImageSource) {
  if (source instanceof HTMLVideoElement) return { width: source.videoWidth, height: source.videoHeight };
  if (source instanceof HTMLImageElement) return { width: source.naturalWidth, height: source.naturalHeight };
  const s = source as { width: number | SVGAnimatedLength; height: number | SVGAnimatedLength };
  return { width: Number(s.width), height: Number(s.height) };
}
