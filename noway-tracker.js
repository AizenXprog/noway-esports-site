import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://vdipsufzlqmnprbjiojb.supabase.co","sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e");
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fixed=(n,decimals=2)=>Number.isFinite(n)?new Intl.NumberFormat("pt-BR",{minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(n):"—";
const pct=(a,b)=>b>0?fixed(100*a/b,1)+"%":"—";
const date=t=>{try{return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric",timeZone:"America/Sao_Paulo"}).format(new Date(t));}catch{return "—";}};
const status=(m,isError=false)=>{const el=$("trackerStatus");el.hidden=false;el.textContent=m;el.classList.toggle("error",isError);};
const count=(r,key)=>Number(r[key]||0);
let all=[],players=[];
function render(){
 const id=$("trackerPlayer").value,rows=all.filter(x=>x.player_id===id);
 const n=$("trackerPeriod").value;
 const scoped=n==="all"?rows:rows.slice(0,Number(n));
 if(!scoped.length){$("trackerContent").hidden=true;status("Ainda não existem confrontos finalizados com estatísticas registradas para este jogador.");return;}
 $("trackerStatus").hidden=true;$("trackerContent").hidden=false;
 $("trackerPlayerName").textContent=scoped[0].display_name||"Jogador NOWAY";
 $("trackerMatchCount").textContent=scoped.length+" CONFRONTO"+(scoped.length===1?"":"S")+" VERIFICADO"+(scoped.length===1?"":"S");
 const sums={};for(const key of ["kills","deaths","assists","rounds_played","rounds_survived","kost_rounds","entry_kills","entry_deaths"]){
  sums[key]=scoped.reduce((a,x)=>a+count(x,key),0);
 }
 const rounds=sums.rounds_played;
 const stats=[
 ["K/D",sums.deaths?fixed(sums.kills/sums.deaths):"—","Abates por morte · "+sums.kills+" K / "+sums.deaths+" D"],
 ["KPR",rounds?fixed(sums.kills/rounds):"—","Eliminações por round"],
 ["KOST",pct(sums.kost_rounds,rounds),"Rounds em que contribuiu"],
 ["SOBREVIVÊNCIA",pct(sums.rounds_survived,rounds),"Rounds terminados vivo"],
 ["ENTRY",sums.entry_kills+" / "+sums.entry_deaths,"First kills / first deaths"],
 ["ROUNDS",String(rounds),"Rounds registrados"]
 ];
 $("trackerMetrics").innerHTML=stats.map((x,i)=>
  '<article class="tracker-metric"><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong><p>'+esc(x[2])+'</p></article>').join("");
 const bars=[
 ["KOST",rounds?100*sums.kost_rounds/rounds:0,pct(sums.kost_rounds,rounds)],
 ["SOBREVIVÊNCIA",rounds?100*sums.rounds_survived/rounds:0,pct(sums.rounds_survived,rounds)],
 ["ROUNDS COM ENTRY KILL",rounds?100*sums.entry_kills/rounds:0,pct(sums.entry_kills,rounds)]
 ];
 $("trackerBars").innerHTML=bars.map(([name,v,label])=>
  '<div class="tracker-bar"><div><span>'+esc(name)+'</span><b>'+esc(label)+'</b></div>'+
  '<div class="tracker-bar-track"><span style="width:'+Math.max(0,Math.min(100,v)).toFixed(1)+'%"></span></div></div>').join("");
 $("trackerHistory").innerHTML=scoped.map(r=>{
  const kd=count(r,"deaths")?fixed(count(r,"kills")/count(r,"deaths")):"—";
  const score=r.our_score!=null&&r.opponent_score!=null?" · "+r.our_score+"–"+r.opponent_score:"";
  const result=({vitoria:"VITÓRIA",derrota:"DERROTA",empate:"EMPATE"})[r.result]||"FINALIZADO";
  return '<tr><td><strong>'+esc(r.opponent)+'</strong><small>'+esc(date(r.played_at))+' · '+esc(r.competition||"Confronto")+'</small></td>'+
   '<td><span class="tracker-result is-'+esc(r.result)+'">'+esc(result+score)+'</span></td>'+
   '<td>'+count(r,"kills")+'</td><td>'+count(r,"deaths")+'</td><td>'+count(r,"assists")+'</td><td>'+count(r,"rounds_played")+'</td>'+
   '<td>'+esc(kd)+'</td><td>'+esc(pct(count(r,"kost_rounds"),count(r,"rounds_played")))+'</td></tr>';
 }).join("");
}
async function load(){
 const button=$("trackerRefresh");button.disabled=true;status("Sincronizando os confrontos confirmados...");
 try{
  const {data,error}=await db.rpc("noway_public_tracker_v1");
  if(error)throw error;
  all=(data||[]).filter(x=>x?.player_id&&Number(x.rounds_played)>=0);
  all.sort((a,b)=>new Date(b.played_at)-new Date(a.played_at));
  const names=new Map();all.forEach(x=>{if(!names.has(x.player_id))names.set(x.player_id,x.display_name||"Jogador NOWAY");});
  players=[...names].sort((a,b)=>a[1].localeCompare(b[1],"pt-BR"));
  const select=$("trackerPlayer"),was=select.value;
  const requested=new URLSearchParams(location.search).get("jogador");
  select.innerHTML=players.map(([id,name])=>'<option value="'+esc(id)+'">'+esc(name)+'</option>').join("");
  select.disabled=!players.length;$("trackerPeriod").disabled=!players.length;
  const choose=players.some(p=>p[0]===was)?was:players.some(p=>p[0]===requested)?requested:players[0]?.[0];
  if(choose)select.value=choose;
  if(!players.length){$("trackerContent").hidden=true;status("O NOWAY Tracker já está conectado. As estatísticas aparecerão aqui assim que forem registradas e confirmadas as primeiras partidas. Nenhum número será estimado.");}
  else render();
 }catch(e){
  $("trackerContent").hidden=true;status("Não foi possível consultar as estatísticas agora. Tente atualizar. "+(e?.message||""),true);
 }finally{button.disabled=false;}
}
$("trackerPlayer").addEventListener("change",render);
$("trackerPeriod").addEventListener("change",render);
$("trackerRefresh").addEventListener("click",load);
load();
