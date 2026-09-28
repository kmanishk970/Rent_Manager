"use client";

import type { MediaFolder } from "@/lib/api/media";

/**
 * Shrinks an image before it is uploaded.
 *
 * A phone camera writes 4–8 MB per photo, and none of that detail survives
 * being shown in a 64px avatar or a document thumbnail. Re-encoding in the
 * browser means the big version never crosses the network at all: the upload
 * is quicker on a phone connection, and the Cloudinary account fills up at a
 * fraction of the rate.
 *
 * Done here rather than as a Cloudinary incoming transformation because that
 * would spend a transformation credit per upload — the free plan has 25 — to
 * do work the browser does for nothing.
 */

export interface CompressionPreset {
  /** Longest edge, in pixels, after scaling. */
  maxDimension: number;
  /** 0–1, passed to the encoder. */
  quality: number;
}

/**
 * How hard to squeeze, per folder.
 *
 * A profile photo is shown at 64px and never larger, so it can be small. A
 * document is a photographed agreement someone may need to read a clause
 * from, so it keeps enough resolution for the text to hold up when zoomed.
 */
export const PRESETS: Record<MediaFolder, CompressionPreset> = {
  photos: { maxDimension: 640, quality: 0.85 },
  documents: { maxDimension: 2200, quality: 0.85 },
};

/** Canvas that works whether or not OffscreenCanvas is available. */
function surface(width: number, height: number) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function encode(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  if (canvas instanceof HTMLCanvasElement) {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  }
  return canvas.convertToBlob({ type, quality }).catch(() => null);
}

/** "agreement.heic" + image/webp → "agreement.webp". */
function rename(name: string, mimeType: string): string {
  const extension = mimeType.split("/")[1] ?? "jpg";
  const stem = name.replace(/\.[^.]+$/, "") || "image";
  return `${stem}.${extension}`;
}

/**
 * Returns a smaller version of the image, or the original.
 *
 * Never throws and never returns something worse: if the browser cannot decode
 * the file, if the encoder is missing, or if the result comes out larger than
 * what was picked — which happens with small images that are already well
 * compressed — the file is handed back untouched. Compression is an
 * optimisation, and an optimisation must not be able to break an upload.
 */
export async function compressImage(
  file: File,
  preset: CompressionPreset,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    // from-image, or every photo taken in portrait arrives on its side: the
    // rotation lives in EXIF, and drawing to a canvas throws EXIF away.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const scale = Math.min(
      1,
      preset.maxDimension / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = surface(width, height);
    const context = canvas.getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, width, height);

    // WebP first: it is a third smaller than JPEG at the same quality and,
    // unlike JPEG, keeps transparency — a logo on a transparent background
    // would otherwise come out on a black one.
    let type = "image/webp";
    let blob = await encode(canvas, type, preset.quality);

    // A browser that cannot write WebP quietly returns PNG instead, which for
    // a photo is far bigger than what came in.
    if (!blob || blob.type !== type) {
      type = "image/jpeg";
      context.fillStyle = "#ffffff";
      context.globalCompositeOperation = "destination-over";
      context.fillRect(0, 0, width, height);
      blob = await encode(canvas, type, preset.quality);
    }

    if (!blob || blob.size >= file.size) return file;

    return new File([blob], rename(file.name, type), {
      type,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

/** The preset for a folder, so callers do not have to know the table. */
export const presetFor = (folder: MediaFolder): CompressionPreset =>
  PRESETS[folder];
