/* Timeline View for Classes Page
   Fetches live data from API and displays in chronological timeline format.
*/

const API_BASE = '/api';

// Utility functions
function formatTime(dtStr) {
  const d = new Date(dtStr.replace(' ', 'T'));
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDate(dtStr) {
  const d = new Date(dtStr.replace(' ', 'T'));
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDay(dtStr) {
  const d = new Date(dtStr.replace(' ', 'T'));
  return d.getDate();
}

function getWeekday(dtStr) {
  const d = new Date(dtStr.replace(' ', 'T'));
  return d.toLocaleDateString(undefined, { weekday: 'long' });
}

function getMonthYear(dtStr) {
  const d = new Date(dtStr.replace(' ', 'T'));
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function getDateKey(dtStr) {
  const d = new Date(dtStr.replace(' ', 'T'));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toMonthKey(dtStr) {
  const d = new Date(dtStr.replace(' ', 'T'));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function seatsLeft(session) {
  if (!session.max_capacity) return null;
  return Math.max(0, session.max_capacity - (session.registrations || 0));
}

// DOM refs
const timelineEl = document.getElementById('timeline-container');
const filterMonthEl = document.getElementById('filter-month');
const filterResetEl = document.getElementById('filter-reset');
const courseTabsEl = document.getElementById('course-tabs');

// Modal refs
const modalEl = document.getElementById('signup-modal');
const signupForm = document.getElementById('signup-form');
const signupCancelBtn = document.getElementById('signup-cancel');
const signupMetaEl = document.getElementById('signup-meta');
const signupCapacityEl = document.getElementById('signup-capacity');
const signupSuccessEl = document.getElementById('signup-success');

// State
let sessions = [];
let activeCourseFilter = '';
let activeMonthFilter = '';
let activeSessionId = null;

// Fetch sessions from API
async function fetchSessions() {
  try {
    const response = await fetch(`${API_BASE}/classes.php?public=true`);
    if (!response.ok) throw new Error('Failed to fetch classes');
    
    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      // Filter to only show future classes
      const now = new Date();
      sessions = result.data.filter(s => {
        if (!s.start_datetime) return false;
        const startDate = new Date(s.start_datetime.replace(' ', 'T'));
        return startDate >= now;
      });
      
      renderTimeline();
    } else {
      showError('Failed to load class schedule');
    }
  } catch (error) {
    console.error('Error fetching sessions:', error);
    showError('Unable to load class schedule. Please try again later.');
  }
}

// Group sessions by date
function groupByDate(sessionList) {
  const groups = {};
  sessionList.forEach(s => {
    const key = getDateKey(s.start_datetime);
    if (!groups[key]) {
      groups[key] = {
        dateKey: key,
        dateStr: s.start_datetime,
        sessions: []
      };
    }
    groups[key].sessions.push(s);
  });
  
  // Convert to array and sort by date
  return Object.values(groups).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function renderTimeline() {
  let filtered = [...sessions];
  
  // Apply course filter
  if (activeCourseFilter) {
    filtered = filtered.filter(s => s.course_type === activeCourseFilter);
  }
  
  // Apply month filter
  if (activeMonthFilter) {
    filtered = filtered.filter(s => toMonthKey(s.start_datetime) === activeMonthFilter);
  }
  
  // Sort by start time
  filtered.sort((a, b) => {
    const dateA = new Date(a.start_datetime.replace(' ', 'T'));
    const dateB = new Date(b.start_datetime.replace(' ', 'T'));
    return dateA - dateB;
  });
  
  if (filtered.length === 0) {
    timelineEl.innerHTML = `
      <div class="no-sessions-msg">
        <h3>No classes found</h3>
        <p>Try adjusting your filters to see more available sessions.</p>
      </div>
    `;
    return;
  }
  
  // Group by date
  const dateGroups = groupByDate(filtered);
  
  timelineEl.innerHTML = dateGroups.map(group => {
    const sessionsHtml = group.sessions.map(s => {
      const left = seatsLeft(s);
      const full = left !== null && left <= 0;
      const fewLeft = left !== null && left > 0 && left <= 3;
      
      return `
        <div class="timeline-session-card">
          <div class="session-time">${formatTime(s.start_datetime)}</div>
          <div class="session-course">${s.course_type}</div>
          <div class="session-location">📍 ${s.location || 'TBD'}</div>
          <div class="session-footer">
            <div class="capacity-badge ${full ? 'full' : fewLeft ? 'few-left' : ''}">
              ${full ? 'Class Full' : left !== null ? `${left} spot${left === 1 ? '' : 's'} left` : 'Register'}
            </div>
            <button 
              class="btn ${full ? 'btn-secondary' : 'btn-primary'} btn-small" 
              data-signup="${s.id}"
              ${full ? 'disabled' : ''}>
              ${full ? 'Full' : 'Sign Up'}
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <div class="date-group">
        <div class="date-header">
          <div class="date-day">${getDay(group.dateStr)}</div>
          <div class="date-info">
            <div class="date-weekday">${getWeekday(group.dateStr)}</div>
            <div class="date-month-year">${getMonthYear(group.dateStr)}</div>
          </div>
        </div>
        <div class="timeline-sessions">
          ${sessionsHtml}
        </div>
      </div>
    `;
  }).join('');
  
  // Attach sign up event listeners
  timelineEl.querySelectorAll('[data-signup]').forEach(btn => {
    btn.addEventListener('click', e => {
      const sid = parseInt(e.currentTarget.getAttribute('data-signup'));
      openSignup(sid);
    });
  });
}

function showError(message) {
  timelineEl.innerHTML = `
    <div class="no-sessions-msg">
      <h3>Error</h3>
      <p>${message}</p>
    </div>
  `;
}

function setupFilters() {
  // Course tabs
  courseTabsEl.querySelectorAll('.course-tab').forEach(tab => {
    tab.addEventListener('click', e => {
      const course = e.currentTarget.getAttribute('data-course');
      activeCourseFilter = course;
      
      // Update active state
      courseTabsEl.querySelectorAll('.course-tab').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      renderTimeline();
    });
  });
  
  // Month filter
  filterMonthEl.addEventListener('change', () => {
    activeMonthFilter = filterMonthEl.value;
    renderTimeline();
  });
  
  // Reset button
  filterResetEl.addEventListener('click', () => {
    activeCourseFilter = '';
    activeMonthFilter = '';
    filterMonthEl.value = '';
    
    // Reset course tabs
    courseTabsEl.querySelectorAll('.course-tab').forEach(t => t.classList.remove('active'));
    courseTabsEl.querySelector('[data-course=""]').classList.add('active');
    
    renderTimeline();
  });
}

function openSignup(sessionId) {
  const s = sessions.find(x => x.id === sessionId);
  if (!s) return;
  
  activeSessionId = sessionId;
  signupMetaEl.textContent = `${s.course_type} • ${formatDate(s.start_datetime)} at ${formatTime(s.start_datetime)} • ${s.location || 'TBD'}`;
  
  const left = seatsLeft(s);
  signupCapacityEl.textContent = left === null ? 'Register' : (left <= 0 ? 'Class Full' : `${left} spot${left === 1 ? '' : 's'} left`);
  signupCapacityEl.className = 'capacity-badge' + (left !== null && left <= 0 ? ' full' : left !== null && left <= 3 ? ' few-left' : '');
  
  signupSuccessEl.style.display = 'none';
  signupForm.style.display = 'block';
  modalEl.classList.add('open');
  
  // Focus first field
  document.getElementById('su-first').focus();
}

function closeSignup() {
  modalEl.classList.remove('open');
  activeSessionId = null;
  signupForm.reset();
}

// Form submission
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = signupForm.querySelector('button[type=submit]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Registering…';
  submitBtn.disabled = true;
  
  const formData = {
    class_id: activeSessionId,
    first_name: document.getElementById('su-first').value.trim(),
    last_name: document.getElementById('su-last').value.trim(),
    email: document.getElementById('su-email').value.trim(),
    phone: document.getElementById('su-phone').value.trim()
  };
  
  try {
    const response = await fetch(`${API_BASE}/register.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      signupForm.style.display = 'none';
      signupSuccessEl.style.display = 'block';
      
      // Refresh session data
      await fetchSessions();
      
      // Auto-close after showing success
      setTimeout(() => closeSignup(), 2500);
    } else {
      alert(result.message || 'Registration failed. Please try again.');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  } catch (error) {
    console.error('Registration error:', error);
    alert('Registration failed. Please try again.');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

signupCancelBtn.addEventListener('click', closeSignup);
modalEl.addEventListener('click', e => {
  if (e.target === modalEl) closeSignup();
});
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalEl.classList.contains('open')) closeSignup();
});

// Initialize
setupFilters();
fetchSessions();

console.debug('[Classes] Timeline view initialized with API integration');
