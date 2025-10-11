// app/api/send-missed-email/route.js
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function POST(req) {
  const { toEmail, medicineName, performerName } = await req.json();

  try {
    await sgMail.send({
      to: toEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `Missed Medicine: ${medicineName}`,
      text: `Hi ${performerName}, you missed your medicine ${medicineName}.`,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("SendGrid email failed:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}
