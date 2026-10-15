import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* NOWAY ID / Portal. Operações sensíveis protegidas no Supabase por RLS + RPC.
   O navegador nunca recebe uma chave administrativa. */
const db=createClient("https://vdipsufzlqmnprbjiojb.supabase.co","sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const roles={owner:"FOUNDER / OWNER",manager:"TEAM MANAGER",jogador:"JOGADOR",membro:"MEMBRO"};
const kinds={partida:"PARTIDA",treino:"TREINO",reuniao:"REUNIÃO",evento:"EVENTO"};
const activeRoles=new Set(["owner","manager","jogador"]);
let me=null,account=null,events=[],calendar=new Date(),selectedDay=null;
let accountsOffset=0,accountSearch="",accountPages=0,accountFetchRun=0,searchTimer=0,loadEventsPromise=null;
let hqSnapshot=null,hqActivity=[],hqInbox=[],hqLoadedAt=0,hqLoading=false,hqRun=0,hqIdentity=null;
calendar=new Date(calendar.getFullYear(),calendar.getMonth(),1);
const signed=()=>Boolean(me&&account);
const isStaff=()=>activeRoles.has(account?.role);
const isManager=()=>account?.role==="owner"||account?.role==="manager";
const isOwner=()=>account?.role==="owner";
const notice=(message,error=false)=>{
  const box=$("nowaySystemNotice");
  if(!box)return;
  box.textContent=message;box.hidden=false;box.classList.toggle("is-error",error);
  if(error)box.scrollIntoView({behavior:"smooth",block:"nearest"});
};
const avatarURL=path=>{
  if(!path||!me||!(/^[a-f0-9-]{36}\/avatar\.(?:webp|jpg)$/.test(path)))return null;
  return db.storage.from("noway-avatars").getPublicUrl(path).data.publicUrl;
};
const avatarMarkup=(path,name,klass="noway-account-avatar")=>{
  const href=avatarURL(path);
  const version=href&&me&&path.startsWith(me.id+"/")?"?v="+encodeURIComponent(window.nowayAvatarVersion||"1"):"";
  return href?'<img class="'+klass+'" src="'+escapeHTML(href+version)+'" alt="" loading="lazy">':
    '<span class="'+klass+' noway-account-avatar-letter">'+escapeHTML((name||"N").trim().charAt(0).toUpperCase())+'</span>';
};
const fmtDate=ts=>ts?new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric",timeZone:"America/Sao_Paulo"}).format(new Date(ts)):"—";
const fmtTime=ts=>ts?new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(new Date(ts)):"—";
const fmtFull=ts=>ts?fmtDate(ts)+" · "+fmtTime(ts):"Nunca";
const spDateKey=ts=>{
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(ts));
  const g=t=>parts.find(p=>p.type===t)?.value||"";
  return g("year")+"-"+g("month")+"-"+g("day");
};
const localKey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const isoLocal=ts=>{
  if(!ts)return"";
  const d=new Date(ts);if(Number.isNaN(d.getTime()))return"";
  const n=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return n.toISOString().slice(0,16);
};
const safeLink=url=>{
  try{const u=new URL(url);return u.protocol==="https:"?u.href:null;}catch{return null;}
};
const viewPermitted=name=>{
  if(name==="users")return isOwner();
  if(["chat","agenda","team","competitive","stats"].includes(name))return isStaff();
  return ["overview","contacts","profile"].includes(name);
};
let currentTab="overview";

// Avisos reais por área: comparação de versões de registros por conta e navegador.
// O primeiro acesso cria uma linha-base; não inventa notificações antigas.
const nowayAreaRevisions=new Map();
function nowayRevisionKey(tab){return "noway:seen:"+me?.id+":"+tab;}
function nowayFingerprint(text){
  let hash=2166136261;
  for(let i=0;i<text.length;i++){hash=Math.imul(hash^text.charCodeAt(i),16777619);}
  return (hash>>>0).toString(36);
}
function nowayNavDot(tab,visible){
  const el=document.querySelector('[data-console-tab="'+tab+'"]');
  if(!el)return;
  el.classList.toggle("has-new",Boolean(visible));
  if(visible)el.title="Há atualizações que você ainda não abriu";
  else el.removeAttribute("title");
}
function nowayObserveArea(tab,items){
  if(!me?.id||!Array.isArray(items))return;
  const fingerprint=nowayFingerprint(items.join("|"));
  nowayAreaRevisions.set(tab,fingerprint);
  const key=nowayRevisionKey(tab);
  let previous=null;
  try{previous=localStorage.getItem(key);}catch{}
  if(previous===null||currentTab===tab){
    try{localStorage.setItem(key,fingerprint);}catch{}
    nowayNavDot(tab,false);
  }else nowayNavDot(tab,previous!==fingerprint);
}
function nowayMarkAreaSeen(tab){
  const version=nowayAreaRevisions.get(tab);
  if(version!==undefined&&me?.id){
    try{localStorage.setItem(nowayRevisionKey(tab),version);}catch{}
  }
  nowayNavDot(tab,false);
}

function syncConsoleNavigationGroups(){
  document.querySelectorAll("[data-console-nav-group]").forEach(group=>{
    const buttons=[...group.querySelectorAll("[data-console-tab]")];
    group.hidden=!buttons.some(button=>!button.hidden);
  });
  document.querySelectorAll("[data-shortcut-group]").forEach(group=>{
    const items=[...group.querySelectorAll("[data-console-open]")];
    group.hidden=!items.some(item=>!item.hidden)&&!group.querySelector('a[href]:not([hidden])');
  });
}
function setTab(name){
  if(!signed()||!viewPermitted(name))name="overview";
  currentTab=name;
  nowayMarkAreaSeen(name);
  const root=$("nowayDashboard");
  root.dataset.consoleActive=name;
  document.querySelectorAll("[data-console-tab]").forEach(btn=>{
    const allowed=viewPermitted(btn.dataset.consoleTab);
    btn.hidden=!allowed;
    btn.classList.toggle("is-active",btn.dataset.consoleTab===name);
    if(btn.dataset.consoleTab===name)btn.setAttribute("aria-current","page");
    else btn.removeAttribute("aria-current");
  });
  for(const v of ["overview","agenda","users","profile"]){
    const el=document.querySelector('[data-console-view="'+v+'"]');
    if(el)el.hidden=v!==name;
  }
  $("nowayConsoleUsers").hidden=name!=="users";
  $("nowayConsoleAgenda").hidden=name!=="agenda";
  $("nowayConsoleCompetitive").hidden=name!=="competitive";
  $("nowayConsolePlayerStats").hidden=name!=="stats";
  $("nowayConsoleProfile").hidden=name!=="profile";
  $("nowayConsoleOverview").hidden=name!=="overview";
  syncConsoleNavigationGroups();
  // A lista e o chat existentes são segmentados em CSS, sem copiar estado.
  if(name==="agenda"){renderCalendar();renderEvents();}
  if(name==="users")refreshAccounts();
  if(name==="overview"){
    renderOverview();
    if(Date.now()-hqLoadedAt>60000)refreshHQ();
  }
  if(name==="profile")renderProfile();
  if(name==="chat")window.dispatchEvent(new Event("noway:chat-open"));
  if(name==="competitive")refreshCompetitive();
  if(name==="stats")refreshPlayerStats();
  try{history.replaceState(null,"",location.pathname+"#"+name);}catch{}
  document.querySelector(".noway-console-main")?.scrollIntoView({behavior:"smooth",block:"start"});
}
function syncRoles(){
  document.querySelectorAll("[data-console-tab]").forEach(btn=>btn.hidden=!viewPermitted(btn.dataset.consoleTab));
  $("nowayEventCreate").hidden=!isManager();
  $("nowayCompCreate").hidden=!isManager();
  const greet={owner:"CENTRAL DO FOUNDER.",manager:"CENTRAL DA GESTÃO.",jogador:"ÁREA DO JOGADOR.",membro:"SUA CONTA NOWAY."};
  $("nowayOverviewGreeting").textContent=greet[account.role]||"NOWAY ID.";
  $("nowayOverviewDesc").textContent=isOwner()?"Controle o elenco, eventos, contatos e as contas cadastradas.":
    isManager()?"Agenda, comunicados e conversas da equipe em um só lugar.":
    isStaff()?"Confira seus compromissos, comunicados e mensagens da equipe.":
    "Sua identidade e suas conversas com a NOWAY, sem complicação.";
  $("nowayConsoleWelcomeText").textContent=isStaff()?
    "O chat da equipe é privado. Todos os jogadores e gestores autorizados podem conversar aqui.":
    "Você pode enviar uma mensagem diretamente à organização e acompanhar a resposta.";
  document.querySelectorAll("[data-console-open]").forEach(el=>el.hidden=!viewPermitted(el.dataset.consoleOpen));
  syncConsoleNavigationGroups();
  $("nowayHQNewEvent").hidden=!isManager();
  $("nowayHQInboxSection").hidden=!isOwner();
  const requested=location.hash.slice(1);
  setTab(viewPermitted(requested)&&["overview","team","agenda","competitive","stats","chat","contacts","users","profile"].includes(requested)?requested:"overview");
}
async function loadAccount(){
  try{
    const auth=await db.auth.getUser();me=auth.data.user||null;
    if(!me){account=null;return;}
    const res=await db.from("noway_profiles").select("id,display_name,role,avatar_url").eq("id",me.id).maybeSingle();
    if(res.error)throw res.error;
    account=res.data||{id:me.id,role:"membro",display_name:me.user_metadata?.full_name||"Membro",avatar_url:null};
    if(hqIdentity!==me.id){hqSnapshot=null;hqActivity=[];hqInbox=[];hqLoadedAt=0;hqIdentity=me.id;}
    nowayAreaRevisions.clear();
    document.querySelectorAll("[data-console-tab]").forEach(button=>{
      button.classList.remove("has-new");button.removeAttribute("title");
    });
    if(playerStatsState.userId&&playerStatsState.userId!==me.id){
      playerStatsState.rows=[];playerStatsState.people=[];playerStatsState.roster=[];playerStatsState.matches=[];
      playerStatsState.userId=null;playerStatsState.loadedAt=0;
      playerStatsState.selectedPlayer=null;playerStatsState.selectedMatch=null;
    }
    if(competitiveState.userId&&competitiveState.userId!==me.id){
      competitiveState.matches.clear();competitiveState.roster=[];competitiveState.maps=[];
      competitiveState.people=[];competitiveState.selected=null;competitiveState.lastLoaded=0;
      competitiveState.userId=null;
    }
    syncRoles();renderProfile();
    if(isStaff())await refreshEvents();
    await refreshHQ();
    if(isStaff()&&currentTab==="competitive")await refreshCompetitive(true);
    if(isStaff()&&currentTab==="stats")await refreshPlayerStats(true);
  }catch(err){notice("Falha ao carregar seu painel: "+err.message,true);}
}
function renderProfile(){
  if(!signed())return;
  const name=account.display_name||"Membro";
  const url=avatarURL(account.avatar_url);
  const img=$("nowayAvatarPhoto"),letter=$("nowayAvatarLetter"),preview=$("nowayProfileAvatar");
  img.hidden=!url;letter.hidden=Boolean(url);letter.textContent=name.trim().charAt(0).toUpperCase();
  if(url){img.src=url+"?v="+encodeURIComponent(window.nowayAvatarVersion||"1");}
  preview.innerHTML=avatarMarkup(account.avatar_url,name,"noway-account-avatar");
  $("nowayProfileRemoveAvatar").hidden=!url;
  // A mudança de nome usa o fluxo já existente do NOWAY ID.
}

