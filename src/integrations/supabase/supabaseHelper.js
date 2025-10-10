"use client";

import { supabase } from "./client";
import { toast } from "sonner";

// ---------------------------------------------
// Fetch all performers with their medicines & logs
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
          status,
          medicine_logs (
            id,
            status,
            timestamp
          )
        )
      `)
      .eq("user_id", userId)
      .order("id", { ascending: true });

    if (error) throw error;

    return (performers || []).map((p) => ({
      ...p,
      medicines: Array.isArray(p.medicines) ? p.medicines : [],
    }));
  } catch (err) {
    console.error("fetchPerformersWithLogs failed:", err);
    toast.error("Could not load performers");
    return [];
  }
}

// ---------------------------------------------
// Log dose status (Taken / Missed)
// with ±30 min restriction
// ---------------------------------------------
export async function logDoseStatus(medicineId, status) {
  try {
    const now = new Date().toISOString();
    const today = new Date().toISOString().split("T")[0];

    // Check if a log for today already exists
    const { data: existingLogs, error: fetchError } = await supabase
      .from("medicine_logs")
      .select("id, status, timestamp")
      .eq("medicine_id", medicineId)
      .gte("timestamp", `${today}T00:00:00`)
      .lte("timestamp", `${today}T23:59:59`);

    if (fetchError) throw fetchError;

    if (existingLogs && existingLogs.length > 0) {
      const log = existingLogs[0];
      
      // ✅ Only update if the new status is different
      if (log.status !== status) {
        const { error: updateError } = await supabase
          .from("medicine_logs")
          .update({ status, timestamp: now })
          .eq("id", log.id);
        if (updateError) throw updateError;
      }
    } else {
      // No log yet for today → insert new one
      const { error: insertError } = await supabase
        .from("medicine_logs")
        .insert([{ medicine_id: medicineId, status, timestamp: now }]);
      if (insertError) throw insertError;
    }

    // Update the medicine table for UI sync (optional)
    await supabase
      .from("medicines")
      .update({ status })
      .eq("id", medicineId);

    return true;
  } catch (err) {
    console.error("logDoseStatus failed:", err);
    return false;
  }
}

// ---------------------------------------------
// Auto-mark missed doses after 30 minutes
// ---------------------------------------------
export async function autoMarkMissedDoses() {
  try {
    const { data: medicines, error } = await supabase
      .from("medicines")
      .select("id, time_of_day");

    if (error) throw error;

    const now = new Date();

    for (const med of medicines) {
      if (!med.time_of_day) continue;

      const [hours, minutes] = med.time_of_day.split(":").map(Number);
      const medTime = new Date();
      medTime.setHours(hours, minutes, 0, 0);

      const diffMinutes = (now - medTime) / 60000;

      if (diffMinutes > 30) {
        // Check if there is already a log for today
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setUTCHours(23, 59, 59, 999);

        const { data: existingLogs } = await supabase
          .from("medicine_logs")
          .select("id")
          .eq("medicine_id", med.id)
          .gte("timestamp", todayStart.toISOString())
          .lte("timestamp", todayEnd.toISOString());

        // Only insert Missed if no log exists
        if (!existingLogs?.length) {
          const { error: insertError } = await supabase
            .from("medicine_logs")
            .insert([{ medicine_id: med.id, status: "Missed", timestamp: now }]);
          if (insertError) throw insertError;
        }
      }
    }
  } catch (err) {
    console.error("autoMarkMissedDoses failed:", err);
  }
}

