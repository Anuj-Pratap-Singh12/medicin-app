// src/integrations/supabase/frontendHelper.js
import { supabase } from "./client";
import { toast } from "sonner";

// ✅ Export Supabase client so client components can use it
export { supabase };

// ---------------------------------------------
// Fetch performers with medicines & today's status
// ---------------------------------------------
export async function fetchPerformersWithLogs(userId) {
  try {
    const { data: performers, error } = await supabase
      .from("performers")
      .select(`
        id,
        name,
        medicines (
          id,
          pill_name,
          dosage,
          time_of_day,
          frequency,
          status
        )
      `)
      .eq("user_id", userId)
      .order("id", { ascending: true });

    if (error) throw error;

    const flatMedicineIds = (performers || [])
      .flatMap((p) => (p.medicines || []).map((m) => m.id))
      .filter(Boolean);

    if (!flatMedicineIds.length)
      return performers.map((p) => ({ ...p, medicines: p.medicines || [] }));

    const todayDate = new Date().toISOString().split("T")[0];

    const { data: todaysLogs, error: logsError } = await supabase
      .from("medicine_logs")
      .select("id, medicine_id, status, log_date")
      .in("medicine_id", flatMedicineIds)
      .eq("log_date", todayDate);

    if (logsError) console.warn("Could not fetch today's logs:", logsError);

    const logsMap = new Map();
    (todaysLogs || []).forEach((log) => logsMap.set(log.medicine_id, log));

    return (performers || []).map((p) => ({
      ...p,
      medicines: (p.medicines || []).map((m) => {
        const todayLog = logsMap.get(m.id);
        return { ...m, status: todayLog ? todayLog.status : "Upcoming" };
      }),
    }));
  } catch (err) {
    console.error("fetchPerformersWithLogs failed:", err);
    toast.error("Could not load performers");
    return [];
  }
}

// ---------------------------------------------
// Log dose status (Taken / Missed) once per day
// ---------------------------------------------
export async function logDoseStatus(medicineId, status) {
  if (!medicineId || !status) {
    console.error("logDoseStatus called with invalid arguments", { medicineId, status });
    toast.error("Invalid medicine or status");
    return false;
  }

  const now = new Date().toISOString();
  const todayDate = new Date().toISOString().split("T")[0];

  try {
    const { data: existingLogs, error: fetchError } = await supabase
      .from("medicine_logs")
      .select("id, status")
      .eq("medicine_id", medicineId)
      .eq("log_date", todayDate)
      .limit(1);

    if (fetchError) throw fetchError;

    if (existingLogs?.length > 0) {
      const log = existingLogs[0];
      if (log.status !== status) {
        const { error: updateError } = await supabase
          .from("medicine_logs")
          .update({ status, timestamp: now })
          .eq("id", log.id);
        if (updateError) throw updateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from("medicine_logs")
        .insert([{ medicine_id: medicineId, status, log_date: todayDate, timestamp: now }]);
      if (insertError) throw insertError;
    }

    const { error: updateMedicineError } = await supabase
      .from("medicines")
      .update({ status })
      .eq("id", medicineId);

    if (updateMedicineError) console.warn("Medicine table update failed (non-critical):", updateMedicineError);

    return true;
  } catch (err) {
    console.error("logDoseStatus failed:", err);
    toast.error("Failed to log dose");
    return false;
  }
}

// ---------------------------------------------
// Auto-mark missed doses after 30 minutes
// (Client-safe: no emails / no Node modules)
// ---------------------------------------------
export async function autoMarkMissedDoses() {
  try {
    const { data: medicines, error } = await supabase
      .from("medicines")
      .select(`
        id,
        pill_name,
        time_of_day,
        performer:performer_id (
          id,
          name,
          user_id
        )
      `);

    if (error) throw error;

    const now = new Date();

    for (const med of medicines || []) {
      if (!med.time_of_day) continue;

      const [hours, minutes] = med.time_of_day.split(":").map(Number);
      const medTime = new Date();
      medTime.setHours(hours, minutes, 0, 0);

      const diffMinutes = (now.getTime() - medTime.getTime()) / 60000;

      if (diffMinutes > 30) {
        const todayDate = new Date().toISOString().split("T")[0];

        const { data: existingLogs, error: logsError } = await supabase
          .from("medicine_logs")
          .select("id")
          .eq("medicine_id", med.id)
          .eq("log_date", todayDate);

        if (logsError) {
          console.error(`Error fetching logs for ${med.pill_name}:`, logsError);
          continue;
        }

        if (!existingLogs?.length) {
          const { error: insertError } = await supabase
            .from("medicine_logs")
            .insert([{ medicine_id: med.id, status: "Missed", log_date: todayDate, timestamp: now }]);
          if (insertError) console.error(`Error inserting log for ${med.pill_name}:`, insertError);

          await supabase.from("medicines").update({ status: "Missed" }).eq("id", med.id);
        }
      }
    }
  } catch (err) {
    console.error("autoMarkMissedDoses failed:", err);
  }
}
