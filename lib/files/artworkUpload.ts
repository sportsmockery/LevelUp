import { supabaseServer } from '../supabase-server';

export interface ArtworkUploadInput {
  orgId: string;
  releaseId: string;
  file: Buffer;
  fileName: string;
  contentType: string;
}

export async function uploadArtwork(input: ArtworkUploadInput): Promise<string> {
  if (!supabaseServer) throw new Error('Supabase server client not configured');
  const path = `${input.orgId}/${input.releaseId}/${input.fileName}`;
  const { error } = await supabaseServer.storage
    .from('artwork')
    .upload(path, input.file, {
      contentType: input.contentType,
      upsert: true,
    });
  if (error) throw error;
  return path;
}

export async function artworkSignedUrl(
  artworkPath: string,
  expiresIn = 60 * 60,
): Promise<string | null> {
  if (!supabaseServer) return null;
  const { data } = await supabaseServer.storage
    .from('artwork')
    .createSignedUrl(artworkPath, expiresIn);
  return data?.signedUrl ?? null;
}
