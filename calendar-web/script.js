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

// Global events array for drag & drop operations
let allEvents = [];

// Helper function to safely find event data
function findEventById(eventId) {
    // First try global allEvents array
    let event = allEvents.find(e => e.id === eventId);
    
    // If not found, try window.currentEvents
    if (!event && window.currentEvents) {
        event = window.currentEvents.find(e => e.id === eventId);
    }
    
    // If still not found, search in eventsByDate
    if (!event) {
        for (const dateKey in eventsByDate) {
            const dayEvents = eventsByDate[dateKey];
            event = dayEvents.find(e => e.id === eventId);
            if (event) break;
        }
    }
    
    return event;
}

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

// Theme Management
const THEME_STORAGE_KEY = 'calendar_theme_preference';

function getThemeFromStorage() {
    try {
        return localStorage.getItem(THEME_STORAGE_KEY) || 'dark'; // Default to dark mode
    } catch (error) {
        debugLog(`Failed to get theme from localStorage: ${error.message}`, 'warn');
        return 'dark';
    }
}

function saveThemeToStorage(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        debugLog(`✅ Theme saved to localStorage: ${theme}`);
    } catch (error) {
        debugLog(`❌ Failed to save theme to localStorage: ${error.message}`, 'error');
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.querySelector('.theme-toggle-icon');
    const themeText = document.querySelector('.theme-toggle-text');
    
    if (themeToggle && themeIcon && themeText) {
        if (theme === 'dark') {
            themeIcon.textContent = '🌙';
            themeText.textContent = 'Dark';
        } else if (theme === 'colorful') {
            themeIcon.textContent = '🌈';
            themeText.textContent = 'Colorful';
        } else {
            themeIcon.textContent = '☀️';
            themeText.textContent = 'Light';
        }
    }
    
    debugLog(`🎨 Applied ${theme} theme`);
    
    // Phase 5: Refresh theme-specific elements
    setTimeout(() => {
        updateCurrentTimeLine();  // Refresh current time indicator with new theme
        updateViewSwitcher();     // Refresh view switcher appearance
        updateHeaderClock();      // Refresh header clock to apply theme styling
    }, 50);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    let newTheme;
    
    // Normal toggle between dark and light (skip colorful in normal cycle)
    if (currentTheme === 'dark') {
        newTheme = 'light';
    } else if (currentTheme === 'light') {
        newTheme = 'dark';
    } else if (currentTheme === 'colorful') {
        // If we're in colorful mode, go to dark
        newTheme = 'dark';
    }
    
    applyTheme(newTheme);
    saveThemeToStorage(newTheme);
    
    debugLog(`🔄 Toggled theme from ${currentTheme} to ${newTheme}`);
}

function activateSecretTheme() {
    applyTheme('colorful');
    saveThemeToStorage('colorful');
    debugLog('🌈✨ Secret colorful theme activated!');
}

// Initialize theme and view mode
function initializeTheme() {
    const savedTheme = getThemeFromStorage();
    applyTheme(savedTheme);
    
    // Add event listeners for theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // Single click for normal theme toggle
        themeToggle.addEventListener('click', toggleTheme);
        
        // Double click for secret colorful theme
        themeToggle.addEventListener('dblclick', (e) => {
            e.preventDefault(); // Prevent double execution of single click
            activateSecretTheme();
        });
        
        debugLog('🎨 Theme toggle initialized with secret double-click feature');
    } else {
        debugLog('❌ Theme toggle button not found', 'error');
    }
}

