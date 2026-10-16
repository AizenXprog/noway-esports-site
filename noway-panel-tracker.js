import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://vdipsufzlqmnprbjiojb.supabase.co","sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>v===null||v===undefined||v===""||!Number.isFinite(Number(v))?null:Number(v);
const fmt=(v,d=0)=>num(v)===null?"—":new Intl.NumberFormat("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d}).format(Number(v));
const metric=(label,value,hint)=>'<article><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong><span>'+esc(hint)+'</span></article>';
let request=0,loading=false,result=null;
function status(title,description,isError=false){
 const view=$("nowayTrackerState");view.hidden=false;view.classList.toggle("is-error",isError);
 view.innerHTML='<span class="noway-tracker-state-mark">'+(isError?"!":"✳")+'</span><div><strong>'+esc(title)+'</strong><p>'+esc(description)+'</p></div>';
 $("nowayTrackerResults").hidden=true;
}
function unpack(payload){
 const p=payload?.profile||{},segments=p.seasons?.data?.segments||[],boards=p.stats?.platform_families_full_profiles||[];
 const seg=Array.isArray(segments)?segments.find(x=>/ranked/i.test(String(x.type||x.metadata?.name||x.attributes?.playlist||"")))||segments[0]:null;
 const board=Array.isArray(boards)?boards.find(x=>/ranked/i.test(String(x.board_id||x.boardId||x.metadata?.name||"")))||boards[0]:null;
 const sources=[seg?.stats,board?.stats,board,p.stats?.stats].filter(x=>x&&typeof x==="object");
 const get=(...keys)=>{for(const source of sources)for(const k of keys){const v=num(source[k]?.value??source[k]);if(v!==null)return v}return null};
 const rpEvents=p.history?.data?.history?.data||p.history?.history?.data||[];
 const history=(Array.isArray(rpEvents)?rpEvents:[]).map(x=>{
   const t=Array.isArray(x)?new Date(x[0]).getTime():NaN,v=Array.isArray(x)?num(x[1]?.value):null;
   return Number.isFinite(t)&&v!==null?{time:t,rp:v}:null;
 }).filter(Boolean).sort((a,b)=>a.time-b.time).slice(-90);
 const kills=get("kills","Kills"),deaths=get("deaths","Deaths"),wins=get("wins","Wins"),losses=get("losses","Losses");
 const matches=get("matchesPlayed","matches","matchesPlayedTotal")??(wins!==null&&losses!==null?wins+losses:null);
 const ratio=get("kd","kD","killDeathRatio","kdr")??(kills!==null&&deaths>0?kills/deaths:null);
 const winRate=get("winPercentage","winRate","winRatio")??(wins!==null&&matches>0?100*wins/matches:null);
 const rank=seg?.metadata?.rank||board?.metadata?.rank||seg?.stats?.rankPoints?.metadata?.rank||board?.stats?.rankPoints?.metadata?.rank||null;
 return {name:p.player?.nameOnPlatform||null,avatar:typeof p.account?.profilePicture==="string"&&p.account.profilePicture.startsWith("https://")?p.account.profilePicture:null,
  level:num(p.account?.level),rank:typeof rank==="string"?rank:null,rankPoints:get("rankPoints","rp","RankPoints")??history.at(-1)?.rp??null,
  kills,deaths,wins,losses,matches,ratio,winRate,headshots:get("headshotPercentage","headshotPct","headshotsPercentage"),history,
  partial:Boolean(p.meta?.partial),source:payload?.source||"R6 Arenyze",time:payload?.fetchedAt||null};
}
function drawChart(points){
 const el=$("nowayTrackerChart");if(points.length<2){el.innerHTML='<div class="noway-tracker-no-chart">Ainda não existem pontos suficientes de histórico de RP disponibilizados pelo provedor.</div>';return;}
 const w=600,h=220,pad=35,values=points.map(p=>p.rp),lo=Math.min(...values),hi=Math.max(...values),dif=Math.max(1,hi-lo);
 const coords=points.map((p,i)=>[pad+(w-2*pad)*i/(points.length-1),pad+(hi-p.rp)*(h-2*pad)/dif]);
 const poly=coords.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
 const grids=[0,1,2,3].map(i=>{let y=pad+(h-2*pad)*i/3;return '<line x1="'+pad+'" x2="'+(w-pad)+'" y1="'+y+'" y2="'+y+'" stroke="#546448" stroke-dasharray="3 6"/>';}).join("");
 const last=coords.at(-1);
 el.innerHTML='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Histórico de rank points" preserveAspectRatio="xMidYMid meet">'+grids+
 '<path d="'+poly+'" stroke="#f2ff00" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round" fill="none"/>'+
 '<circle cx="'+last[0]+'" cy="'+last[1]+'" r="5" fill="#f2ff00"/></svg>'+
 '<div class="noway-tracker-timeline"><span>'+esc(new Date(points[0].time).toLocaleDateString("pt-BR"))+'</span><strong>'+
 points.length+' REGISTROS DE RP</strong><span>'+esc(new Date(points.at(-1).time).toLocaleDateString("pt-BR"))+'</span></div>';
}
function paint(data,player,platform){
 result=data;$("nowayTrackerState").hidden=true;$("nowayTrackerResults").hidden=false;
 const name=data.name||player;
 $("nowayTrackerName").textContent=name;
 $("nowayTrackerMeta").textContent=(platform==="uplay"?"PC / UBISOFT":platform==="psn"?"PLAYSTATION":"XBOX")+
 (data.rank?" · "+data.rank:"")+(data.level!==null?" · NÍVEL "+fmt(data.level):"");
 $("nowayTrackerAvatar").innerHTML=data.avatar?'<img src="'+esc(data.avatar)+'" loading="lazy" alt="">':esc(name.slice(0,1).toUpperCase());
 $("nowayTrackerExternal").href="https://r6.tracker.network/r6siege/profile/ubi/"+encodeURIComponent(name);
 const winpct=data.winRate!==null&&data.winRate<=1?100*data.winRate:data.winRate;
 const headpct=data.headshots!==null&&data.headshots<=1?100*data.headshots:data.headshots;
 $("nowayTrackerMetrics").innerHTML=[
  metric("RANK POINTS",fmt(data.rankPoints),data.rank||"Sem rank informado"),
  metric("K/D",fmt(data.ratio,2),"Eliminações por morte"),
  metric("WIN RATE",winpct===null?"—":fmt(winpct,1)+"%","Vitórias no período"),
  metric("PARTIDAS",fmt(data.matches),"Jogos registrados"),
  metric("KILLS",fmt(data.kills),"Eliminações"),
  metric("DEATHS",fmt(data.deaths),"Mortes"),
  metric("HEADSHOT",headpct===null?"—":fmt(headpct,1)+"%","Taxa de headshot"),
  metric("NÍVEL",fmt(data.level),"Conta Ubisoft")
 ].join("");
 drawChart(data.history);
 const observations=[];
 if(data.ratio!==null)observations.push("K/D de "+fmt(data.ratio,2)+
  (data.ratio>=1?": eliminações iguais ou superiores às mortes no período disponível.":": mortes superiores às eliminações no período disponível."));
 if(winpct!==null)observations.push("Aproveitamento de "+fmt(winpct,1)+"% em vitórias, conforme os dados obtidos.");
 if(data.history.length>=2){const change=data.history.at(-1).rp-data.history[0].rp;observations.push("Variação de "+
  (change>=0?"+":"")+fmt(change)+" RP nos registros disponíveis.");}
 if(data.partial)observations.push("O provedor indica que as informações retornadas estão incompletas.");
 if(!observations.length)observations.push("A fonte não retornou métricas suficientes para uma análise numérica confiável.");
 $("nowayTrackerInsights").innerHTML=observations.map((text,i)=>'<div><b>'+String(i+1).padStart(2,"0")+'</b><p>'+esc(text)+'</p></div>').join("");
 $("nowayTrackerSeason").innerHTML='<span>ORIGEM DOS DADOS / '+esc(data.source)+'</span><strong>'+
 (data.partial?"INFORMAÇÕES PARCIAIS":"ANÁLISE AUTOMÁTICA")+'</strong>';
 $("nowayTrackerSource").textContent="Fonte: "+data.source+
 " · Consulta: "+(data.time?new Date(data.time).toLocaleString("pt-BR"):"agora")+
 " · Estatísticas de terceiros; podem estar incompletas ou atrasadas.";
}
async function search(event){
 event?.preventDefault();if(loading)return;
 const player=$("nowayTrackerPlayer").value.trim(),platform=$("nowayTrackerPlatform").value;
 if(!/^[\p{L}\p{N}_.-]{2,48}$/u.test(player))return status("NOME INVÁLIDO","Informe o usuário Ubisoft ou da plataforma, com pelo menos 2 caracteres.",true);
 loading=true;const id=++request;const button=$("nowayTrackerSubmit");
 button.disabled=true;button.textContent="CONSULTANDO...";status("CONSULTANDO O PERFIL","Buscando dados externos de Rainbow Six Siege.");
 try{
   const {data:sessionData,error:authError}=await db.auth.getUser();
   if(authError||!sessionData?.user)throw Error("Faça login com NOWAY ID para pesquisar.");
   const {data,error}=await db.functions.invoke("noway-r6-tracker",{body:{player,platform}});
   if(id!==request)return;
   if(error){
     let details=null;try{details=await error.context?.json?.()}catch{}
     throw Error(details?.message||details?.error||error.message||"Falha ao consultar o provedor.");
   }
   if(!data?.profile)throw Error("O provedor não enviou informações válidas.");
   paint(unpack(data),player,platform);
 }catch(err){if(id===request)status("CONSULTA INDISPONÍVEL",err.message||"Não foi possível buscar as estatísticas.",true);}
 finally{if(id===request){loading=false;button.disabled=false;button.innerHTML='ANALISAR PERFIL <span aria-hidden="true">↗</span>';}}
}
$("nowayTrackerSearch")?.addEventListener("submit",search);
window.addEventListener("noway:tracker-open",()=>{if(!result)$("nowayTrackerPlayer")?.focus({preventScroll:true});});
