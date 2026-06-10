// Simple script to allow double-click editing of names (in-place)
(function(){
  const nameEls = document.querySelectorAll('.person .info .name');

  function makeEditable(el){
    el.addEventListener('dblclick', () => {
      const old = el.textContent.trim();
      const newName = prompt('Edit name:', old);
      if (newName === null) return;
      el.textContent = newName.trim() || old;
    });

    // keyboard accessibility: Enter to edit when focused on parent .person
    const parent = el.closest('.person');
    parent.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.dispatchEvent(new Event('dblclick'));
      }
    });
  }

  nameEls.forEach(makeEditable);

  // small progressive enhancement: allow double-click on avatar to suggest initials update
  const avatars = document.querySelectorAll('.avatar');
  avatars.forEach(av => {
    av.addEventListener('dblclick', () => {
      const parent = av.closest('.person');
      const nameEl = parent.querySelector('.info .name');
      const initials = (nameEl.textContent || '').split(/\s+/).map(w => w[0] || '').slice(0,2).join('').toUpperCase();
      av.textContent = initials || av.textContent;
    });
  });
})();