function initializeViewMode() {
    const savedView = getViewFromStorage();
    currentViewMode = savedView;
    
    // Add event listeners for view switcher buttons
    const monthBtn = document.getElementById('view-month');
    const weekBtn = document.getElementById('view-week');
    const dayBtn = document.getElementById('view-day');
    
    if (monthBtn) {
        monthBtn.addEventListener('click', () => setViewMode(VIEW_MODES.MONTH));
    }
    if (weekBtn) {
        weekBtn.addEventListener('click', () => setViewMode(VIEW_MODES.WEEK));
    }
    if (dayBtn) {
        dayBtn.addEventListener('click', () => setViewMode(VIEW_MODES.DAY));
    }
    
    // Initialize view switcher UI
    updateViewSwitcher();
    
    debugLog(`📅 View mode initialized: ${savedView}`);
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

// View mode management
const VIEW_MODES = {
    MONTH: 'month',
    WEEK: 'week',
    DAY: 'day'
};

let currentViewMode = VIEW_MODES.MONTH;
const VIEW_STORAGE_KEY = 'calendar_view_preference';

// View mode management functions
function getViewFromStorage() {
    try {
        return localStorage.getItem(VIEW_STORAGE_KEY) || VIEW_MODES.MONTH;
    } catch (error) {
        debugLog(`Failed to get view from localStorage: ${error.message}`, 'warn');
        return VIEW_MODES.MONTH;
    }
}

function saveViewToStorage(viewMode) {
    try {
        localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
        debugLog(`✅ View mode saved to localStorage: ${viewMode}`);
    } catch (error) {
        debugLog(`❌ Failed to save view mode to localStorage: ${error.message}`, 'error');
    }
}

async function setViewMode(newMode) {
    if (!Object.values(VIEW_MODES).includes(newMode)) {
        debugLog(`❌ Invalid view mode: ${newMode}`, 'error');
        return;
    }
    
    const oldMode = currentViewMode;
    currentViewMode = newMode;
    saveViewToStorage(newMode);
    
    debugLog(`📅 View mode changed from ${oldMode} to ${newMode}`);
    
    // Update UI to reflect new view mode
    updateViewSwitcher();
    updatePanelVisibility(); // Ensure panel visibility is correct
    
    // Check if we need to reload events for the new view mode
    const needsReload = shouldReloadEventsForViewChange(oldMode, newMode);
    
    if (needsReload && accessToken) {
        debugLog(`🔄 Reloading events for view change: ${oldMode} → ${newMode}`);
        // Reload events for the new view's date range
        await loadCalendarEventsForMonth(currentDisplayDate);
    } else {
        debugLog(`📋 Using existing events for view change: ${oldMode} → ${newMode}`);
        // Just re-render with existing data
        renderCurrentView();
    }
}

function shouldReloadEventsForViewChange(oldMode, newMode) {
    // Define which view changes require reloading events due to different date ranges:
    const reloadCases = [
        // Day → Week/Month: Day view only loads single day, need broader range
        oldMode === VIEW_MODES.DAY && (newMode === VIEW_MODES.WEEK || newMode === VIEW_MODES.MONTH),
        
        // Week → Month: Week view only loads 7 days, month needs full month
        oldMode === VIEW_MODES.WEEK && newMode === VIEW_MODES.MONTH,
        
        // Month → Day/Week: Month has broad range, but focused views need precise range
        // (especially for cross-month weeks or specific day focus)
        oldMode === VIEW_MODES.MONTH && (newMode === VIEW_MODES.DAY || newMode === VIEW_MODES.WEEK)
    ];
    
    return reloadCases.some(condition => condition);
}

function updateViewSwitcher() {
    const monthBtn = document.getElementById('view-month');
    const weekBtn = document.getElementById('view-week');
    const dayBtn = document.getElementById('view-day');
    
    // Remove active class from all buttons
    [monthBtn, weekBtn, dayBtn].forEach(btn => {
        if (btn) btn.classList.remove('active');
    });
    
    // Add active class to current view button
    switch (currentViewMode) {
        case VIEW_MODES.MONTH:
            if (monthBtn) monthBtn.classList.add('active');
            break;
        case VIEW_MODES.WEEK:
            if (weekBtn) weekBtn.classList.add('active');
            break;
        case VIEW_MODES.DAY:
            if (dayBtn) dayBtn.classList.add('active');
            break;
    }
}

function renderCurrentView() {
    debugLog(`🖼️ Rendering ${currentViewMode} view`);
    
    // Manage panel visibility based on view mode
    updatePanelVisibility();
    
    switch (currentViewMode) {
        case VIEW_MODES.MONTH:
            debugLog('📅 Calling renderMonthView()');
            renderMonthView();
            break;
        case VIEW_MODES.WEEK:
            debugLog('📊 Calling renderWeekView()');
            renderWeekView();
            break;
        case VIEW_MODES.DAY:
            debugLog('📋 Calling renderDayView()');
            renderDayView();
            break;
        default:
            debugLog(`❌ Unknown view mode: ${currentViewMode}`, 'error');
            renderMonthView(); // Fallback to month view
    }
    
    debugLog(`✅ Finished rendering ${currentViewMode} view`);
    
    // Phase 5: Update current time indicator after view renders
    setTimeout(() => {
        updateCurrentTimeLine();
    }, 100); // Small delay to ensure DOM is ready
}

function updatePanelVisibility() {
    const eventsPanel = document.querySelector('.events-panel');
    const calendarPanel = document.querySelector('.calendar-panel');
    const dashboard = document.getElementById('dashboard');
    
    if (!eventsPanel || !calendarPanel || !dashboard) {
        debugLog('❌ Panel elements not found', 'error');
        return;
    }
    
    // Remove existing view mode classes
    dashboard.classList.remove('month-view-mode', 'week-view-mode', 'day-view-mode');
    
    if (currentViewMode === VIEW_MODES.MONTH) {
        // Month view: show events panel, normal 3-column layout
        eventsPanel.style.display = 'flex';
        dashboard.style.gridTemplateColumns = '350px 1fr 350px';
        dashboard.classList.add('month-view-mode');
        debugLog('📅 Month view: 3-column layout with events panel');
    } else {
        // Week/Day view: hide events panel, expand calendar panel
        eventsPanel.style.display = 'none';
        dashboard.style.gridTemplateColumns = '1fr 350px';
        dashboard.classList.add(`${currentViewMode}-view-mode`);
        debugLog(`📊 ${currentViewMode} view: 2-column layout, events panel hidden`);
    }
}

// Wrapper function for existing month view rendering
function renderMonthView() {
    debugLog('📅 Rendering month view');
    renderCalendar(currentDisplayDate);
    updateHeaderText();
}

function updateHeaderText() {
    if (!monthYear) return;
    
    const options = { year: 'numeric' };
    
    switch (currentViewMode) {
        case VIEW_MODES.MONTH:
            options.month = 'long';
            monthYear.textContent = currentDisplayDate.toLocaleDateString('default', options);
            break;
        case VIEW_MODES.WEEK:
            const weekStart = getWeekStart(currentDisplayDate);
            const weekEnd = getWeekEnd(currentDisplayDate);
            if (weekStart.getMonth() === weekEnd.getMonth()) {
                monthYear.textContent = `${weekStart.toLocaleDateString('default', { month: 'long', year: 'numeric' })}, Week of ${weekStart.getDate()}-${weekEnd.getDate()}`;
            } else {
                monthYear.textContent = `${weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            }
            break;
        case VIEW_MODES.DAY:
            options.month = 'long';
            options.day = 'numeric';
            options.weekday = 'long';
            monthYear.textContent = currentDisplayDate.toLocaleDateString('default', options);
            break;
    }
}

function getWeekStart(date) {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay()); // Sunday
    return start;
}

function getWeekEnd(date) {
    const end = new Date(date);
    end.setDate(date.getDate() + (6 - date.getDay())); // Saturday
    return end;
}

// Week view implementation
function renderWeekView() {
    if (!calendarTable) {
        debugLog('❌ Calendar table element not found', 'error');
        return;
    }
    
    const weekStart = getWeekStart(currentDisplayDate);
    const weekDays = [];
    
    // Generate 7 days of the week
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        weekDays.push(day);
    }
    
    // Create week view HTML structure
    let html = '<div class="week-view">';
    
    // Header with days of the week
    html += '<div class="week-header">';
    html += '<div class="time-label"></div>'; // Empty corner
    
    weekDays.forEach(day => {
        const isToday = isDateToday(day);
        const dayClass = isToday ? 'week-day-header today' : 'week-day-header';
        const dayName = day.toLocaleDateString('default', { weekday: 'short' });
        const dayNumber = day.getDate();
        
        html += `<div class="${dayClass}" data-date="${formatDateForCalendar(day)}">`;
        html += `<div class="day-name">${dayName}</div>`;
        html += `<div class="day-number">${dayNumber}</div>`;
        html += `</div>`;
    });
    html += '</div>';
    
    // Time slots from 6 AM to 10 PM
    const startHour = 6;
    const endHour = 22;
    
    html += '<div class="week-content">';
    
    for (let hour = startHour; hour <= endHour; hour++) {
        const timeString = formatHour(hour);
        
        html += '<div class="week-row">';
        html += `<div class="time-label">${timeString}</div>`;
        
        weekDays.forEach(day => {
            const dateStr = formatDateForCalendar(day);
            const timeSlotId = `${dateStr}-${hour}`;
            
            html += `<div class="time-slot" data-date="${dateStr}" data-hour="${hour}" data-time-slot="${timeSlotId}">`;
            html += renderEventsForTimeSlot(dateStr, hour);
            html += '</div>';
        });
        
        html += '</div>';
    }
    
    html += '</div>';
    html += '</div>';
    
    calendarTable.innerHTML = html;
    
    // Add click handlers for time slots
    addWeekViewEventHandlers();
    
    updateHeaderText();
}

function formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
}

function isDateToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
}

function renderEventsForTimeSlot(dateStr, hour) {
    const dayEvents = eventsByDate[dateStr] || [];
    let html = '';
    
    dayEvents.forEach(event => {
        if (event.start.dateTime) {
            const startTime = new Date(event.start.dateTime);
            const eventHour = startTime.getHours();
            
            // Check if event starts in this hour slot
            if (eventHour === hour) {
                const minutes = startTime.getMinutes();
                const topOffset = (minutes / 60) * 100; // Percentage offset within the hour
                
                const endTime = new Date(event.end.dateTime);
                const durationMinutes = (endTime - startTime) / (1000 * 60);
                const height = Math.max((durationMinutes / 60) * 100, 20); // Minimum 20px height
                
                html += `<div class="week-event" 
                         data-event-id="${event.id}"
                         style="top: ${topOffset}%; height: ${height}px; position: absolute; width: 90%; left: 5%;"
                         title="${event.summary}">`;
                html += `<div class="event-title">${event.summary}</div>`;
                html += `<div class="event-time">${formatTimeForInput(event.start.dateTime)}</div>`;
                html += '</div>';
            }
        } else {
            // All-day event - show at the top of the first hour (6 AM)
            if (hour === 6) {
                html += `<div class="week-event all-day" 
                         data-event-id="${event.id}"
                         style="position: absolute; width: 90%; left: 5%; top: 0; height: 20px;"
                         title="${event.summary}">`;
                html += `<div class="event-title">${event.summary}</div>`;
                html += '</div>';
            }
        }
    });
    
    return html;
}

function addWeekViewEventHandlers() {
    // Add click handlers for time slots to create events
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.addEventListener('click', (e) => {
            // Don't create event if clicking on an existing event
            if (e.target.closest('.week-event')) return;
            
            const dateStr = slot.getAttribute('data-date');
            const hour = parseInt(slot.getAttribute('data-hour'));
            
            debugLog(`🕐 Time slot clicked: ${dateStr} at ${hour}:00`);
            
            // Set selected date and create new event with specific time
            window.selectedDate = dateStr;
            createNewEventAtTime(dateStr, hour);
        });
    });
    
    // Add click handlers for existing events and make them draggable
    document.querySelectorAll('.week-event').forEach(eventEl => {
        const eventId = eventEl.getAttribute('data-event-id');
        
        // Find the event data
        const eventData = findEventById(eventId);
        
        // Make event draggable
        makeEventDraggable(eventEl, eventId, eventData);
        
        // Add click handler (will only trigger if not dragging)
        eventEl.addEventListener('click', (e) => {
            if (!isDragging) {
                e.stopPropagation();
                debugLog(`📅 Week event clicked: ${eventId}`);
                editEvent(eventId);
            }
        });
    });
}

function createNewEventAtTime(dateStr, hour) {
    debugLog(`Creating new event for ${dateStr} at ${hour}:00`);
    
    isCreatingNewEvent = true;
    currentEditingEvent = null;
    
    // Create a blank event object for the selected date and time
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    const endTime = `${String(hour + 1).padStart(2, '0')}:00`;
    
    const newEvent = {
        summary: '',
        description: '',
        start: {
            dateTime: createLocalDateTime(dateStr, startTime).toISOString()
        },
        end: {
            dateTime: createLocalDateTime(dateStr, endTime).toISOString()
        }
    };
    
    showEditForm(newEvent, true);
}

function renderDayView() {
    debugLog('📋 Rendering day view');
    
    if (!calendarTable) {
        debugLog('❌ Calendar table element not found', 'error');
        return;
    }
    
    const currentDay = new Date(currentDisplayDate);
    const dayEvents = eventsByDate[formatDateForCalendar(currentDay)] || [];
    
    // Create day view HTML structure
    let html = '<div class="day-view">';
    
    // Day header
    const isToday = isDateToday(currentDay);
    const dayClass = isToday ? 'day-view-header today' : 'day-view-header';
    
    html += `<div class="${dayClass}">`;
    html += `<div class="day-title">${currentDay.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>`;
    if (dayEvents.length > 0) {
        html += `<div class="day-event-count">${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}</div>`;
    } else {
        html += `<div class="day-event-count">No events</div>`;
    }
    html += '</div>';
    
    // Time slots from 6 AM to 10 PM with 30-minute intervals for more detail
    const startHour = 6;
    const endHour = 22;
    const intervalMinutes = 30;
    
    html += '<div class="day-content">';
    
    for (let hour = startHour; hour <= endHour; hour++) {
        for (let minutes = 0; minutes < 60; minutes += intervalMinutes) {
            const timeString = formatDayViewTime(hour, minutes);
            const timeSlotId = `${formatDateForCalendar(currentDay)}-${hour}-${minutes}`;
            
            html += '<div class="day-time-row">';
            
            // Only show time label for the top of each hour
            if (minutes === 0) {
                html += `<div class="day-time-label full">${formatHour(hour)}</div>`;
            } else {
                html += `<div class="day-time-label half"></div>`;
            }
            
            html += `<div class="day-time-slot" data-date="${formatDateForCalendar(currentDay)}" data-hour="${hour}" data-minutes="${minutes}" data-time-slot="${timeSlotId}">`;
            html += renderEventsForDayTimeSlot(formatDateForCalendar(currentDay), hour, minutes);
            html += '</div>';
            
            html += '</div>';
        }
    }
    
    html += '</div>';
    html += '</div>';
    
    calendarTable.innerHTML = html;
    
    // Add click handlers for time slots
    addDayViewEventHandlers();
    
    updateHeaderText();
}

function formatDayViewTime(hour, minutes) {
    const hourStr = hour === 0 ? '12' : hour > 12 ? (hour - 12).toString() : hour.toString();
    const minuteStr = minutes.toString().padStart(2, '0');
    const period = hour < 12 ? 'AM' : 'PM';
    return `${hourStr}:${minuteStr} ${period}`;
}

function renderEventsForDayTimeSlot(dateStr, hour, minutes) {
    const dayEvents = eventsByDate[dateStr] || [];
    let html = '';
    
    dayEvents.forEach(event => {
        if (event.start.dateTime) {
            const startTime = new Date(event.start.dateTime);
            const eventHour = startTime.getHours();
            const eventMinutes = startTime.getMinutes();
            
            // Check if event starts in this time slot (30-minute intervals)
            if (eventHour === hour && eventMinutes >= minutes && eventMinutes < (minutes + 30)) {
                const endTime = new Date(event.end.dateTime);
                const durationMinutes = (endTime - startTime) / (1000 * 60);
                
                // Calculate precise positioning within the 30-minute slot
                const slotOffset = ((eventMinutes - minutes) / 30) * 100; // Percentage within the slot
                const height = Math.max((durationMinutes / 30) * 60, 25); // Height based on duration, minimum 25px
                
                html += `<div class="day-event" 
                         data-event-id="${event.id}"
                         style="top: ${slotOffset}%; height: ${height}px; position: absolute; width: 95%; left: 2.5%;"
                         title="${event.summary}">`;
                html += `<div class="event-title">${event.summary}</div>`;
                html += `<div class="event-time">${formatTimeForInput(event.start.dateTime)} - ${formatTimeForInput(event.end.dateTime)}</div>`;
                if (event.description) {
                    html += `<div class="event-description">${event.description.substring(0, 50)}${event.description.length > 50 ? '...' : ''}</div>`;
                }
                html += '</div>';
            }
        } else {
            // All-day event - show at the top of the first time slot (6:00 AM)
            if (hour === 6 && minutes === 0) {
                html += `<div class="day-event all-day" 
                         data-event-id="${event.id}"
                         style="position: absolute; width: 95%; left: 2.5%; top: 0; height: 25px;"
                         title="${event.summary}">`;
                html += `<div class="event-title">🗓️ ${event.summary}</div>`;
                html += '</div>';
            }
        }
    });
    
    return html;
}

function addDayViewEventHandlers() {
    // Add click handlers for time slots to create events
    document.querySelectorAll('.day-time-slot').forEach(slot => {
        slot.addEventListener('click', (e) => {
            // Don't create event if clicking on an existing event
            if (e.target.closest('.day-event')) return;
            
            const dateStr = slot.getAttribute('data-date');
            const hour = parseInt(slot.getAttribute('data-hour'));
            const minutes = parseInt(slot.getAttribute('data-minutes'));
            
            debugLog(`🕐 Day time slot clicked: ${dateStr} at ${hour}:${minutes.toString().padStart(2, '0')}`);
            
            // Set selected date and create new event with specific time
            window.selectedDate = dateStr;
            createNewEventAtDayTime(dateStr, hour, minutes);
        });
    });
    
    // Add click handlers for existing events and make them draggable
    document.querySelectorAll('.day-event').forEach(eventEl => {
        const eventId = eventEl.getAttribute('data-event-id');
        
        // Find the event data
        const eventData = findEventById(eventId);
        
        // Make event draggable
        makeEventDraggable(eventEl, eventId, eventData);
        
        // Add click handler (will only trigger if not dragging)
        eventEl.addEventListener('click', (e) => {
            if (!isDragging) {
                e.stopPropagation();
                debugLog(`📅 Day event clicked: ${eventId}`);
                editEvent(eventId);
            }
        });
    });
}

function createNewEventAtDayTime(dateStr, hour, minutes) {
    debugLog(`Creating new event for ${dateStr} at ${hour}:${minutes.toString().padStart(2, '0')}`);
    
    isCreatingNewEvent = true;
    currentEditingEvent = null;
    
    // Create a blank event object for the selected date and time
    const startTime = `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const endHour = minutes >= 30 ? hour + 1 : hour;
    const endMinutes = minutes >= 30 ? 0 : minutes + 30;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    
    const newEvent = {
        summary: '',
        description: '',
        start: {
            dateTime: createLocalDateTime(dateStr, startTime).toISOString()
        },
        end: {
            dateTime: createLocalDateTime(dateStr, endTime).toISOString()
        }
    };
    
    showEditForm(newEvent, true);
}

// Phase 4: Drag & Drop Event Management
let isDragging = false;
let draggedElement = null;
let draggedEventId = null;
let draggedEventData = null;
let dragStartX = 0;
let dragStartY = 0;
let originalPosition = null;

// Phase 5: Polish & Integration
let currentTimeLineInterval = null;
let headerClockInterval = null;

// Drag & Drop Configuration
const DRAG_CONFIG = {
    THRESHOLD: 5, // Minimum pixels to move before starting drag
    SNAP_TO_GRID: true,
    SHOW_DROP_ZONES: true,
    AUTO_SCROLL: true
};

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

// Drag & Drop Core Functions
function initializeDragAndDrop() {
    debugLog('🎯 Initializing drag & drop system');
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('dragstart', handleDragStart);
    
    // Prevent default drag behavior on images and other elements
    document.addEventListener('dragstart', (e) => {
        if (!e.target.classList.contains('draggable-event')) {
            e.preventDefault();
        }
    });
}

function makeEventDraggable(eventElement, eventId, eventData) {
    if (!eventElement || !eventId) {
        debugLog(`⚠️ Skipping drag setup: missing element or eventId`, 'warn');
        return;
    }
    
    eventElement.classList.add('draggable-event');
    eventElement.draggable = true;
    eventElement.setAttribute('data-event-id', eventId);
    
    // Mouse down to start potential drag
    eventElement.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startDragOperation(e, eventElement, eventId, eventData);
    });
    
    // Touch support for mobile
    eventElement.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        const touch = e.touches[0];
        startDragOperation(touch, eventElement, eventId, eventData);
    });
    
    // Phase 5: Enhanced mobile touch support
    eventElement.addEventListener('touchmove', (e) => {
        if (isDragging) {
            e.preventDefault(); // Prevent scrolling during drag
            const touch = e.touches[0];
            handleGlobalMouseMove(touch);
        }
    });
    
    eventElement.addEventListener('touchend', (e) => {
        if (isDragging) {
            e.preventDefault();
            const touch = e.changedTouches[0];
            handleGlobalMouseUp(touch);
        }
    });
}

