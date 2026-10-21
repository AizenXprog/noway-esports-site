// NOWAY / AO VIVO: destaque unificado nos cards do Elenco.
// Não depende de nomes fixos de jogadores. Só é criado quando uma fonte confirmou uma live.
(() => {
  const team = window.NOWAY_DATA?.team || [];
  const platformLabels = { twitch: 'TWITCH', youtube: 'YOUTUBE' };
  function confirmedPlatforms(person) {
    if (!person || person.vacancy) return [];
    const providers = [window.nowayTwitchLiveFor, window.nowayYoutubeLiveFor];
    return providers.flatMap(provider => {
      if (typeof provider !== 'function') return [];
      const status = provider(person);
      return status && platformLabels[status.platform] ? [status.platform] : [];
    }).filter((platform,index,list)=>list.indexOf(platform)===index);
  }
  function make(tag, className, label) {
    const el = document.createElement(tag);
    el.className = className;
    if (label !== undefined) el.textContent = label;
    return el;
  }
  function refresh() {
    document.querySelectorAll('#roster .player-card[data-person]').forEach(card => {
      const person = team.find(player => player.id === card.dataset.person);
      const platforms = confirmedPlatforms(person);
      const signature = platforms.join(',');
      if(card.dataset.nowayLiveSignature === signature &&
         Boolean(card.querySelector('.noway-live-banner')) === Boolean(signature))return;
      card.dataset.nowayLiveSignature = signature;
      card.querySelector('.noway-live-banner')?.remove();
      card.classList.remove('is-noway-live');
      if (!platforms.length) return;
      const banner = make('div', 'noway-live-banner');
      banner.setAttribute('aria-label', person.name + ' está ao vivo na ' + platforms.map(p => platformLabels[p]).join(' e '));

      const primary = make('div', 'noway-live-primary');
      primary.appendChild(make('span', 'noway-live-signal'));
      const headline = make('span', 'noway-live-headline');
      headline.append(make('strong', 'noway-live-title', 'AO VIVO'),
        make('small', 'noway-live-subtitle', 'TRANSMITINDO AGORA'));
      primary.appendChild(headline);

      const sources = make('div', 'noway-live-sources');
      platforms.forEach(platform => sources.appendChild(make('span', 'noway-live-platform', platformLabels[platform])));
      banner.append(primary, sources);
      const info = card.querySelector('.player-info');
      if (info) card.insertBefore(banner,info);
      else card.appendChild(banner);
      card.classList.add('is-noway-live');
      // O card inteiro já abre o perfil com a(s) transmissão(ões), sem link sobre a foto.
    });
  }
  window.nowayRosterLive = { refresh };
  refresh();
})();