function hqStat(label,value,annotation,kind="standard"){
  const formatted=typeof value==="number"?new Intl.NumberFormat("pt-BR").format(value):value??"—";
  return '<article class="noway-hq-stat is-'+kind+'">'+
      '<small>'+escapeHTML(label)+'</small><strong>'+escapeHTML(formatted)+'</strong>'+
      '<span>'+escapeHTML(annotation)+'</span></article>';
}
function renderOverview(){
  if(!signed())return;
  const snapshot=hqSnapshot;
  const atLeastOneRole=isStaff();
  const isLoading=!snapshot;
  const metrics=isOwner()?[
    ["CONTAS NOWAY",snapshot?.accounts,"Usuários cadastrados no NOWAY ID"],
    ["CONTATOS PENDENTES",snapshot?.pending_contacts,"Solicitações que precisam de atenção","priority"],
    ["INTEGRANTES",snapshot?.members,"Jogadores, TM e Founder"],
    ["PRÓXIMOS EVENTOS",snapshot?.upcoming_events,"Agenda da equipe"]
  ]:atLeastOneRole?[
    ["EQUIPE",snapshot?.members,"Integrantes autorizados"],
    ["JOGADORES",snapshot?.players,"Elenco com acesso interno"],
    ["AGENDA",snapshot?.upcoming_events,"Compromissos futuros"],
    ["CHAT / 24H",snapshot?.chat_last_24h,"Mensagens nas últimas 24 horas"]
  ]:[
    ["SEU CARGO",roles[account.role]||"MEMBRO","Nível de acesso"],
    ["CONTATOS",snapshot?.my_contacts,"Solicitações na sua conta"],
    ["MINHA CONTA","ATIVA","Sessão NOWAY ID"],
    ["ÁREA", "PESSOAL","Perfil e conversas"]
  ];
  $("nowayConsoleStats").innerHTML=metrics.map(m=>hqStat(m[0],isLoading?"—":m[1],m[2],m[3]||"standard")).join("");
  const upcoming=atLeastOneRole?events.filter(e=>
    new Date(e.start_at).getTime()>=Date.now()-3600000&&e.status!=="cancelado"
  ).slice(0,4):[];
  $("nowayConsoleUpcoming").innerHTML=!atLeastOneRole?
      '<div class="noway-hq-empty"><span>◈</span><strong>SEU ESPAÇO PESSOAL.</strong><p>Entre em contato com a NOWAY e acompanhe as respostas na aba Contatos.</p></div>':
    upcoming.length?upcoming.map(e=>{
      const date=fmtDate(e.start_at);
      const kind=kinds[e.kind]||"EVENTO";
      return '<button type="button" class="noway-hq-next-item" data-hq-event="'+escapeHTML(e.id)+'">'+
        '<span class="noway-hq-next-date">'+escapeHTML(date)+'<small>'+escapeHTML(fmtTime(e.start_at))+'</small></span>'+
        '<span class="noway-hq-next-name"><small>'+escapeHTML(kind)+'</small><strong>'+escapeHTML(e.title)+'</strong>'+
        (e.opponent?'<em>VS. '+escapeHTML(e.opponent)+'</em>':'')+'</span><b>↗</b></button>';
    }).join(""):'<div class="noway-hq-empty"><span>◇</span><strong>SEM EVENTOS PRÓXIMOS.</strong><p>Quando a gerência marcar um treino ou partida, aparecerá aqui.</p></div>';
  $("nowayConsoleUpcoming").querySelectorAll("[data-hq-event]").forEach(button=>button.addEventListener("click",()=>{
    const e=events.find(x=>x.id===button.dataset.hqEvent);
    if(!e)return;
    const d=new Date(e.start_at);calendar=new Date(d.getFullYear(),d.getMonth(),1);
    selectedDay=spDateKey(e.start_at);setTab("agenda");
  }));
  const act=$("nowayHQActivity");
  act.innerHTML=hqActivity.length?hqActivity.slice(0,6).map(a=>
    '<button type="button" class="noway-hq-activity-item" data-hq-tab="'+escapeHTML(a.tab)+'">'+
      '<span class="noway-hq-activity-icon is-'+escapeHTML(a.type)+'">'+escapeHTML(a.icon)+'</span>'+
      '<span class="noway-hq-activity-copy"><strong>'+escapeHTML(a.title)+'</strong><span>'+escapeHTML(a.description)+'</span></span>'+
      '<time>'+escapeHTML(fmtDate(a.created_at))+'</time></button>'
  ).join(""):'<div class="noway-hq-empty compact"><strong>SEM ATIVIDADES RECENTES.</strong><p>As atualizações da equipe aparecerão aqui.</p></div>';
  act.querySelectorAll("[data-hq-tab]").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.hqTab)));
  if(isOwner()){
    const list=$("nowayHQInboxList");
    list.innerHTML=hqInbox.length?hqInbox.slice(0,4).map(t=>
      '<button class="noway-hq-contact" type="button" data-hq-contact="'+escapeHTML(t.id)+'">'+
      '<div><small>'+escapeHTML(String(t.status||"").replaceAll("_"," ").toUpperCase())+'</small>'+
      '<strong>'+escapeHTML(t.subject)+'</strong></div>'+
      '<span>'+escapeHTML(fmtDate(t.updated_at))+' ↗</span></button>'
    ).join(""):'<div class="noway-hq-empty compact"><strong>CAIXA ORGANIZADA.</strong><p>Nenhuma solicitação registrada até agora.</p></div>';
    list.querySelectorAll("[data-hq-contact]").forEach(b=>b.addEventListener("click",()=>{
      setTab("contacts");
      window.dispatchEvent(new CustomEvent("noway:open-contact",{detail:{id:b.dataset.hqContact}}));
    }));
  }
}
async function refreshHQ(force=false){
  if(!signed())return;
  if(hqLoading&&!force)return;
  const currentId=me.id;
  const run=++hqRun;
  hqLoading=true;
  const refresh=$("nowayHQRefresh");
  if(refresh)refresh.disabled=true;
  $("nowayHQConnectionText").textContent="SINCRONIZANDO";
  $("nowayHQConnection").classList.remove("is-error");
  try{
    const tasks=[db.rpc("noway_hq_overview")];
    const active=isStaff(),owner=isOwner();
    if(active){
      tasks.push(db.from("noway_team_announcements")
        .select("title,body,author_name,created_at").order("created_at",{ascending:false}).limit(5));
      tasks.push(db.from("noway_team_messages")
        .select("sender_name,body,image_path,event_id,created_at").order("created_at",{ascending:false}).limit(5));
    }
    if(owner)tasks.push(db.from("noway_contacts")
      .select("id,subject,status,updated_at,created_at").order("updated_at",{ascending:false}).limit(10));
    else tasks.push(db.from("noway_contacts")
      .select("id,subject,status,updated_at,created_at").eq("user_id",currentId)
      .order("updated_at",{ascending:false}).limit(5));
    const responses=await Promise.all(tasks);
    if(!signed()||me.id!==currentId||run!==hqRun)return;
    let index=0,metrics=responses[index++];
    if(metrics.error)throw metrics.error;
    hqSnapshot=metrics.data;
    const items=[];
    if(active){
      const news=responses[index++];
      const messages=responses[index++];
      if(!news.error)nowayObserveArea("team",(news.data||[]).map(a=>a.created_at+"::"+a.title));
      if(!news.error)for(const a of news.data||[])items.push({
        type:"news",icon:"▣",title:"Comunicado: "+a.title,description:a.author_name+" · "+a.body.slice(0,100),
        created_at:a.created_at,tab:"team"
      });
      if(!messages.error)for(const m of messages.data||[])items.push({
        type:"chat",icon:"↗",title:m.sender_name+" enviou uma mensagem",
        description:(m.body|| (m.image_path?"Imagem compartilhada":m.event_id?"Evento da agenda":"Nova mensagem")).slice(0,120),
        created_at:m.created_at,tab:"chat"
      });
    }
    const contacts=responses[index];
    if(contacts&&!contacts.error){
      const contactList=contacts.data||[];
      nowayObserveArea("contacts",contactList.map(a=>[a.id,a.updated_at,a.status].join(":")));
      hqInbox=owner?contactList:[];
      for(const t of contactList.slice(0,6))items.push({
        type:"contact",icon:"✉",title:"Contato: "+t.subject,
        description:"Status: "+String(t.status||"").replaceAll("_"," "),
        created_at:t.updated_at||t.created_at,tab:"contacts"
      });
    }else hqInbox=[];
    hqActivity=items.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,8);
    hqLoadedAt=Date.now();
    $("nowayHQConnectionText").textContent="DADOS ATUALIZADOS";
    $("nowayHQLastUpdated").textContent="Atualizado às "+new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit"}).format(new Date());
    renderOverview();
  }catch(err){
    notice("Não foi possível atualizar a central: "+(err?.message||"erro inesperado"),true);
    $("nowayHQConnectionText").textContent="FALHA NA SINCRONIZAÇÃO";
    $("nowayHQConnection").classList.add("is-error");
    $("nowayHQLastUpdated").textContent="Erro ao sincronizar os dados";
  }finally{
    if(run===hqRun){hqLoading=false;if(refresh)refresh.disabled=false;}
  }
}

