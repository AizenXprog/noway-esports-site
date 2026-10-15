import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://vdipsufzlqmnprbjiojb.supabase.co",
 "sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e",
 {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const stages={recebida:"RECEBIDA",em_analise:"EM ANÁLISE",teste:"EM TESTES",aprovada:"APROVADA",recusada:"NÃO SELECIONADA",arquivada:"ARQUIVADA",encerrada:"ENCERRADA"};
const positions={jogador:"JOGADOR",coach:"COACH",manager:"GERÊNCIA",discord_staff:"STAFF DISCORD",analista:"ANALISTA",designer:"DESIGN / MÍDIA",criador:"CRIADOR",outro:"OUTRA FUNÇÃO"};
const formatDate=ts=>{try{return new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(ts));}catch{return "—";}};
const photo=path=>/^[a-f0-9-]{36}\/avatar\.(webp|jpg)$/.test(path||"")?
 db.storage.from("noway-avatars").getPublicUrl(path).data.publicUrl:null;
const avatar=(path,name)=>{const img=photo(path);return img?
 '<img src="'+escape(img)+'" alt="" loading="lazy">':
 '<span>'+escape((name||"N").slice(0,1).toUpperCase())+'</span>';};
const badge=(role,name)=>{
 if(!["owner","manager"].includes(role))return "";
 const who=role==="owner"?"Niel - founder":(name||"Team Manager")+" - Team Manager";
 const symbol=role==="owner"?"♛":"⬡";
 return '<span class="noway-desk-badge" title="'+escape(who)+'" aria-label="'+escape(who)+'">'+symbol+'</span>';
};
let authUser=null,manager=false,applications=[],selected=null,messages=[],appVersion=0,threadVersion=0,busy=false;
const active=()=>applications.find(a=>a.id===selected);
const showing=()=>!document.hidden&&$("nowayConsoleRecruitment")&&!$("nowayConsoleRecruitment").hidden;
function note(msg,bad=false){
 const notice=$("nowaySystemNotice");if(!notice)return;
 notice.hidden=false;notice.textContent=msg;notice.classList.toggle("is-error",bad);
}
async function verifyManagement(){
 const {data,error}=await db.auth.getUser();
 authUser=error?null:data?.user||null;manager=false;
 if(!authUser)return false;
 const r=await db.from("noway_profiles").select("role").eq("id",authUser.id).maybeSingle();
 manager=!r.error&&["owner","manager"].includes(r.data?.role);
 return manager;
}
async function loadApplications(force=false){
 if(!showing()||busy)return;
 busy=true;$("nowayDeskRefresh").disabled=true;
 const version=++appVersion;
 try{
  if(!await verifyManagement()){
   $("nowayDeskList").innerHTML='<p class="noway-muted">Somente Founder e Team Manager podem acessar candidaturas.</p>';
   $("nowayDeskActive").hidden=true;$("nowayDeskEmpty").hidden=false;return;
  }
  const {data,error}=await db.from("noway_recruitment_applications")
   .select("id,applicant_id,desired_role,display_name,discord_contact,alternative_contact,ubisoft_handle,tracker_url,experience,availability,motivation,status,created_at,updated_at,closed_at,closure_reason")
   .order("updated_at",{ascending:false}).limit(300);
  if(error)throw error;
  if(version!==appVersion)return;
  applications=data||[];
  renderList();
  if(selected){
   if(active()){renderActive();if(force)await readMessages();}
   else hideActive();
  }
 }catch(err){note("Não foi possível carregar candidaturas: "+err.message,true);}
 finally{busy=false;$("nowayDeskRefresh").disabled=false;}
}
function renderList(){
 const filter=$("nowayDeskFilter").value;
 const entries=applications.filter(a=>filter==="all"||a.status===filter);
 $("nowayDeskList").innerHTML=entries.length?entries.map(a=>
 '<button type="button" class="noway-desk-entry'+(a.id===selected?' is-selected':'')+
 '" data-id="'+escape(a.id)+'"><span class="noway-desk-entry-top">'+escape(positions[a.desired_role]||"CANDIDATURA")+
 '<small>'+escape(formatDate(a.updated_at))+'</small></span><strong>'+escape(a.display_name)+
 '</strong><span class="noway-desk-entry-state">'+escape(stages[a.status]||a.status)+'</span></button>'
 ).join(""):'<p class="noway-muted noway-desk-emptylist">Nenhuma candidatura nesta etapa.</p>';
 $("nowayDeskList").querySelectorAll("[data-id]").forEach(b=>
  b.addEventListener("click",()=>openApplication(b.dataset.id)));
}
function hideActive(){
 selected=null;messages=[];threadVersion++;
 $("nowayDeskActive").hidden=true;$("nowayDeskEmpty").hidden=false;renderList();
}
function renderActive(){
 const a=active();if(!a)return;
 $("nowayDeskActive").hidden=false;$("nowayDeskEmpty").hidden=true;
 $("nowayDeskTitle").textContent=a.display_name+" / "+(positions[a.desired_role]||"CANDIDATURA");
 $("nowayDeskSubtitle").textContent="Recebida em "+formatDate(a.created_at)+" · "+(stages[a.status]||a.status);
 $("nowayDeskStatus").value=a.closed_at?"recebida":a.status;
 const fields=[["DISCORD",a.discord_contact],["CONTATO ALTERNATIVO",a.alternative_contact],
 ["UBISOFT CONNECT",a.ubisoft_handle],["R6 TRACKER",a.tracker_url],
 ["EXPERIÊNCIA",a.experience],["DISPONIBILIDADE",a.availability],["APRESENTAÇÃO",a.motivation]];
 $("nowayDeskCandidateData").innerHTML=fields.map(([label,val])=>
 '<div><small>'+escape(label)+'</small><p>'+escape(val||"Não informado")+'</p></div>').join("");
 $("nowayDeskClosed").hidden=!a.closed_at;
 $("nowayDeskClosed").innerHTML=a.closed_at?
 '<strong>CONVERSA ENCERRADA / SOMENTE LEITURA</strong><p>Motivo: '+escape(a.closure_reason||"Não informado")+'</p>':"";
 $("nowayDeskReplyForm").hidden=Boolean(a.closed_at);
 $("nowayDeskActions").hidden=Boolean(a.closed_at);
 $("nowayDeskCloseDetails").hidden=Boolean(a.closed_at);
 renderList();
}
async function openApplication(id){
 if(!manager||!applications.some(a=>a.id===id))return;
 selected=id;messages=[];
 renderActive();
 $("nowayDeskMessages").innerHTML='<p class="noway-muted">Carregando mensagens...</p>';
 await readMessages(true);
}
async function readMessages(force=false){
 if(!manager||!selected||!showing())return;
 const id=selected,version=++threadVersion;
 const box=$("nowayDeskMessages");
 const wasNearEnd=box.scrollHeight-box.scrollTop-box.clientHeight<100;
 const {data,error}=await db.rpc("noway_recruitment_get_messages",{p_application_id:id});
 if(id!==selected||version!==threadVersion)return;
 if(error){note("Erro ao buscar a conversa: "+error.message,true);return;}
 messages=data||[];
 box.innerHTML=messages.length?messages.map(m=>{
   const own=m.sender_id===authUser?.id;
   return '<article class="noway-desk-message'+(own?' is-own':'')+'">'+
   '<div class="noway-desk-avatar">'+avatar(m.sender_avatar_path,m.sender_name)+'</div>'+
   '<div class="noway-desk-message-content"><div class="noway-desk-message-top"><strong>'+
   escape(own?'VOCÊ':m.sender_name)+
   '</strong>'+badge(m.sender_role,m.sender_name)+
   '<time>'+escape(formatDate(m.created_at))+'</time></div><p>'+escape(m.body)+'</p></div></article>';
 }).join(""):'<p class="noway-muted">Sem mensagens nesta conversa.</p>';
 if(force||wasNearEnd)box.scrollTop=box.scrollHeight;
}
async function sendReply(event){
 event.preventDefault();
 const a=active();if(!manager||!a||a.closed_at)return;
 const input=$("nowayDeskReply"),text=input.value.trim();
 if(!text)return;
 const btn=$("nowayDeskSend");btn.disabled=true;
 try{
  const {error}=await db.rpc("noway_recruitment_reply",{p_application_id:a.id,p_body:text});
  if(error)throw error;
  input.value="";
  await readMessages(true);await loadApplications();
 }catch(err){note("Falha ao enviar resposta: "+err.message,true);}
 finally{btn.disabled=false;}
}
async function saveStatus(){
 const a=active();if(!manager||!a||a.closed_at)return;
 const btn=$("nowayDeskSaveStatus");btn.disabled=true;
 try{
  const {error}=await db.rpc("noway_recruitment_set_status",
   {p_application_id:a.id,p_status:$("nowayDeskStatus").value});
  if(error)throw error;
  note("Etapa da candidatura atualizada.");await loadApplications(true);
 }catch(err){note("Falha ao salvar etapa: "+err.message,true);}
 finally{btn.disabled=false;}
}
async function closeApplication(event){
 event.preventDefault();
 const a=active();if(!manager||!a||a.closed_at)return;
 const reason=$("nowayDeskCloseReason").value.trim();
 if(reason.length<10||reason.length>1000)return note("Informe um motivo de 10 a 1000 caracteres.",true);
 if(!confirm("Encerrar esta conversa definitivamente? O candidato receberá o motivo e não poderá mais responder."))return;
 const btn=$("nowayDeskCloseConfirm");btn.disabled=true;
 try{
  const {error}=await db.rpc("noway_recruitment_close",{p_application_id:a.id,p_reason:reason});
  if(error)throw error;
  $("nowayDeskCloseForm").reset();$("nowayDeskCloseDetails").open=false;
  note("Conversa encerrada com motivo registrado.");
  await loadApplications(true);await readMessages(true);
 }catch(err){note("Falha ao encerrar conversa: "+err.message,true);}
 finally{btn.disabled=false;}
}
$("nowayDeskRefresh").addEventListener("click",()=>loadApplications(true));
$("nowayDeskFilter").addEventListener("change",renderList);
$("nowayDeskCloseView").addEventListener("click",hideActive);
$("nowayDeskReplyForm").addEventListener("submit",sendReply);
$("nowayDeskReply").addEventListener("keydown",e=>{
 if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(e.currentTarget.value.trim())$("nowayDeskReplyForm").requestSubmit();}
});
$("nowayDeskSaveStatus").addEventListener("click",saveStatus);
$("nowayDeskCloseForm").addEventListener("submit",closeApplication);
window.addEventListener("noway:recruitment-open",()=>loadApplications(true));
document.addEventListener("visibilitychange",()=>{if(showing())loadApplications(true);});
setInterval(async()=>{
 if(!showing()||!manager)return;
 await loadApplications();
 if(selected)await readMessages();
},25000);
if(location.hash==="#recruitment")setTimeout(()=>loadApplications(true),1200);
