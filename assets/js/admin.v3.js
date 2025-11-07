/**
 * Versioned alias for cache-busting; copies current admin.js
 */
/**
 * FRONTLINECPR911 ADMIN DASHBOARD JAVASCRIPT
 * Handles authentication, dynamic data loading, and CRUD operations.
 */
const API_BASE_URL = '/api';

// --- LOGOUT LOGIC ---
document.addEventListener('click', async (e) => {
    const link = e.target.closest('.logout-link, #logout');
    if (!link) return;
    e.preventDefault();
    try {
        await fetch(`${API_BASE_URL}/logout.php`, { method: 'POST' });
    } catch (_) {}
    window.location.href = 'login.html';
});

document.addEventListener('DOMContentLoaded', () => {
    // Mobile admin menu toggle (similar to public site)
    const adminMenuBtn = document.querySelector('.admin-menu-toggle');
    const adminMobileNav = document.querySelector('.admin-mobile-nav');
    if (adminMenuBtn && adminMobileNav) {
        adminMenuBtn.addEventListener('click', () => {
            const isOpen = adminMobileNav.classList.toggle('open');
            // small delay to allow CSS transition if added later
            if (isOpen) {
                // eslint-disable-next-line no-unused-expressions
                adminMobileNav.offsetHeight;
            }
            adminMenuBtn.setAttribute('aria-expanded', String(isOpen));
        });
    }
    async function checkAuthIfNeeded() {
        const requiresAuth = document.querySelector('[data-requires-auth]');
        if (!requiresAuth) return;
        try {
            const res = await fetch(`${API_BASE_URL}/auth.php`, { credentials: 'same-origin' });
            if (!res.ok) throw new Error('unauthorized');
        } catch (_) {
            window.location.href = 'login.html';
        }
    }
    checkAuthIfNeeded();

    // Login page logic
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const btn = loginForm.querySelector('.login-button');
            btn.disabled = true;
            const original = btn.textContent;
            btn.textContent = 'Logging in...';
            try {
                const res = await fetch(`${API_BASE_URL}/auth.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                    credentials: 'same-origin'
                });
                const result = await res.json();
                if (!res.ok || !result.success) throw new Error(result.message || 'Login failed');
                window.location.href = 'dashboard.html';
            } catch (err) {
                alert(err.message);
                btn.disabled = false;
                btn.textContent = original;
            }
        });
    }

    // Dashboard: group requests list
    const grTableBody = document.getElementById('gr-tbody');
    if (grTableBody) {
        const statusFilter = document.getElementById('gr-status');
        const fromInput = document.getElementById('gr-from');
        const toInput = document.getElementById('gr-to');
        const exportBtn = document.getElementById('export-gr');

        async function loadGroupRequests() {
            const params = new URLSearchParams();
            if (statusFilter && statusFilter.value) params.set('status', statusFilter.value);
            if (fromInput && fromInput.value) params.set('from', fromInput.value);
            if (toInput && toInput.value) params.set('to', toInput.value);
            try {
                const res = await fetch(`${API_BASE_URL}/group_request.php?${params.toString()}`, { credentials: 'same-origin' });
                const json = await res.json();
                if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load');
                renderRows(json.data || []);
            } catch (err) {
                console.error(err);
                grTableBody.innerHTML = '<tr><td colspan="8">Error loading data.</td></tr>';
            }
        }

        function renderRows(rows) {
            if (!rows.length) {
                grTableBody.innerHTML = '<tr><td colspan="8">No requests found.</td></tr>';
                return;
            }
            grTableBody.innerHTML = rows.map(r => `
                <tr>
                    <td data-label="Date">${r.created_at?.slice(0,10) || ''}</td>
                    <td data-label="Organization">${r.org_name}</td>
                    <td data-label="Contact">${r.contact_name}</td>
                    <td data-label="Email">${r.email}</td>
                    <td data-label="Phone">${r.phone || ''}</td>
                    <td data-label="Course">${r.course_type}</td>
                    <td data-label="#">${r.participants}</td>
                    <td data-label="Status">${r.status}</td>
                </tr>
            `).join('');
        }

        document.getElementById('gr-filter-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            loadGroupRequests();
        });

        exportBtn?.addEventListener('click', () => {
            const params = new URLSearchParams();
            if (statusFilter && statusFilter.value) params.set('status', statusFilter.value);
            if (fromInput && fromInput.value) params.set('from', fromInput.value);
            if (toInput && toInput.value) params.set('to', toInput.value);
            window.location.href = `${API_BASE_URL}/export.php?type=group_requests&${params.toString()}`;
        });

        loadGroupRequests();
    }
    
    // Clients & Rosters page
    const clientsTbody = document.getElementById('clients-tbody');
    const classSelect = document.getElementById('clients-class');
    if (clientsTbody && classSelect) {
        async function loadClassesForFilter() {
            try {
                const res = await fetch(`${API_BASE_URL}/clients.php?listType=classes`, { credentials: 'same-origin' });
                const json = await res.json();
                if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load classes');
                classSelect.innerHTML = '<option value="">-- Select Class --</option>';
                (json.classes || []).forEach(c => {
                    const dt = c.start_datetime ? new Date(c.start_datetime.replace(' ', 'T')) : null;
                    const labelDate = dt ? dt.toLocaleString() : '(unscheduled)';
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = `${labelDate} • ${c.course_type} (${c.registrations})`;
                    classSelect.appendChild(opt);
                });
            } catch (e) {
                console.error(e);
            }
        }

        async function loadRoster(classId) {
            const rosterTitle = document.getElementById('roster-title');
            try {
                const res = await fetch(`${API_BASE_URL}/clients.php?classId=${encodeURIComponent(classId)}`, { credentials: 'same-origin' });
                const json = await res.json();
                if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load roster');
                const rows = json.data || [];
                if (!rows.length) {
                    clientsTbody.innerHTML = '<tr><td colspan="7">No clients found for this class.</td></tr>';
                    return;
                }
                const meta = rows[0];
                rosterTitle.textContent = `Roster: ${meta.course_type} — ${meta.start_datetime?.slice(0,16) || ''}`;
                clientsTbody.innerHTML = rows.map((r,i) => `
                    <tr>
                        <td data-label="#">${i+1}</td>
                        <td data-label="Full Name">${r.full_name}</td>
                        <td data-label="DOB">${r.dob || ''}</td>
                        <td data-label="Email">${r.email || ''}</td>
                        <td data-label="Phone">${r.phone || ''}</td>
                        <td data-label="Address">${r.address || ''}</td>
                        <td data-label="Status">${r.payment_status || ''}</td>
                    </tr>
                `).join('');
            } catch (e) {
                console.error(e);
                clientsTbody.innerHTML = '<tr><td colspan="7">Error loading roster.</td></tr>';
            }
        }

        document.getElementById('clients-filter-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = classSelect.value;
            if (id) loadRoster(id);
        });

        document.getElementById('export-roster-pdf')?.addEventListener('click', () => {
            const id = classSelect.value;
            if (!id) return alert('Select a class first');
            window.location.href = `${API_BASE_URL}/export.php?type=roster&classId=${encodeURIComponent(id)}`;
        });
        document.getElementById('export-roster-csv')?.addEventListener('click', () => {
            const id = classSelect.value;
            if (!id) return alert('Select a class first');
            window.location.href = `${API_BASE_URL}/export.php?type=roster&classId=${encodeURIComponent(id)}&format=csv`;
        });

        loadClassesForFilter();
    }

    // Classes page: create and list
    const classCreateForm = document.getElementById('class-create-form');
    const classesTbody = document.getElementById('classes-tbody');
    if (classCreateForm || classesTbody) {
        async function loadClasses() {
            if (!classesTbody) return;
            try {
                const res = await fetch(`${API_BASE_URL}/classes.php`, { credentials: 'same-origin' });
                const json = await res.json();
                if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load classes');
                const rows = json.data || [];
                if (!rows.length) {
                    classesTbody.innerHTML = '<tr><td colspan="7">No classes yet.</td></tr>';
                    return;
                }
                classesTbody.innerHTML = rows.map(c => `
                    <tr data-class-id="${c.id}" data-json='${JSON.stringify(c).replace(/'/g,"&#39;")}'>
                        <td data-label="ID">${c.id}</td>
                        <td data-label="Course">${c.course_type}</td>
                        <td data-label="Date/Time">${c.start_datetime || ''}</td>
                        <td data-label="Location">${c.location || ''}</td>
                        <td data-label="Price">${c.price ?? ''}</td>
                        <td data-label="Capacity">${c.max_capacity ?? ''}</td>
                        <td data-label="Actions"><button class="btn-action edit js-edit-class" type="button">Edit</button></td>
                    </tr>
                `).join('');
                attachEditButtons();
            } catch (e) {
                console.error(e);
                classesTbody.innerHTML = '<tr><td colspan="7">Error loading classes.</td></tr>';
            }
        }

        classCreateForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const course_type = document.getElementById('cc-course').value;
            const date = document.getElementById('cc-date').value;
            const time = document.getElementById('cc-time').value;
            const start_datetime = (date && time) ? `${date} ${time}:00` : '';
            const location = document.getElementById('cc-location').value;
            const price = document.getElementById('cc-price').value;
            const max_capacity = document.getElementById('cc-capacity').value;
            const notes = document.getElementById('cc-notes').value;
            const btn = classCreateForm.querySelector('button[type="submit"]');
            const original = btn.textContent;
            btn.disabled = true; btn.textContent = 'Saving...';
            try {
                const res = await fetch(`${API_BASE_URL}/classes.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ course_type, start_datetime, location, price, max_capacity, notes })
                });
                const json = await res.json();
                if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create class');
                classCreateForm.reset();
                loadClasses();
            } catch (e) {
                alert(e.message);
            } finally {
                btn.disabled = false; btn.textContent = original;
            }
        });

        loadClasses();
        // --- Edit Modal Logic ---
        const modal = document.getElementById('edit-class-modal');
        const editForm = document.getElementById('class-edit-form');
        const cancelBtn = document.getElementById('edit-cancel-btn');
        const deleteBtn = document.getElementById('edit-delete-btn');
        function openModal(data){
            if(!modal) return;
            modal.classList.remove('hidden');
            document.getElementById('edit-id').value = data.id;
            document.getElementById('edit-course').value = data.course_type || '';
            if(data.start_datetime){
                const [d,t] = data.start_datetime.split(' ');
                document.getElementById('edit-date').value = d;
                document.getElementById('edit-time').value = t?.slice(0,5) || '';
            } else {
                document.getElementById('edit-date').value = '';
                document.getElementById('edit-time').value = '';
            }
            document.getElementById('edit-location').value = data.location || '';
            document.getElementById('edit-price').value = data.price ?? '';
            document.getElementById('edit-capacity').value = data.max_capacity ?? '';
            document.getElementById('edit-notes').value = data.notes || '';
        }
        function closeModal(){ modal?.classList.add('hidden'); }
        cancelBtn?.addEventListener('click', closeModal);
        function attachEditButtons(){
            classesTbody.querySelectorAll('.js-edit-class').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tr = btn.closest('tr');
                    if(!tr) return;
                    try {
                        const raw = tr.getAttribute('data-json');
                        const data = JSON.parse(raw.replace(/&#39;/g,'"'));
                        openModal(data);
                    } catch(err){ console.error('Parse class row failed', err); }
                });
            });
        }
        editForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;
            const course_type = document.getElementById('edit-course').value;
            const date = document.getElementById('edit-date').value;
            const time = document.getElementById('edit-time').value;
            const start_datetime = (date && time) ? `${date} ${time}:00` : '';
            const location = document.getElementById('edit-location').value;
            const price = document.getElementById('edit-price').value;
            const max_capacity = document.getElementById('edit-capacity').value;
            const notes = document.getElementById('edit-notes').value;
            const btn = document.getElementById('edit-save-btn');
            const original = btn.textContent;
            btn.disabled = true; btn.textContent = 'Saving...';
            try {
                const res = await fetch(`${API_BASE_URL}/classes.php?id=${encodeURIComponent(id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ course_type, start_datetime, location, price, max_capacity, notes })
                });
                const json = await res.json();
                if(!res.ok || !json.success) throw new Error(json.message || 'Failed to update class');
                closeModal();
                loadClasses();
            } catch(err){ alert(err.message); } finally { btn.disabled = false; btn.textContent = original; }
        });
        deleteBtn?.addEventListener('click', async () => {
            const id = document.getElementById('edit-id').value;
            if(!id) return;
            if(!confirm('Delete this class? This cannot be undone.')) return;
            deleteBtn.disabled = true;
            try {
                const res = await fetch(`${API_BASE_URL}/classes.php?id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
                const json = await res.json().catch(()=>({success:false,message:'Bad JSON'}));
                if(!res.ok || !json.success) throw new Error(json.message || 'Delete failed');
                closeModal();
                loadClasses();
            } catch(err){ alert(err.message); } finally { deleteBtn.disabled = false; }
        });
    }
});
