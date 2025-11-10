(function(){
  const params = new URLSearchParams(location.search);
  // Accept multiple possible parameter names and path patterns for robustness
  function extractClassId(){
    // Build a case-insensitive map of query params
    const map = {};
    try {
      for (const [k,v] of params.entries()) { map[String(k).toLowerCase()] = v; }
    } catch(_){ }
    let id = map['class'] || map['classid'] || map['id'] || map['c']
           || params.get('class') || params.get('classId') || params.get('id') || params.get('c');
    if(id) return id;
    // Try path-based /class_checkin.html?123 or /class_checkin/123
    try {
      const url = new URL(location.href);
      const parts = url.pathname.split('/').filter(Boolean);
      // capture last numeric segment
      const last = parts[parts.length-1];
      if(/^[0-9]+$/.test(last)) return last;
    } catch(_){}
    return '';
  }
  const classId = extractClassId();
  const loadingCard = document.getElementById('card-loading');
  const errorCard = document.getElementById('card-error');
  const formCard = document.getElementById('card-form');
  const successCard = document.getElementById('card-success');
  const metaEl = document.getElementById('class-meta');
  const titleEl = document.getElementById('class-title');
  const duplicateMsg = document.getElementById('duplicate-msg');
  const form = document.getElementById('checkin-form');
  const submitBtn = document.getElementById('submit-btn');
  const hiddenClassId = document.getElementById('class_id');
  const errorDebug = document.getElementById('error-debug');
  const manualForm = document.getElementById('manual-class-form');
  const manualInput = document.getElementById('manual-class-id');

  // Simple honeypot to reduce trivial scripted spam
  const honeypot = document.createElement('input');
  honeypot.type = 'text';
  honeypot.name = 'website';
  honeypot.autocomplete = 'off';
  honeypot.style.position = 'absolute';
  honeypot.style.left = '-9999px';
  form.appendChild(honeypot);

  function show(card){
    loadingCard.style.display='none';
    errorCard.style.display='none';
    formCard.style.display='none';
    successCard.style.display='none';
    card.style.display='block';
  }

  function fmtDateTime(iso){
    try {
      const d = new Date(iso.replace(' ', 'T'));
      return d.toLocaleString([], { dateStyle:'medium', timeStyle:'short' });
    } catch(e){ return iso; }
  }

  async function loadClass(idOverride){
    const activeId = idOverride || classId;
    if(!activeId){
      show(errorCard);
      manualForm && (manualForm.style.display='block'); // ensure visible
      if(errorDebug){
        errorDebug.style.display='block';
        errorDebug.textContent = '[Missing class id]\nQuery: ' + location.search;
      }
      return; }
    try {
      const urlRel = `api/classes.php?public=1&id=${encodeURIComponent(activeId)}`;
      let resp;
      try {
        resp = await fetch(urlRel, { cache: 'no-store' });
      } catch(err){
        console.log('[CheckIn] Relative fetch failed, trying absolute /api path', err);
      }
      if(!resp || !resp.ok){
        const urlAbs = `/api/classes.php?public=1&id=${encodeURIComponent(activeId)}`;
        resp = await fetch(urlAbs, { cache: 'no-store' });
      }
      if(!resp.ok){ throw new Error('not ok'); }
      const payload = await resp.json();
      console.log('[CheckIn] classes payload:', payload);
      const data = payload && (payload.data || payload);
      if(!payload || payload.success === false || !data || !data.id){
        show(errorCard);
        manualForm && (manualForm.style.display='block'); // ensure retained
        if(errorDebug){
          errorDebug.style.display='block';
          errorDebug.textContent = '[No class data returned]\nRaw payload:\n' + JSON.stringify(payload,null,2);
        }
        return;
      }
      hiddenClassId.value = data.id;
      titleEl.textContent = (data.course_type || 'Class') + ' Check-In';
      metaEl.innerHTML = `Location: <strong>${data.location || 'TBA'}</strong><br>` +
        `Date: <strong>${fmtDateTime(data.start_datetime || '')}</strong><br>` +
        `Spots Left: <strong>${data.spots_left ?? '—'}</strong>`;
      if(typeof data.spots_left === 'number' && data.spots_left <= 0){
        metaEl.innerHTML += `<br><span style="color:var(--color-primary);font-weight:700;">Class is currently full.</span>`;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Class Full';
      }
      show(formCard);
    } catch(err){
      show(errorCard);
      manualForm && (manualForm.style.display='block');
      if(errorDebug){
        errorDebug.style.display='block';
        errorDebug.textContent = '[Fetch error]\n' + (err && err.message ? err.message : err);
      }
    }
  }

  function validate(){
    let valid = true;
    ['first_name','last_name','email'].forEach(id => {
      const input = document.getElementById(id);
      const errEl = document.querySelector(`[data-error-for="${id}"]`);
      errEl.textContent = '';
      if(!input.value.trim()){ errEl.textContent = 'Required'; valid = false; }
      if(id==='email' && input.value){
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value.trim())){ errEl.textContent = 'Invalid email'; valid = false; }
      }
    });
    return valid;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    duplicateMsg.style.display='none';
    if(honeypot.value){ return; } // bot likely
    if(!validate()){ return; }
    submitBtn.disabled = true;
    const original = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    try {
      const payload = {
        first_name: document.getElementById('first_name').value.trim(),
        last_name: document.getElementById('last_name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        dob: document.getElementById('dob').value,
        address: document.getElementById('address').value.trim(),
        classId: hiddenClassId.value
      };
      const resp = await fetch('api/clients.php', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json().catch(()=>({ success:false }));
      if(data.success){
        if(data.already_registered){ duplicateMsg.style.display='block'; }
        show(successCard);
      } else if((data.message||'').toLowerCase().includes('class is full')){ // backend capacity message
        metaEl.innerHTML += `<br><span style="color:var(--color-primary);font-weight:700;">Class just reached capacity.</span>`;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Class Full';
      } else {
        alert('Unable to process check-in. Please inform instructor.');
        submitBtn.disabled = false;
      }
    } catch(err){
      alert('Network error. Please retry or notify instructor.');
      submitBtn.disabled = false;
    } finally {
      submitBtn.textContent = original;
    }
  });

  loadClass();

  manualForm && manualForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const val = (manualInput && manualInput.value.trim()) || '';
    if(!val){ manualInput && manualInput.focus(); return; }
    errorDebug && (errorDebug.style.display='none');
    loadClass(val);
  });
})();