import { downloadFile } from '@/lib/storage-service';

// In-memory cache: storagePath -> File
const fileCache = new Map<string, File>();
// Track in-flight downloads to avoid duplicate requests
const pendingDownloads = new Map<string, Promise<File>>();

/**
 * Resolve a File object from a storagePath.
 * Uses in-memory cache to avoid redundant downloads.
 */
export async function resolveFile(
  storagePath: string,
  fileName: string
): Promise<File> {
  // Check cache first
  const cached = fileCache.get(storagePath);
  if (cached) return cached;

  // Check if already downloading
  const pending = pendingDownloads.get(storagePath);
  if (pending) return pending;

  // Start download
  const downloadPromise = downloadFile(storagePath, fileName)
    .then((file) => {
      fileCache.set(storagePath, file);
      pendingDownloads.delete(storagePath);
      return file;
    })
    .catch((error) => {
      pendingDownloads.delete(storagePath);
      throw error;
    });

  pendingDownloads.set(storagePath, downloadPromise);
  return downloadPromise;
}

/**
 * Pre-populate cache with a File object (e.g., after local upload)
 */
export function cacheFile(storagePath: string, file: File): void {
  fileCache.set(storagePath, file);
}

/**
 * Remove a file from cache
 */
export function evictFile(storagePath: string): void {
  fileCache.delete(storagePath);
}

/**
 * Clear entire cache
 */
export function clearFileCache(): void {
  fileCache.clear();
  pendingDownloads.clear();
}
