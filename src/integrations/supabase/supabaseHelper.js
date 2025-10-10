// src/integrations/supabase/supabaseHelper.js

import { supabase } from "../supabase/serverClient.js";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ---------------------------------------------
// Fetch all performers with their medicines & logs (server-only)
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

    return (performers || []).map(p => ({
      ...p,
      medicines: Array.isArray(p.medicines) ? p.medicines : [],
    }));
  } catch (err) {
    console.error("fetchPerformersWithLogs failed:", err);
    return [];
  }
}

// ---------------------------------------------
// Log dose status (Taken / Missed) with log_date
// ---------------------------------------------
export async function logDoseStatus(medicineId, status) {
  try {
    const now = new Date();
    const timestamp = now.toISOString();
    const log_date = timestamp.split("T")[0];

    const { data: existingLogs, error: fetchError } = await supabase
      .from("medicine_logs")
      .select("id, status, timestamp")
      .eq("medicine_id", medicineId)
      .eq("log_date", log_date);

    if (fetchError) throw fetchError;

    if (existingLogs?.length > 0) {
      const log = existingLogs[0];
      if (log.status !== status) {
        const { error: updateError } = await supabase
          .from("medicine_logs")
          .update({ status, timestamp })
          .eq("id", log.id);
        if (updateError) throw updateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from("medicine_logs")
        .insert([{ medicine_id: medicineId, status, timestamp, log_date }]);
      if (insertError) throw insertError;
    }

    const { error: updateMedError } = await supabase
      .from("medicines")
      .update({ status })
      .eq("id", medicineId);

    if (updateMedError) console.warn("Failed to update medicine status:", updateMedError);

    return true;
  } catch (err) {
    console.error("logDoseStatus failed:", err);
    return false;
  }
}

// ---------------------------------------------
// Auto-mark missed doses after 30 minutes + send email
// ---------------------------------------------
export async function autoMarkMissedDoses() {
  try {
    const { data: medicines, error } = await supabase
      .from("medicines")
      .select(`
        id,
    pill_name,
    dosage,
    time_of_day,
    frequency,
    status,
    performers (
      id,
      name,
      user_id
        )
      `);

    if (error) throw error;

    const now = new Date();
    const timestamp = now.toISOString();
    const log_date = timestamp.split("T")[0];

    for (const med of medicines || []) {
      if (!med.time_of_day || !med.performers?.user_id) continue;


      const [hours, minutes] = med.time_of_day.split(":").map(Number);
      const medTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        0
      );
      medTime.setHours(hours, minutes, 0, 0);

      const diffMinutes = (now - medTime) / 60000;

      if (diffMinutes > 30 || true) {
        const logDate = medTime.toISOString().split("T")[0];
        // Check if log exists for today
        const { data: existingLogs, error: logsError } = await supabase
          .from("medicine_logs")
          .select("id")
          .eq("medicine_id", med.id)
          .eq("log_date", log_date);

        if (logsError) {
          console.error(`Error fetching logs for ${med.pill_name}:`, logsError);
          continue;
        }

        if (!existingLogs?.length) {
          // Insert missed log
          const { error: insertError } = await supabase
            .from("medicine_logs")
            .insert([
              {
                medicine_id: med.id,
                status: "Missed",
                timestamp: now.toISOString(),
                log_Date: logDate,
              },
            ]);


          if (insertError) {
            console.error(`Error inserting missed log for ${med.pill_name}:`, insertError);
            continue;
          }

          // Update medicine status
          const { error: updateError } = await supabase
            .from("medicines")
            .update({ status: "Missed" })
            .eq("id", med.id);

          if (updateError) console.warn(`Failed to update status for ${med.pill_name}:`, updateError);

          console.log(`⚠️ Missed dose logged for ${med.pill_name}`);
          

          // Send email notification
          const { data: userData, error: userError } = await supabase
  .from("user_emails")
  .select("email")
  .eq("performer_id", med.performers.id)
  .single();


          if (userError || !userData?.email) {
            console.warn(`No email found for ${med.pill_name}`);
            continue;
          }
          console.log("ℹ️ Attempting to send email to:", userData?.email);

          // Send email
          


          try {
            await sendMissedDoseEmail(
    userData.email,
    med.performers?.name,   // ✅ use performers
    med.pill_name,
    logDate
  );
            console.log(`✅ Email sent for: ${med.pill_name}`);
          } catch (emailErr) {
            console.error(`❌ Error sending email for ${med.pill_name}:`, emailErr);
          }
        }
      }
    }
  } catch (err) {
    console.error("autoMarkMissedDoses failed:", err.message || err);
  }
}
