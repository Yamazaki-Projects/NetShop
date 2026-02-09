
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.45.0';

// 本来は環境変数から取得しますが、テンプレートとして定義します
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
