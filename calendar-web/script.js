// Simple JS Calendar + Google Login (frontend only)
// Note: For Google Calendar API, you need to set up OAuth 2.0 credentials and use the gapi client.
// This demo uses Google Identity Services for login, but calendar access requires extra setup.

// Will be loaded from server
let CLIENT_ID = '';
let API_KEY = '';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

const loginBtn = document.getElementById('login-btn');
const loginSection = document.getElementById('login-section');
const calendarSection = document.getElementById('calendar-section');
const monthYear = document.getElementById('month-year');
const calendarTable = document.getElementById('calendar-table');
const eventsDiv = document.getElementById('events');
const debugOutput = document.getElementById('debug-output');
const clearDebugBtn = document.getElementById('clear-debug');

// Debug logging function
function debugLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
    const logMessage = `[${timestamp}] ${prefix} ${message}\n`;
    debugOutput.textContent += logMessage;
    debugOutput.scrollTop = debugOutput.scrollHeight;
    
    // Also log to browser console
    if (type === 'error') {
        console.error(message);
    } else if (type === 'warn') {
        console.warn(message);
    } else {
        console.log(message);
    }
}

// Clear debug console
clearDebugBtn.onclick = () => {
    debugOutput.textContent = '';
};

// Disable login button initially
loginBtn.disabled = true;
loginBtn.textContent = 'Loading...';

debugLog('Calendar app initialized');

// Load configuration from server
async function loadConfig() {
    try {
        debugLog('Loading config from server...');
        const response = await fetch('/api/config');
        const config = await response.json();
        
        CLIENT_ID = config.clientId;
        API_KEY = config.apiKey;
        
        debugLog(`Config loaded - Client ID: ${CLIENT_ID ? 'Set' : 'Not set'}, API Key: ${API_KEY ? 'Set' : 'Not set'}`);
        
        if (!CLIENT_ID || !API_KEY) {
            debugLog('Missing CLIENT_ID or API_KEY from server config', 'error');
            loginBtn.textContent = 'Config Error';
            return false;
        }
        
        return true;
    } catch (error) {
        debugLog(`Failed to load config: ${error.message}`, 'error');
        loginBtn.textContent = 'Config Load Error';
        return false;
    }
}

// Initialize after loading config
loadConfig().then(success => {
    if (success) {
        debugLog('Config loaded successfully, waiting for Google APIs...');
        
        // Check if GAPI is already loaded
        if (typeof gapi !== 'undefined') {
            debugLog('GAPI already loaded');
            gapiLoaded();
        }
        
        // Check if GIS is already loaded
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
            debugLog('GIS already loaded');
            gisLoaded();
        }
    }
});

function gapiLoaded() {
    debugLog('Google APIs script loaded');
    gapi.load('client', initializeGapi);
}

function renderCalendar(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth();
    monthYear.textContent = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let html = '<tr>';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let d of days) html += `<th>${d}</th>`;
    html += '</tr><tr>';
    for (let i = 0; i < firstDay; i++) html += '<td></td>';
    for (let day = 1; day <= daysInMonth; day++) {
        const today = new Date();
        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        html += `<td class="${isToday ? 'today' : ''}">${day}</td>`;
        if ((firstDay + day) % 7 === 0) html += '</tr><tr>';
    }
    html += '</tr>';
    calendarTable.innerHTML = html;
}

function showCalendar() {
    loginSection.style.display = 'none';
    calendarSection.style.display = 'block';
    renderCalendar();
}

// Google API integration
let tokenClient;
let gisInited = false;
let gapiInited = false;
let accessToken = null;

async function initializeGapi() {
    debugLog('Initializing Google API client (GAPI only, no auth)...');
    debugLog(`API Key: ${API_KEY ? 'Set (' + API_KEY.substring(0, 10) + '...)' : 'Not set'}`);
    
    if (!API_KEY) {
        debugLog('API Key is empty or undefined', 'error');
        loginBtn.textContent = 'Missing API Key';
        return;
    }
    
    // Check if API key looks valid (should start with AIza)
    if (!API_KEY.startsWith('AIza')) {
        debugLog(`Warning: API Key doesn't look like a valid Google API Key. Got: ${API_KEY.substring(0, 20)}...`, 'warn');
        debugLog('Google API Keys typically start with "AIza". You may be using a Client Secret instead.', 'warn');
    }
    
    try {
        // Initialize ONLY with apiKey and discoveryDocs - NO CLIENT ID OR AUTH
        const initConfig = {
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
        };
        
        debugLog('GAPI init config:', JSON.stringify(initConfig));
        
        await gapi.client.init(initConfig);
        
        debugLog('Google API client (GAPI) initialized successfully - no auth included');
        gapiInited = true;
        maybeEnableButtons();
    } catch (error) {
        debugLog(`Error initializing Google API: ${error.message || error}`, 'error');
        debugLog(`Error details: ${JSON.stringify(error)}`, 'error');
        loginBtn.textContent = 'API Init Error';
    }
}

