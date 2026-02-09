
import { createClient } from "@supabase/supabase-js";

/**
 * 環境変数を安全に取得するユーティリティ
 */
const getEnvVar = (key: string): string => {
  try {
    // @ts-ignore
    const value = process?.env?.[key];
    return typeof value === 'string' ? value : "";
  } catch (e) {
    return "";
  }
};

const rawUrl = getEnvVar("VITE_SUPABASE_URL") || getEnvVar("SUPABASE_URL");
const rawKey = getEnvVar("VITE_SUPABASE_ANON_KEY") || getEnvVar("SUPABASE_ANON_KEY");

// Supabase URLが無効な場合、ネットワークエラー(Failed to fetch)を避けるために
// 内部でフラグを管理できるような構成にします。
export const isSupabaseConfigured = !!(rawUrl && rawKey && !rawUrl.includes("placeholder"));

const supabaseUrl = isSupabaseConfigured ? rawUrl : "https://placeholder-project.supabase.co";
const supabaseAnonKey = isSupabaseConfigured ? rawKey : "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
