# Google Calendar Web Application

A modern web application that integrates with Google Calendar API using the latest Google Identity Services (GIS) for authentication. This application allows users to sign in with their Google account and view their upcoming calendar events.

## Features

- 📅 Interactive calendar display
- 🔐 Secure Google OAuth2 authentication using Google Identity Services
- 📋 View upcoming events from Google Calendar
- ✏️ Edit event details (title, description, time, duration)
- 💾 Save changes back to Google Calendar
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

### 4. OAuth Consent Screen

Ensure your OAuth consent screen is configured:
1. Go to "APIs & Services" > "OAuth consent screen"
2. Add the Calendar scope: `https://www.googleapis.com/auth/calendar`
3. Add test users if your app is in testing mode

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd calendar/calendar-web
```

### 2. Set Up Credentials

**Option A: Using the Startup Script (Recommended)**

1. Copy the example script:
   ```bash
   cp start-server-example.sh start-server.sh
   ```

2. Edit `start-server.sh` and replace the placeholder credentials:
   ```bash
   export GOOGLE_CLIENT_ID="your-actual-client-id.apps.googleusercontent.com"
   export GOOGLE_API_KEY="AIzaSyByour-actual-api-key"
   ```

3. Make it executable:
   ```bash
   chmod +x start-server.sh
   ```

**Option B: Using Environment Variables**

Set your Google credentials as environment variables:
```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_API_KEY="AIzaSyBxxxxxxxxxxxxxxxxxxxxx"
```

### 3. Start the Server

**Using the startup script:**
```bash
./start-server.sh
# Or specify a custom port:
./start-server.sh 3000
```

**Using Python directly:**
```bash
python3 server.py 8000
```

The server will start and display the current status of your credentials and the server URL.

## Usage

1. Open your web browser and navigate to `http://localhost:8000`
2. Click "Login with Google"
3. Complete the OAuth2 authorization flow
4. View your upcoming calendar events
5. **Click on any event** to edit its details
6. Update title, description, date, time, or duration
7. Click "Save Changes" to update the event in Google Calendar
8. Use the debug console to troubleshoot any issues

### Editing Events

- **Click on any event** in the upcoming events list to open the edit form
- **Edit fields**: Title, description, start/end dates and times
- **All-day events**: Check the "All Day Event" checkbox to hide time fields
- **Save changes**: Click "Save Changes" to update the event in Google Calendar
- **Cancel editing**: Click "Cancel" to close the form without saving

## Project Structure

```
calendar-web/
├── index.html              # Main HTML page
├── script.js               # JavaScript application logic
├── style.css               # Styling and layout
├── server.py               # Python backend server
├── start-server-example.sh # Example startup script template
├── start-server.sh         # Your actual startup script (git-ignored)
├── ARCHITECTURE.md         # Technical architecture documentation
└── README.md               # This file
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

**Event Editing Issues**
- Ensure you have granted calendar write permissions during OAuth
- If you previously granted only read permissions, sign out and sign back in
- Check the debug console for detailed error messages
- Verify that the event exists and you have edit permissions

**Permission Errors**
- The app requires `https://www.googleapis.com/auth/calendar` scope (not just readonly)
- Sign out and sign back in to grant new permissions
- Check OAuth consent screen configuration

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
- **Important**: The `start-server.sh` file is ignored by git to prevent accidentally committing credentials
- Use `start-server-example.sh` as a template and create your own `start-server.sh`
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