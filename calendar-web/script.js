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

const loginBtn = document.getElementById('login-btn');
const loginSection = document.getElementById('login-section');
const calendarSection = document.getElementById('calendar-section');
const monthYear = document.getElementById('month-year');
const calendarTable = document.getElementById('calendar-table');
const eventsDiv = document.getElementById('events');
const debugOutput = document.getElementById('debug-output');
const clearDebugBtn = document.getElementById('clear-debug');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');

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
clearDebugBtn.onclick = () => {
    debugOutput.textContent = '';
};

// Navigation button handlers
prevMonthBtn.onclick = () => {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
    renderCalendar(currentDisplayDate);
    if (accessToken) {
        loadCalendarEventsForMonth(currentDisplayDate);
    }
};

nextMonthBtn.onclick = () => {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
    renderCalendar(currentDisplayDate);
    if (accessToken) {
        loadCalendarEventsForMonth(currentDisplayDate);
    }
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

function renderCalendar(date = currentDisplayDate) {
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
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

function showCalendar() {
    loginSection.style.display = 'none';
    calendarSection.style.display = 'block';
    currentDisplayDate = new Date(); // Reset to current month when showing calendar
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
                loadCalendarEvents();
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
        loadCalendarEvents();
        listUpcomingEvents();
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
        
        // Add new events
        events.forEach(event => {
            const eventDate = event.start.date || event.start.dateTime.split('T')[0];
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
            const when = event.start.dateTime || event.start.date;
            const eventDate = new Date(when).toLocaleDateString();
            const eventTime = event.start.dateTime ? new Date(event.start.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'All day';
            
            html += `<li class="event-item" onclick="editEvent('${event.id}')" data-event-id="${event.id}">`;
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

function showDayEvents(dateStr) {
    debugLog(`Clicked on date: ${dateStr}`);
    const dayEvents = eventsByDate[dateStr] || [];
    
    if (dayEvents.length === 0) {
        eventsDiv.innerHTML = `<b>Events for ${dateStr}:</b><p>No events scheduled</p>`;
        return;
    }
    
    let html = `<b>Events for ${dateStr}:</b><ul>`;
    dayEvents.forEach(event => {
        const time = event.start.dateTime ? 
            new Date(event.start.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
            'All day';
        html += `<li><strong>${time}</strong> - ${event.summary}`;
        if (event.location) html += ` (${event.location})`;
        html += `</li>`;
    });
    html += '</ul>';
    eventsDiv.innerHTML = html;
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

// Event editing functionality
let currentEditingEvent = null;

function editEvent(eventId) {
    debugLog(`Edit event clicked: ${eventId}`);
    
    if (!window.currentEvents) {
        debugLog('No events available for editing', 'error');
        return;
    }
    
    const event = window.currentEvents.find(e => e.id === eventId);
    if (!event) {
        debugLog(`Event not found: ${eventId}`, 'error');
        return;
    }
    
    currentEditingEvent = event;
    showEditForm(event);
}

function showEditForm(event) {
    debugLog(`Showing edit form for event: ${event.summary}`);
    
    // Populate form fields
    document.getElementById('edit-title').value = event.summary || '';
    document.getElementById('edit-description').value = event.description || '';
    
    const isAllDay = !event.start.dateTime;
    document.getElementById('edit-all-day').checked = isAllDay;
    
    if (isAllDay) {
        // All day event
        const startDate = event.start.date;
        const endDate = event.end.date;
        
        document.getElementById('edit-start-date').value = startDate;
        document.getElementById('edit-end-date').value = endDate;
        document.getElementById('edit-start-time').value = '';
        document.getElementById('edit-end-time').value = '';
        
        // Hide time fields for all-day events
        document.getElementById('edit-start-time').style.display = 'none';
        document.getElementById('edit-end-time').style.display = 'none';
        document.querySelector('label[for="edit-start-time"]').style.display = 'none';
        document.querySelector('label[for="edit-end-time"]').style.display = 'none';
    } else {
        // Timed event
        const startDateTime = new Date(event.start.dateTime);
        const endDateTime = new Date(event.end.dateTime);
        
        document.getElementById('edit-start-date').value = startDateTime.toISOString().split('T')[0];
        document.getElementById('edit-end-date').value = endDateTime.toISOString().split('T')[0];
        document.getElementById('edit-start-time').value = startDateTime.toTimeString().substring(0, 5);
        document.getElementById('edit-end-time').value = endDateTime.toTimeString().substring(0, 5);
        
        // Show time fields for timed events
        document.getElementById('edit-start-time').style.display = 'block';
        document.getElementById('edit-end-time').style.display = 'block';
        document.querySelector('label[for="edit-start-time"]').style.display = 'block';
        document.querySelector('label[for="edit-end-time"]').style.display = 'block';
    }
    
    // Show edit section
    document.getElementById('edit-section').style.display = 'block';
    document.getElementById('edit-title').focus();
}

function hideEditForm() {
    document.getElementById('edit-section').style.display = 'none';
    currentEditingEvent = null;
    debugLog('Edit form hidden');
}

async function saveEventChanges() {
    if (!currentEditingEvent) {
        debugLog('No event selected for editing', 'error');
        return;
    }
    
    debugLog('Saving event changes...');
    
    // Disable save button to prevent double-clicks
    const saveBtn = document.getElementById('save-event-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    try {
        // Get form values
        const title = document.getElementById('edit-title').value.trim();
        const description = document.getElementById('edit-description').value.trim();
        const isAllDay = document.getElementById('edit-all-day').checked;
        const startDate = document.getElementById('edit-start-date').value;
        const endDate = document.getElementById('edit-end-date').value;
        const startTime = document.getElementById('edit-start-time').value;
        const endTime = document.getElementById('edit-end-time').value;
        
        if (!title) {
            alert('Title is required');
            return;
        }
        
        if (!startDate) {
            alert('Start date is required');
            return;
        }
        
        if (!isAllDay && (!startTime || !endTime)) {
            alert('Start and end times are required for timed events');
            return;
        }
        
        // Build updated event object
        const updatedEvent = {
            id: currentEditingEvent.id,
            summary: title,
            description: description
        };
        
        if (isAllDay) {
            updatedEvent.start = { date: startDate };
            updatedEvent.end = { date: endDate };
        } else {
            const startDateTime = new Date(`${startDate}T${startTime}`);
            const endDateTime = new Date(`${endDate}T${endTime}`);
            
            updatedEvent.start = { dateTime: startDateTime.toISOString() };
            updatedEvent.end = { dateTime: endDateTime.toISOString() };
        }
        
        debugLog(`Updating event: ${JSON.stringify(updatedEvent)}`);
        
        // Make API call to update event
        const response = await gapi.client.calendar.events.update({
            calendarId: 'primary',
            eventId: currentEditingEvent.id,
            resource: updatedEvent
        });
        
        debugLog('Event updated successfully');
        
        // Refresh events list
        await listUpcomingEvents();
        
        // Hide edit form
        hideEditForm();
        
        // Show success message
        alert('Event updated successfully!');
        
    } catch (error) {
        debugLog(`Error updating event: ${error.message || error}`, 'error');
        alert(`Failed to update event: ${error.message || 'Unknown error'}`);
    } finally {
        // Re-enable save button
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
}

// Event listeners for edit form
document.addEventListener('DOMContentLoaded', () => {
    // Save button
    document.getElementById('save-event-btn').addEventListener('click', saveEventChanges);
    
    // Cancel button
    document.getElementById('cancel-edit-btn').addEventListener('click', hideEditForm);
    
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

// Show calendar for non-logged-in users (demo only)
renderCalendar();
