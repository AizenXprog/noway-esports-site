import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Recrutamento com RLS e RPC: nenhuma chave administrativa é enviada ao navegador.
const db=createClient("https://vdipsufzlqmnprbjiojb.supabase.co",
  "sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const roles={jogador:"JOGADOR",coach:"COACH",manager:"GERÊNCIA",
 discord_staff:"STAFF DISCORD",analista:"ANALISTA",designer:"DESIGN / MÍDIA",criador:"CRIADOR",outro:"OUTRA FUNÇÃO"};
const statuses={recebida:"RECEBIDA",em_analise:"EM ANÁLISE",teste:"CONVOCADO PARA TESTES",
 aprovada:"APROVADA",recusada:"NÃO SELECIONADA",arquivada:"ARQUIVADA",encerrada:"ENCERRADA"};
const date=ts=>{try{return new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(ts));}catch{return "—";}};
const notify=(message,error=false)=>{const el=$("nowayRecruitNotice");el.hidden=false;el.textContent=message;el.classList.toggle("is-error",error);if(error)el.scrollIntoView({behavior:"smooth",block:"nearest"});};
const setBusy=(el,state)=>el.querySelectorAll("button").forEach(b=>b.disabled=state);
let user=null,profile=null,apps=[],messages=[],activeId=null,loadRun=0,threadRun=0,staff=false;
let timestamps=new Map(),initialLoad=false,lastMessageIds=new Set(),loadingApps=false;
const crown='<svg viewBox="0 0 28 28" aria-hidden="true" fill="none"><path d="M3.8 10.1 8.8 13.5 14 5.8l5.2 7.7 5-3.4-2.1 11.7H5.9L3.8 10.1Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6.1 18.5h15.8M7 24h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="m12 15 2-2.5 2 2.5-2 2.5Z" fill="currentColor"/></svg>';
const shield='<svg viewBox="0 0 28 28" aria-hidden="true" fill="none"><path d="M14 2.8 23 6.1v7.2c0 5.7-3.6 9.1-9 11.8-5.4-2.7-9-6.1-9-11.8V6.1L14 2.8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 16.9V10l4.5 5.2 4.5-5.2v6.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';
const badge=(role,name)=>{
 if(role==="gri")return '<span class="noway-role-message-badge is-gri" title="Gestor de Recrutamento e Indicação" aria-label="Gestor de Recrutamento e Indicação">GRI</span>';
 if(!["owner","manager"].includes(role))return "";
 const founder=role==="owner";
 const label=(founder?"Niel":String(name||"Team Manager").trim().split(/\s+/)[0])+
   (founder?" - founder":" - Team Manager");
 return '<span class="noway-role-message-badge '+(founder?"is-founder":"is-manager")+
 '" title="'+safe(label)+'" aria-label="'+safe(label)+'" tabindex="0" data-tooltip="'+safe(label)+'">'+(founder?crown:shield)+'</span>';
};
const isManager=()=>staff&&Boolean(user);
function populateExperience(){
 const role=$("nowayRecruitRole").value;
 const show=["jogador","coach","analista"].includes(role);
 $("nowayRecruitR6Fields").hidden=!show;
 if(!show){$("nowayRecruitUbi").value="";$("nowayRecruitTracker").value="";}
}
async function loadAuth(){
 const token=++loadRun;
 const {data,error}=await db.auth.getUser();
 if(token!==loadRun)return;
 if(error&&error.name!=="AuthSessionMissingError")notify("Não foi possível conferir sua conta: "+error.message,true);
 user=data?.user||null;
 profile=null;staff=false;apps=[];messages=[];activeId=null;timestamps.clear();initialLoad=false;
 $("nowayRecruitAuth").hidden=Boolean(user);
 $("nowayRecruitSigned").hidden=!user;
 $("nowayRecruitThread").hidden=true;
 if(!user)return;
 const {data:own,error:perr}=await db.from("noway_profiles").select("id,display_name,role").eq("id",user.id).maybeSingle();
 if(token!==loadRun)return;
 if(perr)notify("Não foi possível buscar seu perfil NOWAY: "+perr.message,true);
 profile=own||{display_name:user.user_metadata?.full_name||"Candidato",role:"membro"};
 staff=["manager","owner","gri"].includes(profile.role);
 $("nowayRecruitAccountName").textContent=profile.display_name||user.email||"CANDIDATO";
 $("nowayRecruitName").value=profile.display_name==="Membro"?"":profile.display_name||"";
 $("nowayRecruitInboxHeading").innerHTML=staff?"CANDIDATURAS <em>RECEBIDAS.</em>":"SUAS <em>INSCRIÇÕES.</em>";
 $("nowayRecruitInboxKicker").textContent=staff?"GESTÃO / SELEÇÃO DA NOWAY":"ACOMPANHAMENTO / SUAS CONVERSAS";
 $("nowayRecruitInboxHelp").textContent=staff?"Selecione uma inscrição para avaliar, responder ao candidato e atualizar a etapa.":
    "Todas as respostas ficam nesta conversa privada, mesmo após encerrar a avaliação.";
 $("nowayRecruitManagerFilters").hidden=!staff;
 await loadApps(true);
}
async function loadApps(manual=false){
 if(!user||loadingApps)return;
 const uid=user.id,version=loadRun;loadingApps=true;
 if(manual)$("nowayRecruitRefresh").disabled=true;
 try{
   const {data,error}=await db.from("noway_recruitment_applications")
    .select("id,applicant_id,desired_role,display_name,discord_contact,alternative_contact,ubisoft_handle,tracker_url,experience,availability,motivation,status,created_at,updated_at,closed_at,closure_reason,closed_by")
    .order("updated_at",{ascending:false}).limit(300);
   if(version!==loadRun||uid!==user?.id)return;
   if(error)throw error;
   const next=data||[];
   if(initialLoad&&next.some(a=>timestamps.has(a.id)&&timestamps.get(a.id)!==a.updated_at&&a.applicant_id===uid))
     notify("Uma das suas candidaturas foi atualizada. Abra a conversa para conferir.");
   apps=next;initialLoad=true;
   timestamps=new Map(apps.map(a=>[a.id,a.updated_at]));
   renderApps();
   if(activeId&&apps.some(a=>a.id===activeId))renderApplicationDetails();
   if(activeId&&!apps.some(a=>a.id===activeId))closeThread();
 }catch(err){notify("Erro ao carregar inscrições: "+err.message,true);}
 finally{loadingApps=false;$("nowayRecruitRefresh").disabled=false;}
}
function renderApps(){
 const filtered=staff&&$("nowayRecruitFilter").value!=="all"?
    apps.filter(a=>a.status===$("nowayRecruitFilter").value):apps;
 const list=$("nowayRecruitList");
 list.innerHTML=filtered.length?filtered.map(a=>
  '<button type="button" class="nw-rec-entry '+(activeId===a.id?"is-selected":"")+
  '" data-rec-open="'+safe(a.id)+'"><span><small>'+safe(roles[a.desired_role]||"CANDIDATO")+
  ' / '+safe(date(a.created_at))+'</small><strong>'+safe(a.display_name)+'</strong>'+
  '<em>'+safe(a.discord_contact||a.alternative_contact||"")+'</em></span>'+
  '<span class="nw-rec-state is-'+safe(a.status)+'">'+safe(statuses[a.status]||a.status)+'</span></button>'
 ).join(""):'<div class="nw-rec-empty"><strong>'+ (staff?"SEM CANDIDATURAS NESTA ETAPA.":"NENHUMA CANDIDATURA AINDA.")+
 '</strong><p>'+(staff?"Quando chegarem candidaturas, você poderá avaliá-las aqui.":
 "Escolha uma função e envie o formulário para iniciar a conversa com a gestão.")+'</p></div>';
 list.querySelectorAll("[data-rec-open]").forEach(btn=>btn.addEventListener("click",()=>openThread(btn.dataset.recOpen)));
}
const activeApp=()=>apps.find(a=>a.id===activeId);
const safeExternal=(url)=>{
 try{const u=new URL(url);return u.protocol==="https:"&&
  ["tracker.gg","www.tracker.gg","r6.tracker.network","www.r6.tracker.network"].includes(u.hostname) ? u.href:null}
 catch{return null}
};
function renderApplicationDetails(){
 const a=activeApp();if(!a)return;
 $("nowayRecruitThreadTitle").textContent=(roles[a.desired_role]||"INSCRIÇÃO")+" / "+a.display_name;
 $("nowayRecruitThreadSub").textContent="Enviada em "+date(a.created_at)+" · "+(statuses[a.status]||a.status);
 const items=[["CANDIDATO",a.display_name],["FUNÇÃO",roles[a.desired_role]||a.desired_role],
    ["DISCORD",a.discord_contact||"Não informado"],["CONTATO ALTERNATIVO",a.alternative_contact||"—"],
    ["UBISOFT CONNECT",a.ubisoft_handle||"—"],["DISPONIBILIDADE",a.availability||"Não informada"],
    ["EXPERIÊNCIA",a.experience||"Não informada"],["APRESENTAÇÃO",a.motivation]];
 const link=safeExternal(a.tracker_url);
 $("nowayRecruitDetails").innerHTML=items.map(([label,value])=>
  '<div><small>'+safe(label)+'</small><strong>'+safe(value)+'</strong></div>').join("")+
  (link?'<div><small>R6 TRACKER · REFERÊNCIA MANUAL</small><a href="'+safe(link)+
    '" target="_blank" rel="noopener noreferrer">ABRIR PERFIL DO TRACKER ↗</a></div>':"");
 $("nowayRecruitManagerTools").hidden=!staff||Boolean(a.closed_at);
 $("nowayRecruitClosure").hidden=!a.closed_at;
 if(a.closed_at)$("nowayRecruitClosure").innerHTML='<strong>CONVERSA ENCERRADA / SOMENTE LEITURA</strong><p>Motivo: '+safe(a.closure_reason||"Não informado")+'</p>';
 $("nowayRecruitReplyForm").hidden=Boolean(a.closed_at);
 $("nowayRecruitClosePanel").hidden=Boolean(a.closed_at)||profile?.role==="gri";
 $("nowayRecruitStatus").value=a.closed_at?"recebida":a.status;
 $("nowayRecruitStatus").querySelectorAll("option").forEach(option=>option.disabled=profile?.role==="gri"&&!["em_analise","teste"].includes(option.value));
 renderApps();
}
async function openThread(id){
 if(!user||!apps.some(a=>a.id===id))return;
 activeId=id;
 messages=[];lastMessageIds.clear();
 $("nowayRecruitThread").hidden=false;
 $("nowayRecruitMessages").innerHTML='<p class="nw-rec-hint">Carregando conversa...</p>';
 renderApplicationDetails();
 $("nowayRecruitThread").scrollIntoView({behavior:"smooth",block:"start"});
 await refreshThread(true);
}
async function refreshThread(force=false){
 if(!user||!activeId)return;
 const id=activeId,version=++threadRun;
 const list=$("nowayRecruitMessages");
 const bottom=list.scrollHeight-list.scrollTop-list.clientHeight<100;
 const {data,error}=await db.rpc("noway_recruitment_get_messages",{p_application_id:id});
 if(id!==activeId||version!==threadRun)return;
 if(error)return notify("Falha ao abrir conversa: "+error.message,true);
 const incoming=data||[];
 const unseen=incoming.filter(m=>!lastMessageIds.has(m.id)&&m.sender_id!==user.id);
 if(messages.length&&unseen.length)notify("Nova mensagem na conversa sobre recrutamento.");
 messages=incoming;
 lastMessageIds=new Set(messages.map(m=>m.id));
 list.innerHTML=messages.length?messages.map(m=>{
  const own=m.sender_id===user.id;
  const avatarPath=m.sender_avatar_path;
  const isValidPhoto=typeof avatarPath==="string"&&/^[a-f0-9-]{36}\/avatar\.(?:webp|jpg)$/.test(avatarPath);
  const avatarURL=isValidPhoto?db.storage.from("noway-avatars").getPublicUrl(avatarPath).data.publicUrl:null;
  const avatar=avatarURL?'<img src="'+safe(avatarURL)+'" alt="" loading="lazy">':
    '<span>'+safe((m.sender_name||"N").trim().slice(0,1).toUpperCase())+'</span>';
  return '<article class="nw-rec-message'+(own?" is-own":"")+'">'+
  '<div class="nw-rec-message-avatar">'+avatar+'</div>'+
  '<div class="nw-rec-message-content"><div class="nw-rec-message-author"><strong>'+safe(own?"VOCÊ":m.sender_name)+'</strong>'+
  badge(m.sender_role,m.sender_name)+'<time>'+safe(date(m.created_at))+'</time></div>'+
  '<p>'+safe(m.body)+'</p></div></article>';
 }).join(""):'<p class="nw-rec-hint">Comece sua conversa com a NOWAY.</p>';
 if(bottom||force)list.scrollTop=list.scrollHeight;
}
function closeThread(){activeId=null;messages=[];lastMessageIds.clear();threadRun++;$("nowayRecruitThread").hidden=true;renderApps();}
async function sendApplication(ev){
 ev.preventDefault();if(!user)return notify("Entre com sua conta antes de se candidatar.",true);
 const discord=$("nowayRecruitDiscord").value.trim(),alternative=$("nowayRecruitAlt").value.trim();
 if(discord.length<3&&alternative.length<5)return notify("Informe seu Discord ou outra forma de contato para receber retorno.",true);
 if(!$("nowayRecruitAgree").checked)return notify("É necessário concordar com o uso das informações para avaliação.",true);
 const form=$("nowayRecruitForm");setBusy(form,true);
 try{
 const args={
 p_role:$("nowayRecruitRole").value,p_name:$("nowayRecruitName").value.trim(),
 p_discord:discord,p_alternative:alternative,p_ubisoft:$("nowayRecruitUbi").value.trim(),
 p_tracker:$("nowayRecruitTracker").value.trim(),p_experience:$("nowayRecruitExperience").value.trim(),
 p_availability:$("nowayRecruitAvailability").value.trim(),
 p_motivation:$("nowayRecruitMotivation").value.trim()
 };
 const {data,error}=await db.rpc("noway_apply_recruitment",args);
 if(error)throw error;
 notify("Inscrição recebida! Sua conversa privada foi aberta e ficará disponível nesta área.");
 const name=args.p_name;
 form.reset();$("nowayRecruitName").value=name;populateExperience();
 await loadApps(true);
 if(data)await openThread(data);
 }catch(e){notify("Não foi possível enviar a inscrição: "+e.message,true);}
 finally{setBusy(form,false);}
}
async function reply(ev){
 ev.preventDefault();if(!user||!activeId)return;
 if(activeApp()?.closed_at)return notify("Esta conversa já foi encerrada.",true);
 const form=$("nowayRecruitReplyForm"),text=$("nowayRecruitReplyBody").value.trim();
 if(!text)return;setBusy(form,true);
 const {error}=await db.rpc("noway_recruitment_reply",{p_application_id:activeId,p_body:text});
 setBusy(form,false);
 if(error)return notify("Erro ao enviar resposta: "+error.message,true);
 $("nowayRecruitReplyBody").value="";
 await refreshThread(true);await loadApps();
}
async function updateStatus(){
 if(!isManager()||!activeId||activeApp()?.closed_at)return;
 if(profile?.role==="gri"&&!["em_analise","teste"].includes($("nowayRecruitStatus").value))return notify("GRI só pode encaminhar para análise ou testes.",true);
 const b=$("nowayRecruitSaveStatus");b.disabled=true;
 const {error}=await db.rpc("noway_recruitment_set_status",{
  p_application_id:activeId,p_status:$("nowayRecruitStatus").value
 });
 b.disabled=false;
 if(error)return notify("Não foi possível atualizar o status: "+error.message,true);
 notify("Etapa da candidatura atualizada.");
 await loadApps(true);
}
async function closeRecruitmentThread(event){
 event.preventDefault();
 const app=activeApp();
 if(!user||!app||app.closed_at||profile?.role==="gri")return;
 const reason=$("nowayRecruitCloseReason").value.trim();
 if(reason.length<10||reason.length>1000)return notify("Escreva um motivo entre 10 e 1000 caracteres.",true);
 if(!confirm("Encerrar definitivamente esta conversa? O motivo será enviado e ninguém poderá responder depois."))return;
 const button=$("nowayRecruitCloseSubmit");button.disabled=true;
 try{
  const {error}=await db.rpc("noway_recruitment_close",{p_application_id:app.id,p_reason:reason});
  if(error)throw error;
  $("nowayRecruitCloseForm").reset();
  $("nowayRecruitClosePanel").open=false;
  notify("Conversa encerrada. O motivo foi registrado e o canal ficou somente para leitura.");
  await loadApps(true);
  await refreshThread(true);
 }catch(err){notify("Não foi possível encerrar: "+err.message,true);}
 finally{button.disabled=false;}
}
$("nowayRecruitCloseForm").addEventListener("submit",closeRecruitmentThread);

