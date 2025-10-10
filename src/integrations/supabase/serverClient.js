// src/integrations/supabase/serverClient.js
import { createClient } from "@supabase/supabase-js";

// Ensure singleton client
if (!global.supabaseClient) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "❌ Supabase URL or Service Role Key is missing in environment variables."
    );
  }

  global.supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log("✅ Server Supabase client initialized securely");
}

export const supabase = global.supabaseClient;
