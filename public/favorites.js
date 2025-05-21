document.addEventListener('DOMContentLoaded', () => {
  const listEl = document.getElementById('favorites-list');
  const emptyEl = document.getElementById('empty');

  fetch('/api/favorites')
    .then(res => res.json())
    .then(favs => {
      if (!favs.length) {
        emptyEl.style.display = 'block';
        return;
      }
      emptyEl.style.display = 'none';

      favs.forEach(item => {
        const li = document.createElement('li');
        li.classList.add('favorite-item');

        // Obrázek skladby
        const img = document.createElement('img');
        img.src = item.cover || 'fallback.jpg'; // fallback pokud chybí
        img.alt = item.title;
        img.classList.add('cover-image');
        img.onerror = () => img.src = 'fallback.jpg';

        // Název skladby
        const title = document.createElement('span');
        title.textContent = item.title;
        title.classList.add('song-title');

        // Tlačítko pro odebrání
        const btn = document.createElement('button');
        btn.textContent = 'Remove';
        btn.classList.add('remove-button');
        btn.addEventListener('click', () => removeFavorite(item.id, li));

        li.appendChild(img);
        li.appendChild(title);
        li.appendChild(btn);
        listEl.appendChild(li);
      });
    })
    .catch(console.error);

  function removeFavorite(id, liEl) {
    fetch(`/api/favorites/${id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          listEl.removeChild(liEl);
          if (!listEl.children.length) {
            emptyEl.style.display = 'block';
          }
        }
      })
      .catch(console.error);
  }
});
