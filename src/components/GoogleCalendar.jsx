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