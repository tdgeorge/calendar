// Simple JS Calendar + Google Login (frontend only)
// Note: For Google Calendar API, you need to set up OAuth 2.0 credentials and use the gapi client.
// This demo uses Google Identity Services for login, but calendar access requires extra setup.

// Will be loaded from server
let CLIENT_ID = '';
let API_KEY = '';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar";

// Store events by date for color coding
let eventsByDate = {};

// Timezone-aware helper functions
function formatDateForInput(dateString) {
    // For date inputs, we want YYYY-MM-DD in local timezone
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

function formatTimeForInput(dateTimeString) {
    // For time inputs, we want HH:MM in local timezone
    if (!dateTimeString) return '';
    
    const date = new Date(dateTimeString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
}

function createLocalDateTime(dateStr, timeStr) {
    // Create a Date object in local timezone from date and time strings
    if (!dateStr) return null;
    
    if (timeStr) {
        // Timed event - combine date and time in local timezone
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes);
    } else {
        // All-day event - just the date
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
}

function formatDateForCalendar(date) {
    // Format date as YYYY-MM-DD for calendar display
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// DOM element references with null checks
function getElement(id, required = true) {
    const element = document.getElementById(id);
    if (!element && required) {
        debugLog(`❌ Required element not found: ${id}`, 'error');
    }
    return element;
}

// Helper function to safely update login button
function updateLoginButton(text, onClick, disabled = false) {
    if (loginBtn) {
        loginBtn.textContent = text;
        loginBtn.onclick = onClick;
        loginBtn.disabled = disabled;
    }
}

const loginBtn = getElement('login-btn');
const loginSection = getElement('login-section');
const userSection = getElement('user-section');
const dashboard = getElement('dashboard');
const monthYear = getElement('month-year');
const calendarTable = getElement('calendar-table');
const eventsDiv = getElement('events');
const debugOutput = getElement('debug-output');
const clearDebugBtn = getElement('clear-debug');
const prevMonthBtn = getElement('prev-month');
const nextMonthBtn = getElement('next-month');

// Current date being displayed
let currentDisplayDate = new Date();

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
if (clearDebugBtn && debugOutput) {
    clearDebugBtn.onclick = () => {
        debugOutput.textContent = '';
    };
}

// Navigation button handlers
if (prevMonthBtn) {
    prevMonthBtn.onclick = () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
        renderCalendar(currentDisplayDate);
        if (accessToken) {
            loadCalendarEventsForMonth(currentDisplayDate);
        }
    };
}

if (nextMonthBtn) {
    nextMonthBtn.onclick = () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
        renderCalendar(currentDisplayDate);
        if (accessToken) {
            loadCalendarEventsForMonth(currentDisplayDate);
        }
    };
}

// Initialize login button
updateLoginButton('Loading...', null, true);

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
            updateLoginButton('Config Error', null, true);
            return false;
        }
        
        return true;
    } catch (error) {
        debugLog(`Failed to load config: ${error.message}`, 'error');
        updateLoginButton('Config Load Error', null, true);
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

function renderCalendar(date = currentDisplayDate) {
    if (!monthYear || !calendarTable) {
        debugLog('❌ Calendar elements not found, cannot render', 'error');
        return;
    }
    
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
        const dateStr = formatDateForCalendar(new Date(year, month, day));
        const hasEvents = eventsByDate[dateStr] && eventsByDate[dateStr].length > 0;
        
        let classes = [];
        if (isToday) classes.push('today');
        if (hasEvents) classes.push('has-events');
        
        html += `<td class="${classes.join(' ')}" data-date="${dateStr}" onclick="showDayEvents('${dateStr}')">${day}</td>`;
        if ((firstDay + day) % 7 === 0) html += '</tr><tr>';
    }
    html += '</tr>';
    calendarTable.innerHTML = html;
}

