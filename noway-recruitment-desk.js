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
const crown='<svg viewBox="0 0 28 28" aria-hidden="true" fill="none"><path d="M3.8 10.1 8.8 13.5 14 5.8l5.2 7.7 5-3.4-2.1 11.7H5.9L3.8 10.1Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6.1 18.5h15.8M7 24h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="m12 15 2-2.5 2 2.5-2 2.5Z" fill="currentColor"/></svg>';
const shield='<svg viewBox="0 0 28 28" aria-hidden="true" fill="none"><path d="M14 2.8 23 6.1v7.2c0 5.7-3.6 9.1-9 11.8-5.4-2.7-9-6.1-9-11.8V6.1L14 2.8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 16.9V10l4.5 5.2 4.5-5.2v6.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';
const badge=(role,name)=>{
 if(role==="gri")return '<span class="noway-desk-badge is-gri" title="Gestor de Recrutamento e Indicação" aria-label="Gestor de Recrutamento e Indicação">GRI</span>';
 if(!["owner","manager"].includes(role))return "";
 const who=role==="owner"?"Niel - founder":(name||"Team Manager")+" - Team Manager";
 const symbol=role==="owner"?crown:shield;
 return '<span class="noway-desk-badge" title="'+escape(who)+'" aria-label="'+escape(who)+'">'+symbol+'</span>';
};
let authUser=null,manager=false,accountRole="membro",applications=[],selected=null,messages=[],appVersion=0,threadVersion=0,busy=false;
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
 accountRole=r.data?.role||"membro";
 manager=!r.error&&["owner","manager","gri"].includes(accountRole);
 return manager;
}
async function loadApplications(force=false){
 if(!showing()||busy)return;
 busy=true;$("nowayDeskRefresh").disabled=true;
 const version=++appVersion;
 try{
  if(!await verifyManagement()){
   $("nowayDeskList").innerHTML='<p class="noway-muted">Acesso exclusivo do Founder, Team Manager e GRI.</p>';
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
   if(active()){renderActive();if(force){await readMessages();await loadReviews(selected);}}
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
 $("nowayDeskActions").hidden=Boolean(a.closed_at)||(accountRole==="gri"&&["aprovada","recusada","arquivada","encerrada"].includes(a.status));
 $("nowayDeskCloseDetails").hidden=Boolean(a.closed_at)||accountRole==="gri";
 $("nowayDeskStatus").querySelectorAll("option").forEach(opt=>opt.disabled=accountRole==="gri"&&!["em_analise","teste"].includes(opt.value));
 renderList();
}
async function openApplication(id){
 if(!manager||!applications.some(a=>a.id===id))return;
 selected=id;messages=[];
 renderActive();
 $("nowayDeskMessages").innerHTML='<p class="noway-muted">Carregando mensagens...</p>';
 await readMessages(true);
 await loadReviews(id);
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
 if(accountRole==="gri"&&!["em_analise","teste"].includes($("nowayDeskStatus").value))return note("GRI pode encaminhar apenas para análise ou testes.",true);
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
 const a=active();if(!manager||!a||a.closed_at||accountRole==="gri")return;
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

const recommendationLabels={em_analise:"EM ANÁLISE",indicar_teste:"INDICAR TESTES",recomendar:"RECOMENDAR APROVAÇÃO",nao_recomendar:"NÃO RECOMENDAR"};
async function loadReviews(id){
 if(!manager||!id||!showing())return;
 const panel=$("nowayDeskReviews");
 const {data,error}=await db.from("noway_recruitment_reviews")
 .select("id,reviewer_id,recommendation,note,created_at").eq("application_id",id)
 .order("created_at",{ascending:false}).limit(60);
 if(id!==selected)return;
 if(error){panel.textContent="Não foi possível carregar os pareceres: "+error.message;return;}
 panel.innerHTML=(data||[]).length?(data||[]).map(r=>
  '<article class="noway-desk-review"><span>'+escape(recommendationLabels[r.recommendation]||r.recommendation)+
  ' · '+escape(formatDate(r.created_at))+'</span><p>'+escape(r.note)+'</p></article>'
 ).join(""):'<p class="noway-muted">Ainda não há pareceres sobre este candidato.</p>';
}
async function saveReview(event){
 event.preventDefault();
 const a=active();if(!manager||!a)return;
 const noteText=$("nowayDeskReviewNote").value.trim();
 if(noteText.length<10)return note("O parecer deve ter no mínimo dez caracteres.",true);
 const button=$("nowayDeskReviewSave");button.disabled=true;
 try{
  const {error}=await db.rpc("noway_recruitment_add_review",{
   p_application_id:a.id,p_recommendation:$("nowayDeskRecommendation").value,p_note:noteText
  });
  if(error)throw error;
  $("nowayDeskReviewForm").reset();
  await loadReviews(a.id);
  note("Parecer interno registrado. O candidato não pode visualizar esta anotação.");
 }catch(e){note("Erro ao registrar parecer: "+e.message,true);}
 finally{button.disabled=false;}
}
$("nowayDeskReviewForm").addEventListener("submit",saveReview);
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
