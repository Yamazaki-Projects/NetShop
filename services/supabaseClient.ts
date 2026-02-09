
import { createClient } from '@supabase/supabase-js';

// 環境変数は Vite の規約に従い import.meta.env から取得
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