async function showCalendar() {
    if (loginSection) loginSection.style.display = 'none';
    if (userSection) userSection.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'grid';
    currentDisplayDate = new Date(); // Reset to current month when showing calendar
    renderCalendar();
    
    // Load events for calendar coloring and initial display
    if (accessToken) {
        await loadCalendarEventsForMonth(currentDisplayDate);
        showTodaysEvents(); // Show today's events after events are loaded
    }
}

// Google API integration
let tokenClient;
let gisInited = false;
let gapiInited = false;
let accessToken = null;

// Token persistence configuration
const TOKEN_STORAGE_KEY = 'google_calendar_access_token';
const TOKEN_EXPIRY_KEY = 'google_calendar_token_expiry';

// Token management functions
function saveTokenToStorage(token, expiresIn) {
    debugLog(`saveTokenToStorage called with expiresIn: ${expiresIn}`);
    try {
        const expiryTime = Date.now() + (expiresIn * 1000); // Convert to milliseconds
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
        debugLog(`✅ Token saved to localStorage successfully!`);
        debugLog(`📅 Token expires at: ${new Date(expiryTime).toLocaleString()}`);
        debugLog(`⏰ Token valid for ${Math.round(expiresIn / 60)} minutes`);
    } catch (error) {
        debugLog(`❌ Failed to save token to localStorage: ${error.message}`, 'error');
    }
}

function getTokenFromStorage() {
    debugLog('🔍 Checking for stored authentication token...');
    try {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
        
        if (!token || !expiry) {
            debugLog('❌ No stored token found in localStorage');
            return null;
        }
        
        const expiryTime = parseInt(expiry);
        const now = Date.now();
        
        debugLog(`📅 Token found, checking expiry: ${new Date(expiryTime).toLocaleString()}`);
        
        if (now >= expiryTime) {
            debugLog('⏰ Stored token has expired, clearing storage');
            clearTokenStorage();
            return null;
        }
        
        const timeLeft = Math.round((expiryTime - now) / 1000 / 60); // minutes
        debugLog(`✅ Found valid stored token, expires in ${timeLeft} minutes`);
        return token;
    } catch (error) {
        debugLog(`❌ Failed to retrieve token from localStorage: ${error.message}`, 'error');
        return null;
    }
}

function clearTokenStorage() {
    debugLog('🧹 Clearing token storage...');
    try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        debugLog('✅ Token storage cleared successfully');
    } catch (error) {
        debugLog(`❌ Failed to clear token storage: ${error.message}`, 'error');
    }
}

async function initializeGapi() {
    debugLog('Initializing Google API client (GAPI only, no auth)...');
    debugLog(`API Key: ${API_KEY ? 'Set (' + API_KEY.substring(0, 10) + '...)' : 'Not set'}`);
    
    if (!API_KEY) {
        debugLog('API Key is empty or undefined', 'error');
        updateLoginButton('Missing API Key', null, true);
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
        await maybeEnableButtons();
    } catch (error) {
        debugLog(`Error initializing Google API: ${error.message || error}`, 'error');
        debugLog(`Error details: ${JSON.stringify(error)}`, 'error');
        updateLoginButton('API Init Error', null, true);
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
            callback: async (response) => {
                debugLog('GIS callback triggered');
                if (response.error !== undefined) {
                    debugLog(`Token error: ${response.error}`, 'error');
                    updateLoginButton('Auth Error', null, true);
                    return;
                }
                
                // Store the access token
                accessToken = response.access_token;
                debugLog('Access token received successfully');
                
                // Save token to localStorage with expiry (default 1 hour if not specified)
                const expiresIn = response.expires_in || 3600;
                debugLog(`Token expires in ${expiresIn} seconds`);
                saveTokenToStorage(accessToken, expiresIn);
                
                // Set the token for gapi.client
                gapi.client.setToken({
                    access_token: accessToken
                });
                
                debugLog('Token set on gapi.client, showing calendar');
                await showCalendar();
                loadCalendarEvents();
            },
        });
        gisInited = true;
        debugLog('Google Identity Services initialized successfully');
        maybeEnableButtons();
    } catch (error) {
        debugLog(`Error initializing GIS: ${error.message || error}`, 'error');
        updateLoginButton('GIS Init Error', null, true);
    }
}

