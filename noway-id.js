import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Chave PÚBLICA do projeto: permissões são impostas por RLS no Supabase.
// Nunca inclua service_role, client_secret ou tokens administrativos no navegador.
const supabase = createClient(
  "https://vdipsufzlqmnprbjiojb.supabase.co",
  "sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);
const $id = id => document.getElementById(id);
const clean = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const labels={membro:"MEMBRO",jogador:"JOGADOR NOWAY",manager:"GESTÃO NOWAY",owner:"FOUNDER / OWNER"};
const statusText={aberta:"ABERTA",aguardando:"AGUARDANDO",respondida:"RESPONDIDA",resolvida:"RESOLVIDA"};
let signedUser=null, profile=null, tickets=[], members=[], activeId=null, running=0;

function feedback(message, error=false) {
  const notice=$id("nowaySystemNotice");
  notice.hidden=false;
  notice.textContent=message;
  notice.classList.toggle("is-error",error);
}
function setBusy(form, busy) {
  form.querySelectorAll("button").forEach(button=>{button.disabled=busy});
}
function displayDate(date) {
  try {return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(date))}
  catch{return ""}
}
function nowayRoleBadge(role,senderName=""){
  if(role!=="owner"&&role!=="manager")return "";
  const isFounder=role==="owner";
  const name=isFounder?"Niel":(/prado/i.test(senderName)?"Prado":String(senderName||"Team Manager").trim().split(/\s+/)[0]);
  const description=name+(isFounder?" - Founder":" - Team Manager");
  // Desenhos SVG autorais para os dois cargos da NOWAY; o cargo vem do servidor.
  const icon=isFounder?
    '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true" focusable="false">'+
      '<path d="M3.8 10.1 8.8 13.5 14 5.8l5.2 7.7 5-3.4-2.1 11.7H5.9L3.8 10.1Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'+
      '<path d="M6.1 18.5h15.8M7 24h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'+
      '<path d="m12 15 2-2.5 2 2.5-2 2.5-2-2.5Z" fill="currentColor"/>'+
      '<circle cx="14" cy="4.1" r="1.1" fill="currentColor"/>'+
    '</svg>':
    '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true" focusable="false">'+
      '<path d="M14 2.8 23 6.1v7.2c0 5.7-3.6 9.1-9 11.8-5.4-2.7-9-6.1-9-11.8V6.1L14 2.8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'+
      '<path d="M9.5 16.9V10l4.5 5.2 4.5-5.2v6.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="round"/>'+
      '<path d="M11 6.9h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'+
    '</svg>';
  return '<span class="noway-role-message-badge '+(isFounder?'is-founder':'is-manager')+
    '" tabindex="0" role="img" aria-label="'+clean(description)+'" title="'+clean(description)+
    '" data-tooltip="'+clean(description)+'">'+icon+'</span>';
}
function contactName(item) {
  if(item.user_id===signedUser?.id)return "VOCÊ";
  return members.find(m=>m.id===item.user_id)?.display_name||"MEMBRO NOWAY";
}
function moveToSection() {
  location.hash="community";
  $id("community").scrollIntoView({behavior:"smooth",block:"start"});
}

async function refreshAuth() {
  const run=++running;
  const {data:{user},error}=await supabase.auth.getUser();
  if(run!==running)return;
  if(error && error.name!=="AuthSessionMissingError")feedback("Não foi possível verificar a sessão. Tente novamente.",true);
  signedUser=user||null;
  profile=null; tickets=[]; members=[]; activeId=null;
  if(signedUser) {
    const response=await supabase.from("noway_profiles")
      .select("id,display_name,role,avatar_url").eq("id",signedUser.id).maybeSingle();
    if(run!==running)return;
    if(response.error)feedback("Erro ao carregar seu perfil: "+response.error.message,true);
    profile=response.data||{display_name:signedUser.user_metadata?.full_name||"Membro",role:"membro"};
  }
  $id("nowayLoginSurface").hidden=Boolean(signedUser);
  $id("nowayDashboard").hidden=!signedUser;
  $id("nowayHeaderLogin").textContent=signedUser?"MINHA CONTA ↗":"ENTRAR ↗";
  const quick=$id("nowayPortalQuick");
  if(quick)quick.hidden=!signedUser;
  $id("nowayThreadSection").hidden=true;
  $id("nowayTeamWorkspace").hidden=true;
  stopTeamFeed();
  if(!signedUser)return;
  $id("nowayAccountName").textContent=profile.display_name||"MEMBRO NOWAY";
  $id("nowayAccountRole").textContent=labels[profile.role]||"MEMBRO";
  const owner=profile.role==="owner";
  $id("nowayInboxTitle").textContent=owner?"CAIXA DE ENTRADA.":"SUAS CONVERSAS.";
  $id("nowayInboxDescription").textContent=owner?
    "Mensagens enviadas à NOWAY. Selecione uma para responder.":"Acompanhe as suas solicitações e as respostas da organização.";
  $id("nowayOwnerMembers").hidden=!owner;
  // Na página pública o portal é um atalho, sem duplicar toda a área de equipe.
  if(document.body.dataset.nowayConsole!=="true"){
    $id("nowayTeamWorkspace").hidden=true;
    $id("nowayOwnerMembers").hidden=true;
    await refreshTickets();
    if(owner)await refreshMembers();
    return;
  }
  await loadTeamWorkspace(run);
  if(run!==running)return;
  await refreshTickets();
  if(owner)await refreshMembers();
}

