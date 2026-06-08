import { supabase } from '../lib/supabase';

/**
 * Upload an image blob to Supabase Storage (quote-assets bucket) and return
 * a permanent public URL. Falls back to null on failure.
 */
export async function uploadToQuoteAssets(blob: Blob, filename: string): Promise<string | null> {
  try {
    const path = `diagrams/${crypto.randomUUID()}-${filename}`;
    const { error } = await supabase.storage
      .from('quote-assets')
      .upload(path, blob, { contentType: blob.type || 'image/png', upsert: false });
    if (error) {
      console.warn('[storageUpload] upload failed:', error.message);
      return null;
    }
    const { data } = supabase.storage.from('quote-assets').getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn('[storageUpload] unexpected error:', err);
    return null;
  }
}
