/* Versioned alias for cache-busting; copies current script20251106.js with relative API base */

/**
 * FRONTLINECPR911 PUBLIC SITE JAVASCRIPT (v3)
 */

const API_BASE_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const menuButton = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav ul');
    
    if (menuButton && mainNav) {
        menuButton.addEventListener('click', () => {
            const isOpen = mainNav.classList.toggle('open');
            if (isOpen) {
                // eslint-disable-next-line no-unused-expressions
                mainNav.offsetHeight;
                mainNav.classList.add('show');
            } else {
                mainNav.classList.remove('show');
            }
            menuButton.setAttribute('aria-expanded', isOpen);
        });
    }

    // Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (mainNav && window.innerWidth < 768) {
                    mainNav.classList.remove('show');
                    mainNav.classList.remove('open');
                    menuButton.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });

    // ----------------------------------------------------
    // Class Loading & Rendering Logic (with fallback)
    // ----------------------------------------------------
    const classListContainer = document.getElementById('class-list-container');
    const groupRequestForm = document.getElementById('group-request-form');
    
    async function loadUpcomingClasses() {
        if (classListContainer) {
            classListContainer.innerHTML = '<p class="intro-text">Loading schedule…</p>';
        }
        try {
            let classes = await fetchJson(`${API_BASE_URL}/classes`);
            if (!Array.isArray(classes)) {
                throw new Error('Unexpected API response shape');
            }
            renderClassList(classes);
        } catch (apiError) {
            console.warn('Primary API failed, attempting local fallback…', apiError);
            try {
                const fallback = await fetchJson('assets/data/classes.json');
                renderClassList(Array.isArray(fallback) ? fallback : []);
            } catch (fallbackError) {
                console.error('Fallback load failed:', fallbackError);
                if (classListContainer) {
                    classListContainer.innerHTML = '<p class="intro-text" style="color: var(--color-primary);">Error loading schedule. Please refresh the page.</p>';
                }
            }
        }
    }

    async function fetchJson(url) {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        return res.json();
    }

    function renderClassList(classes) {
        if (!classListContainer) return;
        if (!classes || classes.length === 0) {
            classListContainer.innerHTML = '<p class="intro-text">No upcoming classes are scheduled at this time. Please check back soon!</p>';
            return;
        }
        classListContainer.innerHTML = '';
        classes.forEach(classData => {
            const card = createClassCard(classData);
            classListContainer.appendChild(card);
        });
        attachRegistrationListeners();
    }

    function createClassCard(data) {
        const spotsLeft = data.maxCapacity - data.registrations;
        const isFull = spotsLeft <= 0;
        const card = document.createElement('article');
        card.className = `class-card ${isFull ? 'sold-out' : ''}`;
        card.innerHTML = `
            <div class="class-info">
                <h3>${data.courseName}</h3>
                <p class="details">
                    **📅 Date:** ${new Date(data.classDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} <br>
                    **⏱ Time:** ${data.startTime} <br>
                    **📍 Location:** ${data.location}
                </p>
                <p class="capacity">
                    **${isFull ? 'Status: Class Full' : `Spots Available: ${spotsLeft} / ${data.maxCapacity}`}**
                </p>
            </div>
            <div class="class-action">
                <span class="price">$${data.price}</span>
                ${isFull 
                    ? `<button class="btn btn-secondary" disabled>Waitlist Only</button>` 
                    : `<a href="#registration-form" class="btn btn-primary register-btn" data-class-id="${data._id}" data-course-name="${data.courseName}">Register Now</a>`
                }
            </div>
        `;
        return card;
    }

    function attachRegistrationListeners() {
        const registerButtons = document.querySelectorAll('.register-btn');
        registerButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault(); 
                const classId = button.getAttribute('data-class-id');
                const courseName = button.getAttribute('data-course-name');
                const classDateElement = button.closest('.class-card').querySelector('.details');
                const match = classDateElement ? classDateElement.textContent.match(/📅 Date: ([^<]+)/) : null;
                const classDateText = match ? match[1].trim() : '';
                const selectedClassInput = document.getElementById('selected_class');
                if (selectedClassInput) selectedClassInput.value = `${courseName} - ${classDateText}`;
                const hiddenId = document.getElementById('registration_class_id');
                if (hiddenId) hiddenId.value = classId;
                const regForm = document.getElementById('registration-form');
                if (regForm) regForm.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    // Group Request Form Submission
    const banner = document.getElementById('group-form-banner');
    const locationSelect = document.getElementById('location_pref');
    const addressGroup = document.getElementById('address_field_group');
    if (locationSelect && addressGroup) {
        const updateAddressVisibility = () => {
            const show = locationSelect.value === 'At your location';
            addressGroup.classList.toggle('hidden', !show);
            const addressInput = addressGroup.querySelector('input');
            if (addressInput) addressInput.required = show;
        };
        updateAddressVisibility();
        locationSelect.addEventListener('change', updateAddressVisibility);
    }

    if (groupRequestForm) {
        groupRequestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = groupRequestForm.querySelector('.submit-btn');
            const original = submitBtn.textContent;
            submitBtn.textContent = 'Sending…';
            submitBtn.disabled = true;

            const payload = Object.fromEntries(new FormData(groupRequestForm).entries());
            const count = parseInt(payload.participants, 10);
            if (Number.isNaN(count) || count < 1) {
                if (banner) {
                    banner.className = 'alert error';
                    banner.textContent = 'Please enter at least 1 participant.';
                    banner.classList.remove('hidden');
                } else {
                    alert('Please enter at least 1 participant.');
                }
                submitBtn.textContent = original;
                submitBtn.disabled = false;
                return;
            }
            try {
                const resp = await fetch(`${API_BASE_URL}/group_request.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                let result = {};
                try { result = await resp.json(); } catch (_) {}
                if (resp.ok && (result.success === undefined || result.success === true)) {
                    if (banner) {
                        banner.className = 'alert success';
                        banner.textContent = 'Thanks! Your group training request has been received. We will reach out to coordinate scheduling and a quote.';
                        banner.classList.remove('hidden');
                    } else {
                        alert('Thanks! Your group training request has been received. We will reach out to coordinate scheduling and a quote.');
                    }
                    groupRequestForm.reset();
                    if (locationSelect) {
                        locationSelect.value = '';
                        const event = new Event('change');
                        locationSelect.dispatchEvent(event);
                    }
                } else {
                    throw new Error(result.message || `Request failed (HTTP ${resp.status})`);
                }
            } catch (err) {
                console.warn('API unavailable, falling back to email', err);
                const lines = [
                    'Group Training Request',
                    '',
                    `Organization: ${groupRequestForm.org_name.value || ''}`,
                    `Contact: ${groupRequestForm.contact_name.value || ''}`,
                    `Email: ${groupRequestForm.email.value || ''}`,
                    `Phone: ${groupRequestForm.phone.value || ''}`,
                    `Course: ${groupRequestForm.course_type.value || ''}`,
                    `Participants: ${groupRequestForm.participants.value || ''}`,
                    `Location: ${groupRequestForm.location_pref.value || ''}`,
                    `Address/City: ${groupRequestForm.address.value || ''}`,
                    `Preferred Dates: ${groupRequestForm.preferred_dates.value || ''}`,
                    `Notes: ${groupRequestForm.notes.value || ''}`,
                ];
                const mailto = `mailto:frontlinecpr911@gmail.com?subject=${encodeURIComponent('Group Training Request')}&body=${encodeURIComponent(lines.join('\n'))}`;
                if (banner) {
                    banner.className = 'alert success';
                    banner.innerHTML = 'We\'ve prepared your request in your email client. If it didn\'t open, <a href="' + mailto + '">click here to open your email</a>.';
                    banner.classList.remove('hidden');
                    banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                window.location.href = mailto;
            } finally {
                submitBtn.textContent = original;
                submitBtn.disabled = false;
            }
        });
    }

    // Kick off classes load if the container exists
    if (classListContainer) {
        loadUpcomingClasses();
    }
});
