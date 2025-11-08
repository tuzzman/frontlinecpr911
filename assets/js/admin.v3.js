/**
 * Versioned alias for cache-busting; copies current admin.js
 */
/**
 * FRONTLINECPR911 ADMIN DASHBOARD JAVASCRIPT
 * Handles authentication, dynamic data loading, and CRUD operations.
 */
const API_BASE_URL = '/api';
// Toast utility
function showToast(message, type='info', timeout=3500){
    let container = document.querySelector('.toast-container');
    if(!container){
        container = document.createElement('div');
        container.className = 'toast-container';
        container.setAttribute('role','status');
        container.setAttribute('aria-live','polite');
        document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast ${type==='success'?'success': type==='error'?'error':''}`.trim();
    el.textContent = message;
    container.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .4s'; setTimeout(()=> el.remove(), 600); }, timeout);
}

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
        // Force-hide mobile nav on desktop widths to avoid duplicate/plain menu
        const enforceDesktopMobileNavState = () => {
            if (window.innerWidth >= 769) {
                adminMobileNav.classList.remove('open');
                adminMobileNav.style.display = 'none';
                adminMenuBtn.setAttribute('aria-expanded', 'false');
            } else {
                // allow CSS to control on mobile
                adminMobileNav.style.display = '';
            }
        };
        enforceDesktopMobileNavState();
        window.addEventListener('resize', enforceDesktopMobileNavState);
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
            btn.disabled = true; btn.classList.add('btn-loading');
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
                showToast(err.message, 'error');
                btn.disabled = false; btn.classList.remove('btn-loading');
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
                const rows = json.data || [];
                renderRows(rows);
                renderSummary(rows);
            } catch (err) {
                console.error(err);
                grTableBody.innerHTML = '<tr><td colspan="10">Error loading data.</td></tr>';
                showToast('Error loading group requests','error');
            }
        }

        function renderRows(rows) {
            if (!rows.length) {
                grTableBody.innerHTML = '<tr><td colspan="10">No requests found.</td></tr>';
                return;
            }
            grTableBody.innerHTML = rows.map(r => {
                const safeJson = JSON.stringify(r).replace(/'/g,"&#39;");
                return `
                <tr data-gr-id="${r.id}" data-json='${safeJson}'>
                    <td data-label="Date">${r.created_at?.slice(0,10) || ''}</td>
                    <td data-label="Organization">${r.org_name}</td>
                    <td data-label="Contact">${r.contact_name}</td>
                    <td data-label="Email">${r.email}</td>
                    <td data-label="Phone">${r.phone || ''}</td>
                    <td data-label="Course">${r.course_type}</td>
                    <td data-label="#">${r.participants}</td>
                    <td data-label="Status">
                        <select class="gr-status-select" aria-label="Status for ${r.org_name}">
                            ${['new','contacted','scheduled','closed'].map(s=>`<option value="${s}" ${s===r.status?'selected':''}>${s}</option>`).join('')}
                        </select>
                    </td>
                    <td data-label="Notes" class="gr-notes-cell">
                        <div class="notes-wrapper">
                            <span class="notes-text">${(r.notes||'').replace(/</g,'&lt;') || '<em>No notes</em>'}</span>
                            <button type="button" class="btn-action edit gr-edit-notes" aria-label="Edit notes">Edit</button>
                        </div>
                    </td>
                    <td data-label="Actions">
                        <div class="gr-actions-wrapper" style="display:flex;gap:.4rem;flex-wrap:wrap;">
                            <button class="btn-action view gr-save-row" type="button" aria-label="Save row ${r.id}">Save</button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
            // Fallback: if any row missing a save button (edge case), append one
            Array.from(grTableBody.querySelectorAll('tr[data-gr-id]')).forEach(tr => {
                if(!tr.querySelector('.gr-save-row')){
                    const actionsCell = tr.querySelector('td[data-label="Actions"]');
                    if(actionsCell){
                        const wrap = actionsCell.querySelector('.gr-actions-wrapper') || actionsCell;
                        const btn = document.createElement('button');
                        btn.type='button';
                        btn.className='btn-action view gr-save-row';
                        btn.textContent='Save';
                        wrap.appendChild(btn);
                    }
                }
            });
        }

        grTableBody.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.gr-edit-notes');
            if(editBtn){
                const tr = editBtn.closest('tr');
                const cell = tr.querySelector('.gr-notes-cell');
                if(cell.querySelector('textarea')) return; // already editing
                const current = tr.querySelector('.notes-text')?.innerHTML.replace(/<em>No notes<\/em>/,'') || '';
                cell.innerHTML = `<textarea class="gr-notes-textarea" rows="3" style="width:100%;">${current.replace(/&lt;/g,'<')}</textarea>
                <div style="margin-top:.4rem; display:flex; gap:.5rem; flex-wrap:wrap;">
                    <button type="button" class="btn-action view gr-notes-save">Save Notes</button>
                    <button type="button" class="btn-action edit gr-notes-cancel">Cancel</button>
                </div>`;
            }
            const saveNotes = e.target.closest('.gr-notes-save');
            if(saveNotes){
                const tr = saveNotes.closest('tr');
                const ta = tr.querySelector('.gr-notes-textarea');
                const val = ta.value.trim();
                const spanHtml = val ? val.replace(/</g,'&lt;') : '<em>No notes</em>';
                tr.querySelector('.gr-notes-cell').innerHTML = `<div class="notes-wrapper"><span class="notes-text">${spanHtml}</span><button type="button" class="btn-action edit gr-edit-notes">Edit</button></div>`;
            }
            const cancelNotes = e.target.closest('.gr-notes-cancel');
            if(cancelNotes){
                const tr = cancelNotes.closest('tr');
                const raw = tr.getAttribute('data-json');
                try {
                    const data = JSON.parse(raw.replace(/&#39;/g,'"'));
                    const spanHtml = data.notes ? data.notes.replace(/</g,'&lt;') : '<em>No notes</em>';
                    tr.querySelector('.gr-notes-cell').innerHTML = `<div class="notes-wrapper"><span class="notes-text">${spanHtml}</span><button type="button" class="btn-action edit gr-edit-notes">Edit</button></div>`;
                } catch(_){}
            }
            const saveRow = e.target.closest('.gr-save-row');
            if(saveRow){
                const tr = saveRow.closest('tr');
                const id = tr.getAttribute('data-gr-id');
                const statusSel = tr.querySelector('.gr-status-select');
                const notesSpan = tr.querySelector('.notes-text');
                const notesVal = notesSpan ? notesSpan.textContent.replace(/<em>No notes<\/em>/,'').trim() : '';
                saveGroupRequest(id, statusSel.value, notesVal, tr, saveRow);
            }
        });

        async function saveGroupRequest(id, status, notes, tr, btn){
            if(!id) return;
            const original = btn.textContent; btn.disabled=true; btn.textContent='Saving...'; btn.classList.add('btn-loading');
            try {
                let res = await fetch(`${API_BASE_URL}/group_request.php?id=${encodeURIComponent(id)}`, {
                    method:'PUT', headers:{'Content-Type':'application/json'}, credentials:'same-origin',
                    body: JSON.stringify({ status, notes })
                });
                if(!res.ok && (res.status===405 || res.status===400 || res.status===500)){
                    res = await fetch(`${API_BASE_URL}/group_request.php?id=${encodeURIComponent(id)}`, {
                        method:'POST', headers:{'Content-Type':'application/json','X-HTTP-Method-Override':'PUT'}, credentials:'same-origin',
                        body: JSON.stringify({ status, notes, _method:'PUT' })
                    });
                }
                const json = await res.json().catch(()=>({success:false,message:'Bad JSON'}));
                if(!res.ok || !json.success) throw new Error(json.message||'Update failed');
                // update stored json
                const raw = tr.getAttribute('data-json');
                let data = {};
                try { data = JSON.parse(raw.replace(/&#39;/g,'"')) || {}; } catch(_){}
                data.status = status; data.notes = notes;
                tr.setAttribute('data-json', JSON.stringify(data).replace(/'/g,'&#39;'));
                // Recalculate summary metrics from current DOM rows
                recalcGroupRequestMetrics();
                showBanner('Saved');
            } catch(err){ showToast(err.message,'error'); } finally { btn.disabled=false; btn.textContent=original; btn.classList.remove('btn-loading'); }
        }

        document.getElementById('gr-filter-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            // persist filters
            const persist = {
                status: statusFilter?.value || '',
                from: fromInput?.value || '',
                to: toInput?.value || ''
            };
            try { localStorage.setItem('grFilters', JSON.stringify(persist)); } catch(_){}
            loadGroupRequests();
        });

        exportBtn?.addEventListener('click', () => {
            const params = new URLSearchParams();
            if (statusFilter && statusFilter.value) params.set('status', statusFilter.value);
            if (fromInput && fromInput.value) params.set('from', fromInput.value);
            if (toInput && toInput.value) params.set('to', toInput.value);
            window.location.href = `${API_BASE_URL}/export.php?type=group_requests&${params.toString()}`;
        });

        // Restore filters
        try {
            const saved = JSON.parse(localStorage.getItem('grFilters')||'null');
            if(saved){
                if(statusFilter) statusFilter.value = saved.status||'';
                if(fromInput) fromInput.value = saved.from||'';
                if(toInput) toInput.value = saved.to||'';
            }
        } catch(_){ }
        loadGroupRequests();

        function renderSummary(rows){
            const total = rows.length;
            const tally = { new:0, contacted:0, scheduled:0, closed:0 };
            rows.forEach(r=>{ if(tally[r.status]!==undefined) tally[r.status]++; });
            const set = (id,val)=>{ const el = document.getElementById(id); if(el) el.textContent = String(val); };
            set('metric-total', total); set('metric-new', tally.new); set('metric-contacted', tally.contacted); set('metric-scheduled', tally.scheduled); set('metric-closed', tally.closed);
        }
        function recalcGroupRequestMetrics(){
            const rows = Array.from(grTableBody.querySelectorAll('tr[data-gr-id]'));
            const tally = { new:0, contacted:0, scheduled:0, closed:0 };
            rows.forEach(tr => {
                const raw = tr.getAttribute('data-json');
                if(!raw) return;
                try {
                    const data = JSON.parse(raw.replace(/&#39;/g,'"'));
                    if(tally[data.status] !== undefined) tally[data.status]++;
                } catch(_){ }
            });
            const total = rows.length;
            const set = (id,val)=>{ const el = document.getElementById(id); if(el) el.textContent = String(val); };
            set('metric-total', total); set('metric-new', tally.new); set('metric-contacted', tally.contacted); set('metric-scheduled', tally.scheduled); set('metric-closed', tally.closed);
        }
        function showBanner(msg){
            const region = document.getElementById('gr-banner-region');
            if(!region) return showToast(msg,'success');
            // Ensure region has correct positioning in case CSS hasn't loaded
            try {
                const parent = region.closest('.dashboard-table-section');
                if (parent && getComputedStyle(parent).position === 'static') {
                    parent.style.position = 'relative';
                }
                // Apply minimum overlay styles to the region so placement is always correct
                const rs = region.style;
                rs.position = 'absolute';
                rs.left = '0';
                rs.right = '0';
                rs.top = '.25rem';
                rs.display = 'flex';
                rs.justifyContent = 'center';
                rs.pointerEvents = 'none';
                rs.zIndex = '10';
            } catch(_) {}
            region.innerHTML = '';
            const banner = document.createElement('div');
            banner.className = 'admin-banner';
            banner.textContent = msg;
            // Inline minimal safety styles in case CSS cache lags
            banner.style.background = '#198754'; // strong success green
            banner.style.color = '#ffffff';
            banner.style.border = '1px solid #146c43';
            banner.style.padding = '.4rem .65rem';
            banner.style.borderRadius = '4px';
            banner.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
            banner.style.pointerEvents = 'auto';
            region.appendChild(banner);
            // Fade out and clear without shifting layout
            setTimeout(()=>{
                banner.style.opacity='0';
                banner.style.transition='opacity .3s';
                setTimeout(()=>{ region.innerHTML=''; }, 350);
            }, 1800);
        }
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
                    opt.setAttribute('data-json', JSON.stringify(c).replace(/'/g,"&#39;"));
                    classSelect.appendChild(opt);
                });
                // Restore selection
                try { const savedId = localStorage.getItem('clientsSelectedClass'); if(savedId && classSelect.querySelector(`option[value="${savedId}"]`)) { classSelect.value = savedId; loadRoster(savedId); } } catch(_){}
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
                    clientsTbody.innerHTML = '<tr><td colspan="8">No clients found for this class.</td></tr>';
                    return;
                }
                const meta = rows[0];
                rosterTitle.textContent = `Roster: ${meta.course_type} — ${meta.start_datetime?.slice(0,16) || ''}`;
                clientsTbody.innerHTML = rows.map((r,i) => `
                    <tr data-client-id="${r.id}" data-json='${JSON.stringify(r).replace(/'/g,"&#39;")}'>
                        <td data-label="#">${i+1}</td>
                        <td data-label="Full Name">${r.full_name}</td>
                        <td data-label="DOB">${r.dob || ''}</td>
                        <td data-label="Email">${r.email || ''}</td>
                        <td data-label="Phone">${r.phone || ''}</td>
                        <td data-label="Address">${r.address || ''}</td>
                        <td data-label="Status">
                            <select class="client-status-select" aria-label="Payment status for ${r.full_name}">
                                ${['','paid','pending'].map(s=>`<option value="${s}" ${s===(r.payment_status||'')?'selected':''}>${s||'Unknown'}</option>`).join('')}
                            </select>
                        </td>
                        <td data-label="Actions">
                            <div style="display:flex; gap:.4rem; flex-wrap:wrap;">
                                <button class="btn-action edit js-edit-client" type="button">Edit</button>
                                <button class="btn-action view client-save-row" type="button">Save</button>
                            </div>
                        </td>
                    </tr>
                `).join('');
                attachClientEditButtons();
                applyClientSearchFilter?.();
            } catch (e) {
                console.error(e);
                clientsTbody.innerHTML = '<tr><td colspan="8">Error loading roster.</td></tr>';
                showToast('Error loading roster','error');
            }
        }

        document.getElementById('clients-filter-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = classSelect.value;
            if (id) { try{ localStorage.setItem('clientsSelectedClass', id); }catch(_){} loadRoster(id); }
        });
        classSelect?.addEventListener('change', ()=>{ if(classSelect.value) { try{ localStorage.setItem('clientsSelectedClass', classSelect.value);}catch(_){} } });

        document.getElementById('export-roster-pdf')?.addEventListener('click', () => {
            const id = classSelect.value;
            if (!id) return showToast('Select a class first','warn');
            window.location.href = `${API_BASE_URL}/export.php?type=roster&classId=${encodeURIComponent(id)}`;
        });
        document.getElementById('export-roster-csv')?.addEventListener('click', () => {
            const id = classSelect.value;
            if (!id) return showToast('Select a class first','warn');
            window.location.href = `${API_BASE_URL}/export.php?type=roster&classId=${encodeURIComponent(id)}&format=csv`;
        });

        // Roster QR logic (clients page)
        const rosterQrBtn = document.getElementById('show-roster-qr');
        const rosterQrModal = document.getElementById('roster-qr-modal');
        const rosterQrImg = document.getElementById('roster-qr-img');
        const rosterQrLink = document.getElementById('roster-qr-link');
        const rosterQrMeta = document.getElementById('roster-qr-meta');
        const rosterQrCopy = document.getElementById('roster-qr-copy');
        const rosterQrDownload = document.getElementById('roster-qr-download');
        const rosterQrClose = document.getElementById('roster-qr-close');
        let lastRosterQrTrigger = null;
        function openRosterQr(){
            const id = classSelect.value;
            if(!id){ showToast('Select a class first','warn'); return; }
            const opt = classSelect.selectedOptions[0];
            let data = { id };
            try { data = JSON.parse((opt.getAttribute('data-json')||'').replace(/&#39;/g,'"')) || data; } catch(_){ }
            const base = location.origin;
            const link = `${base}/class_checkin.html?class=${id}`;
            const encoded = encodeURIComponent(link);
            const qrUrl = `https://quickchart.io/qr?text=${encoded}&size=512&margin=1`;
            rosterQrLink.value = link;
            rosterQrImg.src = qrUrl;
            rosterQrImg.alt = `QR code for class ${id}`;
            const dt = data.start_datetime ? new Date(data.start_datetime.replace(' ', 'T')) : null;
            const dtLabel = dt ? dt.toLocaleString([], { dateStyle:'medium', timeStyle:'short' }) : 'Unscheduled';
            rosterQrMeta.innerHTML = `<strong>${data.course_type || 'Class'}</strong><br>${dtLabel}<br>${data.location || ''}`;
            rosterQrDownload.href = qrUrl;
            lastRosterQrTrigger = document.activeElement;
            rosterQrModal?.classList.remove('hidden');
            rosterQrCopy?.focus();
        }
        rosterQrBtn?.addEventListener('click', openRosterQr);
        function closeRosterQr(){ rosterQrModal?.classList.add('hidden'); lastRosterQrTrigger?.focus?.(); }
        rosterQrClose?.addEventListener('click', closeRosterQr);
        rosterQrModal?.addEventListener('click', (e)=>{ if(e.target===rosterQrModal) closeRosterQr(); });
        document.addEventListener('keydown', (e)=>{ if(!rosterQrModal?.classList.contains('hidden') && e.key==='Escape') closeRosterQr(); });
        rosterQrCopy?.addEventListener('click', () => {
            rosterQrLink?.select?.();
            try { document.execCommand('copy'); showToast('Link copied','success'); } catch(_){ navigator.clipboard?.writeText(rosterQrLink.value).then(()=>showToast('Link copied','success')).catch(()=>showToast('Copy failed','error')); }
            rosterQrLink?.setSelectionRange?.(0,0);
        });

        loadClassesForFilter();
        // Quick search filter
        const searchInput = document.getElementById('clients-search');
        function applyClientSearchFilter(){
            if(!searchInput) return;
            const q = searchInput.value.trim().toLowerCase();
            const rows = Array.from(clientsTbody.querySelectorAll('tr'));
            let visible = 0;
            rows.forEach(tr => {
                const id = tr.getAttribute('data-client-id');
                if(!id){ tr.style.display=''; return; }
                const text = tr.innerText.toLowerCase();
                const match = !q || text.includes(q);
                tr.style.display = match ? '' : 'none';
                if(match) visible++;
            });
            const existingEmpty = clientsTbody.querySelector('.no-results-row');
            if(visible===0){
                if(!existingEmpty){
                    const tr = document.createElement('tr');
                    tr.className = 'no-results-row';
                    tr.innerHTML = '<td colspan="8">No matching clients.</td>';
                    clientsTbody.appendChild(tr);
                }
            } else {
                existingEmpty?.remove();
            }
        }
        let searchTimer;
        searchInput?.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(applyClientSearchFilter, 150);
            try { localStorage.setItem('clientsSearch', searchInput.value || ''); } catch(_){}
        });
        // Restore search query
        try { const q = localStorage.getItem('clientsSearch'); if(searchInput && q){ searchInput.value = q; } } catch(_){}
        // Client edit modal logic
        const clientModal = document.getElementById('edit-client-modal');
        const clientEditForm = document.getElementById('client-edit-form');
        const clientCancelBtn = document.getElementById('client-cancel-btn');
        const clientDeleteBtn = document.getElementById('client-delete-btn');
        let lastClientTrigger = null;
        function openClientModal(data){
            if(!clientModal) return;
            lastClientTrigger = document.activeElement;
            clientModal.classList.remove('hidden');
            document.getElementById('client-edit-id').value = data.id;
            document.getElementById('client-full-name').value = data.full_name || '';
            document.getElementById('client-dob').value = data.dob || '';
            document.getElementById('client-email').value = data.email || '';
            document.getElementById('client-phone').value = data.phone || '';
            document.getElementById('client-address').value = data.address || '';
            document.getElementById('client-status').value = (data.payment_status||'');
            document.getElementById('client-full-name').focus();
        }
        function closeClientModal(){ clientModal?.classList.add('hidden'); lastClientTrigger?.focus?.(); }
        clientCancelBtn?.addEventListener('click', closeClientModal);
        clientModal?.addEventListener('click', (e)=>{ if(e.target===clientModal) closeClientModal(); });
        document.addEventListener('keydown', (e)=>{ if(!clientModal?.classList.contains('hidden') && e.key==='Escape') closeClientModal(); });
        function attachClientEditButtons(){
            clientsTbody.querySelectorAll('.js-edit-client').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tr = btn.closest('tr');
                    const raw = tr.getAttribute('data-json');
                    try { const data = JSON.parse(raw.replace(/&#39;/g,'"')); openClientModal(data); } catch(err){ console.error('Parse client row failed', err); }
                });
            });
        }

        // Inline save for payment status
        clientsTbody.addEventListener('click', async (e) => {
            const btn = e.target.closest('.client-save-row');
            if(!btn) return;
            const tr = btn.closest('tr');
            const id = tr.getAttribute('data-client-id');
            if(!id) return;
            const raw = tr.getAttribute('data-json');
            let data = {};
            try { data = JSON.parse(raw.replace(/&#39;/g,'"')); } catch(_){}
            const payment_status = tr.querySelector('.client-status-select')?.value || '';
            const payload = { full_name: data.full_name||'', dob: data.dob||'', email: data.email||'', phone: data.phone||'', address: data.address||'', payment_status };
            const original = btn.textContent; btn.disabled = true; btn.textContent = 'Saving...'; btn.classList.add('btn-loading');
            try {
                let res = await fetch(`${API_BASE_URL}/clients.php?id=${encodeURIComponent(id)}`, { method:'PUT', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify(payload) });
                if(!res.ok && (res.status===405 || res.status===400 || res.status===500)){
                    res = await fetch(`${API_BASE_URL}/clients.php?id=${encodeURIComponent(id)}`, { method:'POST', headers:{'Content-Type':'application/json','X-HTTP-Method-Override':'PUT'}, credentials:'same-origin', body: JSON.stringify({...payload, _method:'PUT'}) });
                }
                const json = await res.json().catch(()=>({success:false,message:'Bad JSON'}));
                if(!res.ok || !json.success) throw new Error(json.message||'Update failed');
                data.payment_status = payment_status;
                tr.setAttribute('data-json', JSON.stringify(data).replace(/'/g,'&#39;'));
                showToast('Status saved','success');
            } catch(err){ showToast(err.message,'error'); }
            finally { btn.disabled=false; btn.textContent=original; btn.classList.remove('btn-loading'); }
        });
        clientEditForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('client-edit-id').value;
            const full_name = document.getElementById('client-full-name').value.trim();
            const dob = document.getElementById('client-dob').value;
            const email = document.getElementById('client-email').value.trim();
            const phone = document.getElementById('client-phone').value.trim();
            const address = document.getElementById('client-address').value.trim();
            const payment_status = document.getElementById('client-status').value;
            const btn = document.getElementById('client-save-btn');
            const original = btn.textContent; btn.disabled=true; btn.textContent='Saving...'; btn.classList.add('btn-loading');
            try {
                let res = await fetch(`${API_BASE_URL}/clients.php?id=${encodeURIComponent(id)}`, {
                    method:'PUT', headers:{'Content-Type':'application/json'}, credentials:'same-origin',
                    body: JSON.stringify({ full_name, dob, email, phone, address, payment_status })
                });
                if(!res.ok && (res.status===405 || res.status===400 || res.status===500)){
                    res = await fetch(`${API_BASE_URL}/clients.php?id=${encodeURIComponent(id)}`, {
                        method:'POST', headers:{'Content-Type':'application/json','X-HTTP-Method-Override':'PUT'}, credentials:'same-origin',
                        body: JSON.stringify({ full_name, dob, email, phone, address, payment_status, _method:'PUT' })
                    });
                }
                const json = await res.json().catch(()=>({success:false,message:'Bad JSON'}));
                if(!res.ok || !json.success) throw new Error(json.message||'Update failed');
                closeClientModal();
                if(classSelect.value) loadRoster(classSelect.value);
                showToast('Client updated','success');
            } catch(err){ showToast(err.message,'error'); } finally { btn.disabled=false; btn.textContent=original; btn.classList.remove('btn-loading'); }
        });
        clientDeleteBtn?.addEventListener('click', async () => {
            const id = document.getElementById('client-edit-id').value;
            if(!id) return; if(!confirm('Delete this client?')) return;
            clientDeleteBtn.disabled=true; clientDeleteBtn.classList.add('btn-loading');
            try {
                let res = await fetch(`${API_BASE_URL}/clients.php?id=${encodeURIComponent(id)}`, { method:'DELETE', credentials:'same-origin' });
                if(!res.ok && (res.status===405 || res.status===400 || res.status===500)){
                    res = await fetch(`${API_BASE_URL}/clients.php?id=${encodeURIComponent(id)}&_method=DELETE`, { method:'POST', credentials:'same-origin', headers:{'X-HTTP-Method-Override':'DELETE'} });
                }
                const json = await res.json().catch(()=>({success:false,message:'Bad JSON'}));
                if(!res.ok || !json.success) throw new Error(json.message||'Delete failed');
                closeClientModal();
                if(classSelect.value) loadRoster(classSelect.value); else loadClassesForFilter();
                showToast('Client deleted','success');
            } catch(err){ showToast(err.message,'error'); } finally { clientDeleteBtn.disabled=false; clientDeleteBtn.classList.remove('btn-loading'); }
        });
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
                                                <td data-label="Actions">
                                                    <div style="display:flex; gap:.4rem; flex-wrap:wrap;">
                                                        <button class="btn-action edit js-edit-class" type="button">Edit</button>
                                                        <button class="btn-action view js-qr-class" type="button" aria-label="Show QR for class ${c.id}">QR</button>
                                                    </div>
                                                </td>
                    </tr>
                `).join('');
                attachEditButtons();
                                attachQrButtons();
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
            btn.disabled = true; btn.textContent = 'Saving...'; btn.classList.add('btn-loading');
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
                showToast('Class created','success');
            } catch (e) {
                showToast(e.message,'error');
            } finally {
                btn.disabled = false; btn.textContent = original; btn.classList.remove('btn-loading');
            }
        });

        loadClasses();
        // --- Edit Modal Logic ---
        const modal = document.getElementById('edit-class-modal');
        const editForm = document.getElementById('class-edit-form');
        const cancelBtn = document.getElementById('edit-cancel-btn');
        const deleteBtn = document.getElementById('edit-delete-btn');
        let lastClassTrigger = null;
        function openModal(data){
            if(!modal) return;
            lastClassTrigger = document.activeElement;
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
            document.getElementById('edit-course').focus();
        }
        function closeModal(){ modal?.classList.add('hidden'); lastClassTrigger?.focus?.(); }
        cancelBtn?.addEventListener('click', closeModal);
        modal?.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });
        document.addEventListener('keydown', (e)=>{ if(!modal?.classList.contains('hidden') && e.key==='Escape') closeModal(); });
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
        // --- QR Modal Logic ---
        const qrModal = document.getElementById('qr-modal');
        const qrImg = document.getElementById('qr-img');
        const qrLinkInput = document.getElementById('qr-link');
        const qrMeta = document.getElementById('qr-meta');
        const qrCopyBtn = document.getElementById('qr-copy-btn');
        const qrDownload = document.getElementById('qr-download');
        const qrCloseBtn = document.getElementById('qr-close-btn');
        let lastQrTrigger = null;
        function openQrModal(data){
            if(!qrModal) return;
            lastQrTrigger = document.activeElement;
            const base = location.origin; // if deployed behind domain includes schema + host
            const link = `${base}/class_checkin.html?class=${data.id}`;
            qrLinkInput.value = link;
            // QuickChart QR API
            const encoded = encodeURIComponent(link);
            const qrUrl = `https://quickchart.io/qr?text=${encoded}&size=512&margin=1`; // high-res
            qrImg.src = qrUrl;
            qrImg.alt = `QR code for class ${data.id}`;
            const dt = data.start_datetime ? new Date(data.start_datetime.replace(' ', 'T')) : null;
            const dtLabel = dt ? dt.toLocaleString([], { dateStyle:'medium', timeStyle:'short' }) : 'Unscheduled';
            qrMeta.innerHTML = `<strong>${data.course_type || 'Class'}</strong><br>${dtLabel}<br>${data.location || ''}`;
            qrDownload.href = qrUrl;
            qrModal.classList.remove('hidden');
            qrCopyBtn.focus();
        }
        function closeQrModal(){ qrModal?.classList.add('hidden'); lastQrTrigger?.focus?.(); }
        qrCloseBtn?.addEventListener('click', closeQrModal);
        qrModal?.addEventListener('click', (e)=>{ if(e.target===qrModal) closeQrModal(); });
        document.addEventListener('keydown', (e)=>{ if(!qrModal?.classList.contains('hidden') && e.key==='Escape') closeQrModal(); });
        qrCopyBtn?.addEventListener('click', () => {
            if(!qrLinkInput) return;
            qrLinkInput.select();
            try { document.execCommand('copy'); showToast('Link copied','success'); } catch(_){ navigator.clipboard?.writeText(qrLinkInput.value).then(()=>showToast('Link copied','success')).catch(()=>showToast('Copy failed','error')); }
            qrLinkInput.setSelectionRange(0,0);
        });
        function attachQrButtons(){
            classesTbody.querySelectorAll('.js-qr-class').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tr = btn.closest('tr');
                    if(!tr) return;
                    try {
                        const raw = tr.getAttribute('data-json');
                        const data = JSON.parse(raw.replace(/&#39;/g,'"'));
                        openQrModal(data);
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
            btn.disabled = true; btn.textContent = 'Saving...'; btn.classList.add('btn-loading');
            try {
                let res = await fetch(`${API_BASE_URL}/classes.php?id=${encodeURIComponent(id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ course_type, start_datetime, location, price, max_capacity, notes })
                });
                if (!res.ok && (res.status === 405 || res.status === 400 || res.status === 500)) {
                    // Fallback: POST with method override header
                    res = await fetch(`${API_BASE_URL}/classes.php?id=${encodeURIComponent(id)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-HTTP-Method-Override': 'PUT' },
                        credentials: 'same-origin',
                        body: JSON.stringify({ course_type, start_datetime, location, price, max_capacity, notes, _method: 'PUT' })
                    });
                }
                const json = await res.json().catch(()=>({success:false,message:'Server error'}));
                if(!res.ok || !json.success) throw new Error(json.message || 'Failed to update class');
                closeModal();
                loadClasses();
                showToast('Class updated','success');
            } catch(err){ showToast(err.message,'error'); } finally { btn.disabled = false; btn.textContent = original; btn.classList.remove('btn-loading'); }
        });
        deleteBtn?.addEventListener('click', async () => {
            const id = document.getElementById('edit-id').value;
            if(!id) return;
            if(!confirm('Delete this class? This cannot be undone.')) return;
            deleteBtn.disabled = true; deleteBtn.classList.add('btn-loading');
            try {
                let res = await fetch(`${API_BASE_URL}/classes.php?id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
                if (!res.ok && (res.status === 405 || res.status === 400 || res.status === 500)) {
                    res = await fetch(`${API_BASE_URL}/classes.php?id=${encodeURIComponent(id)}&_method=DELETE`, {
                        method: 'POST', credentials: 'same-origin', headers: { 'X-HTTP-Method-Override': 'DELETE' }
                    });
                }
                const json = await res.json().catch(()=>({success:false,message:'Bad JSON'}));
                if(!res.ok || !json.success) throw new Error(json.message || 'Delete failed');
                closeModal();
                loadClasses();
                showToast('Class deleted','success');
            } catch(err){ showToast(err.message,'error'); } finally { deleteBtn.disabled = false; deleteBtn.classList.remove('btn-loading'); }
        });
    }
});
