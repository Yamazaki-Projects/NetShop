
import { createClient } from "@supabase/supabase-js";

/**
 * Vite環境の環境変数を安全に取得します。
 * 実行環境によって import.meta.env が存在しない場合や、
 * 変数が設定されていない場合でもアプリがクラッシュするのを防ぎます。
 */
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

// Supabaseクライアントの初期化
// URLが空の場合は警告を表示しつつ、ランタイムエラーでの画面消失を防ぎます
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);

if (!supabaseUrl) {
  console.warn("Supabase URL is missing. Please check your .env file or environment variables.");
}
