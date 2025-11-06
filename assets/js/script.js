/**
 * FRONTLINECPR911 PUBLIC SITE JAVASCRIPT
 * (Includes Mobile Menu Logic from previous step)
 */

const API_BASE_URL = 'https://frontlinecpr911.com/api'; // *** Set your backend URL here ***

document.addEventListener('DOMContentLoaded', () => {
    // ... Existing Mobile Menu Toggle Logic ...

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
        try {
            const response = await fetch(`${API_BASE_URL}/classes`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch classes.');
            }
            
            const classes = await response.json();
            
            if (classes.length === 0) {
                classListContainer.innerHTML = '<p class="intro-text">No upcoming classes are scheduled at this time. Please check back soon!</p>';
                return;
            }

            classListContainer.innerHTML = ''; // Clear the container
            
            classes.forEach(classData => {
                const card = createClassCard(classData);
                classListContainer.appendChild(card);
            });
            
            // Re-attach the registration listeners after new cards are added
            attachRegistrationListeners();

        } catch (error) {
            console.error("Error loading classes:", error);
            classListContainer.innerHTML = '<p class="intro-text" style="color: var(--color-primary);">Error loading schedule. Please refresh the page.</p>';
        }
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
                selectedClassInput.value = `${courseName} - ${classDateText}`;
                document.getElementById('registration_class_id').value = classId; // NEW HIDDEN FIELD
                
                document.getElementById('registration-form').scrollIntoView({ behavior: 'smooth' });
            });
        });
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