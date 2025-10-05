"use client";

import { supabase } from "./client";
import { toast } from "sonner";

// ---------------------------------------------
// Fetch all performers with their medicines & logs
// ---------------------------------------------
export async function fetchPerformersWithLogs(userId) {
  try {
    const { data: performers, error: performersError } = await supabase
      .from("performers")
      .select(
        `
        id, name,
        medicines (
          id, pill_name, dosage, time_of_day, frequency, status,
          medicine_logs ( id, status, timestamp )
        )
      `
      )
      .eq("user_id", userId)
      .order("id", { ascending: true });

    if (performersError) throw performersError;
    return performers || [];
  } catch (err) {
    console.error("fetchPerformersWithLogs failed:", err);
    toast.error("Could not load performers");
    return [];
  }
}

// ---------------------------------------------
// Log dose status (Taken / Missed)
// ---------------------------------------------
export async function logDoseStatus(medicineId, status) {
  try {
    // Check if already logged today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: existing } = await supabase
      .from("medicine_logs")
      .select("id")
      .eq("medicine_id", medicineId)
      .gte("timestamp", todayStart.toISOString())
      .lte("timestamp", todayEnd.toISOString());

    if (existing && existing.length > 0) {
      toast.info("Already logged for today");
      return;
    }

    const { error } = await supabase
      .from("medicine_logs")
      .insert([{ medicine_id: medicineId, status }]);

    if (error) throw error;
    toast.success(`Marked as ${status}`);
  } catch (err) {
    console.error("logDoseStatus failed:", err);
    toast.error("Failed to log status");
  }
}

// ---------------------------------------------
// Auto-mark missed doses (optional background use)
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

      const [hours, minutes, seconds] = med.time_of_day.split(":").map(Number);
      const medTime = new Date();
      medTime.setHours(hours, minutes, seconds || 0, 0);

      if (now > medTime) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const { data: existing } = await supabase
          .from("medicine_logs")
          .select("id")
          .eq("medicine_id", med.id)
          .gte("timestamp", todayStart.toISOString())
          .lte("timestamp", todayEnd.toISOString());

        if (!existing?.length) {
          await supabase
            .from("medicine_logs")
            .insert([{ medicine_id: med.id, status: "Missed" }]);
        }
      }
    }
  } catch (err) {
    console.error("autoMarkMissedDoses failed:", err);
  }
}
