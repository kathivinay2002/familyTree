// Combined script: in-place name editing + random joke generator + avatar upload/preview + SQL playground + login modal handler
(function(){
  // --- In-place name editing ---
  const nameEls = document.querySelectorAll('.person .info .name');
  function makeEditable(el){
    el.addEventListener('dblclick', () => {
      const old = el.textContent.trim();
      const newName = prompt('Edit name:', old);
      if (newName === null) return;
      el.textContent = newName.trim() || old;
    });
    const parent = el.closest('.person');
    parent && parent.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); el.dispatchEvent(new Event('dblclick')); }
    });
  }
  nameEls.forEach(makeEditable);

  // double-click avatar updates initials
  const avatars = document.querySelectorAll('.avatar');
  avatars.forEach(av => {
    av.addEventListener('dblclick', () => {
      const parent = av.closest('.person');
      const nameEl = parent && parent.querySelector('.info .name');
      const initials = (nameEl ? (nameEl.textContent || '') : '').split(/\s+/).map(w => w[0] || '').slice(0,2).join('').toUpperCase();
      const initialsEl = av.querySelector('.initials');
      if (initialsEl) initialsEl.textContent = initials || initialsEl.textContent;
    });
  });

  // --- Random joke generator ---
  const jokeTextEl = document.getElementById('joke-text');
  const newJokeBtn = document.getElementById('new-joke');
  const shareJokeBtn = document.getElementById('share-joke');
  function formatJoke(j) { if (!j) return ''; if (j.setup && j.punchline) return `${j.setup}\n\n— ${j.punchline}`; return j.joke || j.answer || JSON.stringify(j); }
  async function fetchRandomJoke() {
    const url = 'https://official-joke-api.appspot.com/random_joke'; setLoading(true);
    try {
      const res = await fetch(url, { cache: 'no-store' }); if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json(); const text = formatJoke(data);
      if (jokeTextEl) jokeTextEl.textContent = text; if (shareJokeBtn) shareJokeBtn.hidden = false; lastJokeText = text;
    } catch (err) { console.error('Failed to fetch joke', err); if (jokeTextEl) jokeTextEl.textContent = 'Sorry — could not load a joke. Try again.'; if (shareJokeBtn) shareJokeBtn.hidden = true; lastJokeText = ''; }
    finally{ setLoading(false); }
  }
  let lastJokeText = '';
  function setLoading(isLoading){ if (!newJokeBtn) return; if (isLoading){ newJokeBtn.disabled = true; newJokeBtn.textContent = 'Loading…'; } else { newJokeBtn.disabled = false; newJokeBtn.textContent = 'Get a random joke'; } }
  async function shareOrCopyJoke(){ if (!lastJokeText) return; if (navigator.share){ try{ await navigator.share({ title:'Random Joke', text:lastJokeText }); return; } catch{} } if (navigator.clipboard && navigator.clipboard.writeText){ try{ await navigator.clipboard.writeText(lastJokeText); const old = shareJokeBtn.textContent; shareJokeBtn.textContent='Copied!'; setTimeout(()=>{ shareJokeBtn.textContent = old; },1500); } catch(err){ console.error(err); alert('Could not share the joke. You can copy it manually from the page.'); } } else { const range = document.createRange(); range.selectNodeContents(jokeTextEl); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); alert('Selected the joke text — press Ctrl/Cmd+C to copy.'); sel.removeAllRanges(); } }
  if (newJokeBtn) newJokeBtn.addEventListener('click', fetchRandomJoke);
  if (shareJokeBtn) shareJokeBtn.addEventListener('click', shareOrCopyJoke);
  setTimeout(fetchRandomJoke, 300);

  // --- Avatar upload & preview + persistence (IndexedDB fallback to localStorage) ---
  // Simple indexedDB helpers
  function openDB(dbName='familyTreeDB', store='avatars'){ return new Promise((resolve,reject)=>{ const req = indexedDB.open(dbName,1); req.onupgradeneeded = ()=>{ const db = req.result; if(!db.objectStoreNames.contains(store)) db.createObjectStore(store); }; req.onsuccess = ()=> resolve({db:req.result,store}); req.onerror = ()=> reject(req.error); }); }
  function idbGet(key){ return openDB().then(({db,store})=>new Promise((res,rej)=>{ const tx = db.transaction(store,'readonly'); const st = tx.objectStore(store); const r = st.get(key); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); })); }
  function idbSet(key,val){ return openDB().then(({db,store})=>new Promise((res,rej)=>{ const tx = db.transaction(store,'readwrite'); const st = tx.objectStore(store); const r = st.put(val,key); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); })); }
  function idbDelete(key){ return openDB().then(({db,store})=>new Promise((res,rej)=>{ const tx = db.transaction(store,'readwrite'); const st = tx.objectStore(store); const r = st.delete(key); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); })); }

  document.querySelectorAll('.person').forEach(person => {
    const personId = person.id || null; const avatar = person.querySelector('.avatar'); if (!avatar) return;
    const input = avatar.querySelector('.avatar-input'); const uploadBtn = avatar.querySelector('.upload-photo-btn'); const removeBtn = avatar.querySelector('.remove-photo-btn'); const img = avatar.querySelector('img.avatar-photo'); const initials = avatar.querySelector('.initials'); const storageKey = personId ? `avatar:${personId}` : null;
    // load from indexedDB first
    (async ()=>{ if (personId){ try{ const data = await idbGet(personId); if (data){ if (img) img.src = data; avatar.classList.add('has-photo'); img && img.removeAttribute('aria-hidden'); initials && initials.setAttribute('aria-hidden','true'); } } catch(e){ /* ignore */ } } // fallback localStorage
      if (storageKey && !img.src){ try{ const data2 = localStorage.getItem(storageKey); if (data2 && img){ img.src = data2; avatar.classList.add('has-photo'); img.removeAttribute('aria-hidden'); initials && initials.setAttribute('aria-hidden','true'); } } catch(e){} }
    })();

    uploadBtn && input && uploadBtn.addEventListener('click',(e)=>{ e.stopPropagation(); input.click(); });
    avatar.addEventListener('click',(e)=>{ if (e.target===removeBtn||e.target===uploadBtn||e.target===input) return; if (input) input.click(); });
    input && input.addEventListener('change',(ev)=>{ const file = ev.target.files && ev.target.files[0]; if (!file) return; if (!file.type.startsWith('image/')){ alert('Please select an image file.'); input.value=''; return; } const reader = new FileReader(); reader.onload = async ()=>{ const dataUrl = reader.result; if (img) img.src = dataUrl; avatar.classList.add('has-photo'); img && img.removeAttribute('aria-hidden'); initials && initials.setAttribute('aria-hidden','true'); if (personId){ try{ await idbSet(personId,dataUrl); } catch(err){ try{ localStorage.setItem(storageKey,dataUrl); } catch(e){ console.warn('avatar persistence failed',e); } } } input.value=''; }; reader.readAsDataURL(file); });
    removeBtn && removeBtn.addEventListener('click', async (e)=>{ e.stopPropagation(); if (img) img.src=''; avatar.classList.remove('has-photo'); initials && initials.setAttribute('aria-hidden','false'); if (personId){ try{ await idbDelete(personId); } catch(e){ localStorage.removeItem(storageKey); } } });
  });

  // --- SQL playground (AlaSQL) ---
  // Expose loadDB and runSQL globally so login handler can call loadDB()
  window.loadDB = async function(){
    const msgEl = document.getElementById('sql-message'); const resultsEl = document.getElementById('sql-results');
    try{
      msgEl && (msgEl.textContent = 'Loading users.json...');
      const res = await fetch('users.json',{cache:'no-store'});
      if (!res.ok) throw new Error('Failed to load users.json');
      const db = await res.json(); const users = db.users || [];
      // reset DB
      if (window.alasql){ alasql('CREATE DATABASE IF NOT EXISTS ktDB; USE ktDB; DROP TABLE IF EXISTS users; CREATE TABLE users;'); if (users.length) alasql('INSERT INTO users SELECT * FROM ?',[users]); }
      msgEl && (msgEl.textContent = `Loaded ${users.length} users.`);
      resultsEl && (resultsEl.innerHTML='');
    } catch(err){ console.error(err); msgEl && (msgEl.textContent = 'Error loading DB: ' + err.message); throw err; }
  };

  function renderResults(rows){ const resultsEl = document.getElementById('sql-results'); if (!resultsEl) return; resultsEl.innerHTML=''; if (!rows || rows.length===0){ resultsEl.textContent='(no rows)'; return; } const table = document.createElement('table'); table.className='sql-table'; const thead = document.createElement('thead'); const headerRow = document.createElement('tr'); const cols = Object.keys(rows[0]); cols.forEach(col=>{ const th = document.createElement('th'); th.textContent = col; headerRow.appendChild(th); }); thead.appendChild(headerRow); table.appendChild(thead); const tbody = document.createElement('tbody'); rows.forEach(r=>{ const tr = document.createElement('tr'); cols.forEach(col=>{ const td = document.createElement('td'); const val = r[col]; td.textContent = val===null||val===undefined ? '' : String(val); tr.appendChild(td); }); tbody.appendChild(tr); }); table.appendChild(tbody); resultsEl.appendChild(table); }

  window.runSQL = function(){ const sqlInput = document.getElementById('sql-input'); const msgEl = document.getElementById('sql-message'); const sql = (sqlInput && sqlInput.value||'').trim(); if (!sql){ msgEl && (msgEl.textContent = 'Enter a SQL query.'); return; } msgEl && (msgEl.textContent='Executing...'); try{ const verb = sql.split(/\s+/)[0].toUpperCase(); if (verb !== 'SELECT' && verb !== 'EXPLAIN' && verb !== 'PRAGMA') { msgEl && (msgEl.textContent = 'Only read-only SELECT/EXPLAIN/PRAGMA queries are allowed.'); return; } const res = alasql(sql); if (Array.isArray(res)){ renderResults(res); msgEl && (msgEl.textContent = `Returned ${res.length} row(s).`); } else { renderResults(Array.isArray(res.data)?res.data:[res]); msgEl && (msgEl.textContent = 'Query returned a result.'); } } catch(err){ console.error('SQL error',err); msgEl && (msgEl.textContent = 'SQL error: ' + err.message); } };

  // wire SQL UI
  document.addEventListener('DOMContentLoaded', ()=>{
    const sampleEl = document.getElementById('sample-query'); const runBtn = document.getElementById('run-sql'); const clearBtn = document.getElementById('clear-results'); const loadBtn = document.getElementById('load-db');
    sampleEl && sampleEl.addEventListener('change', ()=>{ if (sampleEl.value) document.getElementById('sql-input').value = sampleEl.value; });
    runBtn && runBtn.addEventListener('click', ()=>{ // require auth for running queries
      if (typeof window.authRequire === 'function' && !sessionStorage.getItem('kathiUser')){ alert('Please sign in to run queries.'); return; }
      window.runSQL();
    });
    clearBtn && clearBtn.addEventListener('click', ()=>{ const resultsEl = document.getElementById('sql-results'); resultsEl && (resultsEl.innerHTML=''); const msgEl = document.getElementById('sql-message'); msgEl && (msgEl.textContent=''); });
    loadBtn && loadBtn.addEventListener('click', ()=>{ window.loadDB(); });
    // load DB on page load if signed in
    if (sessionStorage.getItem('kathiUser')){ window.loadDB().catch(()=>{}); }
  });

  // --- Login modal submit handler (uses modal in index.html) ---
  (function(){
    const modal = document.getElementById('login-modal'); const loginForm = document.getElementById('login-form'); const errorEl = document.getElementById('login-error'); const sqlSection = document.querySelector('.sql-playground'); const signinBtn = document.getElementById('signin-btn');
    function openModal(){ if (!modal) return; modal.style.display='flex'; modal.setAttribute('aria-hidden','false'); const userInput = document.getElementById('login-user'); userInput && userInput.focus(); }
    function closeModal(){ if (!modal) return; modal.style.display='none'; modal.setAttribute('aria-hidden','true'); if (errorEl){ errorEl.style.display='none'; errorEl.textContent=''; } loginForm && loginForm.reset(); }
    function showOrHideSQL(){ const signedIn = !!sessionStorage.getItem('kathiUser'); if (sqlSection) sqlSection.style.display = signedIn ? 'block' : 'none'; const authLinks = document.getElementById('auth-links'); if (authLinks){ if (signedIn){ const user = sessionStorage.getItem('kathiUser'); authLinks.innerHTML = `<span style="font-size:14px;color:#0b1220">Signed in as <strong>${user}</strong></span><button id="logout-btn" style="background:#ef4444;color:white;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;">Logout</button>`; const btn = document.getElementById('logout-btn'); btn && btn.addEventListener('click', ()=>{ window.authLogout && window.authLogout(); showOrHideSQL(); }); } else { authLinks.innerHTML = '<button id="signin-btn" style="background:var(--accent);color:#fff;padding:6px 10px;border-radius:6px;border:none;cursor:pointer;">Sign in</button>'; const newSign = document.getElementById('signin-btn'); newSign && newSign.addEventListener('click', openModal); } } }
    signinBtn && signinBtn.addEventListener('click', openModal);
    const cancelBtn = document.getElementById('login-cancel'); cancelBtn && cancelBtn.addEventListener('click', closeModal);
    if (loginForm){ loginForm.addEventListener('submit', async (e)=>{ e.preventDefault(); const userId = (document.getElementById('login-user')||{}).value?.trim()||''; const password = (document.getElementById('login-pass')||{}).value||''; if (!userId||!password){ if (errorEl){ errorEl.textContent='Enter user ID and password'; errorEl.style.display='block'; } return; } try{ const res = await fetch('users.json',{cache:'no-store'}); if (!res.ok) throw new Error('Could not load user database'); const db = await res.json(); const user = (db.users||[]).find(u=>u.userId===userId&&u.password===password); if (!user){ if (errorEl){ errorEl.textContent='Invalid user ID or password'; errorEl.style.display='block'; } return; } sessionStorage.setItem('kathiUser', user.userId); sessionStorage.setItem('kathiUserProfile', JSON.stringify(user)); closeModal(); showOrHideSQL(); if (typeof window.loadDB==='function'){ try{ await window.loadDB(); } catch(e){ console.warn('loadDB failed',e); } } if (sqlSection){ sqlSection.scrollIntoView({behavior:'smooth'}); } } catch(err){ console.error(err); if (errorEl){ errorEl.textContent='Login error: '+(err.message||err); errorEl.style.display='block'; } } }); }
    document.addEventListener('DOMContentLoaded', ()=>{ showOrHideSQL(); }); window.addEventListener('storage', showOrHideSQL);
  })();

})();