async function refreshEvents(){
  if(!isStaff())return;
  if(loadEventsPromise)return loadEventsPromise;
  loadEventsPromise=(async()=>{
    const start=new Date(new Date().getFullYear()-5,0,1).toISOString();
    const {data,error}=await db.from("noway_team_events")
      .select("id,kind,title,description,opponent,competition,meeting_link,start_at,end_at,status,created_by")
      .gte("start_at",start).order("start_at",{ascending:true}).limit(1000);
    if(error){notice("Não foi possível carregar a agenda: "+error.message,true);return;}
    events=data||[];renderCalendar();renderEvents();renderOverview();
    const signature=events.slice(-150).map(e=>[e.id,e.kind,e.start_at,e.status,e.opponent,e.competition].join(":"));
    nowayObserveArea("agenda",signature);
    nowayObserveArea("competitive",events.filter(e=>e.kind==="partida"||e.kind==="treino")
      .map(e=>[e.id,e.start_at,e.status,e.opponent].join(":")));
    if(currentTab==="competitive")renderCompetitive();
    if(currentTab==="stats")renderPlayerStats();
  })();
  try{await loadEventsPromise;}finally{loadEventsPromise=null;}
}
function renderCalendar(){
  if(!isStaff())return;
  $("nowayCalTitle").textContent=new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(calendar).toLocaleUpperCase("pt-BR");
  const y=calendar.getFullYear(),m=calendar.getMonth(),first=new Date(y,m,1);
  const offset=(first.getDay()+6)%7;
  const len=new Date(y,m+1,0).getDate();
  const today=spDateKey(new Date().toISOString());
  const eventDays=new Map();
  for(const e of events){
    const key=spDateKey(e.start_at);
    if(!eventDays.has(key))eventDays.set(key,[]);
    eventDays.get(key).push(e);
  }
  let markup="";
  for(let i=0;i<offset;i++)markup+='<span class="noway-cal-blank" aria-hidden="true"></span>';
  for(let day=1;day<=len;day++){
    const date=localKey(new Date(y,m,day)),onDay=eventDays.get(date)||[];
    const counts=[...new Set(onDay.map(e=>e.kind))];
    markup+='<button type="button" data-cal-day="'+date+'" class="noway-cal-day'+
      (today===date?' is-today':'')+(selectedDay===date?' is-selected':'')+
      (onDay.length?' has-events':'')+'" aria-label="Dia '+day+', '+onDay.length+' compromissos">'+
      '<span>'+day+'</span><small>'+counts.map(k=>'<i class="is-'+escapeHTML(k)+'"></i>').join("")+'</small></button>';
  }
  $("nowayCalDays").innerHTML=markup;
  $("nowayCalDays").querySelectorAll("[data-cal-day]").forEach(button=>button.addEventListener("click",()=>{
    selectedDay=selectedDay===button.dataset.calDay?null:button.dataset.calDay;
    renderCalendar();renderEvents();
  }));
}
function renderEvents(){
  if(!isStaff())return;
  const year=calendar.getFullYear(),month=calendar.getMonth()+1;
  let filtered=events.filter(e=>{
    const key=spDateKey(e.start_at);return key.startsWith(year+"-"+String(month).padStart(2,"0")+"-")&&(!selectedDay||key===selectedDay);
  });
  $("nowayCalEventsHeading").textContent=selectedDay?"DIA "+selectedDay.split("-").reverse().join("/")+".":"COMPROMISSOS DO MÊS.";
  const box=$("nowayCalEvents");
  box.innerHTML=filtered.length?filtered.map(e=>{
    const canEdit=isManager()&&(isOwner()||e.created_by===me.id);
    const link=safeLink(e.meeting_link);
    return '<article class="noway-cal-event is-'+escapeHTML(e.kind)+'">'+
      '<div class="noway-cal-event-date"><b>'+escapeHTML(fmtDate(e.start_at))+'</b><span>'+escapeHTML(fmtTime(e.start_at))+'</span></div>'+
      '<div class="noway-cal-event-copy"><span class="noway-cal-event-kind">'+escapeHTML(kinds[e.kind]||"EVENTO")+
      ' / '+escapeHTML(e.status.toUpperCase())+'</span><h5>'+escapeHTML(e.title)+'</h5>'+
      (e.opponent?'<p>VS. '+escapeHTML(e.opponent)+'</p>':'')+
      (e.competition?'<p>'+escapeHTML(e.competition)+'</p>':'')+
      (e.description?'<p>'+escapeHTML(e.description)+'</p>':'')+
      (link?'<a target="_blank" rel="noopener noreferrer" href="'+escapeHTML(link)+'">ACESSAR LINK ↗</a>':'')+
      '<button type="button" data-chat-share-event="'+escapeHTML(e.id)+'" class="noway-mini-action noway-cal-share">▣ MARCAR NO CHAT ↗</button>'+
      (["partida","treino"].includes(e.kind)?'<button type="button" data-comp-from-agenda="'+escapeHTML(e.id)+'" class="noway-mini-action noway-cal-share">⚔ ABRIR NO COMPETITIVE ↗</button>':'')+
      (canEdit?'<button type="button" data-edit-event="'+escapeHTML(e.id)+'" class="noway-mini-action">EDITAR ↗</button>':'')+
      '</div></article>';
  }).join(""):'<p class="noway-muted">Nenhum evento neste período. Use as setas para navegar pelos meses.</p>';
  box.querySelectorAll("[data-edit-event]").forEach(b=>b.addEventListener("click",()=>openEventEditor(events.find(e=>e.id===b.dataset.editEvent))));
  box.querySelectorAll("[data-comp-from-agenda]").forEach(b=>b.addEventListener("click",()=>{
    competitiveState.selected=b.dataset.compFromAgenda;competitiveState.filter="all";setTab("competitive");
  }));
  box.querySelectorAll("[data-chat-share-event]").forEach(b=>b.addEventListener("click",()=>{
    const ev=events.find(e=>e.id===b.dataset.chatShareEvent);
    if(!ev)return;
    setTab("chat");
    window.dispatchEvent(new CustomEvent("noway:attach-event",{detail:{id:ev.id}}));
  }));
}
function openEventEditor(event=null){
  if(!isManager())return;
  $("nowayEventForm").hidden=false;
  $("nowayEventId").value=event?.id||"";
  $("nowayEventKind").value=event?.kind||"partida";
  $("nowayEventStatus").value=event?.status||"confirmado";
  $("nowayEventTitle").value=event?.title||"";
  $("nowayEventStart").value=event?isoLocal(event.start_at):isoLocal(new Date(Date.now()+3600000).toISOString());
  $("nowayEventEnd").value=event?.end_at?isoLocal(event.end_at):"";
  $("nowayEventOpponent").value=event?.opponent||"";
  $("nowayEventCompetition").value=event?.competition||"";
  $("nowayEventDescription").value=event?.description||"";
  $("nowayEventLink").value=event?.meeting_link||"";
  $("nowayEventFormTitle").textContent=event?"EDITAR EVENTO.":"NOVO EVENTO.";
  $("nowayEventDelete").hidden=!event;
  $("nowayEventForm").scrollIntoView({behavior:"smooth",block:"center"});
}
function closeEventEditor(){
  $("nowayEventForm").reset();$("nowayEventForm").hidden=true;$("nowayEventId").value="";
}
async function saveEvent(ev){
  ev.preventDefault();if(!isManager())return;
  const form=$("nowayEventForm"),btn=form.querySelector('[type="submit"]');
  const savedKind=$("nowayEventKind").value;
  const start=new Date($("nowayEventStart").value),end=$("nowayEventEnd").value?new Date($("nowayEventEnd").value):null;
  if(Number.isNaN(start.getTime())||(end&&Number.isNaN(end.getTime())))return notice("Informe uma data e hora válidas.",true);
  btn.disabled=true;
  const {data:savedEventId,error}=await db.rpc("noway_save_team_event",{
    p_id:$("nowayEventId").value||null,p_kind:$("nowayEventKind").value,
    p_title:$("nowayEventTitle").value.trim(),p_start:start.toISOString(),
    p_end:end?.toISOString()||null,p_description:$("nowayEventDescription").value.trim(),
    p_opponent:$("nowayEventOpponent").value.trim(),p_competition:$("nowayEventCompetition").value.trim(),
    p_meeting_link:$("nowayEventLink").value.trim(),p_status:$("nowayEventStatus").value
  });
  btn.disabled=false;
  if(error)return notice("Erro ao salvar: "+error.message,true);
  closeEventEditor();selectedDay=null;calendar=new Date(start.getFullYear(),start.getMonth(),1);
  playerStatsState.loadedAt=0;
  await refreshEvents();notice("Compromisso salvo na agenda da equipe.");
  if(["partida","treino"].includes(savedKind) && savedEventId){
    competitiveState.filter="all";
    competitiveState.selected=savedEventId;
    setTab("competitive");
  }
}
async function deleteEvent(){
  if(!isManager()||!$("nowayEventId").value||!confirm("Excluir este evento da agenda?"))return;
  const btn=$("nowayEventDelete");btn.disabled=true;
  const {error}=await db.rpc("noway_delete_team_event",{p_id:$("nowayEventId").value});
  btn.disabled=false;
  if(error)return notice("Não foi possível excluir: "+error.message,true);
  closeEventEditor();playerStatsState.loadedAt=0;
  await refreshEvents();await refreshCompetitive(true);notice("Evento excluído.");
}
async function refreshAccounts(){
  if(!isOwner())return;
  const request=++accountFetchRun;
  $("nowayAccountsList").innerHTML='<p class="noway-muted">Carregando contas registradas...</p>';
  const {data,error}=await db.rpc("noway_admin_accounts",{
    p_search:accountSearch,p_offset:accountsOffset,p_limit:25
  });
  if(request!==accountFetchRun||!isOwner())return;
  if(error){$("nowayAccountsList").innerHTML='<p class="noway-muted">Não foi possível carregar as contas.</p>';return notice("Erro na administração: "+error.message,true);}
  const list=data||[],total=Number(list[0]?.total_count||0);
  $("nowayAccountsCount").textContent=total+" CONTA"+(total===1?"":"S");
  $("nowayAccountsPage").textContent=(Math.floor(accountsOffset/25)+1)+" / "+Math.max(1,Math.ceil(total/25));
  $("nowayAccountsPrev").disabled=accountsOffset===0;
  $("nowayAccountsNext").disabled=accountsOffset+25>=total;
  const container=$("nowayAccountsList");
  container.innerHTML=list.length?list.map(u=>
    '<article class="noway-console-account-row">'+
      avatarMarkup(u.avatar_url,u.display_name,"noway-account-avatar")+
      '<div class="noway-console-account-data"><strong>'+escapeHTML(u.display_name||"Membro")+'</strong>'+
      '<span>'+escapeHTML(u.email||"E-mail não informado")+'</span>'+
      '<small>CADASTRO: '+escapeHTML(fmtDate(u.created_at))+' · ÚLTIMO LOGIN: '+escapeHTML(fmtFull(u.last_sign_in_at))+'</small></div>'+
      '<div class="noway-console-account-control">'+
      (u.role==="owner"?'<b>FOUNDER / OWNER</b>':
        '<select data-account-role="'+escapeHTML(u.id)+'" aria-label="Cargo de '+escapeHTML(u.display_name)+'">'+
          ["membro","jogador","manager"].map(role=>
            '<option value="'+role+'"'+(role===u.role?' selected':'')+'>'+escapeHTML(roles[role])+'</option>').join("")+
        '</select><button class="noway-mini-action" type="button" data-account-save="'+escapeHTML(u.id)+'">SALVAR CARGO</button>')+
      '</div></article>'
  ).join(""):'<p class="noway-muted">Nenhuma conta encontrada para esta busca.</p>';
  container.querySelectorAll("[data-account-save]").forEach(button=>button.addEventListener("click",async()=>{
    if(!isOwner())return;
    const select=container.querySelector('[data-account-role="'+button.dataset.accountSave+'"]');
    if(!select)return;
    button.disabled=true;
    const {error}=await db.rpc("noway_set_member_role",{target_id:button.dataset.accountSave,next_role:select.value});
    button.disabled=false;
    if(error)return notice("Falha ao atualizar cargo: "+error.message,true);
    await refreshAccounts();notice("Cargo atualizado. O acesso será aplicado conforme as permissões do banco.");
  }));
}
function avatarFeedback(message,error=false){
  const el=$("nowayAvatarStatus");
  if(!el)return;
  el.hidden=!message;
  el.textContent=message||"";
  el.classList.toggle("is-error",Boolean(error));
}
function imageFromObjectUrl(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error(
      "O navegador não conseguiu abrir a imagem. Tente salvar uma cópia como JPG ou PNG e enviar novamente."
    ));
    img.src=src;
  });
}
async function encodeAvatar(canvas,type,quality){
  return new Promise((resolve,reject)=>{
    try{
      canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Não foi possível converter a imagem.")),type,quality);
    }catch(error){reject(error);}
  });
}
async function uploadAvatar(file){
  if(!signed()||!file)return;
  const name=(file.name||"").toLowerCase();
  const supported=["image/png","image/jpeg","image/webp","image/heic","image/heif"].includes(file.type)||
    /\.(png|jpe?g|webp|heic|heif)$/.test(name);
  if(!supported){
    avatarFeedback("Formato não reconhecido. Use JPG, PNG ou WebP.",true);
    return notice("Formato não reconhecido. Use JPG, PNG ou WebP.",true);
  }
  if(file.size>24*1024*1024){
    avatarFeedback("Arquivo acima de 24 MB. Tente uma foto menor.",true);
    return notice("Sua foto excede o limite de 24 MB.",true);
  }
  const button=$("nowayAvatarTrigger");
  const action=$("nowayProfileChangeAvatar");
  button.disabled=true;
  if(action)action.disabled=true;
  avatarFeedback("Preparando sua foto...");
  let src=null,uploadedPath=null;
  const oldPath=account?.avatar_url||null;
  try{
    src=URL.createObjectURL(file);
    const img=await imageFromObjectUrl(src);
    if(img.naturalWidth<64||img.naturalHeight<64)
      throw new Error("Escolha uma imagem com pelo menos 64 × 64 pixels.");
    if(img.naturalWidth*img.naturalHeight>44000000)
      throw new Error("Esta foto possui resolução muito alta. Reduza-a antes do envio.");
    const cv=document.createElement("canvas");
    cv.width=cv.height=480;
    const ctx=cv.getContext("2d");
    if(!ctx)throw new Error("Seu navegador não conseguiu processar a foto.");
    ctx.fillStyle="#181b1a";
    ctx.fillRect(0,0,480,480);
    const size=Math.min(img.naturalWidth,img.naturalHeight);
    ctx.drawImage(img,(img.naturalWidth-size)/2,(img.naturalHeight-size)/2,size,size,0,0,480,480);
    avatarFeedback("Convertendo e compactando...");
    let blob=null,extension="webp";
    try{blob=await encodeAvatar(cv,"image/webp",.82);}catch{}
    if(blob?.type!=="image/webp"){
      blob=await encodeAvatar(cv,"image/jpeg",.84);
      extension="jpg";
    }
    if(blob.type!=="image/webp"&&blob.type!=="image/jpeg")
      throw new Error("Seu navegador não conseguiu gerar uma imagem compatível.");
    if(blob.size>2*1024*1024)
      throw new Error("A foto continua muito grande após a compactação.");
    const currentUserId=me.id;
    const path=currentUserId+"/avatar."+extension;
    avatarFeedback("Enviando foto para sua conta...");
    const {error:uploadError}=await db.storage.from("noway-avatars").upload(path,blob,{
      upsert:true,contentType:blob.type,cacheControl:"60"
    });
    if(uploadError)throw new Error(
      /row.level.security|not.authorized|403|unauthorized/i.test(uploadError.message)?
        "O servidor recusou o envio. Saia da conta, entre novamente e tente outra vez.":
        uploadError.message
    );
    uploadedPath=path;
    const {error:profileError}=await db.rpc("noway_set_avatar",{p_path:path});
    if(profileError)throw profileError;
    if(me?.id!==currentUserId)throw new Error("A sessão mudou durante o envio. Atualize a página.");
    account.avatar_url=path;
    window.nowayAvatarVersion=Date.now();
    renderProfile();
    avatarFeedback("Foto atualizada! ✓");
    notice("Sua foto de perfil foi atualizada com sucesso.");
    // Não deixar arquivos antigos se o navegador mudou do WebP para JPEG.
    if(oldPath&&oldPath!==path&&
       (oldPath===currentUserId+"/avatar.webp"||oldPath===currentUserId+"/avatar.jpg")){
      db.storage.from("noway-avatars").remove([oldPath]).catch(()=>{});
    }
  }catch(error){
    const message=error?.message||"Erro desconhecido ao enviar a foto.";
    avatarFeedback(message,true);
    notice("Não foi possível atualizar a foto: "+message,true);
    // Evita excluir um avatar previamente existente ao falhar um upsert.
    if(uploadedPath&&uploadedPath!==oldPath)
      db.storage.from("noway-avatars").remove([uploadedPath]).catch(()=>{});
  }finally{
    button.disabled=false;
    if(action)action.disabled=false;
    if(src)URL.revokeObjectURL(src);
    $("nowayAvatarInput").value="";
  }
}
async function removeAvatar(){
  if(!signed()||!account.avatar_url||!confirm("Remover sua foto de perfil?"))return;
  const {error}=await db.rpc("noway_set_avatar",{p_path:null});
  if(error)return notice("Não foi possível remover: "+error.message,true);
  await db.storage.from("noway-avatars").remove([me.id+"/avatar.webp"]);
  account.avatar_url=null;window.nowayAvatarVersion=Date.now();renderProfile();avatarFeedback("Foto removida.");notice("Foto removida.");
}
function bind(){
  document.querySelectorAll("[data-console-tab]").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.consoleTab)));
  document.querySelectorAll("[data-console-open]").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.consoleOpen)));
  $("nowayCalPrev").addEventListener("click",()=>{calendar=new Date(calendar.getFullYear(),calendar.getMonth()-1,1);selectedDay=null;renderCalendar();renderEvents();});
  $("nowayCalNext").addEventListener("click",()=>{calendar=new Date(calendar.getFullYear(),calendar.getMonth()+1,1);selectedDay=null;renderCalendar();renderEvents();});
  $("nowayCalToday").addEventListener("click",()=>{const n=new Date();calendar=new Date(n.getFullYear(),n.getMonth(),1);selectedDay=null;renderCalendar();renderEvents();});
  $("nowayEventCreate").addEventListener("click",()=>openEventEditor());
  $("nowayEventClose").addEventListener("click",closeEventEditor);
  $("nowayEventForm").addEventListener("submit",saveEvent);
  $("nowayEventDelete").addEventListener("click",deleteEvent);
  $("nowayAccountsSearch").addEventListener("input",ev=>{
    accountSearch=ev.currentTarget.value.trim();accountsOffset=0;
    clearTimeout(searchTimer);searchTimer=setTimeout(refreshAccounts,320);
  });
  $("nowayAccountsRefresh").addEventListener("click",refreshAccounts);
  $("nowayHQRefresh").addEventListener("click",()=>refreshHQ(true));
  $("nowayCompRefresh").addEventListener("click",()=>refreshCompetitive(true));
  $("nowayStatsRefresh").addEventListener("click",()=>refreshPlayerStats(true));
  $("nowayStatsSeason").addEventListener("change",event=>{
    playerStatsState.season=event.currentTarget.value;
    renderPlayerStats();
  });
  $("nowayStatsPlayerSelect").addEventListener("change",event=>{
    playerStatsState.selectedPlayer=event.currentTarget.value;
    playerStatsState.selectedMatch=null;renderPlayerStats();
  });
  $("nowayStatsMatchSelect").addEventListener("change",event=>{
    playerStatsState.selectedMatch=event.currentTarget.value;
    renderPlayerStatsEditor();
  });
  $("nowayStatsOpenCompetitive").addEventListener("click",()=>setTab("competitive"));
  $("nowayStatsForm").addEventListener("submit",savePlayerMatchStats);

  $("nowayCompCreate").addEventListener("click",()=>{
    if(!isManager())return;
    setTab("agenda");openEventEditor();
  });
  $("nowayCompClose").addEventListener("click",()=>{$("nowayCompForm").hidden=true;$("nowayCompDetail").hidden=false;});
  $("nowayCompEditEvent").addEventListener("click",()=>{
    const match=events.find(e=>e.id===competitiveState.selected);
    if(!match||!isManager())return;
    if(!isOwner()&&match.created_by!==me.id){
      notice("Apenas quem agendou o evento ou o Founder pode alterar data e horário. O Team Manager ainda pode gerenciar a escalação aqui.",true);
      return;
    }
    setTab("agenda");openEventEditor(match);
  });
  $("nowayCompAddMap").addEventListener("click",()=>addCompetitiveMapRow());
  $("nowayCompForm").addEventListener("submit",saveCompetitiveSetup);
  document.querySelectorAll("[data-noway-comp-filter]").forEach(b=>b.addEventListener("click",()=>{
    competitiveState.filter=b.dataset.nowayCompFilter;
    $("nowayCompForm").hidden=true;$("nowayCompDetail").hidden=false;
    renderCompetitive();
  }));
  setInterval(()=>{if(isStaff()&&currentTab==="competitive"&&!document.hidden)refreshCompetitive(true);},45000);

  $("nowayHQNewEvent").addEventListener("click",()=>{
    if(!isManager())return;
    setTab("agenda");openEventEditor();
  });
  $("nowayAccountsPrev").addEventListener("click",()=>{accountsOffset=Math.max(0,accountsOffset-25);refreshAccounts();});
  $("nowayAccountsNext").addEventListener("click",()=>{accountsOffset+=25;refreshAccounts();});
  $("nowayAvatarTrigger").addEventListener("click",()=>$("nowayAvatarInput").click());
  $("nowayProfileChangeAvatar").addEventListener("click",()=>$("nowayAvatarInput").click());
  $("nowayProfileRemoveAvatar").addEventListener("click",removeAvatar);
  $("nowayProfileChangeName").addEventListener("click",()=>{
    $("nowayEditName").click();$("nowayDisplayNameForm").scrollIntoView({behavior:"smooth",block:"center"});
  });
  $("nowayAvatarInput").addEventListener("change",ev=>uploadAvatar(ev.target.files?.[0]));
  db.auth.onAuthStateChange(()=>setTimeout(loadAccount,0));
  window.addEventListener("focus",()=>{if(isStaff())refreshEvents();});
}
window.addEventListener("noway:open-competitive",e=>{
  if(!isStaff())return;
  competitiveState.filter="all";competitiveState.selected=e.detail?.id||null;
  setTab("competitive");
});
window.addEventListener("noway:go-to-event",event=>{
  const ev=events.find(e=>e.id===event.detail?.id);
  if(ev){const date=new Date(ev.start_at);calendar=new Date(date.getFullYear(),date.getMonth(),1);
    selectedDay=spDateKey(ev.start_at);setTab("agenda");}
});