function startDragOperation(e, element, eventId, eventData) {
    debugLog(`🎯 Starting drag operation for event: ${eventId}`);
    
    draggedElement = element;
    draggedEventId = eventId;
    draggedEventData = eventData;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    // Store original position
    const rect = element.getBoundingClientRect();
    originalPosition = {
        x: rect.left,
        y: rect.top,
        parent: element.parentElement
    };
    
    // Add dragging class for visual feedback
    element.classList.add('dragging');
    document.body.classList.add('drag-active');
    
    // Show drop zones if enabled
    if (DRAG_CONFIG.SHOW_DROP_ZONES) {
        highlightDropZones();
    }
    
    // Create drag helper text
    createDragHelper(eventData);
}

function handleGlobalMouseMove(e) {
    if (!draggedElement) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    // Check if we've moved enough to start dragging
    if (!isDragging && (Math.abs(deltaX) > DRAG_CONFIG.THRESHOLD || Math.abs(deltaY) > DRAG_CONFIG.THRESHOLD)) {
        isDragging = true;
        debugLog('🎯 Drag threshold reached, starting drag');
    }
    
    if (isDragging) {
        // Move the element
        draggedElement.style.position = 'fixed';
        draggedElement.style.left = (originalPosition.x + deltaX) + 'px';
        draggedElement.style.top = (originalPosition.y + deltaY) + 'px';
        draggedElement.style.zIndex = '9999';
        draggedElement.style.pointerEvents = 'none';
        
        // Update drag helper
        updateDragHelper(e.clientX, e.clientY);
        
        // Highlight drop target
        const dropTarget = getDropTargetAt(e.clientX, e.clientY);
        updateDropHighlight(dropTarget);
    }
}

