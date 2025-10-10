<<<<<<< HEAD
// src/components/GoogleConnectButton.jsx

import React from 'react';

const GoogleConnectButton = () => {

  const handleConnect = () => {
    const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

    const scope = [
      'https://www.googleapis.com/auth/calendar.events'
    ].join(' ');

    const params = {
      response_type: 'code',
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID, // Corrected
      redirect_uri: import.meta.env.VITE_REDIRECT_URI, // Corrected
      scope: scope,
      access_type: 'offline',
      prompt: 'consent',
    };

    const urlParams = new URLSearchParams(params).toString();
    const fullUrl = `${googleAuthUrl}?${urlParams}`;

    console.log("Generated Google Auth URL:", fullUrl); 

    window.location.href = fullUrl;
  };

  return (
    <button
      onClick={handleConnect}
      className="flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
      </svg>
      Connect Google Calendar
    </button>
  );
};

export default GoogleConnectButton;
=======
// src/components/GoogleCalendar.js
import { useState, useEffect } from 'react';
import { google } from 'googleapis';

const GoogleCalendar = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      // Your OAuth 2.0 client
      const oAuth2Client = new google.auth.OAuth2(
        'https://44099196713-enhau811ee9fo0bj734dbbh66p98cn28.apps.googleusercontent.com/',
        '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',
        'http://localhost:3000/redirect'
      );

      // Generate a URL for user consent
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.readonly'],
      });

      // After the user grants consent, you'll get a code in the redirect URL
      // You'll need to exchange this code for tokens
      // This part is typically handled on a server to keep your client secret safe
      // For this example, we'll assume you have the tokens
      const tokens = {
        access_token: 'USER_ACCESS_TOKEN',
        refresh_token: 'USER_REFRESH_TOKEN',
      };

      oAuth2Client.setCredentials(tokens);

      const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
      const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      });

      setEvents(res.data.items);
    };

    fetchEvents();
  }, []);

  return (
    <div>
      <h2>Upcoming Events</h2>
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            {event.summary} ({new Date(event.start.dateTime).toLocaleString()})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GoogleCalendar;
>>>>>>> 5baf03f81f9cc31ce9aa9c24d497d09986f3bd16
