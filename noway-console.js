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
  if(name==="chat"||name==="agenda"||name==="team")return isStaff();
  return ["overview","contacts","profile"].includes(name);
};
let currentTab="overview";
function setTab(name){
  if(!signed()||!viewPermitted(name))name="overview";
  currentTab=name;
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
  $("nowayConsoleProfile").hidden=name!=="profile";
  $("nowayConsoleOverview").hidden=name!=="overview";
  // A lista e o chat existentes são segmentados em CSS, sem copiar estado.
  if(name==="agenda"){renderCalendar();renderEvents();}
  if(name==="users")refreshAccounts();
  if(name==="overview"){
    renderOverview();
    if(Date.now()-hqLoadedAt>60000)refreshHQ();
  }
  if(name==="profile")renderProfile();
  if(name==="chat")window.dispatchEvent(new Event("noway:chat-open"));
  try{history.replaceState(null,"",location.pathname+"#"+name);}catch{}
  document.querySelector(".noway-console-main")?.scrollIntoView({behavior:"smooth",block:"start"});
}
function syncRoles(){
  document.querySelectorAll("[data-console-tab]").forEach(btn=>btn.hidden=!viewPermitted(btn.dataset.consoleTab));
  $("nowayEventCreate").hidden=!isManager();
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
  $("nowayHQNewEvent").hidden=!isManager();
  $("nowayHQInboxSection").hidden=!isOwner();
  const requested=location.hash.slice(1);
  setTab(viewPermitted(requested)&&["overview","team","agenda","chat","contacts","users","profile"].includes(requested)?requested:"overview");
}
async function loadAccount(){
  try{
    const auth=await db.auth.getUser();me=auth.data.user||null;
    if(!me){account=null;return;}
    const res=await db.from("noway_profiles").select("id,display_name,role,avatar_url").eq("id",me.id).maybeSingle();
    if(res.error)throw res.error;
    account=res.data||{id:me.id,role:"membro",display_name:me.user_metadata?.full_name||"Membro",avatar_url:null};
    if(hqIdentity!==me.id){hqSnapshot=null;hqActivity=[];hqInbox=[];hqLoadedAt=0;hqIdentity=me.id;}
    syncRoles();renderProfile();
    if(isStaff())await refreshEvents();
    await refreshHQ();
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
    else if(!active)tasks.push(db.from("noway_contacts")
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
      hqInbox=owner?contactList:[];
      for(const t of contactList.slice(0,6))items.push({
        type:"contact",icon:"✉",title:"Contato: "+t.subject,
        description:"Status: "+String(t.status||"").replaceAll("_"," "),
        created_at:t.updated_at||t.created_at,tab:"contacts"
      });
    }else hqInbox=[];
    hqActivity=items.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,8);
    hqLoadedAt=Date.now();
    $("nowayHQLastUpdated").textContent="Atualizado às "+new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit"}).format(new Date());
    renderOverview();
  }catch(err){
    notice("Não foi possível atualizar a central: "+(err?.message||"erro inesperado"),true);
    $("nowayHQLastUpdated").textContent="Erro ao sincronizar os dados";
  }finally{
    if(run===hqRun){hqLoading=false;if(refresh)refresh.disabled=false;}
  }
}

async function refreshEvents(){
  if(!isStaff())return;
  if(loadEventsPromise)return loadEventsPromise;
  loadEventsPromise=(async()=>{
    const start=new Date(new Date().getFullYear()-1,0,1).toISOString();
    const {data,error}=await db.from("noway_team_events")
      .select("id,kind,title,description,opponent,competition,meeting_link,start_at,end_at,status,created_by")
      .gte("start_at",start).order("start_at",{ascending:true}).limit(500);
    if(error){notice("Não foi possível carregar a agenda: "+error.message,true);return;}
    events=data||[];renderCalendar();renderEvents();renderOverview();
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
      (canEdit?'<button type="button" data-edit-event="'+escapeHTML(e.id)+'" class="noway-mini-action">EDITAR ↗</button>':'')+
      '</div></article>';
  }).join(""):'<p class="noway-muted">Nenhum evento neste período. Use as setas para navegar pelos meses.</p>';
  box.querySelectorAll("[data-edit-event]").forEach(b=>b.addEventListener("click",()=>openEventEditor(events.find(e=>e.id===b.dataset.editEvent))));
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
  const start=new Date($("nowayEventStart").value),end=$("nowayEventEnd").value?new Date($("nowayEventEnd").value):null;
  if(Number.isNaN(start.getTime())||(end&&Number.isNaN(end.getTime())))return notice("Informe uma data e hora válidas.",true);
  btn.disabled=true;
  const {error}=await db.rpc("noway_save_team_event",{
    p_id:$("nowayEventId").value||null,p_kind:$("nowayEventKind").value,
    p_title:$("nowayEventTitle").value.trim(),p_start:start.toISOString(),
    p_end:end?.toISOString()||null,p_description:$("nowayEventDescription").value.trim(),
    p_opponent:$("nowayEventOpponent").value.trim(),p_competition:$("nowayEventCompetition").value.trim(),
    p_meeting_link:$("nowayEventLink").value.trim(),p_status:$("nowayEventStatus").value
  });
  btn.disabled=false;
  if(error)return notice("Erro ao salvar: "+error.message,true);
  closeEventEditor();selectedDay=null;calendar=new Date(start.getFullYear(),start.getMonth(),1);
  await refreshEvents();notice("Compromisso salvo na agenda da equipe.");
}
async function deleteEvent(){
  if(!isManager()||!$("nowayEventId").value||!confirm("Excluir este evento da agenda?"))return;
  const btn=$("nowayEventDelete");btn.disabled=true;
  const {error}=await db.rpc("noway_delete_team_event",{p_id:$("nowayEventId").value});
  btn.disabled=false;
  if(error)return notice("Não foi possível excluir: "+error.message,true);
  closeEventEditor();await refreshEvents();notice("Evento excluído.");
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
window.addEventListener("noway:go-to-event",event=>{
  const ev=events.find(e=>e.id===event.detail?.id);
  if(ev){const date=new Date(ev.start_at);calendar=new Date(date.getFullYear(),date.getMonth(),1);
    selectedDay=spDateKey(ev.start_at);setTab("agenda");}
});
bind();
loadAccount();