async function refreshTickets() {
  if(!signedUser)return;
  const result=await supabase.from("noway_contacts")
    .select("id,user_id,category,subject,status,created_at,updated_at")
    .order("updated_at",{ascending:false}).limit(100);
  if(result.error){feedback("Não foi possível carregar solicitações: "+result.error.message,true);return}
  tickets=result.data||[];
  drawTickets();
}
function drawTickets() {
  const target=$id("nowayContactsList");
  if(!tickets.length) {
    target.innerHTML='<p class="noway-muted">Nenhuma solicitação ainda. Use o formulário ao lado para enviar a primeira mensagem.</p>';
    return;
  }
  target.innerHTML=tickets.map(ticket=>'<button class="noway-ticket" type="button" data-noway-ticket="'+clean(ticket.id)+'">'+
    '<span class="noway-ticket-title">'+clean(ticket.subject)+'</span>'+
    '<span class="noway-ticket-by">'+clean(contactName(ticket))+' · '+clean(displayDate(ticket.updated_at))+'</span>'+
    '<span class="noway-ticket-status">'+clean(statusText[ticket.status]||ticket.status)+'</span></button>').join("");
  target.querySelectorAll("[data-noway-ticket]").forEach(btn=>
    btn.addEventListener("click",()=>openTicket(btn.dataset.nowayTicket))
  );
}

async function openTicket(id) {
  const ticket=tickets.find(t=>t.id===id);if(!ticket)return;
  activeId=id;
  $id("nowayThreadSection").hidden=false;
  $id("nowayThreadTitle").textContent=ticket.subject;
  $id("nowayThreadMeta").textContent=contactName(ticket)+" • "+statusText[ticket.status];
  $id("nowayReplyForm").hidden=ticket.status==="resolvida";
  $id("nowayOwnerTicketControls").hidden=profile?.role!=="owner";
  $id("nowayTicketStatus").value=ticket.status;
  $id("nowayThreadMessages").innerHTML='<p class="noway-muted">Carregando conversa...</p>';
  $id("nowayThreadSection").scrollIntoView({behavior:"smooth",block:"nearest"});
  const [res,rolesResult]=await Promise.all([
    supabase.from("noway_contact_messages")
      .select("id,contact_id,sender_id,body,created_at")
      .eq("contact_id",id).order("created_at",{ascending:true}),
    supabase.rpc("noway_contact_message_roles",{p_contact_id:id})
  ]);
  if(activeId!==id)return;
  if(res.error){feedback("Não foi possível abrir a conversa: "+res.error.message,true);return}
  const list=res.data||[];
  const senderRoles=new Map((rolesResult.error?[]:rolesResult.data||[]).map(m=>[m.sender_id,m.role]));
  if(rolesResult.error)console.warn("NOWAY: cargo do remetente indisponível",rolesResult.error.message);
  $id("nowayThreadMessages").innerHTML=list.length?list.map(m=>{
    const own=m.sender_id===signedUser?.id;
    const authorRole=senderRoles.get(m.sender_id)||(own?profile?.role:null);
    return '<article class="noway-chat-message'+(own?' is-own':'')+'">'+
      '<div class="noway-chat-author-line"><span class="noway-chat-author">'+
        clean(own?"VOCÊ":(profile?.role==="owner"?contactName(ticket):"NOWAY ESPORTS"))+
      '</span>'+nowayRoleBadge(authorRole,own?(profile?.display_name||""):(authorRole==="owner"?"Niel":authorRole==="manager"?"Prado":""))+
      '<time>'+clean(displayDate(m.created_at))+'</time></div>'+
      '<p>'+clean(m.body)+'</p></article>';
  }).join(""):'<p class="noway-muted">Sem mensagens.</p>';
}

async function refreshMembers() {
  const res=await supabase.from("noway_profiles").select("id,display_name,role").order("created_at",{ascending:false}).limit(120);
  if(res.error){feedback("Não foi possível carregar os membros: "+res.error.message,true);return}
  members=res.data||[];
  drawTickets();
  const container=$id("nowayMembersList");
  container.innerHTML=members.map(item=>{
    if(item.role==="owner")return '<div class="noway-member-row"><span>'+clean(item.display_name)+'</span><strong>FOUNDER / OWNER</strong></div>';
    return '<div class="noway-member-row"><span>'+clean(item.display_name)+'</span>'+
      '<select aria-label="Cargo de '+clean(item.display_name)+'" data-member-role="'+clean(item.id)+'">'+
      ["membro","jogador","manager"].map(role=>'<option value="'+role+'"'+(role===item.role?" selected":"")+'>'+labels[role]+'</option>').join("")+
      '</select><button type="button" class="noway-mini-action" data-save-role="'+clean(item.id)+'">SALVAR</button></div>';
  }).join("")||'<p class="noway-muted">Nenhum usuário cadastrado.</p>';
  container.querySelectorAll("[data-save-role]").forEach(btn=>btn.addEventListener("click",async()=>{
    const id=btn.dataset.saveRole;
    const sel=[...container.querySelectorAll("[data-member-role]")].find(x=>x.dataset.memberRole===id);
    if(!sel)return;
    btn.disabled=true;
    const result=await supabase.rpc("noway_set_member_role",{target_id:id,next_role:sel.value});
    btn.disabled=false;
    if(result.error){feedback("Não foi possível mudar o cargo: "+result.error.message,true);return}
    feedback("Cargo do membro atualizado.");
    await refreshMembers();
  }));
}

$id("nowayHeaderLogin").addEventListener("click",moveToSection);
$id("nowayGoogleLogin").addEventListener("click",async()=>{
  const button=$id("nowayGoogleLogin");
  button.disabled=true;
  feedback("Redirecionando para o Google...");
  const {error}=await supabase.auth.signInWithOAuth({
    provider:"google",
    options:{redirectTo:location.origin+location.pathname}
  });
  if(error){feedback("Google ainda não disponível: "+error.message+". Use o acesso por e-mail.",true);button.disabled=false}
});

