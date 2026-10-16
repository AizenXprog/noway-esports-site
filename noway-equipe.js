import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import {fetchR6,rankTier} from "./noway-r6-model.js";
const db=createClient("https://vdipsufzlqmnprbjiojb.supabase.co","sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=(v,d=0)=>v==null||!Number.isFinite(Number(v))?"—":Number(v).toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d});
const pct=(n,d)=>d>0?fmt(n*100/d,1)+"%":"—";
const ratio=(n,d)=>d>0?fmt(n/d,2):n>0?"∞":"—";
const date=v=>v?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(v)):"—";
const roleLabel={owner:"FOUNDER / JOGADOR",manager:"TEAM MANAGER / JOGADOR",gri:"GRI / JOGADOR",jogador:"JOGADOR"};
const rosterRoles=new Set(["owner","manager","gri","jogador"]);
const ranks={copper:"COBRE",bronze:"BRONZE",silver:"PRATA",gold:"OURO",platinum:"PLATINA",emerald:"ESMERALDA",diamond:"DIAMANTE",champion:"CAMPEÃO",unranked:"SEM RANK"};
const roman=["","I","II","III","IV","V"];
const rankLabel=r=>r&&ranks[r.tier]?ranks[r.tier]+(r.division?" "+roman[r.division]:""):"NÃO REGISTRADO";
const rankIcon=(r,image)=>{
 const trusted=typeof image==="string"&&
  /^https:\/\/r6\.arenyze\.com\/assets\/img\/r6_ranks_img\/[a-z0-9_-]+\.webp$/i.test(image)?image:null;
 if(trusted)return '<img src="'+safe(trusted)+'" alt="'+safe(rankLabel(r))+'" loading="lazy">';
 if(!r||!Object.hasOwn(ranks,r.tier))return "";
 const file=["champion","unranked"].includes(r.tier)?r.tier+"-small.webp":
 roman[Number(r.division)]?r.tier+"-"+roman[Number(r.division)].toLowerCase()+"-small.webp":null;
 return file?'<img src="https://raw.githubusercontent.com/Guliveer/r6-stats-extension/main/public/icons/ranks/'+file+'" alt="'+safe(rankLabel(r))+'" loading="lazy">':"";
};
const avatar=p=>{
 if(/^[a-f0-9-]{36}\/avatar\.(webp|jpg)$/.test(p.avatar||""))return '<img src="'+safe(db.storage.from("noway-avatars").getPublicUrl(p.avatar).data.publicUrl)+'" alt="" loading="lazy">';
 return safe((p.name||"N").trim()[0]?.toUpperCase()||"N");
};
let people=[],events=[],current=null,user=null,canManage=false,busy=false,generation=0;
const active=()=>!$("nowayConsoleEquipe")?.hidden||!$("nowayConsoleAgenda")?.hidden;
const person=()=>people.find(p=>p.id===current);
const live=p=>p?.ubisoft&&externalCache.get(p.id)?.state==="ready"?externalCache.get(p.id).data:null;

/* Dados externos são obtidos do backend já usado pelo NOWAY Tracker. A origem
   permanece separada das estatísticas oficiais registradas pela NOWAY. */
