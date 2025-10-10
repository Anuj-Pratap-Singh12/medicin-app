import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { google } from 'https://jspm.dev/googleapis@108'

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { user, medicine } = await req.json();

  // Get the user's saved tokens from the database
  const { data: tokenData } = await supabaseAdmin
    .from('user_google_tokens')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  oAuth2Client.setCredentials(tokenData);

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  const event = {
    summary: `Take: ${medicine.pill_name}`,
    description: `Dosage: ${medicine.dosage}. For ${medicine.performer_name}.`,
    start: {
      dateTime: medicine.start_datetime, // e.g., '2025-10-10T09:00:00'
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: medicine.end_datetime, // e.g., '2025-10-10T09:30:00'
      timeZone: 'Asia/Kolkata',
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    // Return the new event's ID
    return new Response(JSON.stringify({ eventId: response.data.id }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});