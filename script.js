const data=window.NOWAY_DATA;
const $=selector=>document.querySelector(selector);
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeLink=url=>{try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}};
function renderTeam(filter='all'){
 const people=data.team.filter(p=>filter==='all'||(filter==='management'?Boolean(p.management):true));
 $('#roster').innerHTML=people.map((p,i)=>`<article class="player-card" tabindex="0" role="button" aria-label="Ver perfil de ${escapeHTML(p.name)}" data-person="${escapeHTML(p.id)}"><div class="player-art"><span class="player-number">${String(i+1).padStart(2,'0')} / NW</span><span class="player-arrow">↗</span>${p.image?`<img class="player-photo" src="${escapeHTML(p.image)}" alt="Foto de ${escapeHTML(p.name)}">`:`<span class="player-monogram">${escapeHTML(p.initials)}</span>`}</div><div class="player-info"><div class="player-name">${escapeHTML(p.name)}</div><div class="player-role">${escapeHTML(p.role)}</div>${p.management?`<div class="player-mgmt">${escapeHTML(p.management)}</div>`:''}</div></article>`).join('');
 document.querySelectorAll('[data-person]').forEach(el=>{const action=()=>showProfile(data.team.find(p=>p.id===el.dataset.person));el.addEventListener('click',action);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action()}})});
}
function showProfile(p){if(!p)return;const links=(p.socials||[]).map(s=>safeLink(s.url)?`<a href="${escapeHTML(safeLink(s.url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.label)} ↗</a>`:'').join('');$('#modalContent').innerHTML=`<div class="modal-art"><img src="${escapeHTML(p.image||"assets/logo-black.webp")}" alt="${escapeHTML(p.name)}"></div><div class="modal-body"><span class="modal-label">NOWAY ESPORTS / PLAYER PROFILE</span><h2>${escapeHTML(p.name)}</h2><div class="modal-role">${escapeHTML(p.role)} ${p.management?' • '+escapeHTML(p.management):''}</div><p>${escapeHTML(p.bio)}</p><div class="modal-links">${links||'<span class="modal-no-social">Redes sociais ainda não cadastradas.</span>'}</div></div>`;$('#playerModal').showModal()}
renderTeam();
document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(b=>b.classList.remove('is-active'));btn.classList.add('is-active');renderTeam(btn.dataset.filter)}));
$('#closeModal').addEventListener('click',()=>$('#playerModal').close());$('#playerModal').addEventListener('click',e=>{if(e.target===$('#playerModal'))$('#playerModal').close()});
const tournamentContainer=$('#tournaments');
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
