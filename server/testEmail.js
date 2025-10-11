// server/testEmail.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

// ----------------------------
// Supabase setup
// ----------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ----------------------------
// SendGrid setup
// ----------------------------
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ----------------------------
// Test function
// ----------------------------
(async () => {
  try {
    console.log("🚀 Fetching a user from Supabase...");

    const { data: users, error } = await supabase
      .from('user_emails')   // Use the view you created
      .select('id, email')
      .limit(1);

    if (error) throw error;

    if (!users || users.length === 0) {
      console.warn("No users found in Supabase!");
      return;
    }

    const user = users[0];
    console.log("✅ User fetched:", user);

    // ----------------------------
    // Send test email
    // ----------------------------
    const msg = {
      to: user.email,  // send to first user
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "Test Email from Medicine Cron",
      text: `Hi! This is a test email to verify email sending for user ID: ${user.id}`,
    };

    await sgMail.send(msg);
    console.log(`✅ Test email sent to ${user.email}`);
  } catch (err) {
    console.error("❌ Test failed:", err);
  }
})();
