import { createClient } from "@supabase/supabase-js";
import { User } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

class DBService {
  async login(loginId: string, password: string): Promise<User | null> {
    try {
      const email = `${loginId.trim().toLowerCase()}@net-shop.com`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error || !data.user) {
        console.error(error);
        return null;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_uid", data.user.id)
        .single();

      if (profileError) {
        console.error(profileError);
        return null;
      }

      return profile;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async logout() {
    await supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getSession();

    const user = data.session?.user;

    if (!user) return null;

    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("auth_uid", user.id)
      .single();

    return profile || null;
  }
}

export const db = new DBService();