/**
 * Versioned alias for cache-busting; copies current admin.js
 */
/**
 * FRONTLINECPR911 ADMIN DASHBOARD JAVASCRIPT
 * Handles authentication, dynamic data loading, and CRUD operations.
 */
// Compute API base relative to site root or subdirectory hosting
const API_BASE_URL = (() => {
    try {
        const path = window.location.pathname || '/';
        const idx = path.indexOf('/admin/');
        const base = idx >= 0 ? path.slice(0, idx) : '';
        return `${base}/api`;
    } catch(_) {
        return '/api';
    }
})();
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

        let grAbortController = null;
        async function loadClasses() {
            const params = new URLSearchParams();
            if (statusFilter && statusFilter.value) params.set('status', statusFilter.value);
            if (fromInput && fromInput.value) params.set('from', fromInput.value);
            if (toInput && toInput.value) params.set('to', toInput.value);
            const placeholder = document.createElement('tr');
            placeholder.className = 'loading-row';
            placeholder.innerHTML = '<td colspan="10">Loading group requests...</td>';
            grTableBody.innerHTML = '';
            grTableBody.appendChild(placeholder);
            try {
                // Abort any in-flight request to avoid queueing
                if (grAbortController) { try { grAbortController.abort(); } catch(_){} }
                grAbortController = new AbortController();
                const start = performance.now();
                const res = await fetch(`${API_BASE_URL}/group_request.php?${params.toString()}`, { credentials: 'same-origin', signal: grAbortController.signal });
                const json = await res.json();
                const ms = Math.round(performance.now() - start);
                console.log(`[GR] Loaded ${Array.isArray(json.data)?json.data.length:0} rows in ${ms} ms`);
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
            // Build rows using DOM APIs to avoid any template parsing anomalies
            const frag = document.createDocumentFragment();
            rows.forEach(r => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-gr-id', r.id);
                tr.setAttribute('data-json', JSON.stringify(r).replace(/'/g,'&#39;'));
                const cells = [
                    ['Date', r.created_at?.slice(0,10) || ''],
                    ['Organization', r.org_name],
                    ['Contact', r.contact_name],
                    ['Email', r.email],
                    ['Phone', r.phone || ''],
                    ['Course', r.course_type],
                    ['#', r.participants]
                ];
                cells.forEach(([label,value]) => {
                    const td = document.createElement('td');
                    td.setAttribute('data-label', label);
                    td.textContent = value;
                    tr.appendChild(td);
                });
                // Status select
                const statusTd = document.createElement('td');
                statusTd.setAttribute('data-label','Status');
                const sel = document.createElement('select');
                sel.className = 'gr-status-select';
                sel.setAttribute('aria-label', `Status for ${r.org_name}`);
                ['new','contacted','scheduled','closed'].forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s; opt.textContent = s; if(s===r.status) opt.selected = true;
                    sel.appendChild(opt);
                });
                statusTd.appendChild(sel); tr.appendChild(statusTd);
                // Notes
                const notesTd = document.createElement('td');
                notesTd.className = 'gr-notes-cell';
                notesTd.setAttribute('data-label','Notes');
                const notesWrapper = document.createElement('div');
                notesWrapper.className = 'notes-wrapper';
                const span = document.createElement('span');
                span.className = 'notes-text';
                span.innerHTML = (r.notes||'').replace(/</g,'&lt;') || '<em>No notes</em>';
                const editBtn = document.createElement('button');
                editBtn.type='button'; editBtn.className='btn-action edit gr-edit-notes'; editBtn.setAttribute('aria-label','Edit notes'); editBtn.textContent='Edit';
                notesWrapper.appendChild(span); notesWrapper.appendChild(editBtn); notesTd.appendChild(notesWrapper); tr.appendChild(notesTd);
                // Actions
                const actionsTd = document.createElement('td');
                actionsTd.setAttribute('data-label','Actions');
                const wrap = document.createElement('div');
                wrap.className = 'gr-actions-wrapper';
                wrap.style.display='flex'; wrap.style.gap='.4rem'; wrap.style.flexWrap='wrap';
                const saveBtn = document.createElement('button');
                saveBtn.type='button'; saveBtn.className='btn-action view gr-save-row'; saveBtn.textContent='Save'; saveBtn.setAttribute('aria-label', `Save row ${r.id}`);
                wrap.appendChild(saveBtn); actionsTd.appendChild(wrap); tr.appendChild(actionsTd);
                frag.appendChild(tr);
            });
            grTableBody.innerHTML='';
            grTableBody.appendChild(frag);
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
        // --- Add Client modal wiring ---
    const addBtn = document.getElementById('add-client-btn');
    const addModal = document.getElementById('add-client-modal');
        const addForm = document.getElementById('client-add-form');
        const addCancel = document.getElementById('client-add-cancel-btn');
        const addSaveBtn = document.getElementById('client-add-save-btn');
        let lastAddTrigger = null;
        let overrideFullAdd = false; // track if user confirmed overbooking
        function openAddModal(ev){
            if(!classSelect.value){ showToast('Select a class first','warn'); return; }
            // Safety: if class is full, block opening
            try {
                const opt = classSelect.selectedOptions[0];
                const data = JSON.parse((opt.getAttribute('data-json')||'').replace(/&#39;/g,'"'));
                if(data && data.max_capacity){
                    const regs = rosterAllRows?.length ?? (data.registrations||0);
                    const remaining = parseInt(data.max_capacity,10) - parseInt(regs,10);
                    if(remaining <= 0){
                        // Allow an override with confirmation so admins can overbook if needed
                        const proceed = window.confirm('This class is FULL. Do you want to add a client anyway? (Override capacity)');
                        if(!proceed) return; else overrideFullAdd = true;
                    }
                }
            } catch(_){}
            lastAddTrigger = document.activeElement;
            addForm?.reset?.();
            addModal?.classList.remove('hidden');
            document.getElementById('add-first-name')?.focus?.();
        }
        function closeAddModal(){ addModal?.classList.add('hidden'); lastAddTrigger?.focus?.(); }
        addBtn?.addEventListener('click', (e)=>openAddModal(e));
        addCancel?.addEventListener('click', closeAddModal);
        addModal?.addEventListener('click', (e)=>{ if(e.target===addModal) closeAddModal(); });
        document.addEventListener('keydown', (e)=>{ if(!addModal?.classList.contains('hidden') && e.key==='Escape') closeAddModal(); });

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
                    opt.textContent = `${labelDate} • ${c.course_type} (${c.registrations}${c.max_capacity?'/'+c.max_capacity:''})`;
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
                rosterAllRows = json.data || [];
                if(!rosterAllRows.length){
                    clientsTbody.innerHTML = '<tr><td colspan="8">No clients found for this class.</td></tr>';
                    updateCapacityIndicator(0);
                    renderRosterPagination();
                    return;
                }
                const meta = rosterAllRows[0];
                rosterTitle.textContent = `Roster: ${meta.course_type} — ${meta.start_datetime?.slice(0,16) || ''}`;
                currentRosterPage = 1;
                renderRosterPage();
                updateCapacityIndicator(rosterAllRows.length);
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

        // Create client -> POST /api/clients.php with classId
        addForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const classId = classSelect.value;
            if(!classId){ showToast('Select a class first','warn'); return; }
            const first_name = document.getElementById('add-first-name').value.trim();
            const last_name = document.getElementById('add-last-name').value.trim();
            const email = document.getElementById('add-email').value.trim();
            const phone = document.getElementById('add-phone').value.trim();
            const dob = document.getElementById('add-dob').value.trim();
            const address = document.getElementById('add-address').value.trim();
            if(!first_name || !last_name || !email){ showToast('First, last, and email are required','error'); return; }
            // Email format validation
            const emailErrorEl = document.getElementById('add-email-error');
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if(!emailPattern.test(email)){
                if(emailErrorEl){ emailErrorEl.style.display='block'; }
                document.getElementById('add-email').focus();
                return;
            } else if(emailErrorEl){ emailErrorEl.style.display='none'; }
            const original = addSaveBtn.textContent; addSaveBtn.disabled=true; addSaveBtn.textContent='Creating...'; addSaveBtn.classList.add('btn-loading');
            try {
                const res = await fetch(`${API_BASE_URL}/clients.php`, {
                    method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin',
                    body: JSON.stringify({ first_name, last_name, email, phone, dob, address, classId, force: overrideFullAdd })
                });
                const json = await res.json().catch(()=>({success:false,message:'Server error'}));
                if(!res.ok || !json.success){ throw new Error(json.message||'Create failed'); }
                closeAddModal();
                showToast(json.created_new? 'Client added to class' : (json.already_registered? 'Client already in class' : 'Client linked to class'), 'success');
                if(classSelect.value) loadRoster(classSelect.value); else loadClassesForFilter();
            } catch(err){ showToast(err.message,'error'); }
            finally { overrideFullAdd = false; addSaveBtn.disabled=false; addSaveBtn.textContent=original; addSaveBtn.classList.remove('btn-loading'); }
        });

        // Capacity indicator logic
        function updateCapacityIndicator(currentRegistrations){
            const span = document.getElementById('capacity-remaining');
            if(!span) return;
            const opt = classSelect.selectedOptions[0];
            if(!opt){ span.textContent=''; return; }
            let data = null;
            try { data = JSON.parse((opt.getAttribute('data-json')||'').replace(/&#39;/g,'"')); } catch(_){ }
            if(!data){ span.textContent=''; return; }
            const max = data.max_capacity ? parseInt(data.max_capacity,10) : null;
            const regs = (typeof currentRegistrations === 'number') ? currentRegistrations : (data.registrations || 0);
            if(max){
                const remaining = Math.max(0, max - regs);
                const addBtn = document.getElementById('add-client-btn');
                if(remaining <= 0){
                    span.innerHTML = `Capacity: ${regs}/${max} (0 left) <span class="capacity-full-badge">FULL</span>`;
                    span.style.color='#CC0000';
                    // Keep button enabled but warn via title; open handler will confirm override
                    if(addBtn){ addBtn.disabled = false; addBtn.title = 'Class is full — confirmation required to add'; }
                } else {
                    span.innerHTML = `Capacity: ${regs}/${max} (${remaining} left)`;
                    span.style.color='';
                    if(addBtn){ addBtn.disabled = false; addBtn.title = ''; }
                }
            } else {
                span.textContent = `Registered: ${regs}`;
                span.style.color='';
                const addBtn = document.getElementById('add-client-btn');
                if(addBtn){ addBtn.disabled = false; addBtn.title = ''; }
            }
        }
        classSelect?.addEventListener('change', ()=> updateCapacityIndicator());

        // --- Pagination logic ---
        let rosterAllRows = [];
        let currentRosterPage = 1;
        function getPageSize(){ const sel = document.getElementById('clients-page-size'); return sel ? parseInt(sel.value,10) : 25; }
        function totalPages(){ const ps = getPageSize(); return Math.max(1, Math.ceil(filteredRosterRows().length / ps)); }
        function filteredRosterRows(){
            const q = (document.getElementById('clients-search')?.value||'').trim().toLowerCase();
            if(!q) return rosterAllRows;
            return rosterAllRows.filter(r => JSON.stringify(r).toLowerCase().includes(q));
        }
        function renderRosterPage(){
            const rows = filteredRosterRows();
            const ps = getPageSize();
            const pages = totalPages();
            if(currentRosterPage > pages) currentRosterPage = pages;
            const start = (currentRosterPage-1)*ps;
            const slice = rows.slice(start, start+ps);
            if(!slice.length){
                clientsTbody.innerHTML = '<tr><td colspan="8">No matching clients.</td></tr>';
            } else {
                clientsTbody.innerHTML = slice.map((r,i) => `
                <tr data-client-id="${r.client_id}" data-json='${JSON.stringify(r).replace(/'/g,"&#39;")}'>
                    <td data-label="#">${start + i + 1}</td>
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
                </tr>`).join('');
            }
            attachClientEditButtons();
            renderRosterPagination();
        }
        function renderRosterPagination(){
            const pages = totalPages();
            const info = document.getElementById('clients-page-info');
            const prev = document.getElementById('clients-prev');
            const next = document.getElementById('clients-next');
            if(info) info.textContent = `Page ${Math.min(currentRosterPage,pages)}/${pages}`;
            if(prev) prev.disabled = currentRosterPage <= 1;
            if(next) next.disabled = currentRosterPage >= pages;
        }
        document.getElementById('clients-prev')?.addEventListener('click', () => { if(currentRosterPage>1){ currentRosterPage--; renderRosterPage(); } });
        document.getElementById('clients-next')?.addEventListener('click', () => { if(currentRosterPage<totalPages()){ currentRosterPage++; renderRosterPage(); } });
        document.getElementById('clients-page-size')?.addEventListener('change', () => { currentRosterPage = 1; renderRosterPage(); });
        // Enhance existing search to reset to page 1
        const origApply = typeof applyClientSearchFilter === 'function' ? applyClientSearchFilter : null;
        function applyClientSearchFilter(){ currentRosterPage = 1; renderRosterPage(); }
        // Replace earlier reference with new implementation

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

        function buildCheckInLink(id){
            const base = location.origin;
            return `${base}/class_checkin.html?class=${encodeURIComponent(id)}`; // lowercase param
        }
        function buildQrUrls(link){
            const encoded = encodeURIComponent(link);
            return {
                primary: `https://quickchart.io/qr?text=${encoded}&size=512&margin=1`,
                fallback: `https://chart.googleapis.com/chart?chs=512x512&cht=qr&chld=M|1&chl=${encoded}`
            };
        }
        function openRosterQr(){
            const id = classSelect.value;
            if(!id){ showToast('Select a class first','warn'); return; }
            const opt = classSelect.selectedOptions[0];
            let data = { id };
            try { data = JSON.parse((opt.getAttribute('data-json')||'').replace(/&#39;/g,'"')) || data; } catch(_){ }
            const link = buildCheckInLink(id);
            const { primary, fallback } = buildQrUrls(link);
            if(rosterQrLink) rosterQrLink.value = link;
            if(rosterQrImg){
                rosterQrImg.alt = `QR code for class ${id}`;
                rosterQrImg.onload = () => { try { rosterQrDownload.href = rosterQrImg.src; } catch(_){} };
                rosterQrImg.onerror = () => {
                    try {
                        if(rosterQrImg.src !== fallback){
                            rosterQrImg.src = fallback;
                            showToast('Primary QR service unavailable; using fallback','warn');
                        }
                    } catch(_){ }
                };
                rosterQrImg.src = primary;
            }
            const dt = data.start_datetime ? new Date(data.start_datetime.replace(' ', 'T')) : null;
            const dtLabel = dt ? dt.toLocaleString([], { dateStyle:'medium', timeStyle:'short' }) : 'Unscheduled';
            if(rosterQrMeta) rosterQrMeta.innerHTML = `<strong>${data.course_type || 'Class'}</strong><br>${dtLabel}<br>${data.location || ''}`;
            if(rosterQrDownload) rosterQrDownload.href = primary;
            lastRosterQrTrigger = document.activeElement;
            rosterQrModal?.classList.remove('hidden');
            rosterQrCopy?.focus();
        }
        function closeRosterQr(){ rosterQrModal?.classList.add('hidden'); lastRosterQrTrigger?.focus?.(); }
        rosterQrBtn?.addEventListener('click', openRosterQr);
        rosterQrClose?.addEventListener('click', closeRosterQr);
        rosterQrModal?.addEventListener('click', (e)=>{ if(e.target===rosterQrModal) closeRosterQr(); });
        document.addEventListener('keydown', (e)=>{ if(!rosterQrModal?.classList.contains('hidden') && e.key==='Escape') closeRosterQr(); });
        rosterQrCopy?.addEventListener('click', () => {
            if(!rosterQrLink) return;
            rosterQrLink.select();
            try { document.execCommand('copy'); showToast('Link copied','success'); }
            catch(_){ navigator.clipboard?.writeText(rosterQrLink.value).then(()=>showToast('Link copied','success')).catch(()=>showToast('Copy failed','error')); }
            rosterQrLink.setSelectionRange(0,0);
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
            document.getElementById('client-edit-id').value = data.client_id || data.id;
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
            try { data = JSON.parse(raw.replace(/&#39;/g,'"')); } catch(_){ }
            const payment_status = tr.querySelector('.client-status-select')?.value || '';
            // Split full name for server requirements
            const parts = (data.full_name||'').trim().split(/\s+/);
            const first_name = parts.shift() || '';
            const last_name = parts.length ? parts.join(' ') : '';
            const payload = { first_name, last_name, dob: data.dob||'', email: data.email||'', phone: data.phone||'', address: data.address||'', payment_status };
            const original = btn.textContent; btn.disabled = true; btn.textContent = 'Saving...'; btn.classList.add('btn-loading');
            try {
                const classId = classSelect.value || '';
                let res = await fetch(`${API_BASE_URL}/clients.php?id=${encodeURIComponent(id)}${classId?`&classId=${encodeURIComponent(classId)}`:''}`, { method:'PUT', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify(payload) });
                if(!res.ok && (res.status===405 || res.status===400 || res.status===500)){
                    res = await fetch(`${API_BASE_URL}/clients.php?id=${encodeURIComponent(id)}${classId?`&classId=${encodeURIComponent(classId)}`:''}`, { method:'POST', headers:{'Content-Type':'application/json','X-HTTP-Method-Override':'PUT'}, credentials:'same-origin', body: JSON.stringify({...payload, _method:'PUT'}) });
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
                const parts = full_name.split(/\s+/);
                const first_name = parts.shift() || '';
                const last_name = parts.length ? parts.join(' ') : '';
                const classId = classSelect.value || '';
                let res = await fetch(`${API_BASE_URL}/clients.php?id=${encodeURIComponent(id)}${classId?`&classId=${encodeURIComponent(classId)}`:''}`, {
                    method:'PUT', headers:{'Content-Type':'application/json'}, credentials:'same-origin',
                    body: JSON.stringify({ first_name, last_name, dob, email, phone, address, payment_status })
                });
                if(!res.ok && (res.status===405 || res.status===400 || res.status===500)){
                    res = await fetch(`${API_BASE_URL}/clients.php?id=${encodeURIComponent(id)}${classId?`&classId=${encodeURIComponent(classId)}`:''}`, {
                        method:'POST', headers:{'Content-Type':'application/json','X-HTTP-Method-Override':'PUT'}, credentials:'same-origin',
                        body: JSON.stringify({ first_name, last_name, dob, email, phone, address, payment_status, _method:'PUT' })
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

    // Open/close Create Class modal wiring
    const createModal = document.getElementById('create-class-modal');
    const openCreateBtn = document.getElementById('open-create-class');
    const createCancelBtn = document.getElementById('create-class-cancel');
    const createCloseBtn = document.getElementById('create-class-close');
    let lastCreateTrigger = null;
    function openCreateModal(){ if(!createModal) return; lastCreateTrigger = document.activeElement; createModal.classList.remove('hidden'); document.getElementById('cc-course')?.focus(); }
    function closeCreateModal(){ if(!createModal) return; createModal.classList.add('hidden'); lastCreateTrigger?.focus?.(); }
    openCreateBtn?.addEventListener('click', openCreateModal);
    createCancelBtn?.addEventListener('click', closeCreateModal);
    createCloseBtn?.addEventListener('click', closeCreateModal);
    createModal?.addEventListener('click', (e)=>{ if(e.target===createModal) closeCreateModal(); });
    document.addEventListener('keydown', (e)=>{ if(!createModal?.classList.contains('hidden') && e.key==='Escape') closeCreateModal(); });

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
        function buildQrUrls(link){
            const encoded = encodeURIComponent(link);
            return {
                primary: `https://quickchart.io/qr?text=${encoded}&size=512&margin=1`,
                fallback: `https://chart.googleapis.com/chart?chs=512x512&cht=qr&chld=M|1&chl=${encoded}`
            };
        }
        function wrapText(ctx, text, maxWidth, lineHeight){
            const words = String(text||'').split(/\s+/);
            const lines = [];
            let line = '';
            words.forEach((w, idx) => {
                const test = line ? line + ' ' + w : w;
                if(ctx.measureText(test).width <= maxWidth){
                    line = test;
                } else {
                    if(line) lines.push(line);
                    line = w;
                }
                if(idx === words.length-1) lines.push(line);
            });
            return lines;
        }
        function buildQrComposite(img, title, subtitle){
            const qrSize = 512; // normalize output size
            const pad = 40;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            // Prepare fonts
            const nameFont = 'bold 26px Roboto, Arial, sans-serif'; // class name bold
            const dateFont = '34px Roboto, Arial, sans-serif'; // date ~h2 size
            // Measure wrapped text
            const maxTextWidth = qrSize; // keep within QR width
            ctx.font = nameFont;
            const nameLines = wrapText(ctx, title||'Class', maxTextWidth, 32);
            const nameLH = 32;
            ctx.font = dateFont;
            const dateLines = wrapText(ctx, subtitle||'', maxTextWidth, 40);
            const dateLH = 40;
            const textHeight = (nameLines.length*nameLH) + (dateLines.length? (12 + dateLines.length*dateLH) : 0);
            canvas.width = qrSize + pad*2;
            canvas.height = qrSize + pad*2 + textHeight + 10;
            // Background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0,0,canvas.width,canvas.height);
            // Draw QR centered horizontally
            const qrX = (canvas.width - qrSize)/2;
            ctx.drawImage(img, qrX, pad, qrSize, qrSize);
            // Draw text
            let y = pad + qrSize + 28;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#111';
            ctx.font = nameFont; // Class name (bold)
            nameLines.forEach(line => { ctx.fillText(line, canvas.width/2, y); y += nameLH; });
            if(dateLines.length){ y += 6; ctx.font = dateFont; ctx.fillStyle = '#333'; dateLines.forEach(line => { ctx.fillText(line, canvas.width/2, y); y += dateLH; }); }
            return canvas.toDataURL('image/png');
        }
        function suggestFilename(title, subtitle){
            const safe = (s)=> String(s||'').replace(/\s+/g,' ').trim().replace(/[^\w\-\s]/g,'').replace(/\s/g,'-').slice(0,80);
            const a = safe(title||'Class');
            const b = safe(subtitle||'');
            return `${a}${b?'-'+b:''}-QR.png`;
        }
        async function fetchImageAsBlobUrl(url){
            try {
                const res = await fetch(url, { mode: 'cors' });
                if(!res.ok) throw new Error('fetch failed');
                const blob = await res.blob();
                return URL.createObjectURL(blob);
            } catch(err){ return null; }
        }
        async function ensureImageLoaded(img){
            if(img.complete && img.naturalWidth>0) return;
            await new Promise((resolve, reject)=>{
                img.onload = ()=> resolve();
                img.onerror = ()=> reject(new Error('img load error'));
            });
        }
        function openQrModal(data){
            if(!qrModal) return;
            lastQrTrigger = document.activeElement;
            const base = location.origin; // if deployed behind domain includes schema + host
            const link = `${base}/class_checkin.html?class=${data.id}`;
            qrLinkInput.value = link;
            // QR image with fallback
            const { primary, fallback } = buildQrUrls(link);
            // store metadata for download click
            const dt = data.start_datetime ? new Date(data.start_datetime.replace(' ', 'T')) : null;
            const dtLabel = dt ? dt.toLocaleString([], { dateStyle:'medium', timeStyle:'short' }) : 'Unscheduled';
            qrDownload.dataset.title = data.course_type || 'Class';
            qrDownload.dataset.dt = dtLabel;
            qrDownload.dataset.link = link;
            // Avoid default navigation on anchor
            try { qrDownload.href = 'javascript:void(0)'; } catch(_){}
            qrImg.onerror = () => {
                try {
                    if(qrImg.src !== fallback){
                        qrImg.src = fallback;
                        showToast('Primary QR service unavailable; using fallback','warn');
                    }
                } catch(_){}
            };
            try { qrImg.crossOrigin = 'anonymous'; } catch(_){}
            qrImg.src = primary;
            qrImg.alt = `QR code for class ${data.id}`;
            qrMeta.innerHTML = `<strong>${data.course_type || 'Class'}</strong><br>${dtLabel}<br>${data.location || ''}`;
            qrModal.classList.remove('hidden');
            qrCopyBtn.focus();
        }
        qrDownload?.addEventListener('click', async (e) => {
            e.preventDefault();
            const link = qrDownload?.dataset?.link || qrLinkInput?.value || '';
            if(!link){ showToast('No link available for QR','error'); return; }
            const title = qrDownload.dataset.title;
            const dateLabel = qrDownload.dataset.dt;
            const { primary } = buildQrUrls(link);
            // 1) Try composing directly from the displayed image (fast path)
            try {
                const directUrl = buildQrComposite(qrImg, title, dateLabel);
                if(directUrl){
                    const a = document.createElement('a');
                    a.href = directUrl; a.download = suggestFilename(title, dateLabel);
                    document.body.appendChild(a); a.click(); a.remove();
                    return;
                }
            } catch(_){ /* likely canvas taint; fall through */ }
            // 2) Fetch QR as blob to avoid CORS taint, then compose
            const blobUrl = await fetchImageAsBlobUrl(primary);
            if(!blobUrl){
                try { window.open(qrImg.src, '_blank'); } catch(_){}
                showToast('Could not embed text due to network/CORS; downloaded QR only','warn');
                return;
            }
            const tmp = new Image();
            tmp.onload = () => {
                try {
                    const dataUrl = buildQrComposite(tmp, title, dateLabel);
                    const a = document.createElement('a');
                    a.href = dataUrl; a.download = suggestFilename(title, dateLabel);
                    document.body.appendChild(a); a.click(); a.remove();
                } catch(err){
                    try { window.open(qrImg.src, '_blank'); } catch(_){}
                    showToast('Could not embed text; downloaded QR only','warn');
                } finally { URL.revokeObjectURL(blobUrl); }
            };
            tmp.onerror = () => {
                try { window.open(qrImg.src, '_blank'); } catch(_){}
                showToast('Could not embed text; downloaded QR only','warn');
                URL.revokeObjectURL(blobUrl);
            };
            tmp.src = blobUrl;
        });
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
