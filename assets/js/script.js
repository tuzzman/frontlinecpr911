/**
 * FRONTLINECPR911 PUBLIC SITE JAVASCRIPT
 */

const API_BASE_URL = '/api';

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
    // Class Loading & Rendering Logic (public API, no admin auth)
    // ----------------------------------------------------
    const classListContainer = document.getElementById('class-list-container');
    const selectedClassInput = document.getElementById('selected_class'); // For registration form

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function parseClassDate(dtStr) {
        if (!dtStr) return null;
        const parsed = new Date(String(dtStr).replace(' ', 'T'));
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    function isUpcomingClass(classData) {
        const start = parseClassDate(classData && classData.start_datetime);
        return !!(start && start >= new Date());
    }

    function spotsLeft(classData) {
        if (!classData) return null;
        if (classData.spots_left != null && classData.spots_left !== '') {
            return Number(classData.spots_left);
        }
        if (classData.max_capacity == null || classData.max_capacity === '') return null;
        return Math.max(0, Number(classData.max_capacity) - Number(classData.registrations || 0));
    }

    if (classListContainer) {
        loadUpcomingClasses();
    }

    async function loadUpcomingClasses() {
        classListContainer.innerHTML = '<p class="intro-text">Loading schedule…</p>';
        try {
            if (!window.FrontlinePublicApi || typeof window.FrontlinePublicApi.fetchPublicClasses !== 'function') {
                throw new Error('Public API helper is not loaded');
            }
            const classes = await window.FrontlinePublicApi.fetchPublicClasses();
            renderClassList(classes.filter(isUpcomingClass));
        } catch (apiError) {
            console.error('Failed to load class schedule', apiError);
            classListContainer.innerHTML = '<p class="intro-text" style="color: var(--color-primary);">Unable to load class schedule. Please try again later.</p>';
        }
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

        attachRegistrationListeners();
    }
    
    // Testimonials Carousel
    const testimonialContainer = document.querySelector('.testimonials-container');
    if (testimonialContainer) {
        let currentTestimonial = 0;
        const testimonials = testimonialContainer.querySelectorAll('.testimonial');
        const totalTestimonials = testimonials.length;

        // Create navigation dots
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'testimonial-dots';
        testimonials.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.className = `dot ${index === 0 ? 'active' : ''}`;
            dot.setAttribute('aria-label', `Go to testimonial ${index + 1}`);
            dot.addEventListener('click', () => showTestimonial(index));
            dotsContainer.appendChild(dot);
        });
        testimonialContainer.appendChild(dotsContainer);

        function showTestimonial(index) {
            testimonials.forEach(t => t.style.opacity = '0');
            setTimeout(() => {
                testimonials.forEach(t => t.style.display = 'none');
                testimonials[index].style.display = 'block';
                setTimeout(() => {
                    testimonials[index].style.opacity = '1';
                }, 50);
            }, 300);

            // Update dots
            dotsContainer.querySelectorAll('.dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
            currentTestimonial = index;
        }

        // Auto-rotate testimonials
        setInterval(() => {
            const nextTestimonial = (currentTestimonial + 1) % totalTestimonials;
            showTestimonial(nextTestimonial);
        }, 5000);
    }

    // Animated Trust Metrics
    const trustMetrics = document.querySelectorAll('.trust-metric');
    if (trustMetrics.length) {
        const options = {
            threshold: 0.5,
            rootMargin: "0px"
        };

        const animateValue = (element, start, end, duration) => {
            const range = end - start;
            const increment = range / (duration / 16);
            let current = start;
            
            const updateNumber = () => {
                current += increment;
                if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                    element.textContent = end.toLocaleString();
                } else {
                    element.textContent = Math.round(current).toLocaleString();
                    requestAnimationFrame(updateNumber);
                }
            };
            
            requestAnimationFrame(updateNumber);
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target;
                    const endValue = parseInt(target.getAttribute('data-value'), 10);
                    animateValue(target.querySelector('.metric-value'), 0, endValue, 2000);
                    observer.unobserve(target);
                }
            });
        }, options);

        trustMetrics.forEach(metric => observer.observe(metric));
    }

    // Function to generate the HTML element for a single class (PHP public API shape)
    function createClassCard(data) {
        const left = spotsLeft(data);
        const isFull = left !== null && left <= 0;
        const start = parseClassDate(data.start_datetime);
        const dateText = start
            ? start.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : 'TBD';
        const timeText = start
            ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            : 'TBD';
        const priceNum = data.price != null && data.price !== '' ? Number(data.price) : null;
        const priceLabel = priceNum != null && !Number.isNaN(priceNum)
            ? (priceNum % 1 === 0 ? String(priceNum) : priceNum.toFixed(2))
            : '';
        const capacityText = isFull
            ? 'Status: Class Full'
            : (left !== null ? `Spots Available: ${left} / ${data.max_capacity}` : 'Registration open');
        const card = document.createElement('article');
        card.className = `class-card ${isFull ? 'sold-out' : ''}`;

        card.innerHTML = `
            <div class="class-info">
                <h3>${escapeHtml(data.course_type || 'Class')}</h3>
                <p class="details">
                    📅 Date: ${escapeHtml(dateText)} <br>
                    ⏱ Time: ${escapeHtml(timeText)} <br>
                    📍 Location: ${escapeHtml(data.location || 'TBD')}
                </p>
                <p class="capacity">${escapeHtml(capacityText)}</p>
            </div>
            <div class="class-action">
                ${priceLabel ? `<span class="price">$${escapeHtml(priceLabel)}</span>` : ''}
                ${isFull
                    ? `<button class="btn btn-secondary" disabled>Waitlist Only</button>`
                    : `<a href="classes.html" class="btn btn-primary">Register Now</a>`
                }
            </div>
        `;
        return card;
    }
    
    // Function to attach click listeners (including the existing logic for the registration form)
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
                document.getElementById('registration_class_id').value = classId; // NEW HIDDEN FIELD
                
                document.getElementById('registration-form').scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    // Pricing Toggle (if exists)
    const pricingToggle = document.querySelector('.pricing-toggle');
    if (pricingToggle) {
        const annualPrices = document.querySelectorAll('[data-annual-price]');
        const monthlyPrices = document.querySelectorAll('[data-monthly-price]');
        const toggleBtn = pricingToggle.querySelector('button');

        toggleBtn.addEventListener('click', () => {
            const isMonthly = toggleBtn.getAttribute('aria-pressed') === 'true';
            toggleBtn.setAttribute('aria-pressed', !isMonthly);

            annualPrices.forEach(price => {
                price.style.display = isMonthly ? 'block' : 'none';
            });
            monthlyPrices.forEach(price => {
                price.style.display = isMonthly ? 'none' : 'block';
            });
        });
    }

    // Intersection Observer for Fade-In Animation
    const fadeElements = document.querySelectorAll('.fade-in');
    if (fadeElements.length) {
        const fadeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    fadeObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px'
        });

        fadeElements.forEach(element => fadeObserver.observe(element));
    }

    const registrationForm = document.querySelector('.registration-form');
    
    if (registrationForm) {
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = registrationForm.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            
            submitBtn.textContent = 'Processing...';
            submitBtn.disabled = true;

            const formData = Object.fromEntries(new FormData(registrationForm).entries());

            try {
                // Submit to the PHP backend endpoint
                const response = await fetch(`${API_BASE_URL}/register.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    // Success! Now redirect to a confirmation or payment page
                    alert(result.message);
                    
                    // *** Next Step Placeholder: Redirect to Payment ***
                    // window.location.href = `payment.html?clientId=${result.client_id}`;
                    
                    // For now, redirect to the homepage
                    window.location.href = 'index.html'; 
                } else {
                    // Registration failed (e.g., class full, invalid data, duplicate email)
                    alert('Registration Failed: ' + (result.message || 'Unknown error.'));
                }
            } catch (error) {
                console.error('Registration Network Error:', error);
                alert('A network error occurred. Please try again.');
            } finally {
                // Reset button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // ... Existing Mobile Menu Toggle Logic ...
});