$id("nowayEmailForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const form=event.currentTarget;setBusy(form,true);
  const email=$id("nowayLoginEmail").value.trim().toLowerCase();
  const {error}=await supabase.auth.signInWithOtp({
    email,options:{shouldCreateUser:true,emailRedirectTo:location.origin+location.pathname}
  });
  setBusy(form,false);
  feedback(error?"Não foi possível enviar o link: "+error.message:
    "Confira sua caixa de entrada e spam. Enviamos um link de acesso ao e-mail informado.",Boolean(error));
});
$id("nowaySignOut").addEventListener("click",async()=>{
  const {error}=await supabase.auth.signOut();
  if(error){feedback("Falha ao sair: "+error.message,true);return}
  await refreshAuth();
  feedback("Você saiu da conta com segurança.");
});
$id("nowayNewContact").addEventListener("submit",async event=>{
  event.preventDefault();
  if(!signedUser){feedback("Entre com sua conta para enviar uma mensagem.",true);return}
  const form=event.currentTarget;setBusy(form,true);
  const result=await supabase.rpc("noway_open_contact",{
    p_category:$id("nowayContactType").value,
    p_subject:$id("nowayContactSubject").value.trim(),
    p_message:$id("nowayContactBody").value.trim()
  });
  setBusy(form,false);
  if(result.error){feedback("Não foi possível enviar: "+result.error.message,true);return}
  form.reset();
  feedback("Solicitação enviada à NOWAY. Você pode acompanhar a resposta nesta página.");
  await refreshTickets();
  if(result.data)await openTicket(result.data);
});
$id("nowayReplyForm").addEventListener("submit",async event=>{
  event.preventDefault();
  if(!activeId)return;
  const form=event.currentTarget;setBusy(form,true);
  const result=await supabase.rpc("noway_reply_contact",{
    p_contact_id:activeId,p_message:$id("nowayReplyBody").value.trim()
  });
  setBusy(form,false);
  if(result.error){feedback("Não foi possível responder: "+result.error.message,true);return}
  form.reset();feedback("Resposta enviada.");await openTicket(activeId);
});
$id("nowaySaveStatus").addEventListener("click",async()=>{
  if(profile?.role!=="owner"||!activeId)return;
  const button=$id("nowaySaveStatus");button.disabled=true;
  const result=await supabase.from("noway_contacts").update({status:$id("nowayTicketStatus").value}).eq("id",activeId);
  button.disabled=false;
  if(result.error){feedback("Falha ao atualizar status: "+result.error.message,true);return}
  feedback("Status atualizado.");const id=activeId;await refreshTickets();await openTicket(id);
});

supabase.auth.onAuthStateChange(()=>{setTimeout(()=>{refreshAuth().catch(err=>feedback("Erro de acesso: "+err.message,true))},0)});
refreshAuth().catch(err=>feedback("Erro ao iniciar NOWAY ID: "+err.message,true));


// Controles de administração e atualização manual, sem compartilhar e-mail no site.
$id("nowayCopyId").addEventListener("click",async()=>{
  if(!signedUser)return;
  try {
    await navigator.clipboard.writeText(signedUser.id);
    feedback("ID da conta copiado. Ele permite que a gestão identifique seu perfil.");
  } catch {
    feedback("ID da sua conta: "+signedUser.id);
  }
});
$id("nowayRefreshInbox").addEventListener("click",async()=>{
  await refreshTickets();
  if(activeId)await openTicket(activeId);
  if(profile?.role==="owner")await refreshMembers();
  feedback("Caixa de entrada atualizada.");
});
// Mantém a caixa de entrada atualizada sem descartar rascunhos.
setInterval(async()=>{
  if(!signedUser || document.hidden)return;
  try {
    await refreshTickets();
    if(activeId)await openTicket(activeId);
  }catch(error){console.warn("NOWAY ID: atualização adiada",error)}
},60000);


// Mostra o botão do Google somente quando o provedor estiver habilitado.
(async function nowayCheckGoogleProvider(){
  try{
    const url="https://vdipsufzlqmnprbjiojb.supabase.co/auth/v1/settings";
    const response=await fetch(url,{
      headers:{"apikey":"sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e"}
    });
    if(!response.ok)return;
    const settings=await response.json();
    if(settings?.external?.google===false){
      const button=$id("nowayGoogleLogin");
      button.disabled=true;
      button.title="A autenticação Google ainda precisa ser ativada no Supabase";
      button.textContent="LOGIN GOOGLE — ATIVAÇÃO PENDENTE";
    }
  }catch{ /* Sem resposta do serviço, o fluxo normal continua disponível. */ }
})();


// Nome exibido na comunidade para usuários com ou sem perfil Google.
$id("nowayEditName").addEventListener("click",()=>{
  const form=$id("nowayDisplayNameForm");
  form.hidden=!form.hidden;
  $id("nowayDisplayName").value=profile?.display_name==="Membro"?"":(profile?.display_name||"");
  if(!form.hidden)$id("nowayDisplayName").focus();
});
$id("nowayDisplayNameForm").addEventListener("submit",async(event)=>{
  event.preventDefault();
  if(!signedUser)return;
  const form=event.currentTarget;
  const name=$id("nowayDisplayName").value.trim();
  if(name.length<1||name.length>80)return feedback("Informe um nome de até 80 caracteres.",true);
  setBusy(form,true);
  const {error}=await supabase.rpc("noway_update_display_name",{new_name:name});
  setBusy(form,false);
  if(error)return feedback("Não foi possível mudar o nome: "+error.message,true);
  form.hidden=true;
  await refreshAuth();
  feedback("Seu nome na comunidade foi atualizado.");
});


// HQ 2.0: abrir a solicitação selecionada pela central do Founder, sem expor dados.
if(document.body.dataset.nowayConsole==="true"){
  window.addEventListener("noway:open-contact",async event=>{
    const id=event.detail?.id;
    if(!id||!signedUser)return;
    if(!tickets.some(t=>t.id===id))await refreshTickets();
    if(tickets.some(t=>t.id===id))await openTicket(id);
  });
}

