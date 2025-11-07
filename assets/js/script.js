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
    // NEW: Class Loading & Rendering Logic
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