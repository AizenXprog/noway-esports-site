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
      .select("id,display_name,role").eq("id",signedUser.id).maybeSingle();
    if(run!==running)return;
    if(response.error)feedback("Erro ao carregar seu perfil: "+response.error.message,true);
    profile=response.data||{display_name:signedUser.user_metadata?.full_name||"Membro",role:"membro"};
  }
  $id("nowayLoginSurface").hidden=Boolean(signedUser);
  $id("nowayDashboard").hidden=!signedUser;
  $id("nowayHeaderLogin").textContent=signedUser?"MINHA CONTA ↗":"ENTRAR ↗";
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
  const res=await supabase.from("noway_contact_messages")
    .select("id,contact_id,sender_id,body,created_at")
    .eq("contact_id",id).order("created_at",{ascending:true});
  if(activeId!==id)return;
  if(res.error){feedback("Não foi possível abrir a conversa: "+res.error.message,true);return}
  const list=res.data||[];
  $id("nowayThreadMessages").innerHTML=list.length?list.map(m=>'<article class="noway-chat-message'+(m.sender_id===signedUser?.id?' is-own':'')+'">'+
    '<span class="noway-chat-author">'+clean(m.sender_id===signedUser?.id?"VOCÊ":(profile?.role==="owner"?contactName(ticket):"NOWAY ESPORTS"))+' · '+clean(displayDate(m.created_at))+'</span>'+
    '<p>'+clean(m.body)+'</p></article>').join(""):'<p class="noway-muted">Sem mensagens.</p>';
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


// NOWAY Team Hub v1 — espaços de Jogador, Gerência e Owner.
// O servidor valida todos os papéis em RPC e RLS. Esconder painéis não dá permissão.
const teamRoles=new Set(["jogador","manager","owner"]);
let teamChannel=null,teamPollCounter=0;
let teamDirectory=[],teamMessageSignature=null,teamNewsSignature=null;

function stopTeamFeed(){
  if(teamChannel){supabase.removeChannel(teamChannel);teamChannel=null;}
  teamDirectory=[];
  teamMessageSignature=null;
  teamNewsSignature=null;
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
  await Promise.all([refreshTeamDirectory(),refreshTeamNews(),refreshTeamChat()]);
  if(run!==running || !signedUser || signedUser.id!==currentUser)return;

  // Supabase Realtime atualiza ao chegar nova mensagem; o polling recupera
  // eventos perdidos ao suspender a aba ou perder a conexão.
  try{
    teamChannel=supabase.channel("noway-private-team-chat")
      .on("postgres_changes",{
        event:"INSERT",schema:"public",table:"noway_team_messages"
      },()=>{if(canReadTeam())refreshTeamChat();})
      .subscribe();
  }catch(err){console.warn("NOWAY: chat usará atualização periódica",err);}
}

async function refreshTeamDirectory(){
  if(!canReadTeam())return;
  const currentUser=signedUser.id;
  const result=await supabase.rpc("noway_team_directory");
  if(!signedUser||signedUser.id!==currentUser||!canReadTeam())return;
  if(result.error){
    $id("nowayTeamDirectoryList").innerHTML='<p class="noway-muted">Não foi possível carregar a equipe.</p>';
    console.warn("NOWAY directory",result.error.message);
    return;
  }
  teamDirectory=result.data||[];
  $id("nowayTeamDirectoryList").innerHTML=teamDirectory.length?teamDirectory.map(person=>
    '<div class="noway-team-person">'+
      '<span class="noway-team-avatar" aria-hidden="true">'+clean((person.display_name||"N").trim().charAt(0).toUpperCase())+'</span>'+
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
  const currentUser=signedUser.id;
  const {data,error}=await supabase.from("noway_team_messages")
    .select("id,sender_id,sender_name,body,created_at")
    .order("created_at",{ascending:false}).limit(80);
  if(!signedUser||signedUser.id!==currentUser||!canReadTeam())return;
  const target=$id("nowayTeamChatList");
  if(error){
    target.innerHTML='<p class="noway-muted">O chat não pôde ser carregado. Tente atualizar.</p>';
    console.warn("NOWAY team chat",error.message);
    return;
  }
  const list=(data||[]).reverse();
  const signature=list.map(msg=>msg.id).join(",");
  if(signature===teamMessageSignature)return;
  const autoScroll=target.scrollHeight-target.scrollTop-target.clientHeight<110;
  teamMessageSignature=signature;
  target.innerHTML=list.length?list.map(msg=>
    '<article class="noway-team-msg'+(msg.sender_id===signedUser.id?' is-own':'')+'">'+
      '<div class="noway-team-msg-meta"><strong>'+clean(msg.sender_name)+'</strong><time datetime="'+clean(msg.created_at)+'">'+clean(teamTime(msg.created_at))+'</time></div>'+
      '<p>'+clean(msg.body)+'</p>'+
    '</article>'
  ).join(""):'<p class="noway-muted">O canal está pronto. Envie a primeira mensagem para a equipe NOWAY.</p>';
  if(autoScroll||list.length===1)target.scrollTop=target.scrollHeight;
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
  const form=event.currentTarget;
  const input=$id("nowayTeamChatBody");
  const body=input.value.trim();
  if(!body)return;
  setBusy(form,true);
  const {error}=await supabase.rpc("noway_send_team_message",{p_body:body});
  setBusy(form,false);
  if(error)return feedback("Não foi possível enviar no chat: "+error.message,true);
  input.value="";
  teamMessageSignature=null;
  await refreshTeamChat();
  input.focus();
});
$id("nowayTeamChatBody").addEventListener("keydown",event=>{
  if(event.key==="Enter"&&!event.shiftKey&&!event.isComposing){
    event.preventDefault();
    if(event.currentTarget.value.trim())$id("nowayTeamChatForm").requestSubmit();
  }
});
$id("nowayRefreshTeamChat").addEventListener("click",async()=>{
  await Promise.all([refreshTeamChat(),refreshTeamNews(),refreshTeamDirectory()]);
  feedback("Espaço da equipe atualizado.");
});

// Revalidamos o papel no banco a cada novo acesso aos dados: RLS/RPC impedem
// contas comuns ou rebaixadas de ler/escrever mensagens e comunicados privados.
setInterval(()=>{
  if(!canReadTeam()||document.hidden)return;
  refreshTeamChat();
  if(++teamPollCounter%3===0){refreshTeamNews();refreshTeamDirectory();}
},12000);
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden&&canReadTeam()){
    refreshTeamChat();refreshTeamNews();
  }
});