const externalCache=new Map();
let externalFetchRunning=false;
const trackerDisplayTime=value=>value?date(value):"Ainda sem atualização";
function extractExternal(payload){
 const p=payload?.profile||{};
 const segment=(p.seasons?.data?.segments||[]).find(x=>/ranked/i.test(String(x.type||x.metadata?.name||"")));
 const board=(p.stats?.platform_families_full_profiles||[]).find(x=>/ranked/i.test(String(x.board_id||x.metadata?.name||"")));
 const sources=[segment?.stats,board?.stats,board,p.stats?.stats].filter(x=>x&&typeof x==="object");
 const numeric=(...keys)=>{for(const data of sources)for(const key of keys){
   const raw=data[key]?.value??data[key];
   if(raw!==null&&raw!==undefined&&raw!==""&&Number.isFinite(Number(raw)))return Number(raw);
 }return null};
 const kills=numeric("kills","Kills"),deaths=numeric("deaths","Deaths");
 return {
   kd:numeric("kd","kD","killDeathRatio","kdr")??(kills!==null&&deaths>0?kills/deaths:null),
   rp:numeric("rankPoints","rp","RankPoints"),
   rank:segment?.metadata?.rank||board?.metadata?.rank||null,
   wins:numeric("wins","Wins"),matches:numeric("matchesPlayed","matches"),
   fetchedAt:payload?.fetchedAt||new Date().toISOString(),
   source:payload?.source||"Provedor externo",
   partial:Boolean(p.meta?.partial)
 };
}
function externalCard(p){
 if(!p.ubisoft)return '<span class="nw-team-link-status is-missing">TRACKER OBRIGATÓRIO · AGUARDANDO VÍNCULO</span>';
 const entry=externalCache.get(p.id);
 const status=entry?.state==="ready"?"CONSULTADO":entry?.state==="error"?"FONTE INDISPONÍVEL":entry?.state==="loading"?"ATUALIZANDO":"VÍNCULO REGISTRADO";
 let stats='<small>Estatísticas externas ainda não consultadas.</small>';
 if(entry?.state==="ready"){
   const x=entry.data;
   stats='<small>K/D DA API <b>'+fmt(x.kd,2)+'</b></small><small>RP DA API <b>'+fmt(x.rankPoints)+'</b></small>';
 }
 return '<span class="nw-team-link-status is-linked">● '+status+' · '+safe(p.ubisoft)+' / '+safe(p.platform||"uplay")+'</span>'+
 '<span class="nw-team-external-mini">'+stats+'</span>'+
 '<span class="nw-team-link-date">Vínculo: '+safe(trackerDisplayTime(p.tracker_updated_at))+
 (entry?.data?.fetchedAt?' · Dados: '+safe(trackerDisplayTime(entry.data.fetchedAt)):'')+'</span>';
}
function refreshSelectedExternal(){
 const p=person(),el=$("nowayTeamPlayerLiveStats");if(!p||!el)return;
 const entry=externalCache.get(p.id),x=live(p);
 el.innerHTML=!p.ubisoft?'<strong>TRACKER NÃO VINCULADO</strong><p>Vincule a conta no seu perfil NOWAY ID.</p>':
 x?'<strong>FONTE EXTERNA / ARENYZE</strong><p>'+safe(p.ubisoft)+' · '+safe(x.source)+' · '+safe(trackerDisplayTime(x.fetchedAt))+
 (x.partial?' · DADOS PARCIAIS':'')+'</p>':
 '<strong>'+(entry?.state==="error"?"API TEMPORARIAMENTE INDISPONÍVEL":"TRACKER VINCULADO")+
 '</strong><p>'+(entry?.state==="error"?"O provedor não retornou dados nesta consulta.":"Sincronizando dados reais...")+'</p>';
 const root=$("nowayTeamPlayerContent");
 if(root){
  const rank=root.querySelector(".nw-detail-ranking");if(rank)rank.outerHTML=renderRank(p);
  const stats=root.querySelector(".nw-detail-metrics");if(stats)stats.innerHTML=metrics(p);
  const history=root.querySelector(".nw-r6-progress");if(history)history.outerHTML=renderExternalHistory(p);
 }
}
async function refreshExternalLinked(force=false){
 if(externalFetchRunning||!user)return;
 const players=people.filter(p=>p.ubisoft);
 if(!players.length)return;
 externalFetchRunning=true;
 const token=generation;
 try{
   // Consultas sequenciais com limite de atualização por jogador: não sobrecarrega o provedor.
   for(const p of players){
     if(token!==generation||document.hidden)break;
     const key=p.platform+":"+p.ubisoft.toLowerCase();
     const old=externalCache.get(p.id);
     if(!force&&old?.key===key&&Date.now()-old.checked<300000)continue;
     externalCache.set(p.id,{state:"loading",key,checked:Date.now()});
     if(!$("nowayConsoleEquipe").hidden)renderRoster();
     try{
       const liveData=await fetchR6(db,p.ubisoft,p.platform||"uplay",{force});
       externalCache.set(p.id,{state:"ready",key,checked:Date.now(),data:liveData});
     }catch(error){
       externalCache.set(p.id,{state:"error",key,checked:Date.now(),error:String(error?.message||error)});
     }
     if(token!==generation)break;
     if(!$("nowayConsoleEquipe").hidden){renderRoster();renderSummary();}
     if(current===p.id)refreshSelectedExternal();
   }
 }finally{externalFetchRunning=false;}
}
function showTrackerRequirement(){
 const box=$("nowayTeamTrackerRequirement");
 if(!box)return;
 const p=people.find(p=>p.id===user?.id);
 const missing=p?.role==="jogador"&&!p.ubisoft;
 box.hidden=!missing;
 if(missing){
   box.innerHTML='<span><strong>VÍNCULO DO TRACKER OBRIGATÓRIO</strong><small>Registre seu nickname e plataforma em Minha Conta para identificar seus dados competitivos na NOWAY.</small></span>'+
     '<button type="button" id="nwTeamProfileLink">VINCULAR AGORA ↗</button>';
   $("nwTeamProfileLink")?.addEventListener("click",()=>document.querySelector('[data-console-tab="profile"]')?.click());
 }
}