function gisLoaded() {
    debugLog('Google Identity Services loaded');
    
    if (!CLIENT_ID) {
        debugLog('Client ID not available, cannot initialize GIS', 'error');
        return;
    }
    
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response) => {
                debugLog('GIS callback triggered');
                if (response.error !== undefined) {
                    debugLog(`Token error: ${response.error}`, 'error');
                    loginBtn.textContent = 'Auth Error';
                    return;
                }
                
                // Store the access token
                accessToken = response.access_token;
                debugLog('Access token received successfully');
                
                // Set the token for gapi.client
                gapi.client.setToken({
                    access_token: accessToken
                });
                
                debugLog('Token set on gapi.client, showing calendar');
                showCalendar();
                listUpcomingEvents();
            },
        });
        gisInited = true;
        debugLog('Google Identity Services initialized successfully');
        maybeEnableButtons();
    } catch (error) {
        debugLog(`Error initializing GIS: ${error.message || error}`, 'error');
        loginBtn.textContent = 'GIS Init Error';
    }
}

function maybeEnableButtons() {
    debugLog(`Checking if ready to enable buttons - GAPI: ${gapiInited}, GIS: ${gisInited}`);
    
    if (gapiInited && gisInited) {
        debugLog('Both GAPI and GIS initialized successfully');
        debugLog('Enabling login button');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login with Google';
        loginBtn.onclick = handleAuthClick;
    } else {
        debugLog(`Still waiting - GAPI: ${gapiInited ? 'Ready' : 'Loading'}, GIS: ${gisInited ? 'Ready' : 'Loading'}`);
    }
}

function handleAuthClick() {
    debugLog('Login button clicked');
    
    // Check if user is already authenticated
    if (accessToken && gapi.client.getToken()) {
        debugLog('User already authenticated, showing calendar');
        showCalendar();
        listUpcomingEvents();
        return;
    }
    
    debugLog('Requesting new access token');
    tokenClient.requestAccessToken({
        prompt: 'consent'
    });
}

async function listUpcomingEvents() {
    debugLog('Fetching upcoming events...');
    
    // Check if we have an access token
    if (!accessToken) {
        debugLog('No access token available', 'error');
        eventsDiv.innerHTML = 'Error: No access token. Please sign in first.';
        return;
    }
    
    // Ensure the token is set on gapi.client
    gapi.client.setToken({
        access_token: accessToken
    });
    
    let response;
    try {
        const request = {
            'calendarId': 'primary',
            'timeMin': (new Date()).toISOString(),
            'showDeleted': false,
            'singleEvents': true,
            'maxResults': 10,
            'orderBy': 'startTime'
        };
        
        debugLog('Making Calendar API request...');
        response = await gapi.client.calendar.events.list(request);
        debugLog('Events fetched successfully');
    } catch (err) {
        debugLog(`Error fetching events: ${err.message || err}`, 'error');
        
        if (err.status === 401 || err.status === 403) {
            eventsDiv.innerHTML = 'Authentication expired. Please sign in again.';
            handleSignoutClick();
        } else {
            eventsDiv.innerHTML = `Error loading events: ${err.message || err}`;
            debugLog(`Full error object: ${JSON.stringify(err)}`, 'error');
        }
        return;
    }
    
    const events = response.result.items;
    if (events && events.length > 0) {
        let html = '<b>Upcoming Events:</b><ul>';
        events.forEach(event => {
            const when = event.start.dateTime || event.start.date;
            html += `<li>${when}: ${event.summary}</li>`;
        });
        html += '</ul>';
        eventsDiv.innerHTML = html;
        debugLog(`Displayed ${events.length} events`);
    } else {
        eventsDiv.innerHTML = 'No upcoming events found.';
        debugLog('No upcoming events found');
    }
}

function handleSignoutClick() {
    debugLog('Sign out clicked');
    
    if (accessToken) {
        // Revoke the access token
        google.accounts.oauth2.revoke(accessToken, () => {
            debugLog('Access token revoked');
        });
        
        // Clear stored token
        accessToken = null;
        gapi.client.setToken(null);
        
        // Reset UI
        loginSection.style.display = 'block';
        calendarSection.style.display = 'none';
        eventsDiv.innerHTML = '';
        loginBtn.textContent = 'Login with Google';
        
        debugLog('User signed out successfully');
    }
}

// Show calendar for non-logged-in users (demo only)
renderCalendar();