// NOWAY Team Hub v1 — espaços de Jogador, Gerência e Owner.
// O servidor valida todos os papéis em RPC e RLS. Esconder painéis não dá permissão.
const teamRoles=new Set(["jogador","manager","owner"]);
let teamChannel=null,teamPollCounter=0;
let teamDirectory=[],teamMessageSignature=null,teamNewsSignature=null;
let teamChatList=[], teamKnownIds=new Set(),teamChatReady=false,chatRequestId=0;
let teamChatEvents=[],chatImages=new Map(),chatReplyTo=null,chatEventId=null,chatPhoto=null,chatPhotoURL=null;
let teamUnread=0,chatToastTimer=null;
let chatSoundOn=true,chatAudioContext=null;
const originalNowayTitle=document.title;

function stopTeamFeed(){
  if(teamChannel){supabase.removeChannel(teamChannel);teamChannel=null;}
  teamDirectory=[];
  teamMessageSignature=null;
  teamNewsSignature=null;
  teamChatReady=false;
  teamKnownIds=new Set();
  teamChatList=[];
  teamUnread=0;
  teamChatEvents=[];
  chatImages.clear();
  chatReplyTo=null;chatEventId=null;
  if(chatPhotoURL){URL.revokeObjectURL(chatPhotoURL);chatPhotoURL=null;}
  chatPhoto=null;
  hideTeamToast();
  updateTeamUnread();
}
function canReadTeam(){return Boolean(signedUser&&teamRoles.has(profile?.role));}
function canManageTeam(){return profile?.role==="manager"||profile?.role==="owner";}
function teamRoleLabel(role){
  return {owner:"FOUNDER",manager:"TEAM MANAGER",jogador:"JOGADOR"}[role]||"EQUIPE";
}
function teamTime(date){
  const d=new Date(date);
  return Number.isNaN(d.getTime())?"":d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}
function teamDate(date){
  const d=new Date(date);
  return Number.isNaN(d.getTime())?"":d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"});
}

async function loadTeamWorkspace(run){
  if(!canReadTeam())return;
  const level=profile.role;
  const titles={
    jogador:"ESPAÇO DO JOGADOR.",
    manager:"ESPAÇO DA GESTÃO.",
    owner:"CENTRAL DA EQUIPE."
  };
  const subtitles={
    jogador:"Seus comunicados, companheiros e conversas internas. Um canal só para a NOWAY.",
    manager:"Organize os comunicados e mantenha o elenco conectado. A administração de contas continua com o Founder.",
    owner:"Acompanhe a equipe, publique comunicados e converse diretamente com jogadores e gestão."
  };
  $id("nowayTeamWorkspace").hidden=false;
  $id("nowayTeamTitle").textContent=titles[level];
  $id("nowayTeamSubtitle").textContent=subtitles[level];
  $id("nowayAnnouncementForm").hidden=!canManageTeam();
  const currentUser=signedUser.id;
  await Promise.all([refreshTeamDirectory(),refreshTeamEvents()]);
  await Promise.all([refreshTeamNews(),refreshTeamChat()]);
  if(run!==running || !signedUser || signedUser.id!==currentUser)return;

  // Supabase Realtime atualiza ao chegar nova mensagem; o polling recupera
  // eventos perdidos ao suspender a aba ou perder a conexão.
  try{
    teamChannel=supabase.channel("noway-private-team-chat")
      .on("postgres_changes",{
        event:"*",schema:"public",table:"noway_team_messages"
      },()=>{if(canReadTeam())refreshTeamChat();})
      .subscribe();
  }catch(err){console.warn("NOWAY: chat usará atualização periódica",err);}
}

async function refreshTeamDirectory(){
  if(!canReadTeam())return;
  const currentUser=signedUser.id;
  const result=await supabase.rpc("noway_team_directory_v2");
  if(!signedUser||signedUser.id!==currentUser||!canReadTeam())return;
  if(result.error){
    $id("nowayTeamDirectoryList").innerHTML='<p class="noway-muted">Não foi possível carregar a equipe.</p>';
    console.warn("NOWAY directory",result.error.message);
    return;
  }
  teamDirectory=result.data||[];
  $id("nowayTeamDirectoryList").innerHTML=teamDirectory.length?teamDirectory.map(person=>
    '<div class="noway-team-person">'+
      '<span class="noway-team-avatar" aria-hidden="true">'+
        (person.avatar_url?'<img src="'+clean(supabase.storage.from("noway-avatars").getPublicUrl(person.avatar_url).data.publicUrl)+'" alt="" loading="lazy">':clean((person.display_name||"N").trim().charAt(0).toUpperCase()))+
      '</span>'+
      '<span class="noway-team-person-name">'+clean(person.display_name||"Integrante NOWAY")+(person.id===signedUser.id?' <small>(VOCÊ)</small>':'')+'</span>'+
      '<span class="noway-team-person-role">'+clean(teamRoleLabel(person.role))+'</span>'+
    '</div>'
  ).join(""):'<p class="noway-muted">A equipe aparecerá aqui assim que as contas forem autorizadas.</p>';
}