// NOWAY Competitive / v1 — jogos são eventos reais da Agenda, sem dados simulados.
const competitiveState={
 matches:new Map(),roster:[],maps:[],people:[],selected:null,filter:"upcoming",
 lastLoaded:0,loading:false,request:0,userId:null
};
const compResultLabels={pendente:"A DEFINIR",vitoria:"VITÓRIA",derrota:"DERROTA",empate:"EMPATE"};
const compPresenceLabels={pendente:"SEM RESPOSTA",confirmado:"CONFIRMADO",ausente:"NÃO VOU",talvez:"TALVEZ"};
const compMapActions={disponivel:"EM ANÁLISE",pick_nosso:"PICK NOWAY",pick_adversario:"PICK ADVERSÁRIO",
 ban_nosso:"BAN NOWAY",ban_adversario:"BAN ADVERSÁRIO",jogado:"JOGADO"};
const compUUID=/^[a-f0-9-]{36}$/i;
const compGetEvent=id=>events.find(e=>e.id===id&&["partida","treino"].includes(e.kind));
const compGetSetup=id=>competitiveState.matches.get(id)||null;
const compGetRoster=id=>competitiveState.roster.filter(p=>p.event_id===id);
const compGetMaps=id=>competitiveState.maps.filter(m=>m.event_id===id).sort((a,b)=>a.slot-b.slot);
const compPerson=id=>competitiveState.people.find(p=>p.id===id);
const compCanEdit=()=>isManager();
const compEsc=escapeHTML;
const compDate=ts=>fmtDate(ts)+" · "+fmtTime(ts);
function compAvatar(person){
 const url=avatarURL(person?.avatar_url);
 return url?'<img src="'+compEsc(url)+'" alt="" loading="lazy">':
  '<span>'+compEsc((person?.display_name||"N").trim().slice(0,1).toUpperCase())+'</span>';
}
async function refreshCompetitive(force=false){
 if(!isStaff()||!signed())return;
 if(competitiveState.loading)return;
 if(!force&&Date.now()-competitiveState.lastLoaded<6000){
   renderCompetitive();return;
 }
 competitiveState.loading=true;
 const current=me.id,run=++competitiveState.request;
 $("nowayCompRefresh").disabled=true;
 try{
   const [matches,roster,maps,people]=await Promise.all([
     db.from("noway_competitive_matches").select("event_id,best_of,result,our_score,opponent_score,preparation,updated_at"),
     db.from("noway_competitive_roster").select("event_id,player_id,starter,presence,responded_at"),
     db.from("noway_competitive_maps").select("event_id,slot,map_name,action,our_rounds,their_rounds"),
     db.rpc("noway_team_directory_v2")
   ]);
   if(!signed()||me.id!==current||run!==competitiveState.request)return;
   for(const [name,response] of [["partidas",matches],["convocações",roster],["mapas",maps],["diretório",people]]){
     if(response.error)throw Error("Falha ao carregar "+name+": "+response.error.message);
   }
   competitiveState.matches=new Map((matches.data||[]).map(m=>[m.event_id,m]));
   competitiveState.roster=roster.data||[];
   competitiveState.maps=maps.data||[];
   competitiveState.people=people.data||[];
   competitiveState.userId=current;
   competitiveState.lastLoaded=Date.now();
   renderCompetitive();
 }catch(err){
   notice("NOWAY Competitive: "+(err?.message||"Não foi possível sincronizar os confrontos."),true);
   $("nowayCompList").innerHTML='<p class="noway-muted">Não foi possível carregar os confrontos. Clique em ATUALIZAR para tentar novamente.</p>';
 }finally{
   if(run===competitiveState.request){competitiveState.loading=false;$("nowayCompRefresh").disabled=false;}
 }
}
function compGetVisible(){
 const all=events.filter(e=>["partida","treino"].includes(e.kind));
 const now=Date.now();
 const f=competitiveState.filter;
 return all.filter(e=>{
   const setup=compGetSetup(e.id),ended=new Date(e.start_at).getTime()<now-2*3600000;
   const finished=setup?.result&&setup.result!=="pendente";
   if(f==="upcoming")return e.status!=="cancelado"&&!finished&&!ended;
   if(f==="history")return finished||ended||e.status==="cancelado";
   if(f==="mine")return compGetRoster(e.id).some(p=>p.player_id===me?.id);
   return true;
 }).sort((a,b)=>{
   const reverse=f==="history";
   return reverse?new Date(b.start_at)-new Date(a.start_at):new Date(a.start_at)-new Date(b.start_at);
 });
}
function renderCompetitive(){
 if(!isStaff()||!signed())return;
 document.querySelectorAll("[data-noway-comp-filter]").forEach(btn=>{
   btn.classList.toggle("is-active",btn.dataset.nowayCompFilter===competitiveState.filter);
   btn.setAttribute("aria-pressed",String(btn.dataset.nowayCompFilter===competitiveState.filter));
 });
 const all=events.filter(e=>["partida","treino"].includes(e.kind));
 const finished=all.filter(e=>compGetSetup(e.id)?.result&&compGetSetup(e.id).result!=="pendente");
 const future=all.filter(e=>e.status!=="cancelado"&&new Date(e.start_at)>new Date()&&(!compGetSetup(e.id)?.result||compGetSetup(e.id).result==="pendente"));
 const mine=competitiveState.roster.filter(r=>r.player_id===me.id);
 const stats=[
   ["CONFRONTOS",all.filter(e=>e.kind==="partida").length,"partidas registradas"],
   ["VITÓRIAS",finished.filter(e=>compGetSetup(e.id)?.result==="vitoria").length,"resultados cadastrados"],
   ["PRÓXIMOS",future.length,"treinos e partidas"],
   ["MINHAS CONVOCAÇÕES",mine.length,"compromissos convocados"]
 ];
 $("nowayCompStats").innerHTML=stats.map(st=>'<article><small>'+compEsc(st[0])+'</small><strong>'+st[1]+'</strong><span>'+compEsc(st[2])+'</span></article>').join("");
 const list=compGetVisible();
 if(!list.some(e=>e.id===competitiveState.selected)){
   competitiveState.selected=list[0]?.id||null;
   $("nowayCompForm").hidden=true;
   $("nowayCompDetail").hidden=false;
 }
 const container=$("nowayCompList");
 container.innerHTML=list.length?list.map(e=>{
   const m=compGetSetup(e.id),convoked=compGetRoster(e.id);
   const present=convoked.filter(p=>p.presence==="confirmado").length;
   const result=e.status==="cancelado"?"CANCELADO":m?.result&&m.result!=="pendente"?compResultLabels[m.result]:"A DEFINIR";
   const resultClass=e.status==="cancelado"?"is-canceled":m?.result==="vitoria"?"is-win":m?.result==="derrota"?"is-loss":"is-pending";
   return '<button type="button" class="noway-comp-match'+(competitiveState.selected===e.id?' is-selected':'')+'" data-comp-open="'+compEsc(e.id)+'">'+
     '<span class="noway-comp-match-top"><small>'+compEsc(e.kind==="partida"?"PARTIDA / RAINBOW SIX":"TREINO / RAINBOW SIX")+
       '</small><span class="noway-comp-tag '+resultClass+'">'+compEsc(result)+'</span></span>'+
     '<span class="noway-comp-vs"><b>NOWAY</b><i>VS.</i><b>'+compEsc(e.opponent|| (e.kind==="treino"?"TREINO INTERNO":"A DEFINIR"))+'</b></span>'+
     '<span class="noway-comp-match-bottom"><span>'+compEsc(compDate(e.start_at))+'</span><strong>'+compEsc(e.competition||"COMPETITIVO")+'</strong></span>'+
     '<span class="noway-comp-roster-count">'+(m?"MD"+m.best_of+" · ":"")+convoked.length+' CONVOCADOS · '+present+' CONFIRMADOS ↗</span></button>';
 }).join(""):'<div class="noway-comp-empty"><span>NW / 00</span><h4>NENHUM CONFRONTO AQUI.</h4><p>As partidas e os treinos cadastrados na Agenda aparecerão nesta seção.</p></div>';
 container.querySelectorAll("[data-comp-open]").forEach(b=>b.addEventListener("click",()=>{
   competitiveState.selected=b.dataset.compOpen;
   $("nowayCompForm").hidden=true;$("nowayCompDetail").hidden=false;
   renderCompetitive();
 }));
 if(!$("nowayCompForm").hidden)return;
 renderCompetitiveDetail();
}
function renderCompetitiveDetail(){
 const wrap=$("nowayCompDetail"),event=compGetEvent(competitiveState.selected);
 if(!event){
   wrap.innerHTML='<div class="noway-comp-empty"><span>NW / VS.</span><h4>SELECIONE UM CONFRONTO.</h4><p>Abra uma partida ou treino para consultar a escalação, a presença e os resultados.</p></div>';
   return;
 }
 const config=compGetSetup(event.id),roster=compGetRoster(event.id).sort((a,b)=>Number(b.starter)-Number(a.starter));
 const maps=compGetMaps(event.id);
 const mine=roster.find(r=>r.player_id===me.id);
 const score=config?.our_score!=null?config.our_score+" — "+config.opponent_score:"— : —";
 const confirmed=roster.filter(r=>r.presence==="confirmado").length;
 const status=event.status==="cancelado"?"CANCELADO":compResultLabels[config?.result||"pendente"];
 const rosterHtml=roster.length?roster.map((r,i)=>{
   const person=compPerson(r.player_id)||{display_name:"Integrante"};
   return '<div class="noway-comp-player">'+
     '<div class="noway-comp-player-avatar">'+compAvatar(person)+'</div>'+
     '<div class="noway-comp-player-name"><strong>'+compEsc(person.display_name||"Jogador")+'</strong>'+
       '<small>'+(r.starter?"TITULAR":"RESERVA")+'</small></div>'+
     '<span class="noway-comp-presence is-'+compEsc(r.presence)+'">'+compEsc(compPresenceLabels[r.presence]||r.presence)+'</span></div>';
 }).join(""):'<p class="noway-muted">Nenhum integrante convocado. A gestão pode montar a escalação em GERENCIAR.</p>';
 const mapHtml=maps.length?maps.map(m=>
  '<div class="noway-comp-map"><div><strong>'+compEsc(m.map_name)+'</strong><small>'+compEsc(compMapActions[m.action]||"EM ANÁLISE")+'</small></div>'+
  '<span>'+(m.our_rounds!=null?m.our_rounds+" : "+m.their_rounds:"—")+'</span></div>'
 ).join(""):'<p class="noway-muted">Os mapas ainda não foram definidos.</p>';
 wrap.innerHTML=
   '<div class="noway-comp-detail-kicker">NOWAY / '+compEsc(event.kind==="treino"?"TREINO":"PARTIDA")+'</div>'+
   '<h4>'+compEsc(event.title)+'</h4><p class="noway-comp-details-date">'+compEsc(compDate(event.start_at))+
     (event.competition?" · "+compEsc(event.competition):"")+'</p>'+
   '<div class="noway-comp-scoreboard"><div><small>TIME</small><strong>NOWAY</strong></div>'+
     '<b>'+compEsc(score)+'</b><div><small>ADVERSÁRIO</small><strong>'+compEsc(event.opponent||"A DEFINIR")+'</strong></div></div>'+
   '<div class="noway-comp-detail-status"><span>'+compEsc(status)+'</span><span>'+
      compEsc("MD"+(config?.best_of||1))+' · '+confirmed+'/'+roster.length+' CONFIRMADOS</span></div>'+
   (event.description?'<p class="noway-comp-description">'+compEsc(event.description)+'</p>':"")+
   '<section class="noway-comp-subsection"><div class="noway-comp-subheading"><h5>ESCALAÇÃO.</h5><small>'+roster.length+' CONVOCADOS</small></div>'+
     '<div class="noway-comp-player-list">'+rosterHtml+'</div></section>'+
   (mine?'<div class="noway-comp-rsvp"><strong>SUA DISPONIBILIDADE</strong><p>'+compEsc(compPresenceLabels[mine.presence])+
      '</p><div><button type="button" data-comp-rsvp="confirmado" '+(mine.presence==="confirmado"?'class="is-current"':'')+'>✓ CONFIRMO</button>'+
      '<button type="button" data-comp-rsvp="talvez" '+(mine.presence==="talvez"?'class="is-current"':'')+'>? TALVEZ</button>'+
      '<button type="button" data-comp-rsvp="ausente" '+(mine.presence==="ausente"?'class="is-current"':'')+'>× NÃO VOU</button></div></div>':"")+
   '<section class="noway-comp-subsection"><div class="noway-comp-subheading"><h5>MAP POOL.</h5><small>'+maps.length+' MAPAS</small></div>'+
     '<div class="noway-comp-map-list">'+mapHtml+'</div></section>'+
   (config?.preparation?'<section class="noway-comp-subsection"><div class="noway-comp-subheading"><h5>PLANO DE JOGO.</h5></div>'+
     '<p class="noway-comp-description">'+compEsc(config.preparation)+'</p></section>':"")+
   '<div class="noway-comp-detail-actions">'+
     (compCanEdit()?'<button type="button" id="nowayCompManage" class="btn btn-yellow">GERENCIAR PARTIDA ↗</button>':'')+
     '<button type="button" id="nowayCompViewStats" class="noway-outline-action">▥ ESTATÍSTICAS ↗</button>'+
     '<button type="button" id="nowayCompShareChat" class="noway-outline-action">▣ MARCAR NO CHAT ↗</button>'+
     '<button type="button" id="nowayCompOpenAgenda" class="noway-outline-action">VER NA AGENDA ↗</button></div>';
 wrap.querySelector("#nowayCompManage")?.addEventListener("click",openCompetitiveEditor);
 wrap.querySelector("#nowayCompViewStats")?.addEventListener("click",()=>{
   playerStatsState.selectedMatch=event.id;
   const convoked=compGetRoster(event.id);
   if(!convoked.some(r=>r.player_id===playerStatsState.selectedPlayer))
     playerStatsState.selectedPlayer=convoked.find(r=>r.player_id===me.id)?.player_id||
       convoked[0]?.player_id||null;
   setTab("stats");
 });
 wrap.querySelector("#nowayCompShareChat")?.addEventListener("click",()=>{
   setTab("chat");
   window.dispatchEvent(new CustomEvent("noway:attach-event",{detail:{id:event.id}}));
 });
 wrap.querySelector("#nowayCompOpenAgenda")?.addEventListener("click",()=>{
   const date=new Date(event.start_at);calendar=new Date(date.getFullYear(),date.getMonth(),1);
   selectedDay=spDateKey(event.start_at);setTab("agenda");
 });
 wrap.querySelectorAll("[data-comp-rsvp]").forEach(b=>b.addEventListener("click",async()=>{
   if(!mine||!isStaff())return;
   wrap.querySelectorAll("[data-comp-rsvp]").forEach(button=>button.disabled=true);
   const result=await db.rpc("noway_competitive_respond",{
     p_event_id:event.id,p_presence:b.dataset.compRsvp
   });
   if(result.error)notice("Não foi possível confirmar presença: "+result.error.message,true);
   else notice("Sua resposta de presença foi registrada.");
   await refreshCompetitive(true);
 }));
}
function addCompetitiveMapRow(m=null){
 const target=$("nowayCompMapsEditor");
 if(target.querySelectorAll(".noway-comp-map-edit").length>=12)
   return notice("O limite é de 12 mapas para picks, bans e preparação.",true);
 const n=target.querySelectorAll(".noway-comp-map-edit").length+1;
 const row=document.createElement("div");
 row.className="noway-comp-map-edit";
 row.innerHTML=
   '<div class="noway-comp-map-row"><div><label>MAPA</label><input class="comp-map-name" type="text" maxlength="64" list="nowayCompMapSuggestions" placeholder="Nome do mapa" value="'+compEsc(m?.map_name||"")+'"></div>'+
   '<div><label>SELEÇÃO / VETO</label><select class="comp-map-action">'+
     Object.entries(compMapActions).map(([value,label])=>
       '<option value="'+compEsc(value)+'"'+((m?.action||"disponivel")===value?" selected":"")+'>'+compEsc(label)+'</option>'
     ).join("")+'</select></div></div>'+
   '<div class="noway-comp-map-result"><div><label>ROUNDS NOWAY</label><input class="comp-map-ours" type="number" min="0" max="20" placeholder="—" value="'+(m?.our_rounds??"")+'"></div>'+
   '<div><label>ROUNDS ADVERSÁRIO</label><input class="comp-map-theirs" type="number" min="0" max="20" placeholder="—" value="'+(m?.their_rounds??"")+'"></div>'+
   '<button class="noway-comp-map-remove" type="button" aria-label="Remover mapa">REMOVER ×</button></div>';
 row.querySelector(".noway-comp-map-remove").addEventListener("click",()=>row.remove());
 target.appendChild(row);
}
function openCompetitiveEditor(){
 if(!compCanEdit())return;
 const event=compGetEvent(competitiveState.selected);
 if(!event)return;
 const m=compGetSetup(event.id);
 $("nowayCompEventId").value=event.id;
 $("nowayCompBestOf").value=m?.best_of||1;
 $("nowayCompResult").value=m?.result||"pendente";
 $("nowayCompOurScore").value=m?.our_score??"";
 $("nowayCompOpponentScore").value=m?.opponent_score??"";
 $("nowayCompPreparation").value=m?.preparation||"";
 const current=new Map(compGetRoster(event.id).map(r=>[r.player_id,r]));
 const container=$("nowayCompRosterEditor");
 const staff=competitiveState.people.filter(p=>["jogador","manager","owner"].includes(p.role));
 container.innerHTML=staff.length?staff.map(p=>{
   const item=current.get(p.id);
   return '<div class="noway-comp-pick-row" data-comp-player="'+compEsc(p.id)+'">'+
     '<span class="noway-comp-player-avatar">'+compAvatar(p)+'</span><div class="noway-comp-player-name"><strong>'+compEsc(p.display_name||"Integrante")+'</strong><small>'+compEsc(roles[p.role]||"EQUIPE")+'</small></div>'+
     '<label><input class="comp-summon" type="checkbox"'+(item?' checked':'')+'> CONVOCAR</label>'+
     '<label><input class="comp-starter" type="checkbox"'+(item?.starter?' checked':'')+(item?'':' disabled')+'> TITULAR</label></div>';
 }).join(""):'<p class="noway-muted">Não foi possível localizar jogadores autorizados.</p>';
 container.querySelectorAll("[data-comp-player]").forEach(row=>{
   const summon=row.querySelector(".comp-summon"),starter=row.querySelector(".comp-starter");
   summon.addEventListener("change",()=>{
     starter.disabled=!summon.checked;
     if(!summon.checked)starter.checked=false;
   });
   starter.addEventListener("change",()=>{
     if(starter.checked&&container.querySelectorAll(".comp-starter:checked").length>5){
       starter.checked=false;notice("A line-up titular permite no máximo 5 jogadores.",true);
     }
   });
 });
 $("nowayCompMapsEditor").replaceChildren();
 compGetMaps(event.id).forEach(addCompetitiveMapRow);
 $("nowayCompDetail").hidden=true;
 $("nowayCompForm").hidden=false;
 $("nowayCompForm").scrollIntoView({behavior:"smooth",block:"nearest"});
}
async function saveCompetitiveSetup(ev){
 ev.preventDefault();
 if(!compCanEdit())return;
 const event=compGetEvent($("nowayCompEventId").value);
 if(!event)return notice("Escolha uma partida existente na Agenda.",true);
 const lineup=[...$("nowayCompRosterEditor").querySelectorAll("[data-comp-player]")]
  .filter(row=>row.querySelector(".comp-summon").checked)
  .map(row=>({player_id:row.dataset.compPlayer,starter:row.querySelector(".comp-starter").checked}));
 const b=$("nowayCompBestOf").value;
 const our=$("nowayCompOurScore").value.trim();
 const them=$("nowayCompOpponentScore").value.trim();
 if((our==="")!==(them===""))return notice("Preencha os dois placares ou deixe ambos em branco.",true);
 const rows=[...$("nowayCompMapsEditor").querySelectorAll(".noway-comp-map-edit")];
 const maps=[];
 for(const row of rows){
   const name=row.querySelector(".comp-map-name").value.trim();
   const us=row.querySelector(".comp-map-ours").value.trim(),themRounds=row.querySelector(".comp-map-theirs").value.trim();
   if(!name)return notice("Preencha o nome do mapa ou remova a linha vazia.",true);
   if((us==="")!==(themRounds===""))return notice("Informe os dois placares por mapa ou deixe ambos vazios.",true);
   maps.push({slot:maps.length+1,map_name:name,action:row.querySelector(".comp-map-action").value,
     our_rounds:us===""?null:Number(us),their_rounds:themRounds===""?null:Number(themRounds)});
 }
 const form=$("nowayCompForm"),save=form.querySelector('[type="submit"]');
 save.disabled=true;
 try{
   const {error}=await db.rpc("noway_competitive_save",{
     p_event_id:event.id,p_best_of:Number(b),p_result:$("nowayCompResult").value,
     p_our_score:our===""?null:Number(our),p_opponent_score:them===""?null:Number(them),
     p_preparation:$("nowayCompPreparation").value.trim(),
     p_roster:lineup,p_maps:maps
   });
   if(error)throw error;
   competitiveState.selected=event.id;
   competitiveState.filter="all";
   $("nowayCompForm").hidden=true;$("nowayCompDetail").hidden=false;
   playerStatsState.loadedAt=0;
   await refreshCompetitive(true);
   notice("Confronto salvo! Escalação, mapas e resultados atualizados.");
 }catch(error){
   notice("Não foi possível salvar a preparação: "+error.message,true);
 }finally{save.disabled=false;}
}



