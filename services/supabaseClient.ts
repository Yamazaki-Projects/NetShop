
import { createClient } from "@supabase/supabase-js";

// Fix: Use process.env for environment variables as import.meta.env is not recognized 
// by the current TypeScript configuration for ImportMeta.
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);
