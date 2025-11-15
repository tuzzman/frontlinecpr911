/**
 * Admin User Management
 * Handles CRUD operations for admin users
 */

(function() {
    'use strict';

    // Authentication check
    async function checkAuthIfNeeded() {
        const authEl = document.querySelector('[data-requires-auth]');
        if (!authEl) return;
        try {
            const res = await fetch('/api/auth.php', { credentials: 'include' });
            if (!res.ok) {
                window.location.href = '/admin/login.html';
                return;
            }
            const data = await res.json();
            if (data.success && data.user) {
                authEl.classList.add('authenticated');
            } else {
                window.location.href = '/admin/login.html';
            }
        } catch (err) {
            console.error('Auth check failed:', err);
            window.location.href = '/admin/login.html';
        }
    }

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('open');
        });
    }

    // Logout
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.logout-link')) {
            e.preventDefault();
            try {
                await fetch('/api/logout.php', { method: 'POST', credentials: 'include' });
            } catch (err) {
                console.error('Logout error:', err);
            }
            window.location.href = '/index.html';
        }
    });

    // DOM Elements
    const usersTbody = document.getElementById('users-tbody');
    const usersBanner = document.getElementById('users-banner-region');
    const addUserBtn = document.getElementById('add-user-btn');
    const userModal = document.getElementById('user-modal');
    const userForm = document.getElementById('user-form');
    const cancelUserBtn = document.getElementById('cancel-user-btn');
    const passwordModal = document.getElementById('password-modal');
    const passwordForm = document.getElementById('password-form');
    const cancelPasswordBtn = document.getElementById('cancel-password-btn');

    let currentUsers = [];

    // Show banner message
    function showBanner(message, type = 'info') {
        const colors = {
            success: '#4CAF50',
            error: '#CC0000',
            info: '#2196F3'
        };
        usersBanner.innerHTML = `<div style="background:${colors[type]};color:#fff;padding:0.75rem 1rem;border-radius:4px;margin-bottom:1rem;">${message}</div>`;
        setTimeout(() => { usersBanner.innerHTML = ''; }, 5000);
    }

    // Load users
    async function loadUsers() {
        try {
            const res = await fetch('/api/users.php', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load users');
            const data = await res.json();
            
            console.log('Users API response:', data);
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load users');
            }

            currentUsers = data.users || [];
            console.log('Current users:', currentUsers);
            renderUsers();
        } catch (err) {
            console.error('Load users error:', err);
            usersTbody.innerHTML = `<tr><td colspan="5" style="color:#CC0000;">Error: ${err.message}</td></tr>`;
        }
    }

    // Render users table
    function renderUsers() {
        if (!currentUsers.length) {
            usersTbody.innerHTML = '<tr><td colspan="5">No admin users found.</td></tr>';
            return;
        }

        usersTbody.innerHTML = currentUsers.map(u => {
            const createdDate = u.created_at ? new Date(u.created_at).toLocaleDateString() : '';
            return `
                <tr data-user-id="${u.id}">
                    <td>${u.id}</td>
                    <td>${u.email}</td>
                    <td><span class="badge" style="background:#2196F3;color:#fff;padding:0.25rem 0.5rem;border-radius:3px;font-size:0.75rem;">${u.role}</span></td>
                    <td>${createdDate}</td>
                    <td>
                        <button class="btn-action edit change-password-btn" data-user-id="${u.id}" data-user-email="${u.email}">Change Password</button>
                        <button class="btn-action delete delete-user-btn" data-user-id="${u.id}" data-user-email="${u.email}">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Render mobile cards
        renderMobileCards();
    }

    // Render mobile card layout
    function renderMobileCards() {
        console.log('renderMobileCards called, users:', currentUsers.length);
        let mobileContainer = document.querySelector('.mobile-card-list');
        
        if (!mobileContainer) {
            const section = document.querySelector('.dashboard-table-section');
            console.log('Section found:', !!section);
            if (!section) return;
            mobileContainer = document.createElement('div');
            mobileContainer.className = 'mobile-card-list';
            section.appendChild(mobileContainer);
            console.log('Mobile container created and appended');
        }

        if (!currentUsers.length) {
            mobileContainer.innerHTML = '<p style="text-align:center;padding:2rem;color:#666;">No admin users found.</p>';
            return;
        }

        mobileContainer.innerHTML = '';
        const frag = document.createDocumentFragment();

        currentUsers.forEach(u => {
            const createdDate = u.created_at ? new Date(u.created_at).toLocaleDateString() : '';
            const card = document.createElement('div');
            card.className = 'mobile-card';
            card.setAttribute('data-user-id', u.id);
            card.innerHTML = `
                <div class="mobile-card-header">
                    <h3 class="mobile-card-title">${u.email}</h3>
                    <span class="mobile-card-badge" style="background:#2196F3;">${u.role}</span>
                </div>
                <div class="mobile-card-body">
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">ID:</span>
                        <span class="mobile-card-value">${u.id}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Created:</span>
                        <span class="mobile-card-value">${createdDate}</span>
                    </div>
                </div>
                <div class="mobile-card-actions">
                    <button class="btn-action edit change-password-btn" data-user-id="${u.id}" data-user-email="${u.email}">Change Password</button>
                    <button class="btn-action delete delete-user-btn" data-user-id="${u.id}" data-user-email="${u.email}">Delete</button>
                </div>
            `;
            frag.appendChild(card);
        });

        mobileContainer.appendChild(frag);
        console.log('Mobile cards rendered:', currentUsers.length, 'cards');
    }

    // Open add user modal
    addUserBtn?.addEventListener('click', () => {
        document.getElementById('user-modal-title').textContent = 'Add Admin User';
        userForm.reset();
        document.getElementById('user-id').value = '';
        document.getElementById('user-password').required = true;
        document.getElementById('user-password-confirm').required = true;
        document.getElementById('confirm-password-group').style.display = 'block';
        userModal.classList.remove('hidden');
    });

    // Cancel user modal
    cancelUserBtn?.addEventListener('click', () => {
        userModal.classList.add('hidden');
    });

    // Submit user form
    userForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userId = document.getElementById('user-id').value;
        const email = document.getElementById('user-email').value.trim();
        const password = document.getElementById('user-password').value;
        const passwordConfirm = document.getElementById('user-password-confirm').value;

        // Validate password
        if (password.length < 8) {
            showBanner('Password must be at least 8 characters', 'error');
            return;
        }

        if (password !== passwordConfirm) {
            showBanner('Passwords do not match', 'error');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        try {
            const payload = { email, password };
            if (userId) payload.id = parseInt(userId);

            const res = await fetch('/api/users.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to save user');
            }

            showBanner(userId ? 'User updated successfully' : 'User added successfully', 'success');
            userModal.classList.add('hidden');
            loadUsers();
        } catch (err) {
            console.error('Save user error:', err);
            showBanner(err.message, 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Handle change password and delete buttons (for both table and mobile cards)
    document.addEventListener('click', (e) => {
        const changeBtn = e.target.closest('.change-password-btn');
        if (changeBtn) {
            const userId = changeBtn.dataset.userId;
            const userEmail = changeBtn.dataset.userEmail;
            
            document.getElementById('password-user-id').value = userId;
            document.getElementById('password-user-email').textContent = `Changing password for: ${userEmail}`;
            passwordForm.reset();
            passwordModal.classList.remove('hidden');
        }

        const deleteBtn = e.target.closest('.delete-user-btn');
        if (deleteBtn) {
            const userId = deleteBtn.dataset.userId;
            const userEmail = deleteBtn.dataset.userEmail;
            
            if (confirm(`Are you sure you want to delete user: ${userEmail}?\n\nThis action cannot be undone.`)) {
                deleteUser(userId);
            }
        }
    });

    // Cancel password modal
    cancelPasswordBtn?.addEventListener('click', () => {
        passwordModal.classList.add('hidden');
    });

    // Submit password change
    passwordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userId = document.getElementById('password-user-id').value;
        const newPassword = document.getElementById('new-password').value;
        const newPasswordConfirm = document.getElementById('new-password-confirm').value;

        if (newPassword.length < 8) {
            showBanner('Password must be at least 8 characters', 'error');
            return;
        }

        if (newPassword !== newPasswordConfirm) {
            showBanner('Passwords do not match', 'error');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Changing...';
        submitBtn.disabled = true;

        try {
            const res = await fetch('/api/users.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    id: parseInt(userId),
                    password: newPassword
                })
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to change password');
            }

            showBanner('Password changed successfully', 'success');
            passwordModal.classList.add('hidden');
        } catch (err) {
            console.error('Change password error:', err);
            showBanner(err.message, 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Delete user
    async function deleteUser(userId) {
        try {
            const res = await fetch('/api/users.php', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id: parseInt(userId) })
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to delete user');
            }

            showBanner('User deleted successfully', 'success');
            loadUsers();
        } catch (err) {
            console.error('Delete user error:', err);
            showBanner(err.message, 'error');
        }
    }

    // Close modals on outside click
    [userModal, passwordModal].forEach(modal => {
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });

    // Initialize
    checkAuthIfNeeded().then(() => {
        loadUsers();
    });
})();
