# Architecture Documentation

## Overview

This Google Calendar Web Application is built using a modern, secure architecture that follows Google's latest authentication and API guidelines. The application separates concerns between authentication, API access, and user interface components.

## High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Web Browser   │    │  Python Server   │    │   Google APIs       │
│                 │    │                  │    │                     │
│  ┌─────────────┐│    │  ┌─────────────┐ │    │  ┌─────────────────┐│
│  │   Frontend  ││◄──►│  │   Backend   │ │◄──►│  │  Calendar API   ││
│  │   (SPA)     ││    │  │   Server    │ │    │  │                 ││
│  └─────────────┘│    │  └─────────────┘ │    │  └─────────────────┘│
│                 │    │                  │    │                     │
│  ┌─────────────┐│    │  ┌─────────────┐ │    │  ┌─────────────────┐│
│  │   GIS Auth  ││◄───┼──┤Config API   │ │    │  │ Identity Services││
│  │   Client    ││    │  │ (/api/config)│ │    │  │    (OAuth2)     ││
│  └─────────────┘│    │  └─────────────┘ │    │  └─────────────────┘│
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

## Component Architecture

### 1. Frontend Architecture (Client-Side)

The frontend is a Single Page Application (SPA) built with vanilla JavaScript, following a modular component approach:

#### Core Components:

**Authentication Module**
- **Google Identity Services (GIS)**: Handles OAuth2 authentication flow
- **Google API Client (GAPI)**: Manages Calendar API calls
- **Token Management**: Stores and manages access tokens securely

**UI Components**
- **Login Section**: Authentication interface
- **Calendar Display**: Interactive calendar view
- **Events Panel**: Shows upcoming events
- **Debug Console**: Development and troubleshooting interface

**Configuration Module**
- **Config Loader**: Fetches API credentials from backend
- **Environment Handler**: Manages API keys and client IDs

#### Frontend Flow:

```
App Init → Load Config → Initialize GAPI → Initialize GIS → Enable Login
    ↓
User Login → GIS Auth → Receive Token → Set GAPI Token → Load Calendar Data
    ↓
Display Events → User Interaction → API Calls → Update UI
```

### 2. Backend Architecture (Server-Side)

The backend is a lightweight Python HTTP server that serves static files and provides configuration endpoints:

#### Components:

**HTTP Server**
- **Static File Server**: Serves HTML, CSS, JS files
- **Custom Request Handler**: Extends SimpleHTTPRequestHandler
- **Configuration API**: Provides `/api/config` endpoint

**Environment Management**
- **Credential Provider**: Serves Google API credentials to frontend
- **Environment Variables**: Secure storage of sensitive configuration

#### Backend Endpoints:

```
GET /                  → Serves index.html
GET /api/config        → Returns JSON configuration
GET /{static-files}    → Serves CSS, JS, and other assets
```

### 3. Google Services Integration

#### Authentication Architecture (GIS):

```
┌─────────────────────────────────────────────────────────────┐
│                     Authentication Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User clicks "Login"                                     │
│  2. GIS initiates OAuth2 flow                              │
│  3. User grants permissions                                 │
│  4. GIS returns access token                               │
│  5. Token set on GAPI client                              │
│  6. Calendar API calls authenticated                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### API Access Architecture (GAPI):

```
┌─────────────────────────────────────────────────────────────┐
│                      API Call Flow                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend → GAPI Client → Google Calendar API              │
│      ↑                                                     │
│  Access Token (from GIS)                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Security Architecture

### Authentication Security

**OAuth2 Flow**
- Uses Authorization Code flow with PKCE
- Client-side authentication with secure token handling
- No client secrets exposed to frontend

**Token Management**
- Access tokens stored in memory only
- Automatic token refresh handled by GIS
- Secure token revocation on logout

### API Security

**Credential Management**
- API keys served securely from backend
- Environment variables for sensitive data
- No hardcoded credentials in source code