async function maybeEnableButtons() {
    debugLog(`Checking if ready to enable buttons - GAPI: ${gapiInited}, GIS: ${gisInited}`);
    
    if (gapiInited && gisInited) {
        debugLog('Both GAPI and GIS initialized successfully');
        
        // Try to restore previous authentication
        debugLog('🔄 Attempting to restore previous authentication...');
        const storedToken = getTokenFromStorage();
        if (storedToken) {
            debugLog('🎉 Restoring previous authentication session');
            accessToken = storedToken;
            
            // Set the token for gapi.client
            gapi.client.setToken({
                access_token: accessToken
            });
            
            // Show calendar interface
            await showCalendar();
            
            // Update login button to show sign out option
            updateLoginButton('Sign Out', handleSignoutClick, false);
            
            // Show restoration message
            debugLog('Successfully restored authentication from stored token');
        } else {
            debugLog('No valid stored token, showing login button');
            updateLoginButton('Login with Google', handleAuthClick, false);
        }
    } else {
        debugLog(`Still waiting - GAPI: ${gapiInited ? 'Ready' : 'Loading'}, GIS: ${gisInited ? 'Ready' : 'Loading'}`);
    }
}

async function handleAuthClick() {
    debugLog('Login/Auth button clicked');
    
    // Check if user is already authenticated (this should not happen with proper UI state)
    if (accessToken && gapi.client.getToken()) {
        debugLog('User already authenticated, showing calendar');
        await showCalendar();
        loadCalendarEvents();
        return;
    }
    
    debugLog('Requesting new access token');
    tokenClient.requestAccessToken({
        prompt: 'consent'
    });
}

async function loadCalendarEvents() {
    return loadCalendarEventsForMonth(currentDisplayDate);
}

async function loadCalendarEventsForMonth(date) {
    debugLog(`Loading calendar events for ${date.toLocaleString('default', { month: 'long', year: 'numeric' })}...`);
    
    // Check if we have an access token
    if (!accessToken) {
        debugLog('No access token available', 'error');
        return;
    }
    
    // Ensure the token is set on gapi.client
    gapi.client.setToken({
        access_token: accessToken
    });
    
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    try {
        const request = {
            'calendarId': 'primary',
            'timeMin': startOfMonth.toISOString(),
            'timeMax': endOfMonth.toISOString(),
            'showDeleted': false,
            'singleEvents': true,
            'orderBy': 'startTime'
        };
        
        debugLog('Making Calendar API request for month events...');
        const response = await gapi.client.calendar.events.list(request);
        const events = response.result.items;
        debugLog(`Found ${events.length} events for ${date.toLocaleString('default', { month: 'long', year: 'numeric' })}`);
        
        // Clear existing events for this month and add new ones
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        // Remove events from eventsByDate that belong to this month
        Object.keys(eventsByDate).forEach(dateKey => {
            if (dateKey.startsWith(monthKey)) {
                delete eventsByDate[dateKey];
            }
        });
        
        // Add new events with proper timezone handling
        events.forEach(event => {
            let eventDate;
            if (event.start.date) {
                // All-day event - use date as-is
                eventDate = event.start.date;
            } else {
                // Timed event - get date in local timezone
                const startDateTime = new Date(event.start.dateTime);
                eventDate = formatDateForCalendar(startDateTime);
            }
            
            if (!eventsByDate[eventDate]) {
                eventsByDate[eventDate] = [];
            }
            eventsByDate[eventDate].push(event);
        });
        
        // Re-render calendar with event indicators
        renderCalendar(date);
        
    } catch (err) {
        debugLog(`Error loading calendar events: ${err.message}`, 'error');
    }
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
            'maxResults': 5,
            'orderBy': 'startTime'
        };
        
        debugLog('Making Calendar API request...');
        response = await gapi.client.calendar.events.list(request);
        debugLog('Events fetched successfully');
    } catch (err) {
        debugLog(`Error fetching events: ${err.message || err}`, 'error');
        
        if (err.status === 401 || err.status === 403) {
            debugLog('Authentication expired, clearing stored token');
            clearTokenStorage();
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
        events.forEach((event, index) => {
            // Use timezone-aware formatting for consistent display
            const eventDate = event.start.date ? 
                new Date(event.start.date + 'T00:00:00').toLocaleDateString() :
                new Date(event.start.dateTime).toLocaleDateString();
            const eventTime = event.start.dateTime ? 
                formatTimeForInput(event.start.dateTime) : 
                'All day';
            
            html += `<li class="event-item" data-event-id="${event.id}" style="cursor: pointer;">`;
            html += `<strong>${event.summary}</strong><br>`;
            html += `📅 ${eventDate} ${eventTime}`;
            if (event.description) {
                html += `<br>📝 ${event.description.substring(0, 50)}${event.description.length > 50 ? '...' : ''}`;
            }
            html += `</li>`;
        });
        html += '</ul>';
        eventsDiv.innerHTML = html;
        
        // Store events for editing
        window.currentEvents = events;
        debugLog(`Displayed ${events.length} events`);
    } else {
        eventsDiv.innerHTML = 'No upcoming events found.';
        debugLog('No upcoming events found');
    }
}

