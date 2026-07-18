import { supabase } from "@/integrations/supabase/client";

export type IntroVideoRecord = {
  id: string;
  storage_path: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
};

const BUCKET = "intro-videos";
// Workspace policy blocks public buckets, so we sign long-lived URLs.
// One year in seconds.
const SIGNED_URL_TTL = 60 * 60 * 24 * 365;

async function signedUrlFor(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function getActiveIntroVideo(): Promise<
  { url: string; record: IntroVideoRecord } | null
> {
  const { data, error } = await supabase
    .from("app_intro_videos")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  const url = await signedUrlFor(data.storage_path);
  if (!url) return null;
  return { url, record: data as IntroVideoRecord };
}

export async function listIntroVideos(): Promise<IntroVideoRecord[]> {
  const { data, error } = await supabase
    .from("app_intro_videos")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IntroVideoRecord[];
}

export async function uploadAndActivateIntroVideo(file: File): Promise<IntroVideoRecord> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) throw new Error("Not signed in");

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const path = `${userRes.user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type || "video/mp4",
      cacheControl: "31536000",
      upsert: false,
    });
  if (upErr) throw upErr;

  // Deactivate any currently active row (unique index enforces one active)
  const { error: deactErr } = await supabase
    .from("app_intro_videos")
    .update({ is_active: false })
    .eq("is_active", true);
  if (deactErr) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw deactErr;
  }

  const { data: inserted, error: insErr } = await supabase
    .from("app_intro_videos")
    .insert({
      storage_path: path,
      is_active: true,
      created_by: userRes.user.id,
    })
    .select("*")
    .single();
  if (insErr || !inserted) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw insErr ?? new Error("Insert failed");
  }
  return inserted as IntroVideoRecord;
}

export async function disableIntroVideo(): Promise<void> {
  const { error } = await supabase
    .from("app_intro_videos")
    .update({ is_active: false })
    .eq("is_active", true);
  if (error) throw error;
}

export async function reactivateIntroVideo(id: string): Promise<void> {
  const { error: deactErr } = await supabase
    .from("app_intro_videos")
    .update({ is_active: false })
    .eq("is_active", true);
  if (deactErr) throw deactErr;
  const { error } = await supabase
    .from("app_intro_videos")
    .update({ is_active: true })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteIntroVideo(record: IntroVideoRecord): Promise<void> {
  const { error: rmErr } = await supabase.storage
    .from(BUCKET)
    .remove([record.storage_path]);
  if (rmErr && rmErr.message && !/not found/i.test(rmErr.message)) throw rmErr;
  const { error } = await supabase.from("app_intro_videos").delete().eq("id", record.id);
  if (error) throw error;
}
