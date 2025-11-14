import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Screenshot3DMetadata {
  quoteId: string;
  width: number;
  height: number;
  cameraPosition?: { x: number; y: number; z: number };
  viewPreset?: 'front' | 'side' | 'top' | 'isometric' | 'custom';
}

export async function dataURLtoBlob(dataURL: string): Promise<Blob> {
  const response = await fetch(dataURL);
  return response.blob();
}

export async function uploadScreenshot3D(
  dataURL: string,
  metadata: Screenshot3DMetadata
): Promise<{ success: boolean; url?: string; error?: string; id?: string }> {
  try {
    const blob = await dataURLtoBlob(dataURL);
    const timestamp = Date.now();
    const filename = `screenshot-${metadata.quoteId}-${timestamp}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('3d-screenshots')
      .upload(filename, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabase.storage
      .from('3d-screenshots')
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    const screenshotRecord = {
      quote_id: metadata.quoteId,
      image_url: publicUrl,
      width: metadata.width,
      height: metadata.height,
      file_size: blob.size,
      camera_position: metadata.cameraPosition ? metadata.cameraPosition : null,
      view_preset: metadata.viewPreset || 'custom'
    };

    const { data: dbData, error: dbError } = await supabase
      .from('screenshot_3d')
      .insert(screenshotRecord)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return { success: false, error: dbError.message };
    }

    return {
      success: true,
      url: publicUrl,
      id: dbData.id
    };
  } catch (error) {
    console.error('Screenshot upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getQuoteScreenshots(quoteId: string): Promise<{
  success: boolean;
  screenshots?: any[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('screenshot_3d')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch screenshots:', error);
      return { success: false, error: error.message };
    }

    return { success: true, screenshots: data };
  } catch (error) {
    console.error('Screenshot fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function deleteScreenshot3D(screenshotId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: screenshot, error: fetchError } = await supabase
      .from('screenshot_3d')
      .select('image_url')
      .eq('id', screenshotId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    const filename = screenshot.image_url.split('/').pop();
    if (filename) {
      await supabase.storage.from('3d-screenshots').remove([filename]);
    }

    const { error: deleteError } = await supabase
      .from('screenshot_3d')
      .delete()
      .eq('id', screenshotId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Screenshot delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