function showTodaysEvents() {
    debugLog('Showing today\'s events...');
    
    // Get today's date in YYYY-MM-DD format using timezone-aware helper
    const today = new Date();
    const todayStr = formatDateForCalendar(today);
    
    // Show today's events using the existing function
    showDayEvents(todayStr);
}

function showDayEvents(dateStr) {
    debugLog(`Clicked on date: ${dateStr}`);
    const dayEvents = eventsByDate[dateStr] || [];
    
    // Store the selected date for creating new events
    window.selectedDate = dateStr;
    
    let html = `<b>Events for ${dateStr}:</b>`;
    
    // Add create event button
    html += `<div style="margin: 1rem 0;"><button class="btn btn-primary" onclick="createNewEvent()" style="width: 100%; padding: 0.75rem;">+ Create Event</button></div>`;
    
    if (dayEvents.length === 0) {
        html += `<p>No events scheduled</p>`;
    } else {
        html += `<ul>`;
        dayEvents.forEach(event => {
            // Format date and time in local timezone
            const displayDate = new Date(dateStr).toLocaleDateString();
            const eventTime = event.start.dateTime ? 
                formatTimeForInput(event.start.dateTime) : 
                'All day';
            
            // Log event ID for debugging
            debugLog(`🆔 Adding event to list: ${event.summary} (ID: ${event.id})`);
            
            // Use data attribute for event ID to avoid onclick issues with special characters
            html += `<li class="event-item" data-event-id="${event.id}" style="cursor: pointer;">`;
            html += `<strong>${event.summary}</strong><br>`;
            html += `📅 ${displayDate} ${eventTime}`;
            if (event.description) {
                html += `<br>📝 ${event.description.substring(0, 50)}${event.description.length > 50 ? '...' : ''}`;
            }
            if (event.location) {
                html += `<br>📍 ${event.location}`;
            }
            html += `</li>`;
        });
        html += '</ul>';
    }
    
    if (eventsDiv) {
        eventsDiv.innerHTML = html;
        debugLog(`📝 Updated events container HTML. Container ID: ${eventsDiv.id}`);
    } else {
        debugLog('❌ Events container not found!', 'error');
    }
    
    // Store events for editing (just like in listUpcomingEvents)
    window.currentEvents = dayEvents;
    debugLog(`📊 Stored ${dayEvents.length} events in window.currentEvents for ${dateStr}`);
}

