import { createClient } from "@supabase/supabase-js";
import { User, Case } from "../types";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

class DBService {

  toInternalEmail(loginId: string) {
    return `${loginId.trim().toLowerCase()}@net-shop.com`;
  }

  async login(loginId: string, password: string): Promise<User | null> {

    try {

      const email = this.toInternalEmail(loginId);

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

      return profile as User;

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

    return profile as User;
  }

  async getUsers(): Promise<User[]> {

    const { data } = await supabase
      .from("users")
      .select("*");

    return (data || []) as User[];
  }

  async getCases(user: User): Promise<Case[]> {

    const { data } = await supabase
      .from("cases")
      .select("*")
      .eq("referrer_id", user.id);

    return (data || []) as Case[];
  }

  async getTeamCases(user: User): Promise<Case[]> {

    const { data } = await supabase
      .from("cases")
      .select("*")
      .eq("referrer_id", user.id);

    return (data || []) as Case[];
  }

  async getAllCases(): Promise<Case[]> {

    const { data } = await supabase
      .from("cases")
      .select("*");

    return (data || []) as Case[];
  }

  async createCase(caseData: Partial<Case>) {

    const { data, error } = await supabase
      .from("cases")
      .insert(caseData)
      .select()
      .single();

    if (error) throw error;

    return data as Case;
  }

  async getApprovedCount(userId: string) {

    const { count } = await supabase
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", userId)
      .eq("status", "approved");

    return count || 0;
  }

  async calculateRate(userId: string) {

    const { count } = await supabase
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", userId)
      .eq("status", "approved");

    const approved = count || 0;

    if (approved >= 30) return 0.5;
    if (approved >= 10) return 0.4;
    return 0.3;
  }

  async checkRegistrationEligibility(code: string) {

    const { data } = await supabase
      .from("cases")
      .select("*")
      .eq("referral_code", code)
      .single();

    return data;
  }

  async completeRegistration(data: any) {

    const { data: result, error } = await supabase
      .from("users")
      .insert(data)
      .select()
      .single();

    if (error) throw error;

    return result;
  }

}

export const db = new DBService();