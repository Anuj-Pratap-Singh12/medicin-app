import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { google } from 'npm:googleapis@108';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

serve(async (req) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed, use POST' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse request body safely
  let body: any = {};
  try {
    body = await req.json();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { user, eventId, status, pill_name } = body;

  // Validate required fields
  if (!user?.id || !eventId || !status || !pill_name) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields in request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Get user's tokens from Supabase
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) throw tokenError || new Error('No tokens found');

    // Setup Google OAuth2 client
    const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    oAuth2Client.setCredentials(tokenData);

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    // Prepare updated event data
    let updatedEvent: any = {};
    if (status === 'taken') {
      updatedEvent = { summary: `✅ Taken: ${pill_name}`, colorId: '2' };
    } else if (status === 'missed') {
      updatedEvent = { summary: `❌ Missed: ${pill_name}`, colorId: '11' };
    }

    // Update the calendar event
    await calendar.events.patch({
      calendarId: 'primary',
      eventId: eventId,
      resource: updatedEvent,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error updating calendar event:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