async function refreshTeamNews(){
  if(!canReadTeam())return;
  const currentUser=signedUser.id;
  const {data,error}=await supabase.from("noway_team_announcements")
    .select("id,author_id,author_name,title,body,created_at")
    .order("created_at",{ascending:false}).limit(30);
  if(!signedUser||signedUser.id!==currentUser||!canReadTeam())return;
  const target=$id("nowayTeamNewsList");
  if(error){
    target.innerHTML='<p class="noway-muted">Não foi possível carregar os comunicados.</p>';
    console.warn("NOWAY announcements",error.message);
    return;
  }
  const list=data||[];
  const signature=list.map(a=>a.id).join(",");
  if(teamNewsSignature===signature)return;
  teamNewsSignature=signature;
  target.innerHTML=list.length?list.map(a=>{
    const mayRemove=profile.role==="owner"||(profile.role==="manager"&&a.author_id===signedUser.id);
    return '<article class="noway-team-news-item">'+
      '<div class="noway-team-news-meta"><span>'+clean(a.author_name)+' · '+clean(teamDate(a.created_at))+'</span>'+
      nowayRoleBadge(teamDirectory.find(p=>p.id===a.author_id)?.role||(a.author_id===signedUser.id?profile?.role:null),a.author_name)+
      (mayRemove?'<button type="button" class="noway-team-delete" data-team-remove="'+clean(a.id)+'" aria-label="Excluir comunicado: '+clean(a.title)+'">EXCLUIR ×</button>':'')+
      '</div><h5>'+clean(a.title)+'</h5><p>'+clean(a.body)+'</p></article>';
  }).join(""):'<p class="noway-muted">Nenhum comunicado ainda. A gestão pode publicar os primeiros recados aqui.</p>';
  target.querySelectorAll("[data-team-remove]").forEach(button=>button.addEventListener("click",async()=>{
    if(!canManageTeam()||!confirm("Excluir este comunicado da equipe?"))return;
    button.disabled=true;
    const res=await supabase.rpc("noway_remove_team_announcement",{p_announcement_id:button.dataset.teamRemove});
    if(res.error){button.disabled=false;feedback("Não foi possível excluir: "+res.error.message,true);return;}
    teamNewsSignature=null;
    await refreshTeamNews();
    feedback("Comunicado removido da equipe.");
  }));
}

async function refreshTeamChat(){
  if(!canReadTeam())return;
  const userId=signedUser.id;
  const req=++chatRequestId;
  const {data,error}=await supabase.from("noway_team_messages")
    .select("id,sender_id,sender_name,body,created_at,reply_to,event_id,image_path")
    .order("created_at",{ascending:false}).limit(100);
  if(req!==chatRequestId||!canReadTeam()||signedUser?.id!==userId)return;
  const target=$id("nowayTeamChatList");
  if(error){
    target.innerHTML='<p class="noway-muted">O chat não pôde ser carregado. Tente novamente.</p>';
    console.warn("NOWAY chat:",error.message);return;
  }
  const list=(data||[]).reverse();
  const newMessages=teamChatReady?list.filter(m=>!teamKnownIds.has(m.id)&&m.sender_id!==signedUser.id):[];
  teamChatReady=true;
  for(const m of list)teamKnownIds.add(m.id);
  // Não acumular ilimitadamente identificadores de mensagens antigas.
  if(teamKnownIds.size>450)teamKnownIds=new Set(list.map(m=>m.id));
  teamChatList=list;
  if(newMessages.length)announceTeamMessages(newMessages);
  const signature=list.map(m=>m.id).join(",");
  if(signature===teamMessageSignature)return;
  const autoScroll=target.scrollHeight-target.scrollTop-target.clientHeight<105;
  // URLs de imagens vêm de links temporários, liberados apenas a contas da equipe.
  const mediaPaths=[...new Set(list.map(m=>m.image_path).filter(Boolean))];
  await Promise.all(mediaPaths.map(async path=>{
    const cached=chatImages.get(path);
    if(cached?.expires>Date.now())return;
    if(!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.webp$/.test(path))return;
    const res=await supabase.storage.from("noway-team-chat").createSignedUrl(path,3600);
    if(!res.error&&res.data?.signedUrl)chatImages.set(path,{url:res.data.signedUrl,expires:Date.now()+3300000});
  }));
  if(req!==chatRequestId||!canReadTeam()||signedUser?.id!==userId)return;
  teamMessageSignature=signature;
  const refs=new Map(list.map(m=>[m.id,m]));
  const eventsById=new Map(teamChatEvents.map(e=>[e.id,e]));
  const avatarFor=m=>{
    const person=teamDirectory.find(p=>p.id===m.sender_id);
    const path=person?.avatar_url;
    if(path&&/^[a-f0-9-]{36}\/avatar\.(?:webp|jpg)$/.test(path)){
      const url=supabase.storage.from("noway-avatars").getPublicUrl(path).data.publicUrl;
      return '<img class="noway-chat-avatar" src="'+clean(url)+'" alt="" loading="lazy">';
    }
    return '<span class="noway-chat-avatar noway-chat-avatar-letter">'+clean((m.sender_name||"N").charAt(0).toUpperCase())+'</span>';
  };
  target.innerHTML=list.length?list.map(m=>{
    const own=m.sender_id===signedUser.id;
    const replied=refs.get(m.reply_to);
    const ev=eventsById.get(m.event_id);
    const eventHtml=m.event_id?
      '<button type="button" class="noway-chat-event-quote" data-chat-event-view="'+clean(m.event_id)+'">'+
        '<span>▣ EVENTO DA AGENDA'+(ev?' · '+clean(teamDate(ev.start_at))+' '+clean(teamTime(ev.start_at)):'')+'</span>'+
        '<strong>'+clean(ev?.title||"Evento compartilhado")+'</strong>'+
        (ev?.kind?'<small>'+clean(({reuniao:"REUNIÃO",partida:"PARTIDA",treino:"TREINO",evento:"EVENTO"})[ev.kind]||"EVENTO")+'</small>':'')+
      '</button>':"";
    const replyHtml=m.reply_to?
      '<button type="button" class="noway-chat-reply-quote" data-chat-reply-view="'+clean(m.reply_to)+'">'+
        '<b>↳ '+clean(replied?.sender_name||"Mensagem anterior")+'</b>'+
        '<span>'+clean((replied?.body||"Mensagem anterior ou removida").slice(0,150))+'</span></button>':"";
    const media=chatImages.get(m.image_path);
    const imageHtml=m.image_path&&media?.url?
      '<a href="'+clean(media.url)+'" class="noway-chat-image-link" target="_blank" rel="noopener noreferrer" aria-label="Abrir imagem enviada por '+clean(m.sender_name)+'">'+
        '<img src="'+clean(media.url)+'" alt="Imagem enviada por '+clean(m.sender_name)+'" loading="lazy"></a>':
      m.image_path?'<p class="noway-muted">Imagem indisponível no momento.</p>':"";
    return '<article class="noway-team-msg'+(own?' is-own':'')+'" id="team-message-'+clean(m.id)+'">'+
      avatarFor(m)+
      '<div class="noway-chat-message-content">'+
        '<div class="noway-team-msg-meta"><strong>'+clean(m.sender_name)+'</strong>'+
          nowayRoleBadge(teamDirectory.find(p=>p.id===m.sender_id)?.role||(m.sender_id===signedUser.id?profile?.role:null),m.sender_name)+
          '<time datetime="'+clean(m.created_at)+'">'+clean(teamTime(m.created_at))+'</time></div>'+
        replyHtml+eventHtml+
        (m.body?'<p>'+clean(m.body)+'</p>':"")+imageHtml+
        '<div class="noway-chat-message-actions"><button type="button" data-chat-reply="'+clean(m.id)+'">↩ RESPONDER</button>'+
        (profile?.role==="owner"?'<button type="button" data-noway-chat-delete="'+clean(m.id)+'">EXCLUIR ×</button>':"")+
        '</div></div></article>';
  }).join(""):'<div class="noway-chat-empty"><strong>COMECE A CONVERSA.</strong><p>O chat é exclusivo dos jogadores, gerência e Founder. Compartilhe uma mensagem, imagem ou evento.</p></div>';
  if(autoScroll||list.length===1)target.scrollTop=target.scrollHeight;
  target.querySelectorAll("[data-chat-reply]").forEach(button=>button.addEventListener("click",()=>{
    const msg=teamChatList.find(m=>m.id===button.dataset.chatReply);
    if(!msg)return;
    setTeamReference("reply",msg.id,msg.sender_name+" · "+(msg.body||"Imagem / evento").slice(0,110));
    $id("nowayTeamChatBody").focus();
  }));
  target.querySelectorAll("[data-chat-reply-view]").forEach(button=>button.addEventListener("click",()=>{
    const el=document.getElementById("team-message-"+button.dataset.chatReplyView);
    if(el){el.scrollIntoView({behavior:"smooth",block:"center"});el.classList.add("is-highlighted");setTimeout(()=>el.classList.remove("is-highlighted"),1800);}
  }));
  target.querySelectorAll("[data-chat-event-view]").forEach(button=>button.addEventListener("click",()=>{
    window.dispatchEvent(new CustomEvent("noway:go-to-event",{detail:{id:button.dataset.chatEventView}}));
  }));
  target.querySelectorAll("[data-noway-chat-delete]").forEach(button=>button.addEventListener("click",async()=>{
    if(profile?.role!=="owner"||!confirm("Excluir esta mensagem do chat interno?"))return;
    button.disabled=true;
    const {error}=await supabase.rpc("noway_delete_team_message",{p_message_id:button.dataset.nowayChatDelete});
    if(error){button.disabled=false;feedback("Erro ao moderar: "+error.message,true);return;}
    teamMessageSignature=null;await refreshTeamChat();feedback("Mensagem removida do canal.");
  }));
}