document.querySelectorAll("[data-role]").forEach(el=>el.addEventListener("click",()=>{
 $("nowayRecruitRole").value=el.dataset.role;populateExperience();
 document.getElementById("inscricao")?.scrollIntoView({behavior:"smooth"});
}));
$("nowayRecruitRole").addEventListener("change",populateExperience);
populateExperience();
$("nowayRecruitGoogle").addEventListener("click",async()=>{
 const btn=$("nowayRecruitGoogle");btn.disabled=true;
 const {error}=await db.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+location.pathname}});
 if(error){btn.disabled=false;notify("Falha no Google: "+error.message+". Você pode entrar por e-mail.",true);}
});
$("nowayRecruitEmailForm").addEventListener("submit",async ev=>{
 ev.preventDefault();const f=ev.currentTarget;setBusy(f,true);
 const {error}=await db.auth.signInWithOtp({email:$("nowayRecruitEmail").value.trim().toLowerCase(),
  options:{shouldCreateUser:true,emailRedirectTo:location.origin+location.pathname}});
 setBusy(f,false);
 notify(error?"Não foi possível enviar o acesso: "+error.message:"Confira seu e-mail e spam. O link de acesso foi enviado.",Boolean(error));
});
$("nowayRecruitLogout").addEventListener("click",async()=>{
 const {error}=await db.auth.signOut();
 if(error)notify("Erro ao sair: "+error.message,true);
 else await loadAuth();
});
$("nowayRecruitForm").addEventListener("submit",sendApplication);
$("nowayRecruitRefresh").addEventListener("click",async()=>{await loadApps(true);if(activeId)await refreshThread();});
$("nowayRecruitFilter").addEventListener("change",renderApps);
$("nowayRecruitThreadClose").addEventListener("click",closeThread);
$("nowayRecruitReplyForm").addEventListener("submit",reply);
$("nowayRecruitReplyBody").addEventListener("keydown",ev=>{
 if(ev.key==="Enter"&&!ev.shiftKey&&!ev.isComposing){ev.preventDefault();if(ev.currentTarget.value.trim())$("nowayRecruitReplyForm").requestSubmit();}
});
$("nowayRecruitSaveStatus").addEventListener("click",updateStatus);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&user){loadApps();if(activeId)refreshThread();}});
setInterval(()=>{if(!document.hidden&&user){loadApps();if(activeId)refreshThread();}},25000);
db.auth.onAuthStateChange((event)=>{if(["SIGNED_IN","SIGNED_OUT","USER_UPDATED"].includes(event))setTimeout(()=>loadAuth(),0);});
loadAuth().catch(e=>notify("Erro ao iniciar o Recrutamento: "+e.message,true));
