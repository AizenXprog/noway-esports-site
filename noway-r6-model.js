/* Arenyze V2 / Estatisticas R6. Ausencia de informacao = null. */
const finite=v=>{
 const x=v&&typeof v==="object"&&"value" in v?v.value:v;
 if(x===null||x===undefined||x==="")return null;
 const n=Number(typeof x==="string"?x.replace(/%$/,"").trim():x);
 return Number.isFinite(n)?n:null;
};
const getNumber=(obj,...keys)=>{
 for(const key of keys){const n=finite(obj?.[key]);if(n!==null)return n;}
 return null;
};
const pct=n=>n===null?null:n>=0&&n<=1?n*100:n;
const ranked=x=>/ranked/i.test(String(x?.attributes?.gamemode||x?.attributes?.sessionType||
 x?.board_id||x?.boardId||x?.metadata?.rankType||x?.metadata?.name||""));
const textRank=x=>typeof x==="string"&&x.trim()?x.trim():null;
const imageRank=x=>typeof x==="string"&&/^https:\/\/r6\.arenyze\.com\/assets\/img\/r6_ranks_img\/[a-z0-9_-]+\.webp$/i.test(x)?x:null;
function findSeason(p){
 const rows=Array.isArray(p?.seasons?.data?.segments)?p.seasons.data.segments:[];
 const current=finite(p?.seasons?.data?.metadata?.currentSeason);
 const candidates=rows.filter(ranked).sort((a,b)=>(finite(b?.attributes?.season)||0)-(finite(a?.attributes?.season)||0));
 const seg=candidates.find(s=>finite(s?.attributes?.season)===current)||candidates[0]||null;
 const families=Array.isArray(p?.stats?.platform_families_full_profiles)?p.stats.platform_families_full_profiles:[];
 const boards=families.flatMap(f=>Array.isArray(f?.board_ids_full_profiles)?f.board_ids_full_profiles:[f]);
 const board=boards.find(ranked)||null;
 const full=Array.isArray(board?.full_profiles)?board.full_profiles:[];
 const selected=full.find(f=>finite(f.season_id)===current)||
  full.slice().sort((a,b)=>(finite(b?.season_id)||0)-(finite(a?.season_id)||0))[0]||null;
 const sources=[seg?.stats,selected?.profile,selected?.season_statistics,
  selected?.season_statistics?.match_outcomes,board?.stats,p?.stats?.stats].filter(Boolean);
 return {seg,board,selected,sources};
}
function hsFromOperators(value){
 const ops=Array.isArray(value?.operators)?value.operators:Array.isArray(value)?value:[];
 let total=0,hits=0;
 for(const operator of ops){
  const kills=getNumber(operator,"kills");
  if(kills===null||kills<=0)continue;
  const count=getNumber(operator,"headshots","headshotKills");
  const percentage=getNumber(operator,"headshotPercent","headshotPercentage","headshotPct");
  if(count===null&&percentage===null)return null;
  total+=kills;hits+=count!==null?count:kills*pct(percentage)/100;
 }
 return total>0?Math.min(100,Math.max(0,100*hits/total)):null;
}
export function normalizeR6(payload){
 const p=payload?.profile||{}, {seg,board,selected,sources}=findSeason(p);
 const get=(...keys)=>{
  for(const source of sources){const n=getNumber(source,...keys);if(n!==null)return n;}
  return null;
 };
 const historyRows=p?.history?.data?.history?.data||p?.history?.history?.data||[];
 const history=(Array.isArray(historyRows)?historyRows:[]).map(row=>{
  const time=Array.isArray(row)?Date.parse(row[0]):NaN;
  const rp=Array.isArray(row)?finite(row[1]):null;
  const meta=Array.isArray(row)?row[1]?.metadata:null;
  return Number.isFinite(time)&&rp!==null?{time,rp,rank:textRank(meta?.rank),rankImage:imageRank(meta?.imageUrl)}:null;
 }).filter(Boolean).sort((a,b)=>a.time-b.time).slice(-90);
 const latest=[...history].reverse().find(r=>r.rank)||null;
 const rank=textRank(seg?.stats?.rankPoints?.metadata?.rank)||
 textRank(board?.stats?.rankPoints?.metadata?.rank)||
 textRank(seg?.metadata?.rank)||textRank(board?.metadata?.rank)||
 textRank(selected?.profile?.rankName)||latest?.rank||null;
 const rankImage=imageRank(seg?.stats?.rankPoints?.metadata?.imageUrl)||
 imageRank(board?.stats?.rankPoints?.metadata?.imageUrl)||imageRank(latest?.rankImage)||null;
 const kills=get("kills","Kills"),deaths=get("deaths","Deaths");
 let wins=null,losses=null;
 for(const source of sources){
  const w=getNumber(source,"wins","Wins","matchesWon");
  const l=getNumber(source,"losses","Losses","matchesLost");
  if(w!==null&&l!==null){wins=w;losses=l;break;}
 }
 const matches=get("matchesPlayed","matches","matchesPlayedTotal")??
  (wins!==null&&losses!==null?wins+losses:null);
 const wr=get("winPercentage","winRate","winRatio","winPercent","matchWinPercent");
 const headshots=get("headshotPercentage","headshotPct","headshotsPercentage","headshotPercent");
 return {
  name:p.player?.nameOnPlatform||null,
  avatar:typeof p.account?.profilePicture==="string"&&p.account.profilePicture.startsWith("https://")?p.account.profilePicture:null,
  level:finite(p.account?.level),rank,rankImage,
  rankPoints:get("rankPoints","rp","RankPoints")??finite(selected?.profile?.rank_points)??history.at(-1)?.rp??null,
  kills,deaths,wins,losses,matches,
  kd:get("kd","kD","kdRatio","killDeathRatio","kdr")??(kills!==null&&deaths>0?kills/deaths:null),
  winRate:wr!==null?pct(wr):wins!==null&&losses!==null&&wins+losses>0?100*wins/(wins+losses):null,
  headshots:headshots!==null?pct(headshots):hsFromOperators(p.operators),
  history,partial:Boolean(p.meta?.partial),source:payload?.source||"R6 Arenyze / Ubisoft",
  fetchedAt:payload?.fetchedAt||new Date().toISOString()
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
const cache=new Map();
export async function fetchR6(db,player,platform="uplay",{force=false}={}){
 const name=String(player||"").trim(),plat=platform||"uplay";
 if(!/^[\p{L}\p{N}_.-]{2,48}$/u.test(name)||!["uplay","psn","xbl"].includes(plat))
  throw Error("Nickname ou plataforma inválidos.");
 const key=plat+":"+name.toLowerCase(),entry=cache.get(key);
 if(!force&&entry&&entry.until>Date.now())return entry.value;
 const {data,error}=await db.functions.invoke("noway-r6-tracker",{body:{player:name,platform:plat}});
 if(error||!data?.profile){
  let problem=null;try{problem=await error?.context?.json?.();}catch{}
  throw Error(problem?.error||problem?.message||error?.message||"O provedor não disponibilizou estatísticas.");
 }
 const normalized=normalizeR6(data);
 cache.set(key,{value:normalized,until:Date.now()+300000});
 if(cache.size>100)cache.delete(cache.keys().next().value);
 return normalized;
}
