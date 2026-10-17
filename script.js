const data=window.NOWAY_DATA;
const $=selector=>document.querySelector(selector);
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeLink=url=>{try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}};
function renderTeam(filter='all'){
 const people=data.team.filter(p=>filter==='all'||(filter==='management'?Boolean(p.management):true));
 $('#roster').innerHTML=people.map((p,i)=>`<article class="player-card${p.vacancy?' player-vacancy':''}" tabindex="0" role="button" aria-label="${p.vacancy?'Conhecer vaga Âncora e Suporte':'Ver perfil de '+escapeHTML(p.name)}" data-person="${escapeHTML(p.id)}"><div class="player-art"><span class="player-number">${String(i+1).padStart(2,'0')} / NW</span><span class="player-arrow">↗</span>${p.vacancy?'<div class="player-vacancy-art" aria-hidden="true"><span>+</span><small>RECRUTAMENTO ABERTO</small></div>':p.image?`<img class="player-photo" src="${escapeHTML(p.image)}" alt="Foto de ${escapeHTML(p.name)}">`:`<span class="player-monogram">${escapeHTML(p.initials)}</span>`}</div><div class="player-info"><div class="player-name">${escapeHTML(p.name)}</div><div class="player-role">${escapeHTML(p.role)}</div>${p.management?`<div class="player-mgmt">${escapeHTML(p.management)}</div>`:''}</div></article>`).join('');
 document.querySelectorAll('[data-person]').forEach(el=>{const action=()=>showProfile(data.team.find(p=>p.id===el.dataset.person));el.addEventListener('click',action);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action()}})});
}
function showProfile(p){if(!p)return;
 if(p.vacancy){
  $('#modalContent').innerHTML='<div class="modal-art player-vacancy-modal-art"><div class="player-vacancy-art" aria-hidden="true"><span>+</span><small>OPORTUNIDADE NOWAY</small></div></div>'+
    '<div class="modal-body"><span class="modal-label">NOWAY ESPORTS / RECRUTAMENTO</span>'+
    '<h2>VAGA ABERTA.</h2><div class="modal-role">ÂNCORA / SUPORTE — RAINBOW SIX SIEGE</div>'+
    '<p>'+escapeHTML(p.bio)+'</p><p>Se você se identifica com essa função, faça sua inscrição na área oficial de recrutamento e apresente sua experiência.</p>'+
    '<div class="modal-links"><a href="recrutamento.html">CANDIDATAR-SE À VAGA ↗</a></div></div>';
  $('#playerModal').showModal();return;
 }
const links=(p.socials||[]).map(s=>safeLink(s.url)?`<a href="${escapeHTML(safeLink(s.url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.label)} ↗</a>`:'').join('');$('#modalContent').innerHTML=`<div class="modal-art"><img src="${escapeHTML(p.image||"assets/logo-black.webp")}" alt="${escapeHTML(p.name)}"></div><div class="modal-body"><span class="modal-label">NOWAY ESPORTS / PLAYER PROFILE</span><h2>${escapeHTML(p.name)}</h2><div class="modal-role">${escapeHTML(p.role)} ${p.management?' • '+escapeHTML(p.management):''}</div><p>${escapeHTML(p.bio)}</p><div class="modal-links">${links||'<span class="modal-no-social">Redes sociais ainda não cadastradas.</span>'}</div></div>`;$('#playerModal').showModal()}
renderTeam();
document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(b=>b.classList.remove('is-active'));btn.classList.add('is-active');renderTeam(btn.dataset.filter)}));
$('#closeModal').addEventListener('click',()=>$('#playerModal').close());$('#playerModal').addEventListener('click',e=>{if(e.target===$('#playerModal'))$('#playerModal').close()});
const tournamentContainer=$('#tournaments');
tournamentContainer.hidden=!data.tournaments.length;
tournamentContainer.innerHTML=data.tournaments.length?data.tournaments.map(t=>`<div class="comp-item"><div><strong>${escapeHTML(t.name)}</strong><p>${escapeHTML(t.description)}</p></div><span>${escapeHTML(t.date)}</span><span>${escapeHTML(t.result)}</span></div>`).join(''):'<div class="empty-comp"><div><b>THE JOURNEY STARTS HERE.</b><p>Em breve, esta seção reunirá campeonatos disputados, resultados, adversários e a trajetória competitiva da NOWAY. Nenhum resultado foi publicado sem confirmação.</p></div><div class="empty-icon">01↗</div></div>';
const media=$('#mediaGrid');
const defaultCards=[
 {tag:'BASTIDORES / NOWAY',title:'O QUE VEM POR AÍ.',desc:'Treinos, preparação e novidades da organização em um só lugar.',label:'EM BREVE'},
 {tag:'MÍDIA / NOWAY',title:'NOSSA HISTÓRIA EM IMAGENS.',desc:'Highlights, registros de campeonatos e momentos do elenco serão publicados aqui.',label:'CONTEÚDOS EM PREPARAÇÃO'}
];
if(data.media.length){
 media.innerHTML=data.media.map(m=>{
  const link=safeLink(m.url);
  const content=`<span class="media-tag">${escapeHTML(m.type||'MÍDIA')}</span><h3>${escapeHTML(m.title)}</h3><p>Conteúdo oficial da NOWAY.</p><span class="media-link">ABRIR CONTEÚDO ↗</span>`;
  return link?`<a class="media-card" href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">${content}</a>`:`<article class="media-card">${content}</article>`;
 }).join('');
}else{
 media.innerHTML=defaultCards.map(m=>`<article class="media-card"><span class="media-tag">${escapeHTML(m.tag)}</span><h3>${escapeHTML(m.title)}</h3><p>${escapeHTML(m.desc)}</p><span class="media-link">${escapeHTML(m.label)}</span></article>`).join('');
}
$('#year').textContent=String(new Date().getFullYear());
const menu=$('#mobileNav');$('#menuBtn').addEventListener('click',()=>{menu.hidden=!menu.hidden;$('#menuBtn').setAttribute('aria-expanded',String(!menu.hidden))});menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.hidden=true;$('#menuBtn').setAttribute('aria-expanded','false')}));
window.addEventListener('scroll',()=>{$('.reading-line').style.width=`${100*window.scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)}%`},{passive:true});