const promptError=e=>{const t=$("nowaySystemNotice");if(t){t.hidden=false;t.textContent=String(e);t.classList.add("is-error");}};
const stat=(label,value,desc)=>'<div><small>'+safe(label)+'</small><strong>'+safe(value)+'</strong><em>'+safe(desc)+'</em></div>';
function renderSummary(){
 const next=events.find(e=>e.kind==="partida")||events[0],roster=next?.roster||[];
 const vals=[
 ["JOGADORES",people.length,"Founder, TM, GRI e atletas"],
 ["CONTAS R6 VINCULADAS",people.filter(p=>Boolean(p.ubisoft)).length,"Perfis associados ao elenco"],
 ["VÍNCULOS PENDENTES",people.filter(p=>!p.ubisoft).length,"Jogadores sem Ubisoft vinculada"],
 ["DADOS SINCRONIZADOS",people.filter(p=>Boolean(live(p))).length,"Jogadores com métricas disponíveis"]
 ];
 $("nowayTeamHubSummary").innerHTML=vals.map(v=>'<div><small>'+v[0]+'</small><strong>'+safe(v[1])+'</strong><span>'+v[2]+'</span></div>').join("");
}
function renderFixtures(){
 const root=$("nowayTeamHubFixtures");
 root.innerHTML=events.length?events.map(e=>{
  const roster=e.roster||[],counts=["confirmado","pendente","talvez","ausente"].map(q=>roster.filter(r=>r.presence===q).length);
  const names=roster.length?roster.map(r=>'<span class="'+(r.presence==="confirmado"?"is-confirmed":r.presence==="ausente"?"is-absent":"")+'">'+
   safe({confirmado:"✓",pendente:"…",talvez:"?",ausente:"×"}[r.presence]||"…")+" "+safe(r.name)+(r.starter?" ★":"")+'</span>').join(""):
   '<span>Escalação não registrada</span>';
  return '<article class="nw-fixture"><div class="nw-fixture-top"><span>'+safe(e.kind==="partida"?"PARTIDA":"TREINO")+'</span><span>'+safe(date(e.start_at))+'</span></div>'+
   '<h5>'+safe(e.opponent?"NOWAY × "+e.opponent:e.title)+'</h5><p>'+safe(e.competition||e.title||"Compromisso da equipe")+'</p>'+
   '<div class="nw-fixture-roster">'+names+'</div><div class="nw-fixture-foot"><span><b>'+counts[0]+'</b> CONFIRMADOS · '+
   counts[1]+' PENDENTES · '+counts[2]+' TALVEZ · '+counts[3]+' AUSENTES</span>'+
   '<button type="button" data-open-competitive>ABRIR ↗</button></div></article>';
 }).join(""):'<div class="nw-team-empty">Sem confrontos futuros registrados. Cadastre partidas em Competições para acompanhar convocações e confirmações. <button type="button" class="nw-team-link" data-open-competitive>ABRIR COMPETIÇÕES ↗</button></div>';
 root.querySelectorAll("[data-open-competitive]").forEach(b=>b.addEventListener("click",()=>document.querySelector('[data-console-tab="competitive"]')?.click()));
}
function renderRoster(){
 const term=$("nowayTeamHubSearch").value.trim().toLocaleLowerCase("pt-BR");
 const list=people.filter(p=>[p.name,p.ubisoft,roleLabel[p.role]].some(v=>String(v||"").toLocaleLowerCase("pt-BR").includes(term)));
 $("nowayTeamHubRoster").innerHTML=list.length?list.map(p=>{
  const x=live(p),rank=x?.rank?rankTier(x.rank):null,entry=externalCache.get(p.id);
  const emblem=rank||x?.rankImage?rankIcon(rank,x?.rankImage):'<span class="nw-team-rank-empty" aria-hidden="true">◇</span>';
  const rankName=x?.rank||(p.ubisoft?"RANK INDISPONÍVEL":"RANK PENDENTE");
  const rp=x?.rankPoints==null?"RP NÃO INFORMADO":fmt(x.rankPoints)+" RP";
  const stats=[["K/D",x?fmt(x.kd,2):"—"],["WIN RATE",x&&x.winRate!==null?fmt(x.winRate,1)+"%":"—"],
   ["TAXA HS",x&&x.headshots!==null?fmt(x.headshots,1)+"%":"—"]];
  const state=!p.ubisoft?"CONTA R6 NÃO VINCULADA":x?(x.partial?"DADOS PARCIAIS / ARENYZE":"DADOS REAIS / ARENYZE"):
   entry?.state==="error"?"API INDISPONÍVEL":"SINCRONIZANDO TRACKER";
  return '<button type="button" class="nw-team-card" data-team-player="'+safe(p.id)+'" aria-label="Abrir perfil de '+safe(p.name)+'">'+
   '<span class="nw-team-card-top"><span class="nw-team-card-photo">'+avatar(p)+'</span>'+
   '<span class="nw-team-card-name"><strong>'+safe(p.name)+'</strong><small>'+safe(roleLabel[p.role]||"JOGADOR")+
   '</small><small class="nw-team-card-handle">'+safe(p.ubisoft||"UBISOFT NÃO VINCULADO")+'</small></span></span>'+
   '<span class="nw-team-card-rank">'+emblem+'<span><small class="nw-team-rank-kicker">RANK DA TEMPORADA</small>'+
   '<strong>'+safe(rankName)+'</strong><small>'+safe(p.ubisoft?rp:"AGUARDANDO VÍNCULO")+'</small></span></span>'+
   '<span class="nw-team-card-stats">'+stats.map(v=>'<span><small>'+safe(v[0])+'</small><b>'+safe(v[1])+'</b></span>').join("")+'</span>'+
   '<span class="nw-team-card-foot"><span>'+safe(state)+'</span><span>ABRIR PERFIL ↗</span></span></button>';
 }).join(""):'<div class="nw-team-empty">Nenhum jogador corresponde à pesquisa.</div>';
 $("nowayTeamHubRoster").querySelectorAll("[data-team-player]").forEach(b=>b.addEventListener("click",()=>openPlayer(b.dataset.teamPlayer)));
}
function renderRank(p){
 const x=live(p),rank=x?.rank?rankTier(x.rank):null;
 const emblem=rank||x?.rankImage?rankIcon(rank,x?.rankImage):'<span class="nw-team-rank-empty" aria-hidden="true">◇</span>';
 const name=x?.rank||(p.ubisoft?"RANK INDISPONÍVEL":"AGUARDANDO VÍNCULO R6");
 const detail=!p.ubisoft?"Vincule sua conta R6 em Minha Conta":x?
 (x.rankPoints===null?"RP não informado":fmt(x.rankPoints)+" RP")+" · ARENYZE · "+trackerDisplayTime(x.fetchedAt):
 "Consultando classificação na API";
 return '<div class="nw-detail-ranking">'+emblem+'<span><small>RAINBOW SIX / CLASSIFICAÇÃO ATUAL</small>'+
  '<strong>'+safe(name)+'</strong><small>'+safe(detail)+'</small></span></div>';
}
function metrics(p){
 const x=live(p);
 return [
  ["K/D",x?fmt(x.kd,2):"—","Eliminações por morte"],
  ["WIN RATE",x&&x.winRate!==null?fmt(x.winRate,1)+"%":"—","Taxa de vitória"],
  ["HEADSHOT",x&&x.headshots!==null?fmt(x.headshots,1)+"%":"—","Taxa de HS"],
  ["PARTIDAS",x?fmt(x.matches):"—","Dados do provedor"],
  ["VITÓRIAS",x?fmt(x.wins):"—","Jogos vencidos"],
  ["DERROTAS",x?fmt(x.losses):"—","Jogos perdidos"],
  ["KILLS",x?fmt(x.kills):"—","Eliminações"],
  ["DEATHS",x?fmt(x.deaths):"—","Mortes"],
  ["RP",x?fmt(x.rankPoints):"—","Classificação"],
  ["NÍVEL",x?fmt(x.level):"—","Conta Ubisoft"]
 ].map(v=>stat(...v)).join("");
}
function renderExternalHistory(p){
 const x=live(p),points=(Array.isArray(x?.history)?x.history:[]).filter(q=>q&&Number.isFinite(q.time)&&Number.isFinite(q.rp));
 let visual='<p class="nw-r6-empty">Não há pontos suficientes de histórico de RP disponibilizados pelo provedor.</p>';
 if(points.length>=2){
  const w=700,h=210,pad=28,values=points.map(q=>q.rp),lo=Math.min(...values),hi=Math.max(...values),span=Math.max(1,hi-lo);
  const ps=points.map((q,i)=>[pad+(w-2*pad)*i/(points.length-1),h-pad-(h-2*pad)*(q.rp-lo)/span]);
  const path=ps.map(([a,b],i)=>(i?"L":"M")+a.toFixed(2)+" "+b.toFixed(2)).join(" ");
  const last=ps.at(-1),diff=points.at(-1).rp-points[0].rp;
  visual='<div class="nw-r6-chart-caption"><span>'+fmt(lo)+' — '+fmt(hi)+' RP</span><b>'+
   (diff>0?"+":"")+fmt(diff)+' RP NO PERÍODO</b></div>'+
   '<svg class="nw-r6-chart" viewBox="0 0 700 210" role="img" aria-label="Gráfico de evolução do RP nas '+points.length+' medições">'+
   '<defs><linearGradient id="nwR6Area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2ff00" stop-opacity=".24"/>'+
   '<stop offset="1" stop-color="#f2ff00" stop-opacity="0"/></linearGradient></defs>'+
   [0,1,2,3].map(i=>'<line x1="28" y1="'+(pad+(h-2*pad)*i/3).toFixed(2)+'" x2="672" y2="'+(pad+(h-2*pad)*i/3).toFixed(2)+'" stroke="#495647" stroke-dasharray="4 7"/>').join("")+
   '<path d="'+path+' L'+last[0].toFixed(2)+' 182 L28 182 Z" fill="url(#nwR6Area)"/>'+
   '<path d="'+path+'" fill="none" stroke="#f2ff00" stroke-width="3" stroke-linejoin="round"/>'+
   '<circle cx="'+last[0].toFixed(2)+'" cy="'+last[1].toFixed(2)+'" r="5" fill="#f2ff00"/></svg>'+
   '<div class="nw-r6-chart-caption"><span>'+safe(new Date(points[0].time).toLocaleDateString("pt-BR"))+'</span>'+
   '<span>'+safe(new Date(points.at(-1).time).toLocaleDateString("pt-BR"))+'</span></div>';
 }
 const log=points.length?'<details class="nw-r6-history-log"><summary>CONSULTAR TODAS AS MEDIÇÕES ('+points.length+') <span>＋</span></summary>'+
 '<div class="nw-detail-history"><table><thead><tr><th>DATA / HORÁRIO</th><th>RANK POINTS</th></tr></thead><tbody>'+
 points.slice().reverse().map(q=>'<tr><td>'+safe(date(q.time))+'</td><td><strong>'+safe(fmt(q.rp))+' RP</strong></td></tr>').join("")+
 '</tbody></table></div></details>':'';
 return '<section class="nw-r6-progress nw-r6-panel"><div class="nw-r6-panel-head"><div>'+
 '<small>HISTÓRICO / API ARENYZE</small><h5>EVOLUÇÃO COMPETITIVA R6.</h5>'+
 '<p>Classificação ao longo do tempo, conforme os registros disponibilizados pela API.</p></div>'+
 '<span class="nw-r6-panel-count">'+points.length+' REGISTROS</span></div>'+visual+log+
 '<p class="nw-r6-caveat">A API atual fornece indicadores agregados e histórico de RP, não o registro de cada partida ranqueada individual. Os jogos oficiais da NOWAY aparecem abaixo.</p></section>';
}
function chart(matches){
 const rows=matches.slice().reverse();
 if(rows.length<2)return '<p class="noway-muted">O gráfico de evolução será exibido após dois confrontos registrados.</p>';
 const w=650,h=165,pad=25,max=Math.max(1,...rows.map(m=>Number(m.kills)||0));
 const points=rows.map((m,i)=>[pad+(w-2*pad)*i/(rows.length-1),h-pad-(h-2*pad)*(Number(m.kills)||0)/max]);
 const path=points.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
 return '<svg viewBox="0 0 650 165" role="img" aria-label="Evolução de eliminações por confronto"><path d="'+path+'" fill="none" stroke="#f2ff00" stroke-width="3"/>'+
 points.map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="#f2ff00"/>').join("")+'</svg>';
}
function renderHistory(payload){
 const matches=payload?.matches||[],ranksHist=payload?.ranks||[];
 const rows=matches.length?'<div class="nw-detail-history"><table><thead><tr><th>DATA</th><th>CONFRONTO</th><th>RESULTADO</th><th>K/D/A</th><th>KOST</th><th>ENTRY</th></tr></thead><tbody>'+
 matches.map(m=>'<tr><td>'+safe(date(m.date))+'</td><td>'+safe(m.opponent||"Adversário não informado")+'</td><td>'+
 safe({vitoria:"VITÓRIA",derrota:"DERROTA",empate:"EMPATE"}[m.result]||"—")+'</td><td><strong>'+fmt(m.kills)+' / '+fmt(m.deaths)+' / '+fmt(m.assists)+'</strong></td><td>'+
 safe(pct(m.kost,m.rounds))+'</td><td>'+fmt(m.entry_kills)+' - '+fmt(m.entry_deaths)+'</td></tr>').join("")+
 '</tbody></table></div>':'<p class="noway-muted">Ainda não foram registradas estatísticas de confrontos finalizados para este jogador.</p>';
 $("nowayTeamPlayerHistoryPanel").innerHTML='<div class="nw-detail-block"><h5>EVOLUÇÃO / ELIMINAÇÕES.</h5><div class="nw-detail-chart">'+chart(matches)+'</div></div>'+
 '<div class="nw-detail-block"><h5>HISTÓRICO DE CONFRONTOS NOWAY / REGISTROS INTERNOS.</h5>'+rows+'</div>';
}
async function openPlayer(id){
 const p=people.find(x=>x.id===id);if(!p)return;
 current=id;$("nowayTeamHubPlayer").hidden=false;
 $("nowayTeamPlayerTitle").textContent=p.name.toUpperCase()+".";
 $("nowayTeamPlayerContent").innerHTML='<div class="nw-detail-overview"><span class="nw-detail-avatar">'+avatar(p)+
 '</span><div><strong>'+safe(p.name)+'</strong><p>'+safe(roleLabel[p.role]||"JOGADOR")+
 (p.ubisoft?" · "+safe(p.ubisoft):"")+'</p><p>NOWAY Tracker / desempenho competitivo</p></div></div>'+
 renderRank(p)+'<div class="nw-detail-external" id="nowayTeamPlayerLiveStats"></div>'+
 '<p class="nw-r6-metrics-label">ESTATÍSTICAS DA API / RAINBOW SIX SIEGE</p>'+
 '<div class="nw-detail-metrics">'+metrics(p)+'</div>'+renderExternalHistory(p)+
 '<div id="nowayTeamPlayerHistoryPanel"><p class="noway-muted">Carregando histórico NOWAY...</p></div>';
 $("nowayTeamPlayerExternal").textContent=p.ubisoft?"CONSULTAR "+p.ubisoft+" NO R6 ↗":"PESQUISAR PERFIL R6 ↗";
 $("nowayTeamPlayerExternal").dataset.playerId=id;
 $("nowayTeamPlayerHistory").hidden=true;
 refreshSelectedExternal();
 $("nowayTeamHubPlayer").scrollIntoView({behavior:"smooth",block:"start"});
 const expected=current;
 try{
  const {data,error}=await db.rpc("noway_team_player_history_v1",{p_player_id:id});
  if(error)throw error;
  if(current===expected)renderHistory(data||{});
 }catch(e){
  if(current===expected)$("nowayTeamPlayerHistoryPanel").innerHTML='<p class="noway-muted">Erro ao carregar histórico: '+safe(e.message)+'</p>';
 }
}
async function checkAuth(){
 const {data,error}=await db.auth.getUser();user=error?null:data?.user||null;
 if(!user)return false;
 const {data:profile,error:pErr}=await db.from("noway_profiles").select("role").eq("id",user.id).maybeSingle();
 canManage=!pErr&&["owner","manager"].includes(profile?.role);
 return !pErr&&["owner","manager","jogador"].includes(profile?.role);
}
async function loadHub(force=false){
 if(!active()||busy)return;
 busy=true;const run=++generation;$("nowayTeamHubRefresh").disabled=true;
 try{
  if(!await checkAuth())throw Error("Acesso exclusivo de jogadores e gestão NOWAY.");
  const {data,error}=await db.rpc("noway_team_hub_v1");if(error)throw error;
  if(run!==generation||!active())return;
  people=(Array.isArray(data?.team)?data.team:[]).filter(p=>rosterRoles.has(p.role));
  events=Array.isArray(data?.upcoming)?data.upcoming:[];
  renderSummary();renderFixtures();renderRoster();showTrackerRequirement();
  void refreshExternalLinked(force);
 }catch(e){
  const block='<div class="nw-team-empty">Não foi possível carregar: '+safe(e.message)+'</div>';
  $("nowayTeamHubFixtures").innerHTML=block;$("nowayTeamHubRoster").innerHTML=block;
  promptError("Erro na central Equipe: "+e.message);
 }finally{busy=false;$("nowayTeamHubRefresh").disabled=false;}
}
$("nowayTeamHubRefresh").addEventListener("click",()=>loadHub(true));
$("nowayTeamHubSearch").addEventListener("input",renderRoster);
$("nowayTeamPlayerClose").addEventListener("click",()=>{
 current=null;$("nowayTeamHubPlayer").hidden=true;
 $("nowayTeamHubRoster").scrollIntoView({behavior:"smooth",block:"start"});
});
const tools=$("nowayTeamTrackerTools");
let skipOwnTrackerLookup=false;
tools.addEventListener("toggle",()=>{
 $("nowayConsoleTracker").hidden=!tools.open;
 if(tools.open&&!skipOwnTrackerLookup)window.dispatchEvent(new Event("noway:tracker-open"));
 skipOwnTrackerLookup=false;
});
$("nowayTeamPlayerExternal").addEventListener("click",()=>{
 const p=person();
 skipOwnTrackerLookup=Boolean(p?.ubisoft)&&!tools.open;
 tools.open=true;
 if(p?.ubisoft){
  $("nowayTrackerPlayer").value=p.ubisoft;
  $("nowayTrackerPlatform").value=p.platform||"uplay";
  $("nowayTrackerSearch").requestSubmit();
 }else $("nowayTrackerPlayer").focus();
 tools.scrollIntoView({behavior:"smooth",block:"start"});
});
window.addEventListener("noway:equipe-open",()=>loadHub());
window.addEventListener("noway:agenda-open",()=>loadHub());
window.addEventListener("noway:tracker-linked",()=>{externalCache.clear();loadHub(true);});
document.addEventListener("visibilitychange",()=>{if(active()&&!document.hidden)loadHub();});
setInterval(()=>{if(active()&&!document.hidden)loadHub();},60000);
db.auth.onAuthStateChange(event=>{
 if(event==="SIGNED_OUT"){people=[];events=[];current=null;canManage=false;generation++;$("nowayTeamHubPlayer").hidden=true;}
});
if(["#equipe","#chat","#tracker"].includes(location.hash))setTimeout(loadHub,800);
