import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import {fetchR6,rankTier} from "./noway-r6-model.js";
const db=createClient("https://vdipsufzlqmnprbjiojb.supabase.co","sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=(v,d=0)=>v==null||!Number.isFinite(Number(v))?"—":Number(v).toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d});
const pct=(n,d)=>d>0?fmt(n*100/d,1)+"%":"—";
const ratio=(n,d)=>d>0?fmt(n/d,2):n>0?"∞":"—";
const date=v=>v?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(v)):"—";
const roleLabel={owner:"FOUNDER",manager:"TEAM MANAGER",jogador:"JOGADOR",gri:"GESTOR DE RECRUTAMENTO"};
const ranks={copper:"COBRE",bronze:"BRONZE",silver:"PRATA",gold:"OURO",platinum:"PLATINA",emerald:"ESMERALDA",diamond:"DIAMANTE",champion:"CAMPEÃO",unranked:"SEM RANK"};
const roman=["","I","II","III","IV","V"];
const rankLabel=r=>r&&ranks[r.tier]?ranks[r.tier]+(r.division?" "+roman[r.division]:""):"NÃO REGISTRADO";
const rankIcon=r=>{
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
   stats='<small>K/D EXTERNO <b>'+fmt(x.kd,2)+'</b></small><small>RP <b>'+fmt(x.rp)+'</b></small>';
 }
 return '<span class="nw-team-link-status is-linked">● '+status+' · '+safe(p.ubisoft)+' / '+safe(p.platform||"uplay")+'</span>'+
 '<span class="nw-team-external-mini">'+stats+'</span>'+
 '<span class="nw-team-link-date">Vínculo: '+safe(trackerDisplayTime(p.tracker_updated_at))+
 (entry?.data?.fetchedAt?' · Dados: '+safe(trackerDisplayTime(entry.data.fetchedAt)):'')+'</span>';
}
function refreshSelectedExternal(){
 const p=person(),el=$("nowayTeamPlayerLiveStats");
 if(!p||!el)return;
 const entry=externalCache.get(p.id),x=live(p);
 el.innerHTML=!p.ubisoft?
  '<strong>TRACKER NÃO VINCULADO</strong><p>Registre sua conta na aba Minha Conta.</p>':
  x?'<strong>DADOS AUTOMÁTICOS / ARENYZE</strong><p>'+safe(p.ubisoft)+' · '+safe(x.source)+
    ' · Consultado '+safe(trackerDisplayTime(x.fetchedAt))+'</p>':
  '<strong>TRACKER VINCULADO</strong><p>'+(entry?.state==="error"?
    'API indisponível no momento. Nenhum valor será inventado.':'Buscando rank e estatísticas automaticamente...')+'</p>';
 const root=$("nowayTeamPlayerContent");
 if(root){
  const rank=root.querySelector(".nw-detail-ranking");if(rank)rank.outerHTML=renderRank(p);
  const stats=root.querySelector(".nw-detail-metrics");if(stats)stats.innerHTML=metrics(p);
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
     if(!$("nowayConsoleEquipe").hidden)renderRoster();
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
 ["INTEGRANTES",people.length,"Membros autorizados"],
 ["TRACKERS VINCULADOS",people.filter(p=>Boolean(p.ubisoft)).length,"Perfis cadastrados pelo titular"],
 ["JOGADORES PENDENTES",people.filter(p=>p.role==="jogador"&&!p.ubisoft).length,"Ainda não vincularam o R6 Tracker"],
 ["ATUAÇÕES REGISTRADAS",people.reduce((a,p)=>a+(p.stats?.matches||0),0),"Registros de desempenho"]
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
  const x=live(p),rank=x?.rank?rankTier(x.rank):null;
  const rankHTML=!p.ubisoft?"":x?.rank?
   '<span class="nw-team-card-rank">'+(rank?rankIcon(rank):"")+
   '<span><strong>'+safe(x.rank)+'</strong><small>'+(x.rankPoints===null?"RP indisponível":fmt(x.rankPoints)+" RP")+
   ' · ARENYZE</small></span></span>':"";
  const stats=!p.ubisoft?"":x?
   '<span class="nw-team-card-stats"><span><small>K/D</small><b>'+fmt(x.kd,2)+'</b></span>'+
   '<span><small>WIN RATE</small><b>'+(x.winRate===null?"—":fmt(x.winRate,1)+"%")+'</b></span>'+
   '<span><small>PARTIDAS</small><b>'+fmt(x.matches)+'</b></span></span>':
   '<span class="nw-team-stat-wait">CONSULTANDO API / ESTATÍSTICAS PENDENTES</span>';
  return '<button type="button" class="nw-team-card" data-team-player="'+safe(p.id)+'">'+
   '<span class="nw-team-card-top"><span class="nw-team-card-photo">'+avatar(p)+'</span>'+
   '<span class="nw-team-card-name"><strong>'+safe(p.name)+'</strong><small>'+
   safe(roleLabel[p.role]||"EQUIPE")+(p.ubisoft?" · "+safe(p.ubisoft):"")+'</small></span></span>'+
   rankHTML+'<span class="nw-team-card-link">'+externalCard(p)+'</span>'+stats+
   '<span class="nw-team-card-foot"><span>'+(p.ubisoft?
    x?"ESTATÍSTICAS AUTOMÁTICAS / ARENYZE":"AGUARDANDO CONSULTA DA API":
    "VINCULE O TRACKER PARA EXIBIR DADOS")+'</span><span>↗</span></span></button>';
 }).join(""):'<div class="nw-team-empty">Nenhum integrante corresponde à pesquisa.</div>';
 $("nowayTeamHubRoster").querySelectorAll("[data-team-player]").forEach(b=>b.addEventListener("click",()=>openPlayer(b.dataset.teamPlayer)));
}
function renderRank(p){
 const x=live(p),rank=x?.rank?rankTier(x.rank):null;
 if(!p.ubisoft)return '<div class="nw-detail-ranking"><span>VÍNCULO DO TRACKER NECESSÁRIO</span></div>';
 if(!x)return '<div class="nw-detail-ranking"><span>AGUARDANDO A API PARA CONSULTAR O RANK</span></div>';
 return '<div class="nw-detail-ranking">'+(rank?rankIcon(rank):"")+
 '<span><strong>'+safe(x.rank||"RANK NÃO INFORMADO PELA API")+'</strong><small>'+
 (x.rankPoints===null?"RP não disponibilizado":fmt(x.rankPoints)+" RP")+
 ' · ARENYZE / '+safe(trackerDisplayTime(x.fetchedAt))+'</small></span></div>';
}
function metrics(p){
 const x=live(p);
 if(!p.ubisoft)return '<p class="noway-muted">Sem vínculo: nenhuma estatística disponível.</p>';
 if(!x)return '<p class="noway-muted">Consultando a API. Indicadores indisponíveis até receber dados.</p>';
 return [
  ["K/D",fmt(x.kd,2),"Eliminações por morte / API"],
  ["WIN RATE",x.winRate===null?"—":fmt(x.winRate,1)+"%","Vitórias / API"],
  ["PARTIDAS",fmt(x.matches),"Jogos consultados"],
  ["RP",fmt(x.rankPoints),"Rank points"],
  ["KILLS",fmt(x.kills),"Eliminações / API"],
  ["DEATHS",fmt(x.deaths),"Mortes / API"],
  ["HEADSHOT",x.headshots===null?"—":fmt(x.headshots,1)+"%","Taxa / API"],
  ["NÍVEL",fmt(x.level),"Conta Ubisoft"]
 ].map(v=>stat(...v)).join("");
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
 '</span><div><strong>'+safe(p.name)+'</strong><p>'+safe(roleLabel[p.role]||"EQUIPE")+
 (p.ubisoft?" · "+safe(p.ubisoft):"")+'</p><p>NOWAY Tracker / dados da equipe</p></div></div>'+
 renderRank(p)+'<div class="nw-detail-external" id="nowayTeamPlayerLiveStats"></div><div class="nw-detail-metrics">'+metrics(p)+'</div>'+
 '<div id="nowayTeamPlayerHistoryPanel"><p class="noway-muted">Carregando histórico...</p></div>'+
 '';
 $("nowayTeamPlayerExternal").textContent=p.ubisoft?"CONSULTAR "+p.ubisoft+" NO R6 ↗":"CONSULTAR PERFIL EXTERNO ↗";
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
 return !pErr&&["owner","manager","jogador","gri"].includes(profile?.role);
}
async function loadHub(force=false){
 if(!active()||busy)return;
 busy=true;const run=++generation;$("nowayTeamHubRefresh").disabled=true;
 try{
  if(!await checkAuth())throw Error("Acesso exclusivo de jogadores e gestão NOWAY.");
  const {data,error}=await db.rpc("noway_team_hub_v1");if(error)throw error;
  if(run!==generation||!active())return;
  people=Array.isArray(data?.team)?data.team:[];
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
