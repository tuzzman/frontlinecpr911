/* Versioned alias for cache-busting; copies current script.js */

/**
 * FRONTLINECPR911 PUBLIC SITE JAVASCRIPT (20251106)
 */

const API_BASE_URL = 'https://frontlinecpr911.com/api';

document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const menuButton = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav ul');
    
    if (menuButton && mainNav) {
        // Toggle using a class so CSS handles layout/animation
        menuButton.addEventListener('click', () => {
            const isOpen = mainNav.classList.toggle('open');
            // small delay to allow CSS transition when opening
            if (isOpen) {
                // force reflow then add visible state
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
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                // Close mobile menu if open (mobile only)
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
    const selectedClassInput = document.getElementById('selected_class'); // For registration form

    if (classListContainer) {
        loadUpcomingClasses();
    }
    
    // Function to load data and render class cards
    async function loadUpcomingClasses() {
        // Show loading state
        if (classListContainer) {
            classListContainer.innerHTML = '<p class="intro-text">Loading schedule…</p>';
        }
        try {
            // Try primary API
            let classes = await fetchJson(`${API_BASE_URL}/classes`);

            // If API returns nothing or not an array, fall back
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
                classListContainer.innerHTML = '<p class="intro-text" style="color: var(--color-primary);">Error loading schedule. Please refresh the page.</p>';
            }
        }
    }

    async function fetchJson(url) {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status} for ${url}`);
        }
        return res.json();
    }

    function renderClassList(classes) {
        if (!classes || classes.length === 0) {
            classListContainer.innerHTML = '<p class="intro-text">No upcoming classes are scheduled at this time. Please check back soon!</p>';
            return;
        }

        classListContainer.innerHTML = '';
        classes.forEach(classData => {
            const card = createClassCard(classData);
            classListContainer.appendChild(card);
        });

        // Re-attach the registration listeners after new cards are added
        attachRegistrationListeners();
    }

    // Function to generate the HTML element for a single class
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

    // Function to attach click listeners
    function attachRegistrationListeners() {
        const registerButtons = document.querySelectorAll('.register-btn');
        
        registerButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault(); 
                
                // Get data from the button's data attributes
                const classId = button.getAttribute('data-class-id');
                const courseName = button.getAttribute('data-course-name');
                
                const classDateElement = button.closest('.class-card').querySelector('.details');
                const classDateText = classDateElement ? classDateElement.textContent.match(/📅 Date: ([^<]+)/)[1].trim() : '';

                // Set the value in the hidden inputs on the registration form
                if (selectedClassInput) {
                    selectedClassInput.value = `${courseName} - ${classDateText}`;
                }
                document.getElementById('registration_class_id').value = classId;
                
                document.getElementById('registration-form').scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    // Existing extras (testimonials, metrics, fades, etc.) omitted for brevity in this alias
});
