import { supabase } from '@/lib/supabase';

const BUCKET = 'exam-files';

/**
 * Upload an answer key PDF to Supabase Storage
 * Path: {userId}/{sessionId}/answer-key.pdf
 */
export async function uploadAnswerKey(
  userId: string,
  sessionId: string,
  file: File
): Promise<string> {
  const path = `${userId}/${sessionId}/answer-key.pdf`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

/**
 * Upload a submission PDF to Supabase Storage
 * Path: {userId}/{sessionId}/submissions/{submissionId}.pdf
 */
export async function uploadSubmissionFile(
  userId: string,
  sessionId: string,
  submissionId: string,
  file: File
): Promise<string> {
  const ext = file.name.endsWith('.pdf') ? 'pdf' : file.type.split('/')[1] || 'pdf';
  const path = `${userId}/${sessionId}/submissions/${submissionId}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

/**
 * Download a file from Supabase Storage and return as File object
 */
export async function downloadFile(
  storagePath: string,
  fileName: string
): Promise<File> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);
  if (error) throw error;
  if (!data) throw new Error('No data returned from storage');
  return new File([data], fileName, { type: data.type });
}

/**
 * Delete all files for a session (answer key + all submissions)
 */
export async function deleteSessionFiles(
  userId: string,
  sessionId: string
): Promise<void> {
  const folderPath = `${userId}/${sessionId}`;

  // List all files in the session folder
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(folderPath, { limit: 1000 });

  if (listError) throw listError;
  if (!files || files.length === 0) return;

  // Also list submissions subfolder
  const { data: subFiles } = await supabase.storage
    .from(BUCKET)
    .list(`${folderPath}/submissions`, { limit: 1000 });

  const allPaths = [
    ...files.filter(f => f.name).map(f => `${folderPath}/${f.name}`),
    ...(subFiles || []).filter(f => f.name).map(f => `${folderPath}/submissions/${f.name}`),
  ];

  if (allPaths.length > 0) {
    const { error: deleteError } = await supabase.storage
      .from(BUCKET)
      .remove(allPaths);
    if (deleteError) throw deleteError;
  }
}

/**
 * Delete a single submission file
 */
export async function deleteSubmissionFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);
  if (error) throw error;
}
