import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
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
 const ext=externalCache.get(p.id);
 el.innerHTML=p.ubisoft?
   '<strong>CONTA VINCULADA PELO JOGADOR</strong><p>'+safe(p.ubisoft)+' / '+safe(p.platform||"uplay")+
   ' · Vínculo atualizado em '+safe(trackerDisplayTime(p.tracker_updated_at))+'</p>'+
   (ext?.state==="ready"?'<div class="nw-team-external-values"><span>K/D <b>'+fmt(ext.data.kd,2)+
   '</b></span><span>RP <b>'+fmt(ext.data.rp)+'</b></span></div>'+
   '<small>Atualizado em '+safe(trackerDisplayTime(ext.data.fetchedAt))+' · '+safe(ext.data.source)+
   '. Dados externos, sujeitos à disponibilidade.</small>':
   '<small>'+(ext?.state==="error"?"Dados externos indisponíveis no momento.": "Buscando dados externos...")+'</small>'):
   '<strong>VÍNCULO PENDENTE</strong><p>Este jogador ainda precisa registrar o Tracker em Minha Conta.</p>';
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
       const {data,error}=await db.functions.invoke("noway-r6-tracker",{body:{player:p.ubisoft,platform:p.platform||"uplay"}});
       if(error||!data?.profile)throw Error(error?.message||"Resposta indisponível");
       externalCache.set(p.id,{state:"ready",key,checked:Date.now(),data:extractExternal(data)});
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
  const s=p.stats||{},has=s.matches>0,r=p.rank;
  return '<button type="button" class="nw-team-card" data-team-player="'+safe(p.id)+'">'+
   '<span class="nw-team-card-top"><span class="nw-team-card-photo">'+avatar(p)+'</span><span class="nw-team-card-name"><strong>'+
   safe(p.name)+'</strong><small>'+safe(roleLabel[p.role]||"EQUIPE")+(p.ubisoft?" · "+safe(p.ubisoft):"")+'</small></span></span>'+
   '<span class="nw-team-card-rank">'+(rankIcon(r)||'<span class="nw-team-rank-empty">◇</span>')+
   '<span><strong>'+safe(rankLabel(r))+'</strong><small>'+
   (r?'TEMPORADA '+safe(r.season)+' · '+(r.rp==null?"RP não registrado":fmt(r.rp)+" RP")+' · GESTÃO':'RANK AINDA NÃO REGISTRADO')+
   '</small></span></span>'+
   '<span class="nw-team-card-link">'+externalCard(p)+'</span>'+
   '<span class="nw-team-card-stats"><span><small>K/D</small><b>'+(has?ratio(s.kills,s.deaths):"—")+'</b></span>'+
   '<span><small>KOST</small><b>'+(has?pct(s.kost,s.rounds):"—")+'</b></span>'+
   '<span><small>PARTIDAS</small><b>'+(has?fmt(s.matches):"—")+'</b></span></span>'+
   '<span class="nw-team-card-foot"><span>'+(has?"DADOS REAIS DA NOWAY":"AGUARDANDO REGISTROS")+'</span><span>↗</span></span></button>';
 }).join(""):'<div class="nw-team-empty">Nenhum integrante corresponde à pesquisa.</div>';
 $("nowayTeamHubRoster").querySelectorAll("[data-team-player]").forEach(b=>b.addEventListener("click",()=>openPlayer(b.dataset.teamPlayer)));
}
function renderRank(p){
 const r=p.rank;
 return '<div class="nw-detail-ranking">'+(rankIcon(r)||'<span class="nw-team-rank-empty">◇</span>')+'<span><strong>'+safe(rankLabel(r))+'</strong><small>'+
 (r?"TEMPORADA "+safe(r.season)+" · "+(r.rp==null?"RP não registrado":fmt(r.rp)+" RP"):"Sem rank registrado")+
 '</small><small>'+(r?"REGISTRO DA GESTÃO · "+safe(date(r.recorded_at)):"Não presume a classificação do jogador")+'</small></span></div>';
}
function metrics(p){
 const s=p.stats||{},has=s.matches>0;
 const list=[
 ["K/D",has?ratio(s.kills,s.deaths):"—","Kills / mortes"],
 ["KOST",has?pct(s.kost,s.rounds):"—","Participação por round"],
 ["WIN RATE",has?pct(s.wins,s.matches):"—","Vitórias da NOWAY"],
 ["KPR",has?ratio(s.kills,s.rounds):"—","Kills por round"],
 ["KILLS",has?fmt(s.kills):"—","Eliminações"],
 ["DEATHS",has?fmt(s.deaths):"—","Mortes"],
 ["ASSISTS",has?fmt(s.assists):"—","Assistências"],
 ["SOBREVIVÊNCIA",has?pct(s.survived,s.rounds):"—","Rounds sobrevividos"],
 ["ENTRY KILLS",has?fmt(s.entry_kills):"—","Entradas vencidas"],
 ["ENTRY DEATHS",has?fmt(s.entry_deaths):"—","Mortes de entrada"],
 ["ENTRY DIFF",has?fmt(s.entry_kills-s.entry_deaths):"—","Saldo de entrada"],
 ["ROUNDS",has?fmt(s.rounds):"—","Rounds registrados"]];
 return list.map(x=>stat(...x)).join("");
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
 const rankHistory=ranksHist.length?'<div class="nw-detail-block"><h5>HISTÓRICO DE RANKS.</h5><div class="nw-fixture-roster">'+ranksHist.map(r=>
 '<span>'+safe(rankLabel(r))+' · '+safe(r.season)+' · '+(r.rp==null?"—":fmt(r.rp)+" RP")+' · '+safe(date(r.date))+'</span>').join("")+'</div></div>':"";
 $("nowayTeamPlayerHistoryPanel").innerHTML='<div class="nw-detail-block"><h5>EVOLUÇÃO / ELIMINAÇÕES.</h5><div class="nw-detail-chart">'+chart(matches)+'</div></div>'+
 '<div class="nw-detail-block"><h5>HISTÓRICO PARTIDA A PARTIDA.</h5>'+rows+'</div>'+rankHistory;
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
 (canManage?'<div class="nw-detail-block"><h5>REGISTRAR RANK.</h5><form id="nowayTeamRankForm" class="nw-rank-form">'+
 '<label>TEMPORADA<input name="season" minlength="3" maxlength="48" placeholder="Y11S4" required></label>'+
 '<label>RANK<select name="tier">'+Object.entries(ranks).map(([v,l])=>
 '<option value="'+v+'"'+(v==="unranked"?" selected":"")+'>'+safe(l)+'</option>').join("")+'</select></label>'+
 '<label>DIVISÃO<select name="division"><option value="">SEM DIVISÃO</option>'+
 [1,2,3,4,5].map(i=>'<option value="'+i+'">'+roman[i]+'</option>').join("")+'</select></label>'+
 '<label>RP<input name="rp" type="number" min="0" max="100000" placeholder="Opcional"></label>'+
 '<button type="submit">SALVAR</button></form><p class="nw-rank-explain">Rank registrado manualmente pela gestão, não sincronizado com os servidores da Ubisoft.</p></div>':"");
 $("nowayTeamPlayerExternal").textContent=p.ubisoft?"CONSULTAR "+p.ubisoft+" NO R6 ↗":"CONSULTAR PERFIL EXTERNO ↗";
 $("nowayTeamPlayerExternal").dataset.playerId=id;
 $("nowayTeamPlayerHistory").hidden=true;
 refreshSelectedExternal();
 $("nowayTeamHubPlayer").scrollIntoView({behavior:"smooth",block:"start"});
 const form=$("nowayTeamRankForm");
 if(form){
  if(p.rank){
   form.elements.season.value=p.rank.season;
   form.elements.tier.value=p.rank.tier;
   form.elements.division.value=p.rank.division??"";
   form.elements.rp.value=p.rank.rp??"";
  }
  form.addEventListener("submit",saveRank);
  form.elements.tier.addEventListener("change",()=>{
   const noDiv=["champion","unranked"].includes(form.elements.tier.value);
   form.elements.division.value=noDiv?"":form.elements.division.value||"5";
   form.elements.division.disabled=noDiv;
  });
 }
 const expected=current;
 try{
  const {data,error}=await db.rpc("noway_team_player_history_v1",{p_player_id:id});
  if(error)throw error;
  if(current===expected)renderHistory(data||{});
 }catch(e){
  if(current===expected)$("nowayTeamPlayerHistoryPanel").innerHTML='<p class="noway-muted">Erro ao carregar histórico: '+safe(e.message)+'</p>';
 }
}
async function saveRank(e){
 e.preventDefault();const p=person();if(!p||!canManage)return;
 const form=e.currentTarget,values=new FormData(form),division=String(values.get("division")||"");
 const args={p_player_id:p.id,p_season:String(values.get("season")||"").trim(),p_tier:String(values.get("tier")||"unranked"),
 p_division:division?Number(division):null,p_rank_points:String(values.get("rp")||"").trim()===""?null:Number(values.get("rp"))};
 const b=form.querySelector('button[type="submit"]');b.disabled=true;
 try{
  const {error}=await db.rpc("noway_tracker_save_rank",args);if(error)throw error;
  const id=p.id;await loadHub();await openPlayer(id);
 }catch(error){promptError("Erro ao registrar rank: "+error.message);}
 finally{b.disabled=false;}
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