function handleGlobalMouseUp(e) {
    if (!draggedElement) return;
    
    if (isDragging) {
        const dropTarget = getDropTargetAt(e.clientX, e.clientY);
        
        if (dropTarget) {
            handleEventDrop(dropTarget);
        } else {
            // Reset to original position
            resetDraggedElement();
            showDragFeedback('❌ Invalid drop location', 'error');
        }
    }
    
    // Cleanup
    cleanupDragOperation();
}

function getDropTargetAt(x, y) {
    // Temporarily hide dragged element to get element underneath
    const originalDisplay = draggedElement.style.display;
    draggedElement.style.display = 'none';
    
    const elementBelow = document.elementFromPoint(x, y);
    
    // Restore dragged element
    draggedElement.style.display = originalDisplay;
    
    if (!elementBelow) {
        debugLog('🎯 No element found below cursor', 'warn');
        return null;
    }
    
    // Check if it's a valid drop zone
    const timeSlot = elementBelow.closest('.time-slot, .day-time-slot');
    if (timeSlot) {
        debugLog('🎯 Found time slot drop target');
        return timeSlot;
    }
    
    // Check for month view calendar cells
    const calendarCell = elementBelow.closest('td[data-date]');
    if (calendarCell) {
        debugLog(`🎯 Found calendar cell drop target with date: ${calendarCell.getAttribute('data-date')}`);
        return calendarCell;
    }
    
    // Also check if we're directly on a calendar cell (not just a child)
    if (elementBelow.tagName === 'TD' && elementBelow.hasAttribute('data-date')) {
        debugLog(`🎯 Found direct calendar cell drop target with date: ${elementBelow.getAttribute('data-date')}`);
        return elementBelow;
    }
    
    debugLog('🎯 No valid drop target found');
    return null;
}

function handleEventDrop(dropTarget) {
    debugLog(`🎯 Event dropped on: ${dropTarget.className}`);
    
    // Extract date and time information from drop target
    const targetInfo = extractDropTargetInfo(dropTarget);
    
    if (targetInfo) {
        // Update event with new time/date
        updateEventDateTime(draggedEventId, targetInfo);
    } else {
        resetDraggedElement();
    }
}

function extractDropTargetInfo(dropTarget) {
    debugLog(`🎯 Extracting drop target info from: ${dropTarget.tagName} with classes: ${dropTarget.className}`);
    
    // Week view time slots
    if (dropTarget.classList.contains('time-slot')) {
        const dateStr = dropTarget.getAttribute('data-date');
        const hour = parseInt(dropTarget.getAttribute('data-hour'));
        debugLog(`🎯 Week view drop target: ${dateStr} at ${hour}:00`);
        return { date: dateStr, hour: hour, view: 'week' };
    }
    
    // Day view time slots
    if (dropTarget.classList.contains('day-time-slot')) {
        const dateStr = dropTarget.getAttribute('data-date');
        const hour = parseInt(dropTarget.getAttribute('data-hour'));
        const minutes = parseInt(dropTarget.getAttribute('data-minutes')) || 0;
        debugLog(`🎯 Day view drop target: ${dateStr} at ${hour}:${minutes.toString().padStart(2, '0')}`);
        return { date: dateStr, hour: hour, minutes: minutes, view: 'day' };
    }
    
    // Month view - for all-day events
    if (dropTarget.tagName === 'TD' && dropTarget.hasAttribute('data-date')) {
        const dateStr = dropTarget.getAttribute('data-date');
        debugLog(`🎯 Month view drop target: ${dateStr} (all-day)`);
        return { date: dateStr, view: 'month', allDay: true };
    }
    
    debugLog(`🎯 No valid drop target info found for: ${dropTarget.tagName}`);
    return null;
}