$id("nowayAnnouncementForm").addEventListener("submit",async event=>{
  event.preventDefault();
  if(!canManageTeam())return feedback("Apenas gestão e Founder podem publicar.",true);
  const form=event.currentTarget;
  setBusy(form,true);
  const {error}=await supabase.rpc("noway_publish_team_announcement",{
    p_title:$id("nowayAnnouncementTitle").value.trim(),
    p_body:$id("nowayAnnouncementBody").value.trim()
  });
  setBusy(form,false);
  if(error)return feedback("Falha ao publicar: "+error.message,true);
  form.reset();teamNewsSignature=null;await refreshTeamNews();
  feedback("Comunicado publicado para a equipe.");
});
$id("nowayTeamChatForm").addEventListener("submit",async event=>{
  event.preventDefault();
  if(!canReadTeam())return feedback("O canal é exclusivo da equipe NOWAY.",true);
  const form=event.currentTarget,input=$id("nowayTeamChatBody");
  const body=input.value.trim();
  if(!body&&!chatPhoto&&!chatReplyTo&&!chatEventId)return;
  setBusy(form,true);
  let path=null;
  try{
    if(chatPhoto){
      const upload=await prepareChatPhoto(chatPhoto);
      path=signedUser.id+"/"+crypto.randomUUID()+".webp";
      const result=await supabase.storage.from("noway-team-chat").upload(path,upload,{
        contentType:"image/webp",upsert:false,cacheControl:"3600"
      });
      if(result.error)throw result.error;
    }
    const {error}=await supabase.rpc("noway_send_team_message_v2",{
      p_body:body,p_reply_to:chatReplyTo,p_event_id:chatEventId,p_image_path:path
    });
    if(error)throw error;
    input.value="";
    clearTeamReference();
    clearChatPhoto();
    await refreshTeamChat();
    input.focus();
  }catch(error){
    if(path)await supabase.storage.from("noway-team-chat").remove([path]);
    feedback("Não foi possível enviar no chat: "+error.message,true);
  }finally{setBusy(form,false);}
});
$id("nowayTeamChatBody").addEventListener("keydown",event=>{
  if(event.key==="Enter"&&!event.shiftKey&&!event.isComposing){
    event.preventDefault();
    if(event.currentTarget.value.trim()||chatPhoto||chatEventId||chatReplyTo)
      $id("nowayTeamChatForm").requestSubmit();
  }
});
$id("nowayRefreshTeamChat").addEventListener("click",async()=>{
  await Promise.all([refreshTeamChat(),refreshTeamNews(),refreshTeamDirectory()]);
  feedback("Espaço da equipe atualizado.");
});