// Prévia Twitch exclusiva à seção Elenco — ativa somente quando a API confirma uma live.
const nowayLiveStreams = new Map();
let nowayCurrentProfile = null;

function nowayTwitchLogin(person) {
  const link = (person?.socials || []).find(item => {
    try {
      const host = new URL(item.url).hostname.toLowerCase();
      return host === 'twitch.tv' || host === 'www.twitch.tv';
    } catch { return false; }
  });
  if (!link) return null;
  const login = new URL(link.url).pathname.split('/').filter(Boolean)[0]?.toLowerCase();
  return /^[a-z0-9_]{3,25}$/.test(login || '') ? login : null;
}

function nowayUpdateLiveBadges() {
  document.querySelectorAll('#roster [data-person]').forEach(card => {
    card.querySelector('.player-live-tag:not(.noway-live-youtube)')?.remove();
    const person = data.team.find(item => item.id === card.dataset.person);
    const channel = nowayTwitchLogin(person);
    if (!channel || !nowayLiveStreams.has(channel)) return;
    const tag = document.createElement('span');
    tag.className = 'player-live-tag';
    tag.textContent = '● AO VIVO';
    card.querySelector('.player-art')?.appendChild(tag);
  });
  window.nowayYoutubeUpdateBadges?.();
}

function nowayRenderLivePreview(person) {
  const profile = $('#modalContent .modal-body');
  if (!profile) return;
  profile.querySelector('.player-stream-section:not(.noway-youtube-stream-section)')?.remove();
  const channel = nowayTwitchLogin(person);
  const stream = channel ? nowayLiveStreams.get(channel) : null;
  if (!stream) return;

  const section = document.createElement('section');
  section.className = 'player-stream-section';

  const heading = document.createElement('div');
  heading.className = 'player-stream-heading';
  const flag = document.createElement('span');
  flag.className = 'player-stream-live';
  flag.textContent = '● AO VIVO';
  const meta = document.createElement('span');
  meta.className = 'player-stream-meta';
  meta.textContent = stream.game || 'TRANSMISSÃO NA TWITCH';
  heading.append(flag, meta);
  section.appendChild(heading);

  const title = document.createElement('h3');
  title.className = 'player-stream-title';
  title.textContent = stream.title || 'Acompanhe a transmissão ao vivo';
  section.appendChild(title);

  const preview = document.createElement('button');
  preview.type = 'button';
  preview.className = 'player-stream-preview';
  preview.setAttribute('aria-label', 'Reproduzir prévia da transmissão de ' + person.name);
  const src = safeLink(stream.thumbnail);
  if (src && new URL(src).hostname.endsWith('.jtvnw.net')) {
    const thumb = document.createElement('img');
    thumb.src = src;
    thumb.alt = 'Imagem de prévia da live de ' + person.name;
    thumb.loading = 'lazy';
    preview.appendChild(thumb);
  }
  const play = document.createElement('span');
  play.className = 'player-stream-play';
  play.textContent = '▶ VER TRANSMISSÃO';
  preview.appendChild(play);
  preview.addEventListener('click', () => {
    // A Twitch exige player incorporado com largura mínima de 400px.
    if (preview.getBoundingClientRect().width < 400) {
      window.open('https://www.twitch.tv/' + channel, '_blank', 'noopener,noreferrer');
      return;
    }
    const playerUrl = new URL('https://player.twitch.tv/');
    playerUrl.searchParams.set('channel', channel);
    playerUrl.searchParams.set('parent', window.location.hostname);
    playerUrl.searchParams.set('muted', 'true');
    playerUrl.searchParams.set('autoplay', 'true');
    const iframe = document.createElement('iframe');
    iframe.className = 'player-stream-frame';
    iframe.title = 'Transmissão Twitch de ' + person.name;
    iframe.src = playerUrl.toString();
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    preview.replaceWith(iframe);
  });
  section.appendChild(preview);

  const note = document.createElement('p');
  note.className = 'player-stream-note';
  note.textContent = 'Prévia integrada · áudio inicia desativado';
  section.appendChild(note);
  profile.appendChild(section);
}

const nowayOriginalShowProfile = showProfile;
showProfile = function(person) {
  nowayCurrentProfile = person;
  nowayOriginalShowProfile(person);
  nowayRenderLivePreview(person);
};

async function nowayRefreshLiveStatus() {
  const channels = [...new Set(data.team.map(nowayTwitchLogin).filter(Boolean))];
  if (!channels.length) return;
  try {
    const response = await fetch('/api/live?channels=' + encodeURIComponent(channels.join(',')), { cache: 'no-store' });
    if (!response.ok) return;
    const result = await response.json();
    if (!result.configured || !Array.isArray(result.streams)) return;
    nowayLiveStreams.clear();
    for (const item of result.streams) {
      const login = String(item.channel || '').toLowerCase();
      if (channels.includes(login)) nowayLiveStreams.set(login, item);
    }
    nowayUpdateLiveBadges();
    if ($('#playerModal').open && nowayCurrentProfile) nowayRenderLivePreview(nowayCurrentProfile);
  } catch {
    // Indisponibilidade temporária não afeta a visualização do elenco.
  }
}

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', nowayUpdateLiveBadges));
nowayRefreshLiveStatus();
setInterval(nowayRefreshLiveStatus, 90000);