function handleSignoutClick() {
    debugLog('Sign out clicked');
    
    if (accessToken) {
        // Revoke the access token
        google.accounts.oauth2.revoke(accessToken, () => {
            debugLog('Access token revoked');
        });
        
        // Clear stored tokens
        accessToken = null;
        gapi.client.setToken(null);
        clearTokenStorage();
        
        // Reset UI
        if (loginSection) loginSection.style.display = 'block';
        if (dashboard) dashboard.style.display = 'none';
        if (userSection) userSection.style.display = 'none';
        if (eventsDiv) eventsDiv.innerHTML = '';
        updateLoginButton('Login with Google', handleAuthClick, false);
        
        debugLog('User signed out successfully, storage cleared');
    }
}

// Event editing functionality
let currentEditingEvent = null;
let isCreatingNewEvent = false;

function createNewEvent() {
    debugLog(`Creating new event for ${window.selectedDate}`);
    
    if (!window.selectedDate) {
        debugLog('No date selected for new event', 'error');
        return;
    }
    
    isCreatingNewEvent = true;
    currentEditingEvent = null;
    
    // Create a blank event object for the selected date
    const newEvent = {
        summary: '',
        description: '',
        start: {
            date: window.selectedDate
        },
        end: {
            date: window.selectedDate
        }
    };
    
    showEditForm(newEvent, true);
}

function editEvent(eventId) {
    debugLog(`🖱️ Edit event clicked: ${eventId}`);
    debugLog(`📊 Current events available: ${window.currentEvents ? window.currentEvents.length : 'none'}`);
    
    if (!window.currentEvents) {
        debugLog('❌ No events available for editing', 'error');
        return;
    }
    
    const event = window.currentEvents.find(e => e.id === eventId);
    if (!event) {
        debugLog(`❌ Event not found: ${eventId}`, 'error');
        debugLog(`Available event IDs: ${window.currentEvents.map(e => e.id).join(', ')}`);
        return;
    }
    
    // Set editing state
    isCreatingNewEvent = false;
    currentEditingEvent = event;
    
    debugLog(`✅ Found event: ${event.summary}, calling showEditForm`);
    
    // Show the edit form
    showEditForm(event, false);
}

function showEditForm(event, isNew = false) {
        debugLog(isNew ? `Showing form for new event on ${window.selectedDate}` : `Showing edit form for event: ${event.summary}`);

        // Define all input and label variables at the top
        const titleInput = document.getElementById('edit-title');
        const descInput = document.getElementById('edit-description');
        const startDateInput = document.getElementById('edit-start-date');
        const endDateInput = document.getElementById('edit-end-date');
        const startTimeInput = document.getElementById('edit-start-time');
        const endTimeInput = document.getElementById('edit-end-time');
        const startTimeLabel = document.querySelector('label[for="edit-start-time"]');
        const endTimeLabel = document.querySelector('label[for="edit-end-time"]');

        if (titleInput) titleInput.value = event.summary || '';
        if (descInput) descInput.value = event.description || '';

        const isAllDay = !event.start.dateTime;
        const allDayInput = document.getElementById('edit-all-day');
        if (allDayInput) allDayInput.checked = isAllDay;

        if (isAllDay) {
            // All day event
            const startDate = event.start.date;
            const endDate = event.end.date;
            if (startDateInput) startDateInput.value = startDate;
            if (endDateInput) endDateInput.value = endDate;
            if (startTimeInput) startTimeInput.value = '';
            if (endTimeInput) endTimeInput.value = '';
            // Hide time fields for all-day events
            if (startTimeInput) startTimeInput.style.display = 'none';
            if (endTimeInput) endTimeInput.style.display = 'none';
            if (startTimeLabel) startTimeLabel.style.display = 'none';
            if (endTimeLabel) endTimeLabel.style.display = 'none';
        } else {
            // Timed event - use timezone-aware formatting
            if (startDateInput) startDateInput.value = formatDateForInput(event.start.dateTime);
            if (endDateInput) endDateInput.value = formatDateForInput(event.end.dateTime);
            if (startTimeInput) startTimeInput.value = formatTimeForInput(event.start.dateTime);
            if (endTimeInput) endTimeInput.value = formatTimeForInput(event.end.dateTime);
            // Show time fields for timed events
            if (startTimeInput) startTimeInput.style.display = 'block';
            if (endTimeInput) endTimeInput.style.display = 'block';
            if (startTimeLabel) startTimeLabel.style.display = 'block';
            if (endTimeLabel) endTimeLabel.style.display = 'block';
        }

        // Update form title and save button text
        const editTitle = document.querySelector('#edit-section h3');
        const saveBtn = document.getElementById('save-event-btn');
        if (isNew) {
            if (editTitle) editTitle.textContent = 'Create New Event';
            if (saveBtn) saveBtn.textContent = 'Create Event';
        } else {
            if (editTitle) editTitle.textContent = 'Edit Event';
            if (saveBtn) saveBtn.textContent = 'Save Changes';
        }
    
    // Show edit section
        const editSection = document.getElementById('edit-section');
        if (editSection) {
            editSection.style.display = 'block';
            debugLog(`📝 Edit panel made visible for ${isNew ? 'new' : 'existing'} event`);
        } else {
            debugLog('❌ Edit section element not found', 'error');
        }
        if (titleInput) titleInput.focus();
}

