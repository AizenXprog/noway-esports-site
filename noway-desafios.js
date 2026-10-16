import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://vdipsufzlqmnprbjiojb.supabase.co","sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let user=null,team=null,requests=[],inProgress=false,refreshCounter=0;
const statusText={pending:"EM ANÁLISE",approved:"APROVADA",suspended:"SUSPENSA",counter:"CONTRAPROPOSTA",confirmed:"CONFIRMADO",declined:"RECUSADO",cancelled:"CANCELADO"};
const notice=(text,error=false)=>{const el=$("nwChallengeNotice");el.hidden=!text;el.textContent=text||"";el.classList.toggle("is-error",error);if(text)el.scrollIntoView({behavior:"smooth",block:"nearest"});};
const displayDate=s=>s?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(s))+" (Brasília)":"—";
const dateValid=s=>Boolean(s)&&Number.isFinite(Date.parse(s));
function setBusy(form,busy){inProgress=busy;form.querySelectorAll("button,input,select,textarea").forEach(el=>el.disabled=busy);}
async function refresh(){const seq=++refreshCounter;const auth=await db.auth.getUser();if(seq!==refreshCounter)return;
 user=auth.error?null:auth.data?.user||null;
 $("nwChallengeLoading").hidden=true;$("nwChallengeAuth").hidden=Boolean(user);$("nwChallengeSigned").hidden=!user;
 if(!user){team=null;requests=[];return}
 $("nwChallengeAccount").textContent=user.user_metadata?.full_name||user.email?.split("@")[0]||"NOWAY ID";
 const a=await db.from("noway_guest_teams").select("id,name,tag,region,platform,discord,description,status,created_at").eq("captain_id",user.id).maybeSingle();
 if(seq!==refreshCounter)return;
 if(a.error){notice("Não foi possível consultar sua organização: "+a.error.message,true);return}
 team=a.data||null;
 $("nwNoTeam").hidden=Boolean(team);$("nwTeamWorkspace").hidden=!team;
 if(!team)return;
 $("nwTeamName").textContent=team.name;$("nwTeamTag").textContent=team.tag;
 $("nwTeamInfo").textContent=[team.region,{pc:"PC / UBISOFT",console:"CONSOLE",crossplay:"CROSSPLAY"}[team.platform],team.discord].filter(Boolean).join(" · ");
 $("nwTeamContactForm").elements.namedItem("discord").value=team.discord||"";
 $("nwTeamContactForm").elements.namedItem("description").value=team.description||"";
 const st=$("nwTeamStatus");st.textContent=statusText[team.status]||team.status;st.className="nw-status "+team.status;
 $("nwAwaitApproval").hidden=team.status!=="pending";$("nwSuspended").hidden=team.status!=="suspended";
 $("nwRequestFormPanel").hidden=team.status!=="approved";
 const b=await db.from("noway_scrim_requests").select("id,kind,best_of,requested_at,duration_minutes,notes,status,counter_at,staff_note,created_at").eq("team_id",team.id).order("created_at",{ascending:false}).limit(80);
 if(seq!==refreshCounter)return;
 if(b.error){notice("Não foi possível carregar solicitações: "+b.error.message,true);return}
 requests=b.data||[];renderRequests();
}
function renderRequests(){
 const root=$("nwChallengeRequestList");
 root.innerHTML=requests.length?requests.map(r=>{
 const counter=r.status==="counter"&&r.counter_at?
 '<div class="nw-request-counter"><strong>NOVO HORÁRIO PROPOSTO PELA NOWAY</strong><div>'+esc(displayDate(r.counter_at))+'</div>'+
 (r.staff_note?'<div>'+esc(r.staff_note)+'</div>':"")+'</div>':"";
 const buttons=r.status==="counter"?
 '<button type="button" data-nw-reply="accept_counter" data-nw-id="'+esc(r.id)+'">ACEITAR NOVO HORÁRIO ↗</button>'+
 '<button type="button" data-nw-reply="cancel" data-nw-id="'+esc(r.id)+'">RETIRAR PROPOSTA</button>':
 r.status==="pending"?'<button type="button" data-nw-reply="cancel" data-nw-id="'+esc(r.id)+'">CANCELAR PEDIDO</button>':"";
 return '<article class="nw-request"><div class="nw-request-header"><b>'+(r.kind==="scrim"?"SCRIM / TREINO":"DISPUTA / CONFRONTO")+
 '</b><span class="nw-request-status '+esc(r.status)+'">'+esc(statusText[r.status]||r.status)+'</span></div>'+
 '<strong class="nw-request-time">'+esc(displayDate(r.status==="confirmed"&&r.counter_at?r.counter_at:r.requested_at))+'</strong>'+
 '<div class="nw-request-meta">MELHOR DE '+esc(r.best_of)+' · '+esc(r.duration_minutes)+' MIN</div>'+
 (r.notes?'<p class="nw-request-note">'+esc(r.notes)+'</p>':"")+
 (r.staff_note&&r.status!=="counter"?'<p class="nw-request-note"><b>NOWAY:</b> '+esc(r.staff_note)+'</p>':"")+
 counter+(buttons?'<div class="nw-request-actions">'+buttons+'</div>':"")+'</article>';
 }).join(""):'<div class="nw-loading">NENHUM DESAFIO ENVIADO AINDA.</div>';
 root.querySelectorAll("[data-nw-reply]").forEach(button=>button.addEventListener("click",async()=>{
  if(inProgress)return;
  const action=button.dataset.nwReply;
  if(action==="cancel"&&!confirm("Deseja retirar esta solicitação?"))return;
  inProgress=true;button.disabled=true;
  const {error}=await db.rpc("noway_guest_request_reply",{p_id:button.dataset.nwId,p_action:action});
  inProgress=false;button.disabled=false;
  if(error)return notice(error.message,true);
  notice(action==="accept_counter"?"Contraproposta aceita. O confronto está confirmado e foi adicionado à Agenda da NOWAY.":"Solicitação cancelada.");
  await refresh();
 }));
}
$("nwChallengeGoogle").addEventListener("click",async()=>{
 const {error}=await db.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+"/desafios.html"}});
 if(error)notice("Não foi possível acessar: "+error.message,true);
});
$("nwChallengeEmailForm").addEventListener("submit",async event=>{
 event.preventDefault();const form=event.currentTarget;setBusy(form,true);
 const {error}=await db.auth.signInWithOtp({email:$("nwChallengeEmail").value.trim(),options:{emailRedirectTo:location.origin+"/desafios.html"}});
 setBusy(form,false);
 notice(error?"Erro ao enviar o link: "+error.message:"Link de acesso enviado. Consulte seu e-mail e retorne à Central de Desafios.",Boolean(error));
});
$("nwChallengeSignOut").addEventListener("click",async()=>{const {error}=await db.auth.signOut();if(error)return notice(error.message,true);notice("");await refresh()});
$("nwTeamRegisterForm").addEventListener("submit",async event=>{
 event.preventDefault();const form=event.currentTarget,fd=new FormData(form);
 setBusy(form,true);const {error}=await db.rpc("noway_guest_register",{
  p_name:String(fd.get("name")||"").trim(),p_tag:String(fd.get("tag")||"").trim(),
  p_region:fd.get("region"),p_platform:fd.get("platform"),
  p_discord:String(fd.get("discord")||"").trim(),p_description:String(fd.get("description")||"").trim()
 });
 setBusy(form,false);
 if(error)return notice("Não foi possível cadastrar: "+error.message,true);
 notice("Cadastro recebido. Sua organização será analisada pela NOWAY.");await refresh();
});
$("nwTeamContactForm").addEventListener("submit",async event=>{
 event.preventDefault();const form=event.currentTarget,fd=new FormData(form);setBusy(form,true);
 const {error}=await db.rpc("noway_guest_update_contact",{
  p_discord:String(fd.get("discord")||"").trim(),p_description:String(fd.get("description")||"").trim()
 });
 setBusy(form,false);
 if(error)return notice("Falha ao salvar contato: "+error.message,true);
 notice("Contato da organização atualizado.");await refresh();
});
$("nwScrimRequestForm").addEventListener("submit",async event=>{
 event.preventDefault();const form=event.currentTarget,fd=new FormData(form);
 const localTime=String(fd.get("requested_at")||"");
 if(!dateValid(localTime))return notice("Informe uma data e horário válidos.",true);
 setBusy(form,true);
 const {error}=await db.rpc("noway_guest_request",{
  p_kind:fd.get("kind"),p_best_of:Number(fd.get("best_of")),
  p_requested_at:new Date(localTime).toISOString(),p_duration_minutes:Number(fd.get("duration")),
  p_notes:String(fd.get("notes")||"").trim()
 });
 setBusy(form,false);
 if(error)return notice("Não foi possível enviar o desafio: "+error.message,true);
 form.reset();notice("Proposta enviada para análise da gestão NOWAY. A partida ainda não está confirmada.");await refresh();
});
$("nwChallengeRefresh").addEventListener("click",refresh);
db.auth.onAuthStateChange(()=>{queueMicrotask(()=>refresh().catch(e=>notice("Falha de conexão: "+e.message,true)))});
refresh().catch(e=>notice("Falha de conexão: "+e.message,true));
