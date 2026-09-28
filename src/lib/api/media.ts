import { http } from "./http";

/**
 * Uploads.
 *
 * One endpoint, one shape: the file goes to the API, the API puts it in
 * Cloudinary, and what comes back is a URL. Whatever the file belongs to — a
 * document, a tenant's photo, the owner's own — is saved afterwards with that
 * URL on it, so nothing is recorded pointing at a file that failed to arrive.
 */

/** Where the file is filed. The folder decides the size and type limits. */
export type MediaFolder = "documents" | "photos";

/**
 * What the API accepts per folder, mirrored from its own rules.
 *
 * Only ever used to say no before sending: the server is still the authority,
 * and a browser that skipped this check is refused there with a 413.
 */
export const MAX_UPLOAD_BYTES: Record<MediaFolder, number> = {
  documents: 20 * 1024 * 1024,
  photos: 5 * 1024 * 1024,
};

export interface UploadedMedia {
  /** The delivery URL. This is what gets stored and rendered. */
  url: string;
  /** Cloudinary's handle for the asset, kept so it can be deleted later. */
  publicId: string;
  /** "image" or "raw" — both are needed to address the asset again. */
  resourceType: string;
  format: string | null;
  bytes: number;
  originalName: string;
  mimeType: string;
  width?: number;
  height?: number;
}

/**
 * A 20 MB file over a slow connection outlasts the client's default timeout
 * several times over, and a request that dies mid-upload looks to the person
 * uploading exactly like a broken server.
 */
const UPLOAD_TIMEOUT_MS = 120_000;

export interface UploadOptions {
  folder?: MediaFolder;
  /** 0–100, or undefined while the total size is still unknown. */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export async function uploadMedia(
  file: File,
  { folder = "documents", onProgress, signal }: UploadOptions = {},
): Promise<UploadedMedia> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);

  const { data } = await http.post<UploadedMedia>("/media/upload", form, {
    timeout: UPLOAD_TIMEOUT_MS,
    signal,
    // `false`, not a multipart string: the client sets application/json for
    // every other call, and axios honours that header even for a FormData
    // body — it would serialise the file to `{"file":{}}` and send that.
    // Removing the header lets the browser write its own, with the boundary
    // that nothing on this side can generate.
    headers: { "Content-Type": false },
    onUploadProgress: (event) => {
      if (!onProgress) return;
      const total = event.total ?? file.size;
      if (!total) return;
      onProgress(Math.min(100, Math.round((event.loaded / total) * 100)));
    },
  });

  return data;
}

/**
 * Removes an uploaded file.
 *
 * For the one case the server cannot clean up itself: a file that went up and
 * then the row it was meant for was never saved. Deleting a document deletes
 * its file server-side.
 */
export async function deleteMedia(
  publicId: string,
  resourceType = "image",
): Promise<void> {
  await http.delete("/media", { data: { publicId, resourceType } });
}

/**
 * The same file, as a download rather than a view.
 *
 * `<a download>` is ignored across origins, so the browser just shows the
 * image instead of saving it. Cloudinary answers with a Content-Disposition of
 * attachment when `fl_attachment` is in the delivery path, which is the only
 * thing that actually makes it save.
 *
 * Anything that is not a Cloudinary URL is handed back untouched.
 */
export function downloadUrl(url: string): string {
  if (!url.includes("/upload/")) return url;
  if (url.includes("/upload/fl_attachment")) return url;
  return url.replace("/upload/", "/upload/fl_attachment/");
}
