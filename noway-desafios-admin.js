import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://vdipsufzlqmnprbjiojb.supabase.co","sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id),safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const date=v=>v?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(v))+" BRT":"—";
const labels={pending:"PENDENTE",approved:"APROVADA",suspended:"SUSPENSA",counter:"NEGOCIAÇÃO",confirmed:"CONFIRMADO",declined:"RECUSADO",cancelled:"CANCELADO"};
let teams=[],requests=[],filterTeams="pending",filterRequests="pending",run=0,busy=false;
function notice(s,error=false){const e=$("nwDeskNotice");e.hidden=!s;e.textContent=s||"";e.classList.toggle("error",error)}
async function load(){
 if($("nowayConsoleDesafios").hidden||busy)return;
 const sequence=++run;
 const a=await db.auth.getUser(),uid=a.data?.user?.id;
 if(sequence!==run||!uid)return notice("É necessário entrar no NOWAY ID.",true);
 const p=await db.from("noway_profiles").select("role").eq("id",uid).maybeSingle();
 if(sequence!==run)return;
 if(p.error||!["owner","manager"].includes(p.data?.role))return notice("Área exclusiva do Founder e Team Manager.",true);
 const [t,r]=await Promise.all([
  db.from("noway_guest_teams").select("id,name,tag,region,platform,discord,description,status,created_at").order("created_at",{ascending:false}).limit(250),
  db.from("noway_scrim_requests").select("id,team_id,kind,best_of,requested_at,counter_at,duration_minutes,notes,staff_note,status").order("created_at",{ascending:false}).limit(250)
 ]);
 if(sequence!==run)return;
 if(t.error||r.error)return notice("Não foi possível consultar os desafios: "+(t.error||r.error).message,true);
 teams=t.data||[];requests=r.data||[];render();
}
function render(){
 const totals=[["CADASTROS PENDENTES",teams.filter(x=>x.status==="pending").length],
 ["EQUIPES APROVADAS",teams.filter(x=>x.status==="approved").length],
 ["NOVOS DESAFIOS",requests.filter(x=>x.status==="pending").length],
 ["CONFIRMADOS",requests.filter(x=>x.status==="confirmed").length]];
 $("nwDeskStats").innerHTML=totals.map(([s,v])=>'<div><small>'+safe(s)+'</small><strong>'+v+'</strong></div>').join("");
 $("nwDeskTeams").innerHTML=teams.filter(x=>filterTeams==="all"||x.status===filterTeams).map(t=>{
 const actions=t.status==="pending"?
 '<button class="primary" data-team-action="approve" data-team-id="'+safe(t.id)+'">APROVAR ↗</button><button data-team-action="suspend" data-team-id="'+safe(t.id)+'">RECUSAR</button>':
 t.status==="approved"?'<button data-team-action="suspend" data-team-id="'+safe(t.id)+'">SUSPENDER</button>':
 '<button class="primary" data-team-action="approve" data-team-id="'+safe(t.id)+'">REATIVAR ↗</button>';
 return '<article class="nw-desk-card"><div class="nw-desk-card-top"><strong>'+safe(t.name)+' ['+safe(t.tag)+']</strong><span class="nw-desk-state '+safe(t.status)+'">'+safe(labels[t.status])+'</span></div>'+
 '<div class="nw-desk-small">'+safe(t.region)+' · '+safe(t.platform.toUpperCase())+'</div>'+
 (t.discord?'<p>DISCORD: '+safe(t.discord)+'</p>':"")+(t.description?'<p>'+safe(t.description)+'</p>':"")+
 '<div class="nw-desk-buttons">'+actions+'</div></article>';
 }).join("")||'<div class="nw-desk-empty">Nenhum cadastro neste filtro.</div>';
 const byId=new Map(teams.map(t=>[t.id,t]));
 $("nwDeskRequests").innerHTML=requests.filter(x=>filterRequests==="all"||x.status===filterRequests).map(r=>{
 const actions=r.status==="pending"?
 '<label class="nw-desk-response">MENSAGEM À EQUIPE (MOTIVO OU ORIENTAÇÃO)<textarea data-req-note="'+safe(r.id)+'" rows="2" maxlength="600" placeholder="Escreva uma resposta para acompanhar a decisão."></textarea></label>'+
 '<div class="nw-desk-buttons"><button class="primary" data-req-action="confirm" data-req-id="'+safe(r.id)+'">CONFIRMAR NA AGENDA ↗</button>'+
 '<button data-counter-open="'+safe(r.id)+'">NOVO HORÁRIO</button><button data-req-action="decline" data-req-id="'+safe(r.id)+'">RECUSAR</button></div>'+
 '<form class="nw-desk-counter" data-counter-form="'+safe(r.id)+'" hidden><label>CONTRAPROPOSTA / DATA E HORA<input name="time" type="datetime-local" required></label>'+
 '<label>MENSAGEM À ORGANIZAÇÃO<textarea name="note" rows="2" maxlength="600"></textarea></label><button type="submit">ENVIAR CONTRAPROPOSTA ↗</button></form>':"";
 return '<article class="nw-desk-card"><div class="nw-desk-card-top"><strong>'+safe(byId.get(r.team_id)?.name||"TIME INDISPONÍVEL")+'</strong><span class="nw-desk-state '+safe(r.status)+'">'+safe(labels[r.status])+'</span></div>'+
 '<div class="nw-desk-small">'+(r.kind==="scrim"?"SCRIM":"DISPUTA")+' · BO'+safe(r.best_of)+' · '+safe(r.duration_minutes)+' MIN</div>'+
 '<div class="nw-desk-when">'+safe(date(r.requested_at))+'</div>'+
 (r.notes?'<p>'+safe(r.notes)+'</p>':"")+
 (r.counter_at?'<p>CONTRAPROPOSTA: '+safe(date(r.counter_at))+'</p>':"")+
 (r.staff_note?'<p>GESTÃO: '+safe(r.staff_note)+'</p>':"")+actions+'</article>';
 }).join("")||'<div class="nw-desk-empty">Nenhum desafio neste filtro.</div>';
 attach();
}
async function act(button,kind,id,action,time=null,note=""){
 if(busy)return;
 if(kind==="request"&&action!=="counter"){
  note=String($("nwDeskRequests").querySelector('[data-req-note="'+id+'"]')?.value||"").trim();
  if(action==="decline"&&!note)return notice("Informe o motivo da recusa para a outra organização.",true);
 }
 if(action!=="counter"&&!confirm(action==="confirm"?"Confirmar confronto e adicioná-lo à Agenda NOWAY?":"Confirmar esta ação?"))return;
 busy=true;button.disabled=true;
 const rpc=kind==="team"?"noway_guest_team_decide":"noway_guest_staff_decide";
 const args=kind==="team"?{p_id:id,p_action:action}:{p_id:id,p_action:action,p_counter_at:time,p_note:note};
 const r=await db.rpc(rpc,args);
 busy=false;button.disabled=false;
 if(r.error)return notice("Não foi possível concluir: "+r.error.message,true);
 notice(kind==="team"?"Cadastro atualizado.":action==="confirm"?"Confronto confirmado e lançado na Agenda.":action==="counter"?"Novo horário enviado. Aguardando resposta adversária.":"Solicitação recusada.");
 await load();
}
function attach(){
 $("nwDeskTeams").querySelectorAll("[data-team-action]").forEach(b=>b.addEventListener("click",()=>act(b,"team",b.dataset.teamId,b.dataset.teamAction)));
 $("nwDeskRequests").querySelectorAll("[data-req-action]").forEach(b=>b.addEventListener("click",()=>act(b,"request",b.dataset.reqId,b.dataset.reqAction)));
 $("nwDeskRequests").querySelectorAll("[data-counter-open]").forEach(b=>b.addEventListener("click",()=>{
 const form=$("nwDeskRequests").querySelector('[data-counter-form="'+b.dataset.counterOpen+'"]');
 if(form)form.hidden=!form.hidden;
 }));
 $("nwDeskRequests").querySelectorAll("[data-counter-form]").forEach(form=>form.addEventListener("submit",e=>{
  e.preventDefault();const d=new FormData(form),v=String(d.get("time")||"");
  if(!v||!Number.isFinite(new Date(v).getTime()))return notice("Informe data válida.",true);
  act(form.querySelector("button"),"request",form.dataset.counterForm,"counter",new Date(v).toISOString(),String(d.get("note")||"").trim());
 }));
}
document.querySelectorAll("[data-nw-scope]").forEach(group=>group.querySelectorAll("[data-nw-filter]").forEach(b=>b.addEventListener("click",()=>{
 group.querySelectorAll("[data-nw-filter]").forEach(x=>x.classList.toggle("is-active",x===b));
 if(group.dataset.nwScope==="teams")filterTeams=b.dataset.nwFilter;else filterRequests=b.dataset.nwFilter;render();
})));
$("nwDeskRefresh").addEventListener("click",load);
window.addEventListener("noway:desafios-open",load);
setInterval(()=>{if(!$("nowayConsoleDesafios").hidden&&!document.hidden)load()},60000);
