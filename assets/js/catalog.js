// FrontlineCPR911 Catalog Page (Option A prototype)
// Hardcoded courses and sessions for visualization. No backend calls.

(function(){
  const $ = (s, r=document)=> r.querySelector(s);
  const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));
  const fmtDate = (s) => {
    const d = new Date(s.replace(' ', 'T'));
    return isNaN(d.getTime()) ? s : d.toLocaleString([], { dateStyle:'medium', timeStyle:'short' });
  };

  const COURSES = [
    {
      key: 'BLS Provider',
      title: 'BLS Provider',
      price: 75,
      features: ['Healthcare Provider Level','2-Year Certification','AHA eCard Included']
    },
    {
      key: 'Heartsaver CPR/AED',
      title: 'Heartsaver CPR/AED',
      price: 60,
      features: ['Perfect for Workplace','2-Year Certification','AHA eCard Included'],
      featured: true
    },
    {
      key: 'First Aid + CPR',
      title: 'First Aid + CPR',
      price: 85,
      features: ['Comprehensive Training','2-Year Certification','AHA eCard Included']
    }
  ];

  const SESSIONS = [
    { id: 101, course_type: 'BLS Provider', start_datetime: '2025-12-05 09:00:00', location: 'Main Training Center', max_capacity: 12, registrations: 9 },
    { id: 102, course_type: 'Heartsaver CPR/AED', start_datetime: '2025-12-07 14:00:00', location: 'Community Hall, Room 2', max_capacity: 16, registrations: 16 },
    { id: 103, course_type: 'First Aid + CPR', start_datetime: '2025-12-12 10:00:00', location: 'West Clinic, 2nd Floor', max_capacity: 14, registrations: 6 },
    { id: 104, course_type: 'BLS Provider', start_datetime: '2026-01-03 13:00:00', location: 'Downtown Campus', max_capacity: 10, registrations: 4 },
    { id: 105, course_type: 'Heartsaver CPR/AED', start_datetime: '2026-01-14 09:30:00', location: 'Northside Office', max_capacity: 18, registrations: 2 }
  ];

  // State
  const state = { course:'', month:'' };

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    renderCatalog();
    renderSessions();
    attachFilters();
    attachModal();
  }

  function renderCatalog(){
    const wrap = $('#catalog-cards');
    if(!wrap) return;
    wrap.innerHTML = COURSES.map(c => `
      <div class="course-card${c.featured?' featured':''}">
        <h4>${c.title}</h4>
        <p class="course-price">$${c.price}</p>
        <ul class="course-features">
          ${c.features.map(f=>`<li>${f}</li>`).join('')}
        </ul>
        <div style="display:flex; gap:.5rem; flex-wrap:wrap;">
          <a href="#upcoming-section" data-course="${c.key}" class="btn ${c.featured?'btn-primary':'btn-secondary'} js-view-sessions">View Sessions</a>
          <a href="classes.html" class="btn btn-secondary">Request Group Training</a>
        </div>
      </div>
    `).join('');
    $$('.js-view-sessions', wrap).forEach(a => {
      a.addEventListener('click', (e)=>{
        const key = e.currentTarget.getAttribute('data-course');
        const select = $('#filter-course');
        if(select){ select.value = key; state.course = key; }
        renderSessions();
        // smooth scroll handled by anchor; ensure focus to section
        setTimeout(()=> $('#upcoming-section')?.focus?.(), 100);
      });
    });
  }

  function attachFilters(){
    const select = $('#filter-course');
    const month = $('#filter-month');
    const reset = $('#filter-reset');
    select?.addEventListener('change', ()=>{ state.course = select.value; renderSessions(); });
    month?.addEventListener('change', ()=>{ state.month = month.value; renderSessions(); });
    reset?.addEventListener('click', ()=>{
      state.course = ''; state.month = '';
      if(select) select.value=''; if(month) month.value='';
      renderSessions();
    });
  }

  function renderSessions(){
    const grid = $('#sessions-grid');
    if(!grid) return;
    let list = [...SESSIONS];
    if(state.course){ list = list.filter(x => x.course_type === state.course); }
    if(state.month){
      const toYM = (s)=>{ const d = new Date(s.replace(' ','T')); if(isNaN(d)) return ''; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
      list = list.filter(x => toYM(x.start_datetime) === state.month);
    }
    // sort asc by date
    list.sort((a,b)=> String(a.start_datetime).localeCompare(String(b.start_datetime)));

    if(list.length === 0){
      grid.innerHTML = '<div class="alert" style="grid-column:1/-1;">No sessions match your filters. Try another course or month.</div>';
      return;
    }
    grid.innerHTML = list.map(s => sessionCardHtml(s)).join('');

    // attach sign up buttons
    $$('.js-signup', grid).forEach(btn => btn.addEventListener('click', ()=> openSignup(btn.getAttribute('data-id'))));
  }

  function sessionCardHtml(s){
    const spots = s.max_capacity ? Math.max(0, s.max_capacity - (s.registrations||0)) : null;
    const full = spots !== null && spots <= 0;
    const cap = full ? '<span class="capacity-badge full">Full</span>' : (spots!==null? `<span class="capacity-badge">${spots} left</span>` : '');
    const disabledAttr = full ? 'disabled' : '';
    return `
      <article class="session-card" aria-label="${s.course_type} on ${fmtDate(s.start_datetime)}">
        <h3 class="session-title">${s.course_type}</h3>
        <div class="session-meta">${fmtDate(s.start_datetime)}</div>
        <div class="session-meta">${s.location||''}</div>
        <div>${cap}</div>
        <div class="session-actions">
          <button class="btn ${full?'':'btn-secondary'} btn-small js-signup" data-id="${s.id}" ${disabledAttr} aria-label="Sign up for ${s.course_type} on ${fmtDate(s.start_datetime)}">${full?'Full':'Sign Up'}</button>
        </div>
      </article>
    `;
  }

  // --- Modal logic ---
  let currentSession = null;
  function attachModal(){
    $('#signup-cancel')?.addEventListener('click', closeSignup);
    $('#signup-form')?.addEventListener('submit', (e)=>{
      e.preventDefault();
      // simple client-side validation
      const fn = $('#su-first').value.trim();
      const ln = $('#su-last').value.trim();
      const em = $('#su-email').value.trim();
      if(!fn || !ln || !em){ return; }
      // simulate success
      $('#signup-success').style.display = 'block';
      setTimeout(()=>{ closeSignup(); }, 1200);
    });
  }
  function openSignup(id){
    const s = SESSIONS.find(x => String(x.id) === String(id));
    if(!s) return;
    currentSession = s;
    $('#signupTitle').textContent = `Register for ${s.course_type}`;
    $('#signup-meta').textContent = `${fmtDate(s.start_datetime)} — ${s.location||''}`;
    const spots = s.max_capacity ? Math.max(0, s.max_capacity - (s.registrations||0)) : null;
    $('#signup-capacity').textContent = spots!==null? `${spots} spot${spots===1?'':'s'} left` : '';
    $('#signup-success').style.display='none';
    $('#su-first').value=''; $('#su-last').value=''; $('#su-email').value='';
    $('#signup-modal').classList.add('open');
    $('#su-first').focus();
  }
  function closeSignup(){
    $('#signup-modal').classList.remove('open');
  }
})();
