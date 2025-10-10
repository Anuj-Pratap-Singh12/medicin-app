import { supabase } from "./src/integrations/supabase/serverClient.js";

const { data, error } = await supabase.from("users").select("*").limit(1);
console.log({ data, error });