// NOWAY Player Stats / v1 — dados inseridos após partidas encerradas, nunca estimados.
const playerStatsState={
  userId:null,rows:[],people:[],roster:[],matches:[],loadedAt:0,loading:false,request:0,
  selectedPlayer:null,selectedMatch:null,season:"all"
};
const statNumericKeys=["kills","deaths","assists","rounds_played","rounds_survived","kost_rounds","entry_kills","entry_deaths"];
const statInputIds=["nowayStatsKills","nowayStatsDeaths","nowayStatsAssists","nowayStatsRounds",
  "nowayStatsSurvived","nowayStatsKost","nowayStatsEntryKills","nowayStatsEntryDeaths"];
const statMatches=()=>new Map(playerStatsState.matches.map(m=>[m.event_id,m]));
function eligibleStatEvent(id,matchMap=null){
  const e=events.find(ev=>ev.id===id);
  const m=(matchMap||statMatches()).get(id);
  return e&&m&&e.kind==="partida"&&e.status==="confirmado"&&
    new Date(e.start_at).getTime()<=Date.now()&&["vitoria","derrota","empate"].includes(m.result)?e:null;
}
function eligibleStatRows(){
  const map=statMatches();
  return playerStatsState.rows.filter(row=>{
    const event=eligibleStatEvent(row.event_id,map);
    const roster=playerStatsState.roster.find(r=>r.event_id===row.event_id&&r.player_id===row.player_id);
    return Boolean(event&&roster&&roster.presence!=="ausente"&&
      (playerStatsState.season==="all"||spDateKey(event.start_at).slice(0,4)===playerStatsState.season));
  });
}
function calcPlayerStats(rows){
  const total={matches:rows.length,kills:0,deaths:0,assists:0,rounds_played:0,rounds_survived:0,
    kost_rounds:0,entry_kills:0,entry_deaths:0};
  for(const row of rows)for(const field of statNumericKeys)total[field]+=Number(row[field]||0);
  total.kd=total.deaths?total.kills/total.deaths:total.kills?Infinity:null;
  total.kpr=total.rounds_played?total.kills/total.rounds_played:null;
  total.kost=total.rounds_played?100*total.kost_rounds/total.rounds_played:null;
  total.survival=total.rounds_played?100*total.rounds_survived/total.rounds_played:null;
  total.entry=total.entry_kills-total.entry_deaths;
  return total;
}
const statRatio=x=>x==null?"—":x===Infinity?"∞":x.toFixed(2).replace(".",",");
const statPercent=x=>x==null?"—":x.toFixed(1).replace(".",",")+"%";
const statSigned=x=>x>0?"+"+x:String(x);
const statsPerson=id=>playerStatsState.people.find(p=>p.id===id);
function statsAvatar(p){
  const href=avatarURL(p?.avatar_url);
  const initial=(p?.display_name||"N").trim().slice(0,1).toUpperCase();
  return href?'<img src="'+escapeHTML(href)+'" alt="" loading="lazy">':
    '<span>'+escapeHTML(initial)+'</span>';
}
async function refreshPlayerStats(force=false){
  if(!isStaff()||!signed())return;
  if(playerStatsState.loading)return;
  if(!force&&Date.now()-playerStatsState.loadedAt<20000){
    renderPlayerStats();return;
  }
  const user=me.id,request=++playerStatsState.request;
  playerStatsState.loading=true;
  $("nowayStatsRefresh").disabled=true;
  try{
    const [stats,roster,matches,directory]=await Promise.all([
      db.from("noway_player_match_stats")
        .select("event_id,player_id,kills,deaths,assists,rounds_played,rounds_survived,kost_rounds,entry_kills,entry_deaths,updated_at")
        .limit(5000),
      db.from("noway_competitive_roster")
        .select("event_id,player_id,presence,starter").limit(5000),
      db.from("noway_competitive_matches").select("event_id,result,our_score,opponent_score").limit(1000),
      db.rpc("noway_team_directory_v2")
    ]);
    if(!signed()||me.id!==user||request!==playerStatsState.request)return;
    for(const [name,response] of [["estatísticas",stats],["convocações",roster],["partidas",matches],["integrantes",directory]]){
      if(response.error)throw Error("Falha ao carregar "+name+": "+response.error.message);
    }
    playerStatsState.rows=stats.data||[];
    playerStatsState.roster=roster.data||[];
    playerStatsState.matches=matches.data||[];
    playerStatsState.people=directory.data||[];
    playerStatsState.userId=user;
    playerStatsState.loadedAt=Date.now();
    renderPlayerStats();
  }catch(err){
    notice("Estatísticas: "+(err.message||"Não foi possível carregar os dados"),true);
    $("nowayStatsPlayers").innerHTML='<p class="noway-muted">Erro ao carregar estatísticas. Tente atualizar.</p>';
  }finally{
    if(request===playerStatsState.request){playerStatsState.loading=false;$("nowayStatsRefresh").disabled=false;}
  }
}
function renderPlayerStats(){
  if(!isStaff()||!signed())return;
  const all=playerStatsState.rows.filter(row=>Boolean(eligibleStatEvent(row.event_id))&&
    playerStatsState.roster.some(r=>r.event_id===row.event_id&&r.player_id===row.player_id&&r.presence!=="ausente"));
  const years=[...new Set(all.map(row=>spDateKey(events.find(e=>e.id===row.event_id).start_at).slice(0,4)))].sort((a,b)=>b.localeCompare(a));
  const season=$("nowayStatsSeason");
  season.innerHTML='<option value="all">TODAS AS TEMPORADAS</option>'+
    years.map(y=>'<option value="'+escapeHTML(y)+'">'+escapeHTML(y)+'</option>').join("");
  if(playerStatsState.season!=="all"&&!years.includes(playerStatsState.season))playerStatsState.season="all";
  season.value=playerStatsState.season;
  const rows=eligibleStatRows();
  const tot=calcPlayerStats(rows);
  const playersWithData=new Set(rows.map(r=>r.player_id)).size;
  const gamesWithData=new Set(rows.map(r=>r.event_id)).size;
  $("nowayStatsOverview").innerHTML=[
    ["PARTIDAS ANALISADAS",gamesWithData,"com dados individuais"],
    ["JOGADORES COM DADOS",playersWithData,"desempenhos registrados"],
    ["ROUNDS REGISTRADOS",tot.rounds_played,"participações individuais"],
    ["KOST GERAL",statPercent(tot.kost),"ponderado por rounds"]
  ].map(m=>'<article><small>'+escapeHTML(m[0])+'</small><strong>'+escapeHTML(m[1])+
    '</strong><span>'+escapeHTML(m[2])+'</span></article>').join("");
  const people=playerStatsState.people.filter(p=>["owner","manager","jogador"].includes(p.role));
  if(!people.some(p=>p.id===playerStatsState.selectedPlayer)){
    playerStatsState.selectedPlayer=people.find(p=>rows.some(r=>r.player_id===p.id))?.id||
      people.find(p=>p.id===me.id)?.id||people[0]?.id||null;
  }
  const ordered=[...people].sort((a,b)=>{
    const aa=rows.filter(x=>x.player_id===a.id).length;
    const bb=rows.filter(x=>x.player_id===b.id).length;
    return bb-aa||a.display_name.localeCompare(b.display_name,"pt-BR");
  });
  $("nowayStatsPlayers").innerHTML=ordered.length?ordered.map(p=>{
    const r=calcPlayerStats(rows.filter(x=>x.player_id===p.id));
    return '<button type="button" class="noway-player-stat-row'+
      (playerStatsState.selectedPlayer===p.id?' is-selected':'')+
      '" data-noway-stat-player="'+escapeHTML(p.id)+'">'+
      '<span class="noway-stats-avatar">'+statsAvatar(p)+'</span>'+
      '<span class="noway-stats-person"><strong>'+escapeHTML(p.display_name)+
      '</strong><small>'+r.matches+(r.matches===1?' PARTIDA ANALISADA':' PARTIDAS ANALISADAS')+'</small></span>'+
      '<span class="noway-stats-inline"><b>'+statRatio(r.kd)+'</b><small>K/D</small></span>'+
      '<span class="noway-stats-inline"><b>'+statPercent(r.kost)+'</b><small>KOST</small></span></button>';
  }).join(""):'<p class="noway-muted">Nenhum integrante autorizado encontrado.</p>';
  $("nowayStatsPlayers").querySelectorAll("[data-noway-stat-player]").forEach(b=>b.addEventListener("click",()=>{
    playerStatsState.selectedPlayer=b.dataset.nowayStatPlayer;
    playerStatsState.selectedMatch=null;renderPlayerStats();
  }));
  renderPlayerStatsDetail(rows);
  $("nowayStatsAdmin").hidden=!isManager();
  if(isManager())renderPlayerStatsEditor();
}
function renderPlayerStatsDetail(filteredRows){
  const target=$("nowayStatsPlayerDetail");
  const p=statsPerson(playerStatsState.selectedPlayer);
  if(!p){
    target.innerHTML='<div class="noway-comp-empty"><h4>ESCOLHA UM INTEGRANTE.</h4></div>';
    return;
  }
  const rows=filteredRows.filter(r=>r.player_id===p.id);
  const totals=calcPlayerStats(rows);
  const summary=[
    ["K/D",statRatio(totals.kd),"Eliminações ÷ mortes"],
    ["KOST",statPercent(totals.kost),"Rounds com K, O, S ou T"],
    ["KPR",statRatio(totals.kpr),"Eliminações por round"],
    ["SOBREVIVÊNCIA",statPercent(totals.survival),"Rounds sobrevividos"]
  ];
  const table=rows.length?'<div class="noway-stats-history-scroll"><table class="noway-stats-history"><thead><tr>'+
    '<th>PARTIDA</th><th>K / D / A</th><th>ROUNDS</th><th>K/D</th><th>KOST</th><th>ENTRY</th></tr></thead><tbody>'+
    rows.sort((a,b)=>{
      const aa=events.find(e=>e.id===a.event_id)?.start_at;
      const bb=events.find(e=>e.id===b.event_id)?.start_at;
      return new Date(bb||0)-new Date(aa||0);
    }).map(r=>{
      const e=events.find(x=>x.id===r.event_id);
      const kd=r.deaths?r.kills/r.deaths:r.kills?Infinity:null;
      const kost=100*r.kost_rounds/r.rounds_played;
      return '<tr><td><strong>'+escapeHTML(e?.opponent||e?.title||"Partida")+
        '</strong><small>'+escapeHTML(fmtDate(e?.start_at))+'</small></td>'+
        '<td>'+r.kills+' / '+r.deaths+' / '+r.assists+'</td>'+
        '<td>'+r.rounds_played+'</td><td>'+statRatio(kd)+'</td><td>'+statPercent(kost)+'</td>'+
        '<td>'+statSigned(r.entry_kills-r.entry_deaths)+'</td></tr>';
    }).join("")+'</tbody></table></div>':
    '<div class="noway-stats-no-data"><strong>SEM PARTIDAS ANALISADAS.</strong>'+
    '<p>A gestão ainda não lançou números individuais para este integrante no período selecionado.</p></div>';
  target.innerHTML='<div class="noway-stats-player-heading">'+
    '<span class="noway-stats-avatar is-large">'+statsAvatar(p)+'</span><div><span class="noway-tiny">PLAYER PROFILE / PERFORMANCE</span>'+
    '<h4>'+escapeHTML(p.display_name)+'</h4><p>'+totals.matches+' partidas com estatísticas · '+totals.kills+
    ' kills · '+totals.deaths+' deaths · '+totals.assists+' assists</p></div></div>'+
    '<div class="noway-stats-player-metrics">'+summary.map(s=>
      '<article><small>'+escapeHTML(s[0])+'</small><strong>'+escapeHTML(s[1])+
      '</strong><span>'+escapeHTML(s[2])+'</span></article>').join("")+'</div>'+
    '<div class="noway-stats-extra"><span>ENTRY KILLS <b>'+totals.entry_kills+'</b></span>'+
    '<span>ENTRY DEATHS <b>'+totals.entry_deaths+'</b></span>'+
    '<span>SALDO DE ENTRY <b>'+statSigned(totals.entry)+'</b></span></div>'+
    '<div class="noway-stats-history-heading"><h5>HISTÓRICO INDIVIDUAL.</h5>'+
    '<span>'+totals.matches+' REGISTROS</span></div>'+table+
    '<p class="noway-stats-disclaimer">Números informados pela gestão após cada partida. Ausência de registro não equivale a zero de desempenho.</p>';
}
function renderPlayerStatsEditor(){
  if(!isManager())return;
  const personSelect=$("nowayStatsPlayerSelect");
  const people=playerStatsState.people.filter(p=>["owner","manager","jogador"].includes(p.role));
  personSelect.innerHTML=people.map(p=>
    '<option value="'+escapeHTML(p.id)+'">'+escapeHTML(p.display_name)+'</option>').join("");
  if(!people.some(p=>p.id===playerStatsState.selectedPlayer))playerStatsState.selectedPlayer=people[0]?.id||null;
  if(!playerStatsState.selectedPlayer){$("nowayStatsSave").disabled=true;return;}
  personSelect.value=playerStatsState.selectedPlayer;
  const matches=playerStatsState.roster
    .filter(r=>r.player_id===playerStatsState.selectedPlayer&&r.presence!=="ausente")
    .map(r=>eligibleStatEvent(r.event_id)).filter(Boolean)
    .sort((a,b)=>new Date(b.start_at)-new Date(a.start_at));
  if(!matches.some(e=>e.id===playerStatsState.selectedMatch))playerStatsState.selectedMatch=matches[0]?.id||null;
  const matchSelect=$("nowayStatsMatchSelect");
  matchSelect.innerHTML=matches.length?matches.map(e=>
    '<option value="'+escapeHTML(e.id)+'">'+escapeHTML(fmtDate(e.start_at))+' · '+escapeHTML(e.opponent||e.title)+'</option>').join(""):
    '<option value="">NENHUMA PARTIDA FINALIZADA COM ESTE JOGADOR</option>';
  matchSelect.disabled=!matches.length;
  if(playerStatsState.selectedMatch)matchSelect.value=playerStatsState.selectedMatch;
  const previous=playerStatsState.rows.find(r=>
    r.player_id===playerStatsState.selectedPlayer&&r.event_id===playerStatsState.selectedMatch);
  statNumericKeys.forEach((key,i)=>{$(statInputIds[i]).value=previous?.[key]??"";});
  $("nowayStatsSave").disabled=!matches.length;
}
async function savePlayerMatchStats(ev){
  ev.preventDefault();
  if(!isManager()||!signed())return;
  const playerId=$("nowayStatsPlayerSelect").value,eventId=$("nowayStatsMatchSelect").value;
  if(!playerId||!eventId||!eligibleStatEvent(eventId))
    return notice("Finalize um confronto e convoque o integrante no Competitive antes de registrar os números.",true);
  const numbers=statInputIds.map(id=>$(id).value.trim());
  if(numbers.some(v=>v===""||!Number.isInteger(Number(v))))
    return notice("Preencha todos os números inteiros, incluindo os valores zero.",true);
  const n=numbers.map(Number);
  if(n[3]<1||n[0]<0||n[1]<0||n[2]<0||n[4]>n[3]||n[5]>n[3]||
    n[6]>n[0]||n[7]>n[1]||n[1]>n[3]||n.some(v=>v<0))
    return notice("Revise rounds, mortes, sobrevivência, KOST e entradas.",true);
  const button=$("nowayStatsSave");button.disabled=true;
  const {error}=await db.rpc("noway_save_player_match_stats",{
    p_event_id:eventId,p_player_id:playerId,p_kills:n[0],p_deaths:n[1],
    p_assists:n[2],p_rounds_played:n[3],p_rounds_survived:n[4],p_kost_rounds:n[5],
    p_entry_kills:n[6],p_entry_deaths:n[7]
  });
  if(error){
    button.disabled=false;
    return notice("Não foi possível salvar as estatísticas: "+error.message,true);
  }
  playerStatsState.selectedPlayer=playerId;playerStatsState.selectedMatch=eventId;
  playerStatsState.loadedAt=0;
  await refreshPlayerStats(true);
  notice("Estatísticas salvas e indicadores recalculados.");
}


bind();
loadAccount();
