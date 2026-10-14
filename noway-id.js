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
  if(!signedUser)return;
  $id("nowayAccountName").textContent=profile.display_name||"MEMBRO NOWAY";
  $id("nowayAccountRole").textContent=labels[profile.role]||"MEMBRO";
  const owner=profile.role==="owner";
  $id("nowayInboxTitle").textContent=owner?"CAIXA DE ENTRADA.":"SUAS CONVERSAS.";
  $id("nowayInboxDescription").textContent=owner?
    "Mensagens enviadas à NOWAY. Selecione uma para responder.":"Acompanhe as suas solicitações e as respostas da organização.";
  $id("nowayOwnerMembers").hidden=!owner;
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