async function updateEventDateTime(eventId, targetInfo) {
    debugLog(`🎯 Updating event ${eventId} to ${targetInfo.date} at ${targetInfo.hour || 'all-day'}`);
    
    try {
        // Find the event in our events array
        const event = findEventById(eventId);
        if (!event) {
            debugLog(`❌ Event ${eventId} not found`, 'error');
            resetDraggedElement();
            return;
        }
        
        // Create updated event data
        const updatedEvent = { ...event };
        
        if (targetInfo.allDay) {
            // Move to all-day event
            updatedEvent.start = { date: targetInfo.date };
            updatedEvent.end = { date: targetInfo.date };
        } else {
            // Move to specific time
            const startTime = `${String(targetInfo.hour).padStart(2, '0')}:${String(targetInfo.minutes || 0).padStart(2, '0')}:00`;
            const endHour = (targetInfo.hour || 0) + 1;
            const endTime = `${String(endHour).padStart(2, '0')}:${String(targetInfo.minutes || 0).padStart(2, '0')}:00`;
            
            updatedEvent.start = { 
                dateTime: `${targetInfo.date}T${startTime}`,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
            updatedEvent.end = { 
                dateTime: `${targetInfo.date}T${endTime}`,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
        }
        
        // Update via Google Calendar API
        if (accessToken) {
            const response = await gapi.client.calendar.events.update({
                calendarId: 'primary',
                eventId: eventId,
                resource: updatedEvent
            });
            
            debugLog(`✅ Event updated successfully`);
            
            // Show success feedback
            showDragFeedback('✅ Event moved successfully!', 'success');
            
            // Refresh the current view
            await loadCalendarEventsForMonth(currentDisplayDate);
            renderCurrentView();
            
            // Switch events panel to show the dropped day's events
            if (targetInfo.date) {
                debugLog(`📅 Switching events panel to show events for ${targetInfo.date}`);
                showDayEvents(targetInfo.date);
            }
            
        } else {
            debugLog(`❌ No access token available`, 'error');
            resetDraggedElement();
        }
        
    } catch (error) {
        debugLog(`❌ Error updating event: ${error.message}`, 'error');
        resetDraggedElement();
    }
}

function resetDraggedElement() {
    if (draggedElement && originalPosition) {
        draggedElement.style.position = '';
        draggedElement.style.left = '';
        draggedElement.style.top = '';
        draggedElement.style.zIndex = '';
        draggedElement.style.pointerEvents = '';
    }
}

function cleanupDragOperation() {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement = null;
    }
    
    document.body.classList.remove('drag-active');
    isDragging = false;
    draggedEventId = null;
    draggedEventData = null;
    originalPosition = null;
    
    // Clear drop zone highlights
    clearDropZoneHighlights();
    
    // Remove drag helper
    removeDragHelper();
}

function highlightDropZones() {
    // Highlight valid drop zones based on current view
    if (currentViewMode === VIEW_MODES.WEEK) {
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.add('drop-zone-active');
        });
    } else if (currentViewMode === VIEW_MODES.DAY) {
        document.querySelectorAll('.day-time-slot').forEach(slot => {
            slot.classList.add('drop-zone-active');
        });
    } else if (currentViewMode === VIEW_MODES.MONTH) {
        document.querySelectorAll('#calendar-table td[data-date], td[data-date]').forEach(cell => {
            cell.classList.add('drop-zone-active');
        });
        debugLog(`🎯 Highlighted ${document.querySelectorAll('td[data-date]').length} calendar cells as drop zones`);
    }
}

function clearDropZoneHighlights() {
    document.querySelectorAll('.drop-zone-active, .drop-zone-hover').forEach(element => {
        element.classList.remove('drop-zone-active', 'drop-zone-hover');
    });
}

function updateDropHighlight(dropTarget) {
    // Clear previous highlights
    document.querySelectorAll('.drop-zone-hover').forEach(element => {
        element.classList.remove('drop-zone-hover');
    });
    
    // Highlight current drop target
    if (dropTarget) {
        dropTarget.classList.add('drop-zone-hover');
    }
}

function handleDragStart(e) {
    // Custom drag start handling if needed
    if (!e.target.classList.contains('draggable-event')) {
        e.preventDefault();
        return;
    }
}

// Helper functions for enhanced user experience
function createDragHelper(eventData) {
    const helper = document.createElement('div');
    helper.id = 'drag-helper';
    helper.className = 'drag-helper';
    
    const eventTitle = eventData && eventData.summary ? eventData.summary : 'Event';
    let eventTime = 'All day';
    
    if (eventData && eventData.start) {
        if (eventData.start.dateTime) {
            eventTime = formatTimeForInput(eventData.start.dateTime);
        } else if (eventData.start.date) {
            eventTime = 'All day';
        }
    }
    
    const instruction = currentViewMode === VIEW_MODES.MONTH ? 
        'Drop on calendar date to reschedule' : 
        'Drop on time slot to reschedule';
    
    helper.innerHTML = `
        <div class="drag-helper-content">
            <div class="drag-helper-title">📅 ${eventTitle}</div>
            <div class="drag-helper-time">🕐 ${eventTime}</div>
            <div class="drag-helper-instruction">${instruction}</div>
        </div>
    `;
    
    helper.style.position = 'fixed';
    helper.style.pointerEvents = 'none';
    helper.style.zIndex = '10000';
    helper.style.display = 'none';
    
    document.body.appendChild(helper);
}

function updateDragHelper(x, y) {
    const helper = document.getElementById('drag-helper');
    if (helper && isDragging) {
        helper.style.left = (x + 15) + 'px';
        helper.style.top = (y + 15) + 'px';
        helper.style.display = 'block';
    }
}

function removeDragHelper() {
    const helper = document.getElementById('drag-helper');
    if (helper) {
        helper.remove();
    }
}

function showDragFeedback(message, type = 'info') {
    const feedback = document.createElement('div');
    feedback.className = `drag-feedback drag-feedback-${type}`;
    feedback.textContent = message;
    
    feedback.style.position = 'fixed';
    feedback.style.top = '20px';
    feedback.style.right = '20px';
    feedback.style.padding = '12px 20px';
    feedback.style.borderRadius = '8px';
    feedback.style.zIndex = '10001';
    feedback.style.fontWeight = '500';
    feedback.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    
    if (type === 'success') {
        feedback.style.background = '#10b981';
        feedback.style.color = 'white';
    } else if (type === 'error') {
        feedback.style.background = '#ef4444';
        feedback.style.color = 'white';
    } else {
        feedback.style.background = 'var(--bg-secondary)';
        feedback.style.color = 'var(--text-primary)';
        feedback.style.border = '1px solid var(--border-primary)';
    }
    
    document.body.appendChild(feedback);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (feedback && feedback.parentNode) {
            feedback.remove();
        }
    }, 3000);
}

