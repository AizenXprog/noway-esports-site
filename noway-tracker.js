import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://vdipsufzlqmnprbjiojb.supabase.co",
"sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e",
{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const numeric=n=>Number.isFinite(Number(n))?Number(n):0;
const decimal=n=>Number.isFinite(n)?n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}):"—";
const percent=n=>Number.isFinite(n)?(n*100).toLocaleString("pt-BR",{maximumFractionDigits:1})+"%":"—";
const date=dt=>{try{return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric",timeZone:"America/Sao_Paulo"}).format(new Date(dt))}catch{return "—"}};
const empty=(title,body)=>'<div class="nt-empty"><strong>'+esc(title)+'</strong>'+esc(body)+'</div>';
const uniqueEvents=list=>new Set(list.map(x=>x.event_id)).size;
let rows=[],filtered=[],selectedPlayer="",activeRequest=0,isLoading=false;
function summary(list){
 const totals={kills:0,deaths:0,assists:0,rounds_played:0,rounds_survived:0,kost_rounds:0,entry_kills:0,entry_deaths:0};
 for(const r of list)for(const k of Object.keys(totals))totals[k]+=numeric(r[k]);
 const games=uniqueEvents(list);
 return {...totals,games,kd:totals.deaths?totals.kills/totals.deaths:(totals.kills?Infinity:NaN),
 kpr:totals.rounds_played?totals.kills/totals.rounds_played:NaN,
 kost:totals.rounds_played?totals.kost_rounds/totals.rounds_played:NaN,
 survive:totals.rounds_played?totals.rounds_survived/totals.rounds_played:NaN,
 entry:totals.entry_kills-totals.entry_deaths};
}
function kdString(total){
 if(total.kd===Infinity)return total.kills+" / 0";
 return decimal(total.kd);
}
function uniqueValues(field){
 return [...new Set(rows.map(r=>String(field==="year"?new Date(r.played_at).getUTCFullYear():r[field]||"")))]
 .filter(Boolean).sort((a,b)=>b.localeCompare(a,"pt-BR"));
}
function refreshFilterOptions(){
 const players=new Map();
 for(const row of rows)players.set(row.player_id,row.display_name);
 const opts=[...players.entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),"pt-BR"));
 const selection=$("ntPlayer");
 const previous=selection.value||selectedPlayer;
 selection.innerHTML='<option value="all">TIME INTEIRO</option>'+
 opts.map(([id,name])=>'<option value="'+esc(id)+'">'+esc(name||"Jogador")+'</option>').join("");
 selectedPlayer=opts.some(p=>p[0]===previous)?previous:(previous==="all"?"all":opts[0]?.[0]||"all");
 selection.value=selectedPlayer;
 const years=uniqueValues("year");
 $("ntSeason").innerHTML='<option value="all">TODAS</option>'+
 years.map(y=>'<option value="'+esc(y)+'">'+esc(y)+'</option>').join("");
 const comps=uniqueValues("competition");
 $("ntCompetition").innerHTML='<option value="all">TODAS</option>'+
 comps.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("");
}
function redraw(){
 const person=$("ntPlayer").value,year=$("ntSeason").value,competition=$("ntCompetition").value;
 filtered=rows.filter(r=>(person==="all"||person===r.player_id)&&
  (year==="all"||String(new Date(r.played_at).getUTCFullYear())===year)&&
  (competition==="all"||r.competition===competition));
 const t=summary(filtered);
 const aggregate=!filtered.length?null:t;
 const blocks=[
 ["PARTIDAS",aggregate?t.games:"—","CONFRONTOS COM DADOS"],
 ["ELIMINAÇÕES",aggregate?t.kills:"—","KILLS CONFIRMADAS"],
 ["K/D",aggregate?kdString(t):"—","ELIMINAÇÕES ÷ MORTES"],
 ["KOST",aggregate?percent(t.kost):"—","ROUNDS COM K/O/S/T"],
 ["KPR",aggregate?decimal(t.kpr):"—","KILLS POR ROUND"],
 ["ROUNDS",aggregate?t.rounds_played:"—","ROUNDS INDIVIDUAIS"],
 ["ASSISTÊNCIAS",aggregate?t.assists:"—","ASSISTS REGISTRADAS"],
 ["ENTRY",aggregate?((t.entry>0?"+":"")+t.entry):"—","PRIMEIRAS KILLS − MORTES"]
 ];
 $("ntMetrics").innerHTML=blocks.map(([label,value,caption])=>
  '<article class="nt-metric"><small>'+esc(label)+'</small><strong>'+esc(value)+
  '</strong><span>'+esc(caption)+'</span></article>').join("");
 if(!filtered.length){
  $("ntTrend").innerHTML=empty("AINDA SEM HISTÓRICO.","Quando os confrontos forem finalizados e as estatísticas registradas, o gráfico aparecerá aqui.");
  $("ntSummary").innerHTML=empty("SEM NÚMEROS INVENTADOS.","Os indicadores ficam vazios até existirem dados verificáveis.");
  $("ntHistory").innerHTML=empty("NENHUMA PARTIDA ANALISADA.","Experimente outro filtro ou aguarde o registro de um confronto.");
  $("ntStatus").textContent=rows.length?"Nenhuma partida corresponde aos filtros selecionados.":"Ainda não há desempenho de partidas finalizadas no NOWAY Tracker.";
  return;
 }
 $("ntStatus").textContent=t.games+" confronto(s) com estatísticas registradas · última consulta à base NOWAY.";
 const chrono=[...filtered].sort((a,b)=>new Date(a.played_at)-new Date(b.played_at)).slice(-8);
 const chartValues=chrono.map(r=>numeric(r.rounds_played)?numeric(r.kills)/numeric(r.rounds_played):0);
 const max=Math.max(.3,...chartValues);
 $("ntTrend").innerHTML=chrono.map((r,i)=>{
  const height=Math.max(5,Math.round(chartValues[i]/max*162));
  return '<div class="nt-trend-bar" title="'+esc(r.opponent)+' · '+esc(date(r.played_at))+
   ' · KPR '+esc(decimal(chartValues[i]))+'"><strong>'+esc(decimal(chartValues[i]))+
   '</strong><div class="nt-bar" style="height:'+height+'px"></div><small>'+esc(date(r.played_at))+'</small></div>';
 }).join("");
 const breakdown=[
  ["K / D / A",t.kills+" / "+t.deaths+" / "+t.assists],
  ["KPR",decimal(t.kpr)],["KOST",percent(t.kost)],["SOBREVIVÊNCIA",percent(t.survive)],
  ["ENTRY KILLS",t.entry_kills],["ENTRY DEATHS",t.entry_deaths],
  ["SALDO ENTRY",(t.entry>0?"+":"")+t.entry],["PARTIDAS COM DADOS",t.games]
 ];
 $("ntSummary").innerHTML=breakdown.map(([label,value])=>
  '<div class="nt-summary-row"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>').join("");
 const ordered=[...filtered].sort((a,b)=>new Date(b.played_at)-new Date(a.played_at)).slice(0,100);
 $("ntHistory").innerHTML='<table><thead><tr><th>DATA / JOGADOR</th><th>ADVERSÁRIO</th><th>RESULTADO</th><th>K / D / A</th><th>K/D</th><th>KOST</th><th>KPR</th></tr></thead><tbody>'+
 ordered.map(r=>{
  const t=summary([r]);const outcome=r.result==="vitoria"?"VITÓRIA":r.result==="derrota"?"DERROTA":"EMPATE";
  const score=r.our_score==null||r.opponent_score==null?"":(" · "+r.our_score+"–"+r.opponent_score);
  return '<tr><td>'+esc(date(r.played_at))+'<small>'+esc(r.display_name)+'</small></td>'+
   '<td>'+esc(r.opponent)+'<small>'+esc(r.competition)+'</small></td>'+
   '<td><span class="nt-result'+(r.result==="derrota"?" is-loss":"")+'">'+esc(outcome+score)+'</span></td>'+
   '<td>'+t.kills+" / "+t.deaths+" / "+t.assists+'</td><td>'+esc(kdString(t))+
   '</td><td>'+esc(percent(t.kost))+'</td><td>'+esc(decimal(t.kpr))+'</td></tr>';
 }).join("")+'</tbody></table>';
}
function errorState(err){
 const message="Não foi possível carregar as estatísticas agora. Tente atualizar mais tarde.";
 $("ntStatus").textContent=message;$("ntStatus").classList.add("is-error");
 $("ntMetrics").innerHTML=empty("CONEXÃO INDISPONÍVEL.",message);
 $("ntTrend").innerHTML="";$("ntSummary").innerHTML="";$("ntHistory").innerHTML="";
 console.warn("NOWAY Tracker:",err?.message||err);
}
async function load(){
 if(isLoading)return;
 isLoading=true;$("ntRefresh").disabled=true;
 const version=++activeRequest;
 $("ntStatus").classList.remove("is-error");
 $("ntStatus").textContent="Buscando partidas confirmadas da NOWAY...";
 try{
  const response=await db.rpc("noway_public_tracker_v1");
  if(response.error)throw response.error;
  if(version!==activeRequest)return;
  rows=(response.data||[]).filter(r=>r.player_id&&r.event_id&&r.rounds_played>0);
  refreshFilterOptions();redraw();
 }catch(err){if(version===activeRequest)errorState(err)}
 finally{isLoading=false;$("ntRefresh").disabled=false}
}
$("ntRefresh").addEventListener("click",load);
for(const id of ["ntPlayer","ntSeason","ntCompetition"])$(id).addEventListener("change",redraw);
load();
