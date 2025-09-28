# Calendar Applications

This repository contains calendar-related applications and utilities.

## Projects

### [calendar-web](./calendar-web/)
A modern Google Calendar web application with secure OAuth2 authentication using Google Identity Services.

**Features:**
- 📅 Interactive calendar display
- 🔐 Modern Google OAuth2 authentication  
- 📋 View upcoming events from Google Calendar
- 🖥️ Responsive web interface
- 🐛 Built-in debug console

[View Documentation →](./calendar-web/README.md)

### [simple-tk-slideshow](./simple-tk-slideshow/)
A simple slideshow application built with Tkinter.

## Getting Started

### 🌐 GitHub Pages Deployment (Recommended)

This calendar app can be automatically deployed to GitHub Pages with secure API key management:

1. **Fork or use this repository**
2. **Add your Google API credentials as GitHub Secrets:**
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Add `GOOGLE_CLIENT_ID` (your OAuth 2.0 Client ID)
   - Add `GOOGLE_API_KEY` (your Google Calendar API Key)
3. **Enable GitHub Pages:**
   - Go to **Settings** → **Pages**
   - Source: **GitHub Actions**
4. **Push to main branch** - GitHub Actions will build and deploy automatically!

### 🛠️ Local Development

```bash
# Set environment variables
export GOOGLE_CLIENT_ID='your-client-id'
export GOOGLE_API_KEY='your-api-key'

# Start development server
./dev-server.sh
```

Or create a `.env` file:
```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_API_KEY=your-api-key
```

### Detailed Setup Instructions
- [Calendar Web App Setup](./calendar-web/README.md)
- [Slideshow App Setup](./simple-tk-slideshow/README.md)

## Development

This repository follows conventional commits and includes comprehensive documentation for each project.