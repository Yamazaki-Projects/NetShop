/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fix: Use Deno.serve (built-in Deno API) for Supabase Edge Functions. 
// The triple-slash reference at the top of the file resolves 'Cannot find name Deno' errors.
Deno.serve(async (req) => {
  // CORS プリフライト対応
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { login_id, registration_code, password } = await req.json();

    // パラメータバリデーション
    if (!login_id || !registration_code || !password) {
      return new Response(JSON.stringify({ error: "missing_params" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return new Response(JSON.stringify({ error: "weak_password" }), { 
        status: 422, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Fix: Access environment variables via Deno.env
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, serviceRole);

    // 1) users レコード取得と検証
    const { data: u, error: uErr } = await supabase
      .from("users")
      .select("*")
      .eq("login_id", login_id)
      .maybeSingle();

    if (uErr || !u) {
      return new Response(JSON.stringify({ error: "user_not_found" }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (
      u.agency_application_status !== "approved" ||
      u.status !== "customer" ||
      !u.registration_code ||
      u.registration_code !== registration_code ||
      u.registration_code_used_at
    ) {
      return new Response(JSON.stringify({ error: "invalid_or_used_code" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const email = `${login_id}@net-shop.com`;

    // 2) Auth ユーザーの作成または更新
    let authUserId: string | null = null;

    // まず作成を試みる
    const { data: created, error: cErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (cErr) {
      // 既に存在する場合（User already registered等）
      // listUsers から取得（getUserByEmailがadmin APIに存在しない場合の代替案）
      const { data: list, error: lErr } = await supabase.auth.admin.listUsers();
      if (lErr || !list?.users) {
        return new Response(JSON.stringify({ error: "auth_operation_failed", detail: cErr.message }), { 
          status: 422, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      const existing = list.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
      if (!existing) {
        return new Response(JSON.stringify({ error: "auth_not_created", detail: cErr.message }), { 
          status: 422, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      authUserId = existing.id;

      // パスワードを更新して有効化
      const { error: upErr } = await supabase.auth.admin.updateUserById(authUserId, {
        password,
        email_confirm: true,
      });

      if (upErr) {
        return new Response(JSON.stringify({ error: "auth_update_failed", detail: upErr.message }), { 
          status: 422, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
    } else {
      authUserId = created?.user?.id ?? null;
    }

    if (!authUserId) {
      return new Response(JSON.stringify({ error: "auth_user_id_missing" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 3) users テーブルの更新（プロファイルを代理店へ）
    const { error: upDbErr } = await supabase
      .from("users")
      .update({
        auth_uid: authUserId,
        status: "agency",
        role: "agency",
        registration_code_used_at: new Date().toISOString(),
      })
      .eq("login_id", login_id);

    if (upDbErr) {
      return new Response(JSON.stringify({ error: "db_update_failed", detail: upDbErr.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ ok: true, email }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error", detail: String(e) }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});