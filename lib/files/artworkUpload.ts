// Music Publishing — artwork upload to the mp-artwork bucket.
// Returns the storage path which we store on releases.artwork_path.

import { getServiceClient } from '@/lib/supabase-publishing-server';

export async function uploadArtwork(opts: {
  orgId: string;
  releaseId: string;
  fileName: string;
  buffer: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ path: string } | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const path = `${opts.orgId}/${opts.releaseId}/${Date.now()}-${opts.fileName}`;
  const body: Uint8Array =
    opts.buffer instanceof Uint8Array ? opts.buffer : new Uint8Array(opts.buffer);
  const { error } = await supabase.storage
    .from('mp-artwork')
    .upload(path, body, { contentType: opts.contentType, upsert: false });
  if (error) throw new Error(`artwork upload failed: ${error.message}`);
  return { path };
}

export async function artworkSignedUrl(path: string, expiresInSeconds = 600): Promise<string | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase.storage.from('mp-artwork').createSignedUrl(path, expiresInSeconds);
  return data?.signedUrl ?? null;
}
