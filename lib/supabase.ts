import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Keep app buildable before envs are connected. Runtime screens show setup guidance.
  console.warn("Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(
  supabaseUrl || "https://example.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function publicUrl(path?: string | null) {
  if (!path) return "";
  const { data } = supabase.storage.from("handoff-files").getPublicUrl(path);
  return data.publicUrl;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

export function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

export function generateAccessCode() {
  const array = new Uint32Array(1);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(array);
    return `HQ-${String(array[0] % 1000000).padStart(6, "0")}`;
  }
  return `HQ-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function formatSupabaseError(action: string, error: { message?: string; code?: string; details?: string } | null) {
  if (!error) return "";
  const parts = [error.message, error.code ? `Code: ${error.code}` : "", error.details].filter(Boolean);
  return `${action} failed. ${parts.join(" • ")}`;
}
