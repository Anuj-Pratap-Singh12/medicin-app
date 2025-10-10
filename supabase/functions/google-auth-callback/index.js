import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { OAuth2Client } from 'https://esm.sh/google-auth-library@8'

// These environment variables are read from your Supabase project's secrets
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
const REDIRECT_URI = Deno.env.get('REDIRECT_URI')

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')

  if (!code) {
    console.error('No authorization code received from Google.')
    return Response.redirect('http://localhost:3000/?error=google_auth_denied')
  }

  try {
    // Exchange the temporary code for permanent tokens
    const oAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI)
    const { tokens } = await oAuth2Client.getToken(code)

    // This is the message you want to see in the logs
    console.log('Successfully received tokens from Google:', tokens)

    // For now, redirect to the dashboard on success
    return Response.redirect('http://localhost:3000/dashboard?status=calendar_connected')

  } catch (error) {
    console.error('Error exchanging code for tokens:', error.message)
    return Response.redirect('http://localhost:3000/?error=token_exchange_failed')
  }
})