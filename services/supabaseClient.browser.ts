import { createClient } from "@supabase/supabase-js";

/**
 * 環境変数から設定値を取得するための安全なヘルパー。
 * Vite (import.meta.env) および標準的な環境 (process.env) の両方をチェックします。
 */
const getEnvVar = (key: string): string | undefined => {
  // 1. Vite / modern ESM environment
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[key]) return metaEnv[key];
  } catch (e) {
    // Ignore access error
  }

  // 2. process.env (Node.js or polyfilled environments)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore access error
  }

  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// 環境変数が設定されていない場合は、エラーメッセージを表示しますが、
// アプリ全体のクラッシュを防ぐためにエラーはスローしません。
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = "Critical Configuration Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined. " +
                   "Please ensure these environment variables are set correctly in your Vercel project settings with the 'VITE_' prefix.";
  console.error(errorMsg);
}

/**
 * Supabaseクライアントの初期化。
 * 環境変数が不足している場合は null を返します。
 */
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : (null as any);
