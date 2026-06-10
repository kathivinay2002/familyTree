// Combined script: in-place name editing + random joke generator + avatar upload/preview
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
    parent.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.dispatchEvent(new Event('dblclick'));
      }
    });
  }

  nameEls.forEach(makeEditable);

  // double-click avatar updates initials
  const avatars = document.querySelectorAll('.avatar');
  avatars.forEach(av => {
    av.addEventListener('dblclick', () => {
      const parent = av.closest('.person');
      const nameEl = parent.querySelector('.info .name');
      const initials = (nameEl.textContent || '').split(/\s+/).map(w => w[0] || '').slice(0,2).join('').toUpperCase();
      const initialsEl = av.querySelector('.initials');
      if (initialsEl) initialsEl.textContent = initials || initialsEl.textContent;
    });
  });

  // --- Random joke generator ---
  const jokeTextEl = document.getElementById('joke-text');
  const newJokeBtn = document.getElementById('new-joke');
  const shareJokeBtn = document.getElementById('share-joke');

  function formatJoke(j) {
    if (!j) return '';
    if (j.setup && j.punchline) return `${j.setup}\n\n— ${j.punchline}`;
    return j.joke || j.answer || JSON.stringify(j);
  }

  async function fetchRandomJoke() {
    const url = 'https://official-joke-api.appspot.com/random_joke';
    setLoading(true);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const text = formatJoke(data);
      if (jokeTextEl) jokeTextEl.textContent = text;
      if (shareJokeBtn) shareJokeBtn.hidden = false;
      lastJokeText = text;
    } catch (err) {
      console.error('Failed to fetch joke', err);
      if (jokeTextEl) jokeTextEl.textContent = 'Sorry — could not load a joke. Try again.';
      if (shareJokeBtn) shareJokeBtn.hidden = true;
      lastJokeText = '';
    } finally {
      setLoading(false);
    }
  }

  let lastJokeText = '';
  function setLoading(isLoading) {
    if (!newJokeBtn) return;
    if (isLoading) {
      newJokeBtn.disabled = true;
      newJokeBtn.textContent = 'Loading…';
    } else {
      newJokeBtn.disabled = false;
      newJokeBtn.textContent = 'Get a random joke';
    }
  }

  async function shareOrCopyJoke() {
    if (!lastJokeText) return;
    if (navigator.share) {
      try { await navigator.share({ title: 'Random Joke', text: lastJokeText }); return; } catch (_) {}
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(lastJokeText);
        const old = shareJokeBtn.textContent;
        shareJokeBtn.textContent = 'Copied!';
        setTimeout(() => { shareJokeBtn.textContent = old; }, 1500);
      } catch (err) {
        console.error(err);
        alert('Could not share the joke. You can copy it manually from the page.');
      }
    } else {
      const range = document.createRange();
      range.selectNodeContents(jokeTextEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      alert('Selected the joke text — press Ctrl/Cmd+C to copy.');
      sel.removeAllRanges();
    }
  }

  if (newJokeBtn) newJokeBtn.addEventListener('click', fetchRandomJoke);
  if (shareJokeBtn) shareJokeBtn.addEventListener('click', shareOrCopyJoke);
  setTimeout(fetchRandomJoke, 300);

  // --- Avatar upload & preview + local persistence ---
  document.querySelectorAll('.person').forEach(person => {
    const personId = person.id || null;
    const avatar = person.querySelector('.avatar');
    if (!avatar) return;

    const input = avatar.querySelector('.avatar-input');
    const uploadBtn = avatar.querySelector('.upload-photo-btn');
    const removeBtn = avatar.querySelector('.remove-photo-btn');
    const img = avatar.querySelector('img.avatar-photo');
    const initials = avatar.querySelector('.initials');

    const storageKey = personId ? `avatar:${personId}` : null;

    // Load persisted photo (if any)
    if (storageKey && localStorage.getItem(storageKey)) {
      const dataUrl = localStorage.getItem(storageKey);
      img.src = dataUrl;
      avatar.classList.add('has-photo');
      img.removeAttribute('aria-hidden');
      if (initials) initials.setAttribute('aria-hidden', 'true');
    }

    // clicking upload button opens file picker
    if (uploadBtn && input) {
      uploadBtn.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });
    }

    // optional: clicking avatar opens file picker (but skip clicks on control buttons)
    avatar.addEventListener('click', (e) => {
      if (e.target === removeBtn || e.target === uploadBtn || e.target === input) return;
      if (input) input.click();
    });

    // file selected -> preview and persist
    if (input) {
      input.addEventListener('change', (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          alert('Please select an image file.');
          input.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          img.src = dataUrl;
          avatar.classList.add('has-photo');
          img.removeAttribute('aria-hidden');
          if (initials) initials.setAttribute('aria-hidden', 'true');
          if (storageKey) {
            try { localStorage.setItem(storageKey, dataUrl); } catch (err) { console.warn('Could not save avatar to localStorage', err); }
          }
          input.value = '';
        };
        reader.readAsDataURL(file);
      });
    }

    // remove photo -> clear preview and storage
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        img.src = '';
        avatar.classList.remove('has-photo');
        if (initials) initials.setAttribute('aria-hidden', 'false');
        if (storageKey) localStorage.removeItem(storageKey);
      });
    }
  });

})(); // IIFE end
