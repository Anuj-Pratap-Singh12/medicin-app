// server/cron.js

import "dotenv/config";
import { supabase } from "../src/integrations/supabase/serverClient.js";
import sgMail from "@sendgrid/mail";
import { createClient } from "@supabase/supabase-js";

// Admin client to fetch emails from auth.users
const adminClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);


console.log("🚀 Starting missed dose checker...");
console.log("ENV VARS LOADED:", {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL,
});
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_SERVICE_ROLE_KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------
// Helper: send email notification
// ---------------------------------------------

console.log("SendGrid API key loaded:", process.env.SENDGRID_API_KEY?.slice(0,5) + "...");
console.log("From email:", process.env.SENDGRID_FROM_EMAIL);

async function sendMissedDoseEmail(email, performerName, pillName, date) {
  try {
    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `⚠️ Missed Medicine Notification: ${pillName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #d9534f;">⚠️ Missed Medicine Alert</h2>
          <p>Dear <strong style="color: #0056b3;">${performerName || "Performer"}</strong>,</p>
          <p>We hope you are doing well. This is a reminder that you <strong style="color: #d9534f;">missed your scheduled medicine</strong>:</p>
          <ul>
            <li>💊 <strong style="color: #28a745;">Medicine:</strong> <strong>${pillName}</strong></li>
            
          </ul>
          <p>To maintain your health schedule, please take the medicine as soon as possible or consult your healthcare provider if needed.</p>
          <p>Thank you for your attention. Stay healthy! 🌿</p>
          <p style="font-size: 0.9em; color: #777;">This is an automated notification from <strong>Medicine Tracker</strong>.</p>
        </div>
      `,
      text: `Dear ${performerName || "Performer"},\n\nYou missed your scheduled medicine:\n- Medicine: ${pillName}\n- Date: ${date}\nPlease take your medicine as soon as possible or consult your healthcare provider.\n\nThis is an automated notification from Medicine Tracker.`,
    });
    console.log(`✅ Email sent to ${email} for missed medicine: ${pillName}`);
  } catch (err) {
    console.error(`❌ Error sending email to ${email} for ${pillName}:`, err);
  }
}

// ---------------------------------------------
// Auto-mark missed doses and store logs by day
// ---------------------------------------------
async function autoMarkMissedDoses() {
  try {
    const { data: medicines, error } = await supabase
      .from("medicines")
      .select(`
        id,
        pill_name,
        time_of_day,
        performers (
          id,
          name,
          user_id
        )
      `);

    if (error) throw error;

    const now = new Date();
    const todayDate = now.toISOString().split("T")[0]; // yyyy-mm-dd

    for (const med of medicines || []) {
      console.log("🔹 Checking medicine:", med.pill_name, "performer:", med.performers);

      if (!med.time_of_day || !med.performers?.user_id) continue;

      const [hours, minutes] = med.time_of_day.split(":").map(Number);
      const medTime = new Date();
      medTime.setHours(hours, minutes, 0, 0);

      const diffMinutes = (now - medTime) / 60000;

      console.log("Scheduled time (local):", medTime.toLocaleString());
      console.log("Current time (local):  ", now.toLocaleString());
      console.log("Minutes past scheduled:", diffMinutes);

      // Skip if not yet due
      if (diffMinutes < 0) {
        console.log(`⏳ Medicine ${med.pill_name} not due yet (${Math.abs(diffMinutes)} min remaining)`);
        continue;
      }

      // Only process if scheduled time passed > 30 min
      if (diffMinutes > 30) {
        const logDate = todayDate;

        // Check if log already exists for today
        const { data: existingLogs, error: logsError } = await supabase
          .from("medicine_logs")
          .select("*")
          .eq("medicine_id", med.id)
          .eq("log_date", logDate);

        if (logsError) {
          console.error(`Error fetching logs for ${med.pill_name}:`, logsError);
          continue;
        }

        // If no log exists for today, send email first, then insert log
        if (!existingLogs?.length) {
          // Fetch email from auth.users
          const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
            med.performers.user_id
          );

          if (userError || !userData?.user?.email) {
            console.warn(`No email found for performer of ${med.pill_name}`, userError?.message);
          } else {
            const email = userData.user.email;

            console.log("ℹ️ Sending email to:", email, "for medicine:", med.pill_name);

            try {
              await sendMissedDoseEmail(
                email,
                med.performers?.name,
                med.pill_name,
                logDate
              );
              console.log(`✅ Email successfully sent to ${email} for medicine: ${med.pill_name}`);
            } catch (e) {
              console.error(`❌ Failed to send email for ${med.pill_name}:`, e);
            }
          }

          // Insert today's missed log
          const { error: insertError } = await supabase
            .from("medicine_logs")
            .insert([
              {
                medicine_id: med.id,
                status: "Missed",
                timestamp: now.toISOString(),
                log_date: logDate,
              },
            ]);

          if (insertError) {
            console.error(`Error inserting missed log for ${med.pill_name}:`, insertError);
            continue;
          }

          // Update medicine status for dashboard
          const { error: updateError } = await supabase
            .from("medicines")
            .update({ status: "Missed" })
            .eq("id", med.id);

          if (updateError)
            console.warn(`Failed to update status for ${med.pill_name}:`, updateError);

          console.log(`⚠️ Missed dose logged for ${med.pill_name}`);
        } else {
          console.log(`✅ Log already exists for ${med.pill_name} on ${logDate}`);
        }
      }
    }
  } catch (err) {
    console.error("autoMarkMissedDoses failed:", err);
  }
}

// ---------------------------------------------
// Initial run
// ---------------------------------------------
(async () => {
  await autoMarkMissedDoses();
  console.log("✅ Initial missed dose check completed");
})();

// ---------------------------------------------
// Run every 5 minutes
// ---------------------------------------------
setInterval(async () => {
  console.log("⏱ medicine-cron heartbeat at", new Date());
  console.log("⏱ Scheduled check for missed doses...");
  await autoMarkMissedDoses();
  console.log("✅ Scheduled check completed");
}, 5 * 60 * 1000);
