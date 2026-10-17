// NOWAY / YouTube AO VIVO no Elenco. Independente da integração da Twitch.
(() => {
  const roster = window.NOWAY_DATA?.team || [];
  const streams = new Map();
  let lastVerifiedAt = 0;
  const hostIsYoutube = host => host === 'youtube.com' || host === 'www.youtube.com';
  function handleOf(person) {
    for (const item of person?.socials || []) {
      try {
        const u = new URL(item.url);
        const name = u.pathname.match(/^\/@([a-z0-9_.-]{3,30})\/?$/i)?.[1]?.toLowerCase();
        if (u.protocol === 'https:' && hostIsYoutube(u.hostname.toLowerCase()) && name) return name;
      } catch { /* URL inválida, ignorar */ }
    }
    return null;
  }
  function updateBadges() {
    document.querySelectorAll('#roster [data-person]').forEach(card => {
      card.querySelectorAll('.noway-live-youtube').forEach(tag => tag.remove());
      const person = roster.find(item => item.id === card.dataset.person);
      const handle = handleOf(person);
      if (!handle || !streams.has(handle)) return;
      const tag = document.createElement('span');
      tag.className = 'player-live-tag noway-live-youtube';
      tag.textContent = '● AO VIVO · YOUTUBE';
      tag.style.bottom = card.querySelector('.player-live-tag:not(.noway-live-youtube)') ? '48px' : '14px';
      card.querySelector('.player-art')?.appendChild(tag);
    });
  }
  window.nowayYoutubeUpdateBadges = updateBadges;

  function renderPreview(person) {
    const profile = document.querySelector('#modalContent .modal-body');
    if (!profile) return;
    profile.querySelectorAll('.noway-youtube-stream-section').forEach(el => el.remove());
    const handle = handleOf(person), stream = handle && streams.get(handle);
    if (!stream) return;
    const section = document.createElement('section');
    section.className = 'player-stream-section noway-youtube-stream-section';

    const heading = document.createElement('div');
    heading.className = 'player-stream-heading';
    const flag = document.createElement('span');
    flag.className = 'player-stream-live';
    flag.textContent = '● AO VIVO · YOUTUBE';
    const meta = document.createElement('span');
    meta.className = 'player-stream-meta';
    meta.textContent = 'TRANSMISSÃO NO YOUTUBE';
    heading.append(flag, meta);
    section.appendChild(heading);

    const title = document.createElement('h3');
    title.className = 'player-stream-title';
    title.textContent = stream.title || 'Transmissão ao vivo no YouTube';
    section.appendChild(title);

    const preview = document.createElement('button');
    preview.type = 'button';
    preview.className = 'player-stream-preview';
    preview.setAttribute('aria-label', 'Assistir à live de ' + person.name + ' no YouTube');
    try {
      const src = new URL(stream.thumbnail || '');
      if (src.protocol === 'https:' && ['i.ytimg.com','img.youtube.com'].includes(src.hostname)) {
        const image = document.createElement('img');
        image.src = src.href;
        image.alt = 'Prévia da transmissão ao vivo de ' + person.name;
        image.loading = 'lazy';
        preview.appendChild(image);
      }
    } catch { /* Prévia indisponível; mantém acesso à transmissão */ }

    const play = document.createElement('span');
    play.className = 'player-stream-play';
    play.textContent = '▶ ASSISTIR NO YOUTUBE';
    preview.appendChild(play);
    preview.addEventListener('click', () => {
      const id = String(stream.videoId || '');
      if (!/^[a-z0-9_-]{11}$/i.test(id)) {
        window.open('https://www.youtube.com/@' + handle + '/live', '_blank', 'noopener,noreferrer');
        return;
      }
      const frame = document.createElement('iframe');
      frame.className = 'player-stream-frame';
      frame.title = 'Transmissão YouTube de ' + person.name;
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1&playsinline=1';
      frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      preview.replaceWith(frame);
    });
    section.appendChild(preview);
    const note = document.createElement('p');
    note.className = 'player-stream-note';
    note.textContent = 'Prévia integrada · áudio desativado inicialmente';
    section.appendChild(note);
    profile.appendChild(section);
  }

  // Encadeia o modal existente sem alterar os links ou a prévia da Twitch.
  const previousProfile = showProfile;
  showProfile = function(person) {
    previousProfile(person);
    if (person && !person.vacancy) renderPreview(person);
  };

  function renderCurrentIfOpen() {
    const modal = document.querySelector('#playerModal');
    if (!modal?.open) return;
    // O perfil aberto contém a foto do atleta; o DOM marca o atual pelo modal original.
    const name = modal.querySelector('.modal-body h2')?.textContent;
    const selected = roster.find(player => player.name === name);
    if (selected) renderPreview(selected);
  }

  function invalidateIfStale() {
    if (streams.size && Date.now() - lastVerifiedAt > 5 * 60 * 1000) {
      streams.clear();
      updateBadges();
      renderCurrentIfOpen();
    }
  }
  async function refresh() {
    const handles = [...new Set(roster.map(handleOf).filter(Boolean))];
    if (!handles.length || document.hidden) return;
    try {
      const response = await fetch('/api/youtube-live?handles=' + encodeURIComponent(handles.join(',')), { cache: 'no-store' });
      if (!response.ok) { invalidateIfStale(); return; }
      const payload = await response.json();
      if (!payload.configured || !Array.isArray(payload.streams)) { invalidateIfStale(); return; }
      streams.clear();
      for (const live of payload.streams) {
        const handle = String(live.handle || '').toLowerCase();
        if (handles.includes(handle) && /^[a-z0-9_-]{11}$/i.test(String(live.videoId || ''))) {
          streams.set(handle, live);
        }
      }
      lastVerifiedAt = Date.now();
      updateBadges();
      renderCurrentIfOpen();
    } catch { invalidateIfStale(); }
  }

  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', updateBadges));
  refresh();
  setInterval(refresh, 90000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