function hideEditForm() {
const editSection = document.getElementById('edit-section');
if (editSection) editSection.style.display = 'none';
    currentEditingEvent = null;
    isCreatingNewEvent = false;
    debugLog('Edit form hidden');
}

async function saveEventChanges() {
    if (!currentEditingEvent && !isCreatingNewEvent) {
        debugLog('No event selected for editing or creating', 'error');
        return;
    }
    
    debugLog(isCreatingNewEvent ? 'Creating new event...' : 'Saving event changes...');
    
    // Disable save button to prevent double-clicks
const saveBtn = document.getElementById('save-event-btn');
if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = isCreatingNewEvent ? 'Creating...' : 'Saving...';
}
    
    try {
        // Get form values
    const titleInput = document.getElementById('edit-title');
    const descInput = document.getElementById('edit-description');
    const allDayInput = document.getElementById('edit-all-day');
    const startDateInput = document.getElementById('edit-start-date');
    const endDateInput = document.getElementById('edit-end-date');
    const startTimeInput = document.getElementById('edit-start-time');
    const endTimeInput = document.getElementById('edit-end-time');
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';
    const isAllDay = allDayInput ? allDayInput.checked : false;
    const startDate = startDateInput ? startDateInput.value : '';
    const endDate = endDateInput ? endDateInput.value : '';
    const startTime = startTimeInput ? startTimeInput.value : '';
    const endTime = endTimeInput ? endTimeInput.value : '';
        
        if (!title) {
            debugLog('❌ Title is required', 'error');
            return;
        }
        
        if (!startDate) {
            debugLog('❌ Start date is required', 'error');
            return;
        }
        
        if (!isAllDay && (!startTime || !endTime)) {
            debugLog('❌ Start and end times are required for timed events', 'error');
            return;
        }
        
        // Build event object
        const eventData = {
            summary: title,
            description: description
        };
        
        if (isAllDay) {
            eventData.start = { date: startDate };
            eventData.end = { date: endDate };
        } else {
            // Create datetime objects in local timezone, then convert to ISO for API
            const startDateTime = createLocalDateTime(startDate, startTime);
            const endDateTime = createLocalDateTime(endDate, endTime);
            
            if (!startDateTime || !endDateTime) {
                debugLog('❌ Invalid date/time values', 'error');
                return;
            }
            
            eventData.start = { dateTime: startDateTime.toISOString() };
            eventData.end = { dateTime: endDateTime.toISOString() };
        }
        
        let response;
        
        if (isCreatingNewEvent) {
            debugLog(`Creating new event: ${JSON.stringify(eventData)}`);
            
            // Make API call to create event
            response = await gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: eventData
            });
            
            debugLog('Event created successfully');
        } else {
            eventData.id = currentEditingEvent.id;
            debugLog(`Updating event: ${JSON.stringify(eventData)}`);
            
            // Make API call to update event
            response = await gapi.client.calendar.events.update({
                calendarId: 'primary',
                eventId: currentEditingEvent.id,
                resource: eventData
            });
            
            debugLog('Event updated successfully');
        }
        
        // Refresh events list and calendar
        await loadCalendarEventsForMonth(currentDisplayDate);
        showTodaysEvents();
        
        // Hide edit form
        hideEditForm();
        
        // Log success message instead of alert
        debugLog(isCreatingNewEvent ? '✅ Event created successfully!' : '✅ Event updated successfully!');
        
    } catch (error) {
        debugLog(`Error ${isCreatingNewEvent ? 'creating' : 'updating'} event: ${error.message || error}`, 'error');
        
        // Handle authentication errors
        if (error.status === 401 || error.status === 403) {
            debugLog('Authentication expired during event save, clearing stored token');
            clearTokenStorage();
            debugLog('⚠️ Authentication expired. Please sign in again.', 'warn');
            handleSignoutClick();
        } else {
            debugLog(`❌ Failed to ${isCreatingNewEvent ? 'create' : 'update'} event: ${error.message || 'Unknown error'}`, 'error');
        }
    } finally {
        // Re-enable save button
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = isCreatingNewEvent ? 'Create Event' : 'Save Changes';
        }
    }
}

