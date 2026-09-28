"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import {
  uploadMedia,
  MAX_UPLOAD_BYTES,
  type MediaFolder,
  type UploadedMedia,
} from "@/lib/api/media";
import { apiErrorMessage } from "@/lib/api/http";
import { compressImage, presetFor } from "@/lib/compress-image";
import { formatBytes } from "@/lib/format";

/**
 * Shrinks a file, sends it up, and reports how far it has got.
 *
 * Every screen that attaches a file does the same two steps — upload, then
 * save the row with the URL — and the only part worth sharing is the first:
 * the compression, the progress number, the in-flight flag, and a failure that
 * has already been turned into something a person can read.
 *
 * Returns the uploaded file, or null when it failed. Null is not an error the
 * caller has to explain; the toast has already said what went wrong. The
 * caller's job is simply not to save the row.
 */
export function useUpload(folder: MediaFolder) {
  const [progress, setProgress] = useState<number | null>(null);
  const [compressing, setCompressing] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const upload = useCallback(
    async (file: File): Promise<UploadedMedia | null> => {
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;

      setProgress(0);
      try {
        // Re-encoded before anything is sent: a 6 MB photo leaves as a few
        // hundred KB, so the upload is quicker and storage fills far slower.
        setCompressing(true);
        const sending = await compressImage(file, presetFor(folder)).finally(
          () => setCompressing(false),
        );
        if (abort.signal.aborted) return null;

        // Compression returns the original when it cannot do better, so a huge
        // file can still arrive here. Saying so now beats a 413 after the wait.
        if (sending.size > MAX_UPLOAD_BYTES[folder]) {
          toast.error(
            `That image is ${formatBytes(sending.size)} even after compressing — the limit is ${formatBytes(MAX_UPLOAD_BYTES[folder])}`,
          );
          return null;
        }

        return await uploadMedia(sending, {
          folder,
          signal: abort.signal,
          onProgress: setProgress,
        });
      } catch (error) {
        // An abort is this hook cancelling itself — a newer upload started, or
        // the dialog closed. Nothing went wrong that anyone needs telling.
        if (!abort.signal.aborted) {
          toast.error(apiErrorMessage(error, `Could not upload ${file.name}`));
        }
        return null;
      } finally {
        if (controller.current === abort) {
          controller.current = null;
          setProgress(null);
          setCompressing(false);
        }
      }
    },
    [folder],
  );

  /** Stops an upload in flight — a dialog closing mid-send, say. */
  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setProgress(null);
    setCompressing(false);
  }, []);

  return {
    upload,
    cancel,
    progress,
    compressing,
    uploading: progress !== null,
  };
}