// Revalidamos o papel no banco a cada novo acesso aos dados: RLS/RPC impedem
// contas comuns ou rebaixadas de ler/escrever mensagens e comunicados privados.
setInterval(()=>{
  if(document.body.dataset.nowayConsole!=="true"||!canReadTeam()||document.hidden)return;
  refreshTeamChat();
  if(++teamPollCounter%3===0){refreshTeamNews();refreshTeamDirectory();}
},12000);
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden&&canReadTeam()){
    refreshTeamChat();refreshTeamNews();
  }
});


// NOWAY Chat v2 utilities and notifications
function hideTeamToast(){
  const toast=$id("nowayChatToast");if(toast)toast.hidden=true;
  if(chatToastTimer){clearTimeout(chatToastTimer);chatToastTimer=null;}
}
function updateTeamUnread(){
  const badge=$id("nowayChatUnread");
  if(badge){badge.hidden=teamUnread===0;badge.textContent=teamUnread>99?"99+":String(teamUnread);}
  const tab=document.querySelector('[data-console-tab="chat"]');
  if(tab)tab.classList.toggle("has-unread",teamUnread>0);
  document.title=teamUnread>0?"● ("+teamUnread+") "+originalNowayTitle:originalNowayTitle;
}
function resetTeamUnread(){
  teamUnread=0;updateTeamUnread();hideTeamToast();
  const el=$id("nowayTeamChatList");if(el)el.scrollTop=el.scrollHeight;
}
function primeChatSound(){
  if(!chatSoundOn||!canReadTeam())return;
  try{
    const AudioCtor=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtor)return;
    if(!chatAudioContext)chatAudioContext=new AudioCtor();
    if(chatAudioContext.state!=="running")chatAudioContext.resume().catch(()=>{});
  }catch(err){console.warn("NOWAY chat sound",err);}
}
function playChatChime(){
  if(!chatSoundOn||!chatAudioContext||chatAudioContext.state!=="running")return;
  try{
    const ctx=chatAudioContext;
    [[0,680],[.09,960]].forEach(([delay,hz])=>{
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type="sine";osc.frequency.setValueAtTime(hz,ctx.currentTime+delay);
      gain.gain.setValueAtTime(.0001,ctx.currentTime+delay);
      gain.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+delay+.018);
      gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+delay+.17);
      osc.connect(gain);gain.connect(ctx.destination);
      osc.start(ctx.currentTime+delay);osc.stop(ctx.currentTime+delay+.18);
    });
  }catch(err){console.warn("Aviso sonoro nao disponivel",err);}
}
function announceTeamMessages(messages){
  if(!messages.length||!canReadTeam())return;
  const msg=messages[messages.length-1];
  const active=document.querySelector("#nowayDashboard")?.dataset.consoleActive==="chat";
  const focused=!document.hidden&&document.hasFocus();
  if(!active||!focused)teamUnread=Math.min(99,teamUnread+messages.length);
  updateTeamUnread();
  const t=$id("nowayChatToast");
  if(t){
    $id("nowayChatToastTitle").textContent=messages.length===1?
      "MENSAGEM DE "+msg.sender_name.toLocaleUpperCase("pt-BR"):
      messages.length+" NOVAS MENSAGENS NA NOWAY";
    $id("nowayChatToastBody").textContent=msg.body?.slice(0,105)||
      (msg.image_path?"Imagem enviada":"Evento ou resposta compartilhada");
    const person=teamDirectory.find(p=>p.id===msg.sender_id);
    const avatar=$id("nowayChatToastAvatar");
    if(avatar)avatar.textContent=(person?.display_name||msg.sender_name||"NW").slice(0,2).toUpperCase();
    t.hidden=false;
    if(chatToastTimer)clearTimeout(chatToastTimer);
    chatToastTimer=setTimeout(hideTeamToast,9500);
  }
  playChatChime();
  if(document.hidden&&typeof Notification!=="undefined"&&Notification.permission==="granted"){
    try{new Notification("NOWAY · "+msg.sender_name,{body:msg.body?.slice(0,100)||"Nova mensagem da equipe",
      icon:"/assets/logo-white.webp",tag:"noway-team-chat"});}catch{}
  }
}
async function refreshTeamEvents(){
  if(!canReadTeam())return;
  const userId=signedUser.id;
  const cutoff=new Date(Date.now()-90*86400000).toISOString();
  const {data,error}=await supabase.from("noway_team_events")
    .select("id,title,kind,start_at,status").gte("start_at",cutoff)
    .order("start_at",{ascending:true}).limit(250);
  if(userId!==signedUser?.id||!canReadTeam())return;
  if(error){console.warn("NOWAY calendar links",error.message);return;}
  teamChatEvents=data||[];
}
function setTeamReference(type,id,label){
  if(!canReadTeam())return;
  chatReplyTo=type==="reply"?id:null;
  chatEventId=type==="event"?id:null;
  const ref=$id("nowayChatReference");if(!ref)return;
  ref.hidden=false;
  $id("nowayChatReferenceType").textContent=type==="event"?"▣ EVENTO COMPARTILHADO":"↳ RESPONDENDO";
  $id("nowayChatReferenceLabel").textContent=label;
  $id("nowayChatEventPicker").hidden=true;
}
function clearTeamReference(){
  chatReplyTo=null;chatEventId=null;
  const r=$id("nowayChatReference");if(r)r.hidden=true;
}
function clearChatPhoto(){
  chatPhoto=null;
  if(chatPhotoURL){URL.revokeObjectURL(chatPhotoURL);chatPhotoURL=null;}
  const holder=$id("nowayChatMediaPreview");if(holder)holder.hidden=true;
  const img=$id("nowayChatMediaThumb");if(img)img.removeAttribute("src");
  const chooser=$id("nowayChatImageInput");if(chooser)chooser.value="";
}
async function prepareChatPhoto(file){
  if(!file||!["image/webp","image/jpeg","image/png"].includes(file.type))
    throw new Error("Use uma imagem JPG, PNG ou WebP.");
  if(file.size>12*1024*1024)throw new Error("Imagem muito grande. O limite antes da compressão é 12 MB.");
  const tempUrl=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=tempUrl;await image.decode();
    const maxDim=1600,scale=Math.min(1,maxDim/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Não foi possível processar a imagem.");
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise((resolve,reject)=>
      canvas.toBlob(b=>b?resolve(b):reject(new Error("Não foi possível compactar a imagem.")),"image/webp",.78));
    if(blob.type!=="image/webp"||blob.size>5*1024*1024)
      throw new Error("Imagem incompatível ou acima de 5 MB.");
    return blob;
  }finally{URL.revokeObjectURL(tempUrl);}
}
function updateChatSoundButton(){
  const b=$id("nowayChatSound");if(!b)return;
  b.textContent=chatSoundOn?"♪ SOM: ATIVO":"♪ SOM: DESLIGADO";
  b.setAttribute("aria-pressed",String(chatSoundOn));
}
async function showTeamEventPicker(){
  if(!canReadTeam())return;
  const panel=$id("nowayChatEventPicker");
  panel.hidden=false;
  $id("nowayChatEventItems").innerHTML='<p class="noway-muted">Carregando a agenda...</p>';
  await refreshTeamEvents();
  const list=teamChatEvents.filter(e=>e.status!=="cancelado").slice(-70);
  $id("nowayChatEventItems").innerHTML=list.length?list.map(e=>
    '<button class="noway-chat-event-option" data-pick-chat-event="'+clean(e.id)+'" type="button">'+
      '<span>'+clean(teamDate(e.start_at))+' · '+clean(teamTime(e.start_at))+' · '+clean(e.kind.toUpperCase())+'</span>'+
      '<strong>'+clean(e.title)+'</strong></button>').join(""):
    '<p class="noway-muted">Nenhuma reunião, partida ou treino na agenda. A gestão pode adicionar um evento na aba Agenda.</p>';
  $id("nowayChatEventItems").querySelectorAll("[data-pick-chat-event]").forEach(b=>b.addEventListener("click",()=>{
    const ev=teamChatEvents.find(e=>e.id===b.dataset.pickChatEvent);
    if(!ev)return;
    setTeamReference("event",ev.id,ev.title+" · "+teamDate(ev.start_at));
    $id("nowayTeamChatBody").focus();
  }));
}
if(document.body.dataset.nowayConsole==="true"){
  try{chatSoundOn=localStorage.getItem("nowayTeamSound")!=="off";}catch{}
  updateChatSoundButton();
  // A primeira interação autoriza o AudioContext; autoplay sem interação é bloqueado pelo navegador.
  document.addEventListener("pointerdown",()=>primeChatSound(),{capture:true});
  document.addEventListener("keydown",()=>primeChatSound(),{capture:true});
  $id("nowayChatSound")?.addEventListener("click",()=>{
    chatSoundOn=!chatSoundOn;
    try{localStorage.setItem("nowayTeamSound",chatSoundOn?"on":"off");}catch{}
    updateChatSoundButton();
    if(chatSoundOn)primeChatSound();
  });
  const desktop=$id("nowayChatDesktop");
  if(desktop){
    if(typeof Notification==="undefined")desktop.hidden=true;
    else{
      desktop.textContent=Notification.permission==="granted"?"AVISOS: AUTORIZADOS":"AVISOS DESKTOP";
      desktop.addEventListener("click",async()=>{
        const result=await Notification.requestPermission();
        desktop.textContent=result==="granted"?"AVISOS: AUTORIZADOS":"AVISOS DESKTOP";
        feedback(result==="granted"?"Avisos de novas mensagens autorizados no navegador.":
          "O navegador não autorizou os avisos. As notificações no painel continuam ativas.",result!=="granted");
      });
    }
  }
  $id("nowayChatToastClose")?.addEventListener("click",hideTeamToast);
  $id("nowayChatToastOpen")?.addEventListener("click",()=>{
    document.querySelector('[data-console-tab="chat"]')?.click();
    resetTeamUnread();
  });
  $id("nowayChatReferenceClose")?.addEventListener("click",clearTeamReference);
  $id("nowayChatAttachButton")?.addEventListener("click",()=>$id("nowayChatImageInput").click());
  $id("nowayChatImageInput")?.addEventListener("change",event=>{
    const file=event.currentTarget.files?.[0];
    if(!file)return;
    if(!["image/webp","image/png","image/jpeg"].includes(file.type)||file.size>12*1024*1024){
      event.currentTarget.value="";return feedback("Use JPG, PNG ou WebP de até 12 MB.",true);
    }
    if(chatPhotoURL)URL.revokeObjectURL(chatPhotoURL);
    chatPhoto=file;chatPhotoURL=URL.createObjectURL(file);
    $id("nowayChatMediaThumb").src=chatPhotoURL;
    $id("nowayChatMediaName").textContent=file.name;
    $id("nowayChatMediaPreview").hidden=false;
  });
  $id("nowayChatMediaClear")?.addEventListener("click",clearChatPhoto);
  $id("nowayChatEventButton")?.addEventListener("click",showTeamEventPicker);
  $id("nowayChatEventPickerClose")?.addEventListener("click",()=>$id("nowayChatEventPicker").hidden=true);
  window.addEventListener("noway:chat-open",resetTeamUnread);
  window.addEventListener("noway:attach-event",async event=>{
    if(!canReadTeam())return;
    await refreshTeamEvents();
    const ev=teamChatEvents.find(e=>e.id===event.detail?.id);
    if(!ev)return feedback("Esse evento não está disponível no chat.",true);
    setTeamReference("event",ev.id,ev.title+" · "+teamDate(ev.start_at));
    $id("nowayTeamChatBody").focus();
  });
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden&&document.querySelector("#nowayDashboard")?.dataset.consoleActive==="chat")
      resetTeamUnread();
  });
}