**CORS and Access Control**
- Appropriate CORS headers for cross-origin requests
- Restricted API key scope (Calendar API only)
- Localhost-only development setup

## Data Flow Architecture

### 1. Initialization Flow

```
Browser Load
    ↓
Load HTML/CSS/JS
    ↓
Initialize App
    ↓
Fetch Config (/api/config)
    ↓
Initialize GAPI (API-only)
    ↓
Initialize GIS (Auth-only)
    ↓
Enable Login Button
```

### 2. Authentication Flow

```
User Clicks Login
    ↓
GIS Request Token
    ↓
OAuth2 Authorization
    ↓
Receive Access Token
    ↓
Set Token on GAPI
    ↓
Show Calendar Interface
```

### 3. API Call Flow

```
Request Calendar Data
    ↓
Verify Token Present
    ↓
Make GAPI Call
    ↓
Process Response
    ↓
Update UI
```

## Error Handling Architecture

### Frontend Error Handling

**Authentication Errors**
- Invalid credentials → User feedback
- Token expiration → Automatic re-authentication
- Network errors → Retry mechanisms

**API Errors**
- Rate limiting → Exponential backoff
- Permission errors → User guidance
- Network failures → Graceful degradation

**UI Error Handling**
- Input validation
- Loading states
- Error message display

### Backend Error Handling

**Server Errors**
- Missing environment variables → Startup warnings
- File serving errors → HTTP error responses
- Configuration errors → Detailed logging

## Performance Architecture

### Frontend Performance

**Loading Strategy**
- Async script loading
- Progressive enhancement
- Minimal initial payload

**Caching Strategy**
- Static asset caching
- Token caching in memory
- Configuration caching

### Backend Performance

**Server Efficiency**
- Lightweight HTTP server
- Static file serving
- Minimal processing overhead

## Scalability Considerations

### Current Limitations

- Single server instance
- In-memory token storage
- Development-focused setup

### Production Scaling

**Frontend Scaling**
- CDN deployment for static assets
- Service worker for offline capability
- Progressive Web App features

**Backend Scaling**
- Multiple server instances
- Load balancing
- Database for session management
- Redis for token caching

## Security Considerations

### Current Security Features

- Environment variable credential storage
- OAuth2 with modern GIS library
- CORS headers for API endpoints
- No client secrets in frontend

### Production Security Requirements

- HTTPS enforcement
- Content Security Policy (CSP)
- Rate limiting
- Input sanitization
- Security headers

## Monitoring and Debugging

### Debug Architecture

**Frontend Debugging**
- Debug console with structured logging
- Error tracking and reporting
- Performance monitoring hooks

**Backend Debugging**
- Server access logs
- Environment variable validation
- Configuration endpoint for status checks

### Production Monitoring

**Recommended Additions**
- Application Performance Monitoring (APM)
- Error tracking service
- API usage analytics
- User authentication metrics

## Technology Stack

### Frontend
- **HTML5**: Modern semantic markup
- **CSS3**: Responsive design and animations  
- **Vanilla JavaScript**: No framework dependencies
- **Google Identity Services**: Modern OAuth2 authentication
- **Google API Client**: Calendar API integration

### Backend  
- **Python 3**: Server runtime
- **http.server**: Built-in HTTP server
- **socketserver**: TCP server implementation
- **JSON**: Configuration API responses

### External Services
- **Google Calendar API**: Calendar data access
- **Google Identity Services**: OAuth2 authentication
- **Google Cloud Platform**: API management and credentials

## Future Architecture Enhancements

### Near-term Improvements
- Add proper session management
- Implement refresh token handling
- Add comprehensive error boundaries
- Include automated testing framework

### Long-term Enhancements
- Migrate to modern frontend framework (React/Vue)
- Implement proper backend framework (FastAPI/Flask)
- Add database integration
- Implement real-time calendar updates
- Add calendar editing capabilities
- Mobile-responsive PWA features