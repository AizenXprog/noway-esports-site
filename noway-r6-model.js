/* NOWAY Tracker — única normalização de dados fornecidos pela API Arenyze.
   Ausência de dado = null; nunca criamos rank ou estatísticas fictícias. */
const finite=v=>{
 const raw=v&&typeof v==="object"&&"value" in v?v.value:v;
 return raw===null||raw===undefined||raw===""||!Number.isFinite(Number(raw))?null:Number(raw);
};
const cache=new Map();
export function normalizeR6(payload){
 const p=payload?.profile||{},seasons=p.seasons?.data?.segments||[],
  boards=p.stats?.platform_families_full_profiles||[];
 const ranked=a=>Array.isArray(a)?a.find(x=>/ranked/i.test(String(x.type||x.board_id||x.boardId||x.metadata?.name||x.attributes?.playlist||"")))||a[0]:null;
 const seg=ranked(seasons),board=ranked(boards);
 const sources=[seg?.stats,board?.stats,board,p.stats?.stats].filter(x=>x&&typeof x==="object");
 const get=(...keys)=>{
  for(const src of sources)for(const key of keys){const v=finite(src[key]);if(v!==null)return v;}
  return null;
 };
 const kills=get("kills","Kills"),deaths=get("deaths","Deaths"),
  wins=get("wins","Wins"),losses=get("losses","Losses");
 const matches=get("matchesPlayed","matches","matchesPlayedTotal")??
  (wins!==null&&losses!==null?wins+losses:null);
 const rawWin=get("winPercentage","winRate","winRatio")??
  (wins!==null&&matches>0?100*wins/matches:null);
 const rank=seg?.metadata?.rank||board?.metadata?.rank||
  seg?.stats?.rankPoints?.metadata?.rank||board?.stats?.rankPoints?.metadata?.rank||null;
 const histSource=p.history?.data?.history?.data||p.history?.history?.data||[];
 const history=(Array.isArray(histSource)?histSource:[]).map(x=>{
  const time=Array.isArray(x)?new Date(x[0]).getTime():NaN,rp=Array.isArray(x)?finite(x[1]):null;
  return Number.isFinite(time)&&rp!==null?{time,rp}:null;
 }).filter(Boolean).sort((a,b)=>a.time-b.time).slice(-90);
 return {
  name:p.player?.nameOnPlatform||null,
  avatar:typeof p.account?.profilePicture==="string"&&p.account.profilePicture.startsWith("https://")?p.account.profilePicture:null,
  level:finite(p.account?.level),
  rank:typeof rank==="string"&&rank.trim()?rank:null,
  rankPoints:get("rankPoints","rp","RankPoints")??history.at(-1)?.rp??null,
  kills,deaths,wins,losses,matches,
  kd:get("kd","kD","killDeathRatio","kdr")??(kills!==null&&deaths>0?kills/deaths:null),
  winRate:rawWin===null?null:rawWin<=1?rawWin*100:rawWin,
  headshots:(()=>{const n=get("headshotPercentage","headshotPct","headshotsPercentage");return n===null?null:n<=1?n*100:n;})(),
  history,partial:Boolean(p.meta?.partial),
  source:payload?.source||"R6 Arenyze / Ubisoft",fetchedAt:payload?.fetchedAt||new Date().toISOString()
 };
}
export function rankTier(rank){
 if(typeof rank!=="string")return null;
 const lower=rank.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"");
 const tier=["copper","bronze","silver","gold","platinum","emerald","diamond","champion","unranked"]
  .find(t=>new RegExp("\\b"+t+"\\b").test(lower));
 if(!tier)return null;
 const after=lower.split(tier)[1]||"";
 const m=after.match(/\b(iii|iv|ii|i|v|[1-5])\b/);
 const roman={i:1,ii:2,iii:3,iv:4,v:5};
 return {tier,division:m?(roman[m[1]]||Number(m[1])):null};
}
export async function fetchR6(db,player,platform="uplay",{force=false}={}){
 const name=String(player||"").trim(),plat=platform||"uplay";
 if(!/^[\p{L}\p{N}_.-]{2,48}$/u.test(name)||!["uplay","psn","xbl"].includes(plat))
  throw Error("Nickname ou plataforma inválidos.");
 const key=plat+":"+name.toLowerCase(),entry=cache.get(key);
 if(!force&&entry&&entry.until>Date.now())return entry.value;
 const {data,error}=await db.functions.invoke("noway-r6-tracker",{body:{player:name,platform:plat}});
 if(error||!data?.profile){
  let problem=null;
  try{problem=await error?.context?.json?.();}catch{}
  throw Error(problem?.error||problem?.message||error?.message||"O provedor não disponibilizou estatísticas.");
 }
 const normalized=normalizeR6(data);
 cache.set(key,{value:normalized,until:Date.now()+300000});
 if(cache.size>100)cache.delete(cache.keys().next().value);
 return normalized;
}
