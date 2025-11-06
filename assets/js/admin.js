/**
 * FRONTLINECPR911 ADMIN DASHBOARD JAVASCRIPT
 * Handles authentication, dynamic data loading, and CRUD operations.
 */
const API_BASE_URL = 'https://frontlinecpr911.com/api'; // *** Set your backend URL here ***

// --- LOGOUT LOGIC (Runs on all pages where .logout-link exists) ---
const logoutLink = document.querySelector('.logout-link');

if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Use POST for logout actions, although the body is empty
        try {
            const response = await fetch(`${API_BASE_URL}/logout.php`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
            });

            // Redirect regardless of response, as PHP should destroy the session cookie
            window.location.href = '../admin/login.html'; 

        } catch (error) {
            console.error('Logout Network Error:', error);
            window.location.href = '../admin/login.html';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Authentication Check (Placeholder)
    function checkAuth() {
        // ...
    }
    checkAuth();

    // -------------------------------------------------------------------
    // 2. ADMIN LOGIN SUBMISSION LOGIC (Runs ONLY on login.html)
    // -------------------------------------------------------------------
    const loginForm = document.querySelector('.login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const loginButton = document.querySelector('.login-button');
            
            loginButton.textContent = 'Logging in...';
            loginButton.disabled = true;

            // FIX: Define dataToSend with correct variables before fetch
            const dataToSend = {
                username: username,
                password: password
            };

            try {
                const response = await fetch(`${API_BASE_URL}/auth.php`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataToSend) // Now correctly defined
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    window.location.href = 'dashboard.html';
                } else {
                    alert(result.message || 'Login failed. Please try again.');
                    loginButton.textContent = 'Log In';
                    loginButton.disabled = false;
                }
            } catch (error) {
                console.error('Network Error:', error);
                alert('An unexpected error occurred. Please try again later.');
                loginButton.textContent = 'Log In';
                loginButton.disabled = false;
            }
        });
    }
    
    // -------------------------------------------------------------------
    // 3. CLASS MANAGEMENT (CRUD) LOGIC (Runs ONLY on add-class.html)
    // -------------------------------------------------------------------
    const classForm = document.querySelector('.class-management-form');
    
    if (classForm) {
        classForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = Object.fromEntries(new FormData(classForm).entries());
            
            // Format data types correctly
            formData.classDate = formData.class_date;
            formData.startTime = formData.class_time;
            formData.price = parseFloat(formData.price);
            formData.maxCapacity = parseInt(formData.capacity, 10);
            formData.isPublished = formData.is_published === 'on';
            
            const url = `${API_BASE_URL}/classes.php`; // Use classes.php endpoint
            const method = 'POST';
            
            try {
                const response = await fetch(url, { 
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (!response.ok || !result.id) { // Check for successful creation/update
                    throw new Error(result.message || 'Failed to save class.');
                }
                
                alert(`Class successfully ${method === 'POST' ? 'created' : 'updated'}!`);
                window.location.href = 'dashboard.html';

            } catch (error) {
                console.error('Error saving class:', error);
                alert('Error: ' + error.message);
            }
        });
    }

    // -------------------------------------------------------------------
    // 4. CLIENT LIST LOGIC (Runs ONLY on client-list.html)
    // -------------------------------------------------------------------
    
    // FIX: Declare and check element existence BEFORE using them
    const filterForm = document.querySelector('.client-filter-form');
    
    if (filterForm) { 
        // Declare all other variables safely inside this block
        const classSelect = document.getElementById('filter_class');
        
        // FIX: Use a safer selector for rosterTitle (avoids reading nextElementSibling of null)
        const rosterTitle = document.querySelector('.dashboard-table-section h2'); 
        
        const clientTableBody = document.querySelector('.client-data-table tbody');

        if (classSelect && rosterTitle && clientTableBody) {
        
        // A. Load Classes for the Filter Dropdown
            async function loadClassFilterOptions() {
            try {
                const response = await fetch(`${API_BASE_URL}/clients.php?listType=select`, {});
                if (!response.ok) throw new Error('Failed to load classes for filter.');

                const result = await response.json();
                const classes = result.classes;
                
                classSelect.innerHTML = `<option value="all">-- View All Upcoming Classes --</option>`;

                classes.forEach(cls => {
                    const dateStr = new Date(cls.class_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const option = document.createElement('option');
                    option.value = cls.class_id;
                    option.textContent = `${dateStr} - ${cls.course_name} (${cls.registrations} Clients)`;
                    classSelect.appendChild(option);
                });
                
                const initialClassId = classes.length > 0 ? classes[0].class_id : 'all';
                classSelect.value = initialClassId;
                const initialClassName = classes.length > 0 ? classes[0].course_name : 'All Clients';
                
                loadClientData(initialClassId, initialClassName);

            } catch (error) {
                console.error("Error loading class filter:", error);
            }
            }
        
        // B. Load Client Data for the Table
            async function loadClientData(classId, className) {
            let url = `${API_BASE_URL}/clients.php`;
            if (classId) {
                url += `?classId=${classId}`;
            }

            try {
                const response = await fetch(url, {});
                if (!response.ok) throw new Error('Failed to load client data.');

                const clients = await response.json();
                renderClientTable(clients, className);

            } catch (error) {
                console.error("Error loading client data:", error);
                clientTableBody.innerHTML = `<tr><td colspan="6">Error fetching data. Check server connection.</td></tr>`;
            }
            }
        
        // C. Render the Table Rows 
            function renderClientTable(clients, className) {
            clientTableBody.innerHTML = '';
            rosterTitle.textContent = `Roster for: ${className || 'All Clients'}`;

            if (clients.length === 0) {
                clientTableBody.innerHTML = `<tr><td colspan="6">No clients registered yet for this selection.</td></tr>`;
                return;
            }

            clients.forEach((client, index) => {
                const row = document.createElement('tr');
                const certName = client.full_name;
                const dob = client.date_of_birth; 
                const statusClass = client.payment_status.toLowerCase();

                row.innerHTML = `
                    <td data-label="ID">${client.class_id}-${index + 1}</td>
                    <td data-label="Full Name (Cert.)">**${certName}**</td>
                    <td data-label="Date of Birth">${dob}</td>
                    <td data-label="Email">${client.email}</td>
                    <td data-label="Mailing Address">${client.address}</td>
                    <td data-label="Status"><span class="${statusClass}">${client.payment_status}</span></td>
                `;
                clientTableBody.appendChild(row);
            });
            }

        // D. Attach Filter Event Listener
            filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const classId = classSelect.value;
            const className = classSelect.options[classSelect.selectedIndex].text.split(' (')[0];
            loadClientData(classId, className);
            });

        // Initial Load
            loadClassFilterOptions();
        }
       
    } // End of filterForm check
});