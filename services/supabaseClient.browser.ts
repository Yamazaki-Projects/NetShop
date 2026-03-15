import { createClient } from "@supabase/supabase-js";

/**
 * 環境変数から設定値を取得するための安全なヘルパー。
 * Vite (import.meta.env) および標準的な環境 (process.env) の両方をチェックします。
 */
const getEnvVar = (key: string): string | undefined => {
  const isInvalid = (val: any) => !val || val === 'undefined' || val === 'null' || val === '';

  // 1. Vite / modern ESM environment
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && !isInvalid(metaEnv[key])) return metaEnv[key];
  } catch (e) {
    // Ignore access error
  }

  // 2. process.env (Node.js or polyfilled environments)
  try {
    if (typeof process !== 'undefined' && process.env && !isInvalid(process.env[key])) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore access error
  }

  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

// 環境変数が設定されていない場合は、エラーメッセージを表示しますが、
// アプリ全体のクラッシュを防ぐためにエラーはスローしません。
if (!isValidUrl(supabaseUrl) || !supabaseAnonKey) {
  const errorMsg = "Critical Configuration Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined or invalid. " +
                   "Please ensure these environment variables are set correctly in your project settings with the 'VITE_' prefix.";
  console.error(errorMsg);
}

/**
 * Supabaseクライアントの初期化。
 * 環境変数が不足している場合は null を返します。
 */
export const supabase = (isValidUrl(supabaseUrl) && supabaseAnonKey) 
  ? createClient(supabaseUrl!, supabaseAnonKey) 
  : (null as any);
