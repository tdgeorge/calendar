# Google Calendar Web Application

A modern web application that integrates with Google Calendar API using the latest Google Identity Services (GIS) for authentication. This application allows users to sign in with their Google account and view their upcoming calendar events.

## Features

- 📅 Interactive calendar display
- 🔐 Secure Google OAuth2 authentication using Google Identity Services
- 📋 View upcoming events from Google Calendar
- 🖥️ Responsive web interface
- 🐛 Built-in debug console for troubleshooting

## Prerequisites

Before running this application, you need:

1. **Google Cloud Project** with Calendar API enabled
2. **Google OAuth2 Credentials** (Client ID)
3. **Google API Key** for Calendar API access
4. **Python 3.x** installed on your system

## Google Cloud Setup

### 1. Create/Configure Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Calendar API"
   - Click "Enable"

### 2. Create OAuth2 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Add authorized origins:
   - `http://localhost:8000`
   - `http://127.0.0.1:8000`
5. Copy the **Client ID** (format: `xxxxx.apps.googleusercontent.com`)

### 3. Create API Key

1. In "Credentials", click "Create Credentials" > "API Key"
2. Copy the **API Key** (format: `AIzaSyBxxxxxxxxxxxxxxxxxxxxx`)
3. (Optional but recommended) Restrict the key to Calendar API only

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd calendar/calendar-web
```

### 2. Set Environment Variables

Set your Google credentials as environment variables:

```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_API_KEY="AIzaSyBxxxxxxxxxxxxxxxxxxxxx"
```

### 3. Start the Server

```bash
python3 server.py 8000
```

The server will start on `http://localhost:8000` and display the current status of your environment variables.

## Usage

1. Open your web browser and navigate to `http://localhost:8000`
2. Click "Login with Google"
3. Complete the OAuth2 authorization flow
4. View your upcoming calendar events
5. Use the debug console to troubleshoot any issues

## Project Structure

```
calendar-web/
├── index.html          # Main HTML page
├── script.js           # JavaScript application logic
├── style.css           # Styling and layout
├── server.py           # Python backend server
└── README.md           # This file
```

## API Endpoints

- `GET /` - Serves the main HTML page
- `GET /api/config` - Returns Google API configuration (Client ID, API Key status)

Example response from `/api/config`:
```json
{
    "clientId": "xxxxx.apps.googleusercontent.com",
    "apiKey": "AIzaSyBxxxxx",
    "status": "ok"
}
```

## Authentication Flow

This application uses the modern **Google Identity Services (GIS)** library, following Google's latest authentication guidelines:

1. **Separate Authentication & API Access**: GIS handles authentication, GAPI handles API calls
2. **No Deprecated Libraries**: Does not use the deprecated `gapi.auth2` library
3. **Secure Token Management**: Access tokens are managed securely and set manually on API clients

## Debug Console

The application includes a built-in debug console that logs:
- Configuration loading status
- API initialization progress
- Authentication flow events
- API call results and errors
- Token management activities

Use this console to troubleshoot any issues with authentication or API calls.

## Troubleshooting

### Common Issues

**"API key not valid" Error**
- Ensure you're using an API Key (starts with `AIza`), not a Client Secret (starts with `GOCSPX`)
- Verify the API Key has Calendar API access enabled

**"idpiframe_initialization_failed" Error**
- This typically means deprecated authentication libraries are being used
- This application uses the modern GIS library to avoid this issue

**"No upcoming events found"**
- The user may not have any events in their calendar
- Check the debug console for API call details

**Environment Variables Not Set**
- The server will show "Not set" for missing credentials
- Verify environment variables are exported correctly
- Restart the server after setting variables

### Debug Steps

1. Check the debug console in the web interface
2. Verify server logs show "Set" for both CLIENT_ID and API_KEY
3. Test the `/api/config` endpoint: `curl http://localhost:8000/api/config`
4. Ensure Google Cloud project has Calendar API enabled
5. Verify OAuth2 redirect URIs are configured correctly

## Security Considerations

- API keys and client IDs are served to the frontend (this is normal for web applications)
- Never expose Client Secrets in frontend code
- Consider implementing proper CORS policies for production
- Use HTTPS in production environments
- Regularly rotate API keys and OAuth credentials

## Development

### Making Changes

1. Modify HTML, CSS, or JavaScript files
2. Refresh the browser (no server restart needed for frontend changes)
3. Restart the server only if you modify `server.py`

### Adding Features

The application is structured to make adding features straightforward:
- Add new API calls in `script.js`
- Extend the UI in `index.html` and `style.css`
- Add new endpoints in `server.py` if needed

## License

[Add your license information here]

## Contributing

[Add contribution guidelines here]