// Clear debug console
if (clearDebugBtn && debugOutput) {
    clearDebugBtn.onclick = () => {
        debugOutput.textContent = '';
    };
}

// Navigation button handlers - updated to work with view modes
if (prevMonthBtn) {
    prevMonthBtn.onclick = () => {
        navigatePrevious();
    };
}

if (nextMonthBtn) {
    nextMonthBtn.onclick = () => {
        navigateNext();
    };
}

async function navigatePrevious() {
    const originalViewMode = currentViewMode; // Preserve view mode
    
    switch (currentViewMode) {
        case VIEW_MODES.MONTH:
            currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
            break;
        case VIEW_MODES.WEEK:
            currentDisplayDate.setDate(currentDisplayDate.getDate() - 7);
            break;
        case VIEW_MODES.DAY:
            currentDisplayDate.setDate(currentDisplayDate.getDate() - 1);
            break;
    }
    
    // Ensure view mode is preserved
    currentViewMode = originalViewMode;
    
    // Load events - loadCalendarEventsForMonth will render when complete
    if (accessToken) {
        await loadCalendarEventsForMonth(currentDisplayDate);
    } else {
        renderCurrentView();
    }
}

async function navigateNext() {
    const originalViewMode = currentViewMode; // Preserve view mode
    
    switch (currentViewMode) {
        case VIEW_MODES.MONTH:
            currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
            break;
        case VIEW_MODES.WEEK:
            currentDisplayDate.setDate(currentDisplayDate.getDate() + 7);
            break;
        case VIEW_MODES.DAY:
            currentDisplayDate.setDate(currentDisplayDate.getDate() + 1);
            break;
    }
    
    // Ensure view mode is preserved
    currentViewMode = originalViewMode;
    
    // Load events - loadCalendarEventsForMonth will render when complete
    if (accessToken) {
        await loadCalendarEventsForMonth(currentDisplayDate);
    } else {
        renderCurrentView();
    }
}

// Initialize login button and UI state
updateLoginButton('Loading...', null, true);

// Set initial UI state - show login section, hide dashboard and user section
if (loginSection) loginSection.style.display = 'block';
if (userSection) userSection.style.display = 'none';
if (dashboard) dashboard.style.display = 'none';

// Initialize theme and view mode
initializeTheme();
initializeViewMode();

debugLog('Calendar app initialized');

// Load configuration - handles both development (server.py) and production (GitHub Pages)
async function loadConfig() {
    try {
        debugLog('Loading config...');
        
        // Try to load from server first (development with server.py)
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const config = await response.json();
                CLIENT_ID = config.clientId;
                API_KEY = config.apiKey;
                debugLog('Config loaded from development server');
            } else {
                throw new Error('Server config not available');
            }
        } catch (serverError) {
            // Fallback to static config file (production on GitHub Pages)
            debugLog('Server config not available, trying static config...');
            try {
                const response = await fetch('./api/config.json');
                if (response.ok) {
                    const config = await response.json();
                    CLIENT_ID = config.CLIENT_ID;
                    API_KEY = config.API_KEY;
                    debugLog('Config loaded from static file (GitHub Pages)');
                } else {
                    throw new Error('Static config not available');
                }
            } catch (staticError) {
                throw new Error(`Both server (${serverError.message}) and static (${staticError.message}) config failed`);
            }
        }
        
        debugLog(`Config loaded - Client ID: ${CLIENT_ID ? 'Set' : 'Not set'}, API Key: ${API_KEY ? 'Set' : 'Not set'}`);
        
        if (!CLIENT_ID || !API_KEY) {
            debugLog('Missing CLIENT_ID or API_KEY from config', 'error');
            updateLoginButton('Config Error', null, true);
            if (loginSection) loginSection.style.display = 'block';
            return false;
        }
        
        return true;
    } catch (error) {
        debugLog(`Failed to load config: ${error.message}`, 'error');
        updateLoginButton('Config Load Error', null, true);
        if (loginSection) loginSection.style.display = 'block';
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
    currentDisplayDate = new Date(); // Reset to current date when showing calendar
    
    // Ensure panel visibility is correct for the current view mode
    updatePanelVisibility();
    
    // Load events - loadCalendarEventsForMonth will call renderCurrentView() when done
    if (accessToken) {
        await loadCalendarEventsForMonth(currentDisplayDate);
    } else {
        renderCurrentView();
    }
    
    // Show today's events after everything is loaded and rendered
    if (accessToken) {
        showTodaysEvents();
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
            accessToken = storedToken;
            
            // Set the token for gapi.client
            gapi.client.setToken({
                access_token: accessToken
            });
            
            // Small delay to ensure token is fully set
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Show calendar interface
            await showCalendar();
            
            // Update login button to show sign out option
            updateLoginButton('Sign Out', handleSignoutClick, false);
        } else {
            debugLog('No valid stored token, showing login button');
            updateLoginButton('Login with Google', handleAuthClick, false);
            // Ensure login section is visible and dashboard is hidden
            if (loginSection) loginSection.style.display = 'block';
            if (userSection) userSection.style.display = 'none';
            if (dashboard) dashboard.style.display = 'none';
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
    // Determine the appropriate date range based on current view mode
    let startDate, endDate, rangeDescription;
    
    if (currentViewMode === VIEW_MODES.WEEK) {
        // For week view, load the entire week (which may span months)
        startDate = getWeekStart(date);
        endDate = getWeekEnd(date);
        rangeDescription = `week of ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    } else if (currentViewMode === VIEW_MODES.DAY) {
        // For day view, load the specific day plus some buffer
        startDate = new Date(date);
        endDate = new Date(date);
        rangeDescription = `day ${date.toLocaleDateString()}`;
    } else {
        // For month view, load the entire month
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        rangeDescription = `${date.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
    }
    
    debugLog(`Loading calendar events for ${rangeDescription}...`);
    
    // Check if we have an access token
    if (!accessToken) {
        debugLog('No access token available', 'error');
        return;
    }
    
    // Ensure the token is set on gapi.client
    gapi.client.setToken({
        access_token: accessToken
    });
    
    try {
        const request = {
            'calendarId': 'primary',
            'timeMin': startDate.toISOString(),
            'timeMax': new Date(endDate.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Add 1 day to include end date
            'showDeleted': false,
            'singleEvents': true,
            'orderBy': 'startTime'
        };
        
        const response = await gapi.client.calendar.events.list(request);
        const events = response.result.items;
        debugLog(`Found ${events.length} events for ${rangeDescription}`);
        
        // Clear existing events for the date range and add new ones
        const startDateStr = formatDateForCalendar(startDate);
        const endDateStr = formatDateForCalendar(endDate);
        
        // Remove events from eventsByDate that belong to this date range
        Object.keys(eventsByDate).forEach(dateKey => {
            if (dateKey >= startDateStr && dateKey <= endDateStr) {
                delete eventsByDate[dateKey];
            }
        });
        
        // Clear and update global events array for drag & drop
        allEvents = [...events];
        
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
        
        // Re-render current view with event indicators
        renderCurrentView();
        
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
            let eventDate;
            if (event.start.date) {
                // All-day event - parse as local date to avoid timezone shifts
                const [year, month, day] = event.start.date.split('-').map(Number);
                eventDate = new Date(year, month - 1, day).toLocaleDateString();
            } else {
                // Timed event - use the dateTime as-is
                eventDate = new Date(event.start.dateTime).toLocaleDateString();
            }
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
        
        // Store events for editing and drag & drop
        window.currentEvents = events;
        // Update global events array (merge with existing to avoid losing other events)
        events.forEach(event => {
            if (!allEvents.find(e => e.id === event.id)) {
                allEvents.push(event);
            }
        });
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

function showSelectedDateEvents() {
    debugLog('Showing events for selected date...');
    
    // If we have a selected date, show events for that date
    if (window.selectedDate) {
        debugLog(`Showing events for selected date: ${window.selectedDate}`);
        showDayEvents(window.selectedDate);
    } else {
        // Fallback to today's events if no date is selected
        debugLog('No selected date found, falling back to today\'s events');
        showTodaysEvents();
    }
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
            // Parse dateStr as local date to avoid timezone shifts
            const [year, month, day] = dateStr.split('-').map(Number);
            const displayDate = new Date(year, month - 1, day).toLocaleDateString();
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
    
    // For week view, we need to search across all events in eventsByDate
    let event = null;
    
    if (window.currentEvents) {
        event = window.currentEvents.find(e => e.id === eventId);
    }
    
    // If not found in currentEvents, search in all eventsByDate
    if (!event) {
        debugLog('🔍 Event not found in currentEvents, searching all events...');
        Object.values(eventsByDate).flat().forEach(e => {
            if (e.id === eventId) {
                event = e;
            }
        });
    }
    
    if (!event) {
        debugLog(`❌ Event not found: ${eventId}`, 'error');
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
        const deleteBtn = document.getElementById('delete-event-btn');
        
        if (isNew) {
            if (editTitle) editTitle.textContent = 'Create New Event';
            if (saveBtn) saveBtn.textContent = 'Create Event';
            // Hide delete button for new events
            if (deleteBtn) deleteBtn.style.display = 'none';
        } else {
            if (editTitle) editTitle.textContent = 'Edit Event';
            if (saveBtn) saveBtn.textContent = 'Save Changes';
            // Show delete button for existing events
            if (deleteBtn) {
                deleteBtn.style.display = 'inline-block';
                deleteBtn.classList.remove('confirm-mode');
                deleteBtn.textContent = 'Delete Event';
                deleteBtn.disabled = false;
            }
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
    
    // Reset delete button state
    const deleteBtn = document.getElementById('delete-event-btn');
    if (deleteBtn) {
        deleteBtn.classList.remove('confirm-mode');
        deleteBtn.textContent = 'Delete Event';
        deleteBtn.disabled = false;
    }
    
    // Clear any pending delete confirmation timeout
    if (deleteConfirmTimeout) {
        clearTimeout(deleteConfirmTimeout);
        deleteConfirmTimeout = null;
    }
    
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
        
        // Refresh the current view and show events
        renderCurrentView();
        showSelectedDateEvents();
        
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

// Delete event function
async function deleteEvent() {
    if (!currentEditingEvent) {
        debugLog('❌ No event selected for deletion', 'error');
        return;
    }
    
    const deleteBtn = document.getElementById('delete-event-btn');
    if (!deleteBtn) return;
    
    try {
        // Disable button during deletion
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting...';
        
        debugLog(`🗑️ Deleting event: ${currentEditingEvent.id}`);
        
        // Make API call to delete event
        await gapi.client.calendar.events.delete({
            calendarId: 'primary',
            eventId: currentEditingEvent.id
        });
        
        debugLog('✅ Event deleted successfully!');
        
        // Refresh events list and calendar
        await loadCalendarEventsForMonth(currentDisplayDate);
        
        // Refresh the current view and show events
        renderCurrentView();
        showSelectedDateEvents();
        
        // Hide edit form
        hideEditForm();
        
    } catch (error) {
        debugLog(`Error deleting event: ${error.message || error}`, 'error');
        
        // Handle authentication errors
        if (error.status === 401 || error.status === 403) {
            debugLog('Authentication expired during event deletion, clearing stored token');
            clearTokenStorage();
            debugLog('⚠️ Authentication expired. Please sign in again.', 'warn');
            handleSignoutClick();
        } else {
            debugLog(`❌ Failed to delete event: ${error.message || 'Unknown error'}`, 'error');
        }
        
        // Reset button state on error
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete Event';
        deleteBtn.classList.remove('confirm-mode');
    }
}

// Handle delete button click with confirmation
let deleteConfirmTimeout = null;
function handleDeleteClick() {
    const deleteBtn = document.getElementById('delete-event-btn');
    if (!deleteBtn) return;
    
    // If already in confirm mode, proceed with deletion
    if (deleteBtn.classList.contains('confirm-mode')) {
        deleteEvent();
        return;
    }
    
    // Switch to confirm mode
    deleteBtn.classList.add('confirm-mode');
    deleteBtn.textContent = 'Are you sure?';
    
    // Clear any existing timeout
    if (deleteConfirmTimeout) {
        clearTimeout(deleteConfirmTimeout);
    }
    
    // Reset to normal after 3 seconds if no second click
    deleteConfirmTimeout = setTimeout(() => {
        deleteBtn.classList.remove('confirm-mode');
        deleteBtn.textContent = 'Delete Event';
        deleteConfirmTimeout = null;
    }, 3000);
}

// Event listeners for edit form
document.addEventListener('DOMContentLoaded', () => {
    // Save button
    document.getElementById('save-event-btn').addEventListener('click', saveEventChanges);
    
    // Delete button
    document.getElementById('delete-event-btn').addEventListener('click', handleDeleteClick);
    
    // Cancel button
    document.getElementById('cancel-edit-btn').addEventListener('click', hideEditForm);
    
    // Close button (X)
    document.getElementById('close-edit-btn').addEventListener('click', hideEditForm);
    
    // Event delegation for clicking on event items
    document.addEventListener('click', (e) => {
        debugLog(`🖱️ Click detected on: ${e.target.tagName} with classes: ${e.target.className}`);
        
        const eventItem = e.target.closest('.event-item[data-event-id]');
        if (eventItem) {
            // Only handle click if we're not in the middle of a drag operation
            if (!isDragging) {
                const eventId = eventItem.getAttribute('data-event-id');
                debugLog(`🎯 Event item clicked via delegation: ${eventId}`);
                editEvent(eventId);
            }
        } else {
            // Check if click was on event-related element
            if (e.target.classList.contains('event-item') || e.target.closest('.event-item')) {
                debugLog(`⚠️ Click on event item but no data-event-id found`);
                debugLog(`Element: ${e.target.outerHTML.substring(0, 200)}...`);
            }
        }
    });
    
    // Make event items in events panel draggable when they're added
    const eventsContainer = document.getElementById('events');
    if (eventsContainer) {
        // Use MutationObserver to detect when new event items are added
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Make new event items draggable
                            const eventItems = node.querySelectorAll ? node.querySelectorAll('.event-item[data-event-id]') : [];
                            eventItems.forEach(eventItem => {
                                const eventId = eventItem.getAttribute('data-event-id');
                                const eventData = findEventById(eventId);
                                makeEventDraggable(eventItem, eventId, eventData);
                            });
                            
                            // Also check if the node itself is an event item
                            if (node.classList && node.classList.contains('event-item')) {
                                const eventId = node.getAttribute('data-event-id');
                                if (eventId) {
                                    const eventData = findEventById(eventId);
                                    makeEventDraggable(node, eventId, eventData);
                                }
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(eventsContainer, { childList: true, subtree: true });
    }
    
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

// Phase 5: Current Time Indicator Functions
function initializeCurrentTimeIndicator() {
    debugLog('🕐 Initializing current time indicator');
    
    // Update immediately and then every minute
    updateCurrentTimeLine();
    
    // Clear any existing interval
    if (currentTimeLineInterval) {
        clearInterval(currentTimeLineInterval);
    }
    
    // Update every minute (60000ms)
    currentTimeLineInterval = setInterval(updateCurrentTimeLine, 60000);
}

function updateCurrentTimeLine() {
    // Only show time line in week and day views
    if (currentViewMode === VIEW_MODES.WEEK || currentViewMode === VIEW_MODES.DAY) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        
        // Check if we're viewing today
        const isViewingToday = isViewingCurrentDay();
        
        // Only show if current time is within our displayed range (6 AM - 10 PM) AND we're viewing today
        if (currentHour >= 6 && currentHour <= 22 && isViewingToday) {
            showCurrentTimeLine(currentHour, currentMinutes);
        } else {
            hideCurrentTimeLine();
        }
    } else {
        hideCurrentTimeLine();
    }
}

function showCurrentTimeLine(hour, minutes) {
    // Remove existing time line
    const existingLine = document.getElementById('current-time-line');
    if (existingLine) {
        existingLine.remove();
    }
    
    // Calculate position based on current time
    const timeLinePosition = calculateTimePosition(hour, minutes);
    
    if (timeLinePosition === null) return;
    
    // Create time line element
    const timeLine = document.createElement('div');
    timeLine.id = 'current-time-line';
    timeLine.className = 'current-time-indicator';
    
    // Add time label
    const timeLabel = document.createElement('div');
    timeLabel.className = 'current-time-label';
    timeLabel.textContent = formatCurrentTime(hour, minutes);
    
    const timeLineLine = document.createElement('div');
    timeLineLine.className = 'current-time-line';
    
    timeLine.appendChild(timeLabel);
    timeLine.appendChild(timeLineLine);
    
    // Position the time line
    timeLine.style.position = 'absolute';
    timeLine.style.top = timeLinePosition.top + 'px';
    timeLine.style.left = timeLinePosition.left + 'px';
    timeLine.style.right = timeLinePosition.right + 'px';
    timeLine.style.zIndex = '100';
    
    // Find the appropriate container
    const container = currentViewMode === VIEW_MODES.WEEK ? 
        document.querySelector('.week-content') : 
        document.querySelector('.day-content');
    
    if (container) {
        container.style.position = 'relative';
        container.appendChild(timeLine);
        debugLog(`🕐 Current time line shown at ${hour}:${minutes.toString().padStart(2, '0')}`);
    }
}

function calculateTimePosition(hour, minutes) {
    const startHour = 6;
    const endHour = 22;
    
    if (hour < startHour || hour > endHour) return null;
    
    if (currentViewMode === VIEW_MODES.WEEK) {
        // Week view positioning - only show on today's column
        const hourRows = document.querySelectorAll('.week-row');
        const targetRowIndex = hour - startHour;
        
        if (hourRows[targetRowIndex]) {
            const row = hourRows[targetRowIndex];
            const rect = row.getBoundingClientRect();
            const containerRect = document.querySelector('.week-content').getBoundingClientRect();
            
            // Find today's column index
            const today = new Date();
            const weekStart = getWeekStart(currentDisplayDate);
            const todayColumnIndex = Math.floor((today - weekStart) / (1000 * 60 * 60 * 24));
            
            // Only show if today is within the current week (0-6)
            if (todayColumnIndex < 0 || todayColumnIndex > 6) return null;
            
            // Calculate the width of each day column (total width - time label width) / 7 days
            const timeSlots = row.querySelectorAll('.time-slot');
            if (!timeSlots[todayColumnIndex]) return null;
            
            const todaySlot = timeSlots[todayColumnIndex];
            const slotRect = todaySlot.getBoundingClientRect();
            
            // Calculate exact position within the hour based on minutes
            const minuteOffset = (minutes / 60) * row.offsetHeight;
            
            return {
                top: (rect.top - containerRect.top) + minuteOffset,
                left: slotRect.left - containerRect.left,
                right: containerRect.right - slotRect.right
            };
        }
    } else if (currentViewMode === VIEW_MODES.DAY) {
        // Day view positioning (30-minute intervals)
        const timeSlotIndex = ((hour - startHour) * 2) + (minutes >= 30 ? 1 : 0);
        const timeRows = document.querySelectorAll('.day-time-row');
        
        if (timeRows[timeSlotIndex]) {
            const row = timeRows[timeSlotIndex];
            const rect = row.getBoundingClientRect();
            const containerRect = document.querySelector('.day-content').getBoundingClientRect();
            
            // For day view, calculate position within the 30-minute slot
            const slotMinutes = minutes % 30;
            const minuteOffset = (slotMinutes / 30) * row.offsetHeight;
            
            return {
                top: (rect.top - containerRect.top) + minuteOffset,
                left: 120, // Skip time label column
                right: 0
            };
        }
    }
    
    return null;
}

function formatCurrentTime(hour, minutes) {
    const hourStr = hour === 0 ? '12' : hour > 12 ? (hour - 12).toString() : hour.toString();
    const minuteStr = minutes.toString().padStart(2, '0');
    const period = hour < 12 ? 'AM' : 'PM';
    return `${hourStr}:${minuteStr} ${period}`;
}

function hideCurrentTimeLine() {
    const existingLine = document.getElementById('current-time-line');
    if (existingLine) {
        existingLine.remove();
    }
}

function isViewingCurrentDay() {
    const today = new Date();
    const todayStr = formatDateForCalendar(today);
    
    if (currentViewMode === VIEW_MODES.DAY) {
        // In day view, check if currentDisplayDate is today
        const displayDateStr = formatDateForCalendar(currentDisplayDate);
        return displayDateStr === todayStr;
    } else if (currentViewMode === VIEW_MODES.WEEK) {
        // In week view, check if today falls within the current week
        const weekStart = getWeekStart(currentDisplayDate);
        const weekEnd = getWeekEnd(currentDisplayDate);
        
        return today >= weekStart && today <= weekEnd;
    }
    
    return false;
}

// Header Clock Functions
function initializeHeaderClock() {
    debugLog('🕐 Initializing header clock');
    
    // Update immediately and then every minute
    updateHeaderClock();
    
    // Clear any existing interval
    if (headerClockInterval) {
        clearInterval(headerClockInterval);
    }
    
    // Update every minute (60000ms)
    headerClockInterval = setInterval(updateHeaderClock, 60000);
}

function updateHeaderClock() {
    const headerTitle = document.querySelector('.app-title');
    if (headerTitle) {
        const now = new Date();
        const dateTimeString = formatHeaderDateTime(now);
        headerTitle.textContent = dateTimeString;
        debugLog(`🕐 Updated header clock: ${dateTimeString}`);
    }
}

function formatHeaderDateTime(date) {
    // Format: "September 28, 2025 • 10:45 PM"
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    };
    
    const dateStr = date.toLocaleDateString('en-US', options);
    
    // Format time with AM/PM
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    const minutesStr = minutes.toString().padStart(2, '0');
    const timeStr = `${hours}:${minutesStr} ${ampm}`;
    
    return `${dateStr} • ${timeStr}`;
}

// Initialize drag and drop system
initializeDragAndDrop();

// Initialize events arrays
allEvents = [];
window.currentEvents = [];

// Phase 5: Initialize current time indicator
initializeCurrentTimeIndicator();

// Phase 5: Initialize header clock
initializeHeaderClock();

// Phase 5: Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (currentTimeLineInterval) {
        clearInterval(currentTimeLineInterval);
    }
    if (headerClockInterval) {
        clearInterval(headerClockInterval);
    }
});

// Show calendar for non-logged-in users (demo only)
renderCurrentView();