// Event listeners for edit form
document.addEventListener('DOMContentLoaded', () => {
    // Save button
    document.getElementById('save-event-btn').addEventListener('click', saveEventChanges);
    
    // Cancel button
    document.getElementById('cancel-edit-btn').addEventListener('click', hideEditForm);
    
    // Close button (X)
    document.getElementById('close-edit-btn').addEventListener('click', hideEditForm);
    
    // Event delegation for clicking on event items
    document.addEventListener('click', (e) => {
        debugLog(`🖱️ Click detected on: ${e.target.tagName} with classes: ${e.target.className}`);
        
        const eventItem = e.target.closest('.event-item[data-event-id]');
        if (eventItem) {
            const eventId = eventItem.getAttribute('data-event-id');
            debugLog(`🎯 Event item clicked via delegation: ${eventId}`);
            editEvent(eventId);
        } else {
            // Check if click was on event-related element
            if (e.target.classList.contains('event-item') || e.target.closest('.event-item')) {
                debugLog(`⚠️ Click on event item but no data-event-id found`);
                debugLog(`Element: ${e.target.outerHTML.substring(0, 200)}...`);
            }
        }
    });
    
    // All-day checkbox toggle
    document.getElementById('edit-all-day').addEventListener('change', (e) => {
        const isAllDay = e.target.checked;
        const startTimeInput = document.getElementById('edit-start-time');
        const endTimeInput = document.getElementById('edit-end-time');
        const startTimeLabel = document.querySelector('label[for="edit-start-time"]');
        const endTimeLabel = document.querySelector('label[for="edit-end-time"]');
        
        if (isAllDay) {
            startTimeInput.style.display = 'none';
            endTimeInput.style.display = 'none';
            startTimeLabel.style.display = 'none';
            endTimeLabel.style.display = 'none';
        } else {
            startTimeInput.style.display = 'block';
            endTimeInput.style.display = 'block';
            startTimeLabel.style.display = 'block';
            endTimeLabel.style.display = 'block';
        }
    });
});

// Debug console toggle functionality
function toggleDebugConsole() {
    const panel = document.getElementById('debug-panel');
    const console = document.getElementById('debug-console');
    const icon = document.getElementById('debug-toggle-icon');
    
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        console.classList.remove('collapsed');
        icon.textContent = '▲';
        debugLog('Debug console opened');
    } else {
        panel.style.display = 'none';
        console.classList.add('collapsed');
        icon.textContent = '▼';
    }
}

// Show calendar for non-logged-in users (demo only)
renderCalendar();
