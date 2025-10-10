// src/integrations/supabase/frontendHelper.js
import { supabase } from "./client";
import { toast } from "sonner";
 // optional: only if you send emails

// ---------------------------------------------
// Fetch performers with medicines & today's status
// ---------------------------------------------
export async function fetchPerformersWithLogs(userId) {
  try {
    // Fetch performers + medicines
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

    if (!flatMedicineIds.length) return performers.map((p) => ({ ...p, medicines: p.medicines || [] }));

    // Fetch today's logs using log_date
    const todayDate = new Date().toISOString().split("T")[0];
    const { data: todaysLogs, error: logsError } = await supabase
      .from("medicine_logs")
      .select("id, medicine_id, status, log_date")
      .in("medicine_id", flatMedicineIds)
      .eq("log_date", todayDate);

    if (logsError) console.warn("Could not fetch today's logs:", logsError);

    const logsMap = new Map();
    (todaysLogs || []).forEach((log) => {
      if (!logsMap.has(log.medicine_id)) logsMap.set(log.medicine_id, log);
    });

    return (performers || []).map((p) => ({
      ...p,
      medicines: (p.medicines || []).map((m) => {
        const todayLog = logsMap.get(m.id);
        const status = todayLog ? todayLog.status : "Upcoming";
        return { ...m, status };
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
  const todayDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  try {
    // 1️⃣ Check if today's log already exists
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
        // 2️⃣ Update existing log if status differs
        const { error: updateError } = await supabase
          .from("medicine_logs")
          .update({ status, timestamp: now })
          .eq("id", log.id);

        if (updateError) throw updateError;
      }
    } else {
      // 3️⃣ Insert new log if none exists
      const { error: insertError } = await supabase
        .from("medicine_logs")
        .insert([{ medicine_id: medicineId, status, log_date: todayDate, timestamp: now }]);

      if (insertError) throw insertError;
    }

    // 4️⃣ Optional: Update medicine table status for UI sync
    const { error: updateMedicineError } = await supabase
      .from("medicines")
      .update({ status })
      .eq("id", medicineId);

    if (updateMedicineError) {
      console.warn("Medicine table update failed (non-critical):", updateMedicineError);
    }

    return true;
  } catch (err) {
    if (err instanceof Error) {
      console.error("logDoseStatus failed (Error):", err.message, err);
    } else {
      console.error("logDoseStatus failed (Supabase object):", JSON.stringify(err, null, 2));
    }
    toast.error("Failed to log dose: Check RLS policies or session");
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
          if (insertError) {
            console.error(`Error inserting log for ${med.pill_name}:`, insertError);
            continue;
          }

          await supabase.from("medicines").update({ status: "Missed" }).eq("id", med.id);

          // Optional: send email if configured
          if (process.env.SENDGRID_API_KEY && med.performer?.user_id) {
            try {
              const { data: userData, error: userError } = await supabase
                .from("users")
                .select("email")
                .eq("id", med.performer.user_id)
                .single();

              if (!userError && userData?.email) {
                await sgMail.send({
                  to: userData.email,
                  from: process.env.SENDGRID_FROM_EMAIL,
                  subject: `Missed Medicine: ${med.pill_name}`,
                  text: `Hi ${med.performer?.name || "Performer"}, you missed your medicine ${med.pill_name}.`,
                });
                console.log(`✅ Email sent for: ${med.pill_name}`);
              }
            } catch (emailErr) {
              console.error(`❌ Error sending email for ${med.pill_name}:`, emailErr);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("autoMarkMissedDoses failed:", err.message || err);
  }
}
