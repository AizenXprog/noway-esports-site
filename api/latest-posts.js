// NOWAY: vídeos públicos recentes dos atletas cadastrados no Elenco.
const team=require("../site-data.js").team||[];
const ytKey=process.env.YOUTUBE_API_KEY||"";
const twitchId=process.env.TWITCH_CLIENT_ID||"";
const twitchSecret=process.env.TWITCH_CLIENT_SECRET||"";
let cached=null, authCache=null;
const videoPattern=/^[a-z0-9_-]{11}$/i;
const validHandle=/^[a-z0-9_.-]{3,30}$/i;
const validLogin=/^[a-z0-9_]{3,25}$/i;
const WEEK_MS=7*24*60*60*1000;
function views(raw){if(typeof raw!=='number'&&!(typeof raw==='string'&&/^\d+$/.test(raw)))return null;
 const value=Number(raw);return Number.isSafeInteger(value)&&value>=0?value:null;}
function channels(){
  const out={youtube:[],twitch:[]},seen=new Set();
  for(const person of team){
    if(person.vacancy)continue;
    for(const social of person.socials||[]){
      let u;try{u=new URL(social.url);}catch{continue;}
      if(u.protocol!=="https:")continue;
      const host=u.hostname.replace(/^www\./,"").toLowerCase();
      const parts=u.pathname.split("/").filter(Boolean);
      let kind="",name="";
      if(host==="youtube.com"&&parts[0]?.startsWith("@")&&validHandle.test(parts[0].slice(1))){
        kind="youtube";name=parts[0].slice(1).toLowerCase();
      }else if(host==="twitch.tv"&&parts.length===1&&validLogin.test(parts[0])){
        kind="twitch";name=parts[0].toLowerCase();
      }else continue;
      if(seen.has(kind+":"+name)||out[kind].length>=(kind==="youtube"?8:12))continue;
      seen.add(kind+":"+name);
      out[kind].push({memberId:person.id,account:name});
    }
  }
  return out;
}
function thumb(value){
 try{const u=new URL(String(value||"").replace(/%\{width\}|\{width\}/g,"640").replace(/%\{height\}|\{height\}/g,"360"));
 return u.protocol==="https:"&&["i.ytimg.com","img.youtube.com","static-cdn.jtvnw.net"].includes(u.hostname)?u.href:"";}catch{return"";}
}
async function json(url,opts={}){
  const response=await fetch(url,{...opts,signal:AbortSignal.timeout(9000)});
  if(!response.ok)throw Error("Video API HTTP "+response.status);
  return response.json();
}
async function youtube(path,fields){
  const u=new URL("https://www.googleapis.com/youtube/v3/"+path);
  for(const [k,v] of Object.entries(fields))u.searchParams.set(k,String(v));
  u.searchParams.set("key",ytKey);
  return json(u.toString());
}
async function getYouTube(m){
  const c=await youtube("channels",{part:"contentDetails",forHandle:"@"+m.account});
  const playlist=c.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if(!/^[a-z0-9_-]{10,36}$/i.test(playlist||""))return[];
  const p=await youtube("playlistItems",{part:"contentDetails,snippet",playlistId:playlist,maxResults:50});
  const entries=(p.items||[]).filter(i=>videoPattern.test(i.contentDetails?.videoId||""))
    .filter(i=>!["private video","deleted video"].includes(String(i.snippet?.title||"").toLowerCase()));
  if(!entries.length)return[];
  const v=await youtube("videos",{part:"snippet,status,statistics",id:entries.map(x=>x.contentDetails.videoId).join(",")});
  const byId=new Map((v.items||[]).map(x=>[x.id,x]));
  return entries.map(item=>{
    const id=item.contentDetails.videoId,video=byId.get(id);
    if(!video||video.status?.privacyStatus!=="public"||video.snippet?.liveBroadcastContent!=="none")return null;
    const date=item.contentDetails.videoPublishedAt||video.snippet.publishedAt;
    if(!date||!Number.isFinite(Date.parse(date)))return null;
    return{platform:"youtube",memberId:m.memberId,videoId:id,publishedAt:date,
      title:String(video.snippet.title||"Vídeo").slice(0,180),
      thumbnail:thumb(video.snippet.thumbnails?.high?.url||video.snippet.thumbnails?.medium?.url),
      viewCount:views(video.statistics?.viewCount),kind:"VÍDEO"};
  }).filter(Boolean);
}
async function token(){
 if(authCache&&authCache.until>Date.now())return authCache.value;
 const data=await json("https://id.twitch.tv/oauth2/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:twitchId,client_secret:twitchSecret,grant_type:"client_credentials"}).toString()});
 if(!data.access_token)throw Error("Twitch token missing");
 authCache={value:data.access_token,until:Date.now()+Math.max(60000,(Number(data.expires_in||3600)-120)*1000)};
 return authCache.value;
}
async function getTwitch(members){
 const auth=await token();
 const headers={"Client-Id":twitchId,Authorization:"Bearer "+auth};
 const q=new URLSearchParams();
 members.forEach(m=>q.append("login",m.account));
 const users=await json("https://api.twitch.tv/helix/users?"+q.toString(),{headers});
 const memberByLogin=new Map(members.map(m=>[m.account,m.memberId]));
 const jobs=(users.data||[]).filter(u=>memberByLogin.has(String(u.login||"").toLowerCase())).map(async user=>{
   const params=new URLSearchParams({user_id:user.id,first:"50"});
   const list=await json("https://api.twitch.tv/helix/videos?"+params.toString(),{headers});
   return(list.data||[]).filter(v=>/^\d+$/.test(String(v.id||""))).map(v=>{
     const date=v.published_at||v.created_at;
     if(!date||!Number.isFinite(Date.parse(date)))return null;
     return{platform:"twitch",memberId:memberByLogin.get(String(user.login).toLowerCase()),videoId:String(v.id),
       publishedAt:date,title:String(v.title||"Vídeo da Twitch").slice(0,180),
       thumbnail:thumb(v.thumbnail_url),viewCount:views(v.view_count),kind:v.type==="archive"?"REPLAY":v.type==="highlight"?"DESTAQUE":"VÍDEO"};
   }).filter(Boolean);
 });
 const result=await Promise.allSettled(jobs);
 if(result.some(r=>r.status==="rejected"))throw Error("Twitch video requests partially or fully unavailable");
 return result.flatMap(r=>r.status==="fulfilled"?r.value:[]);
}
async function collect(){
 const roster=channels(),jobs=[];
 if(ytKey)for(const m of roster.youtube)jobs.push(getYouTube(m));
 if(twitchId&&twitchSecret&&roster.twitch.length)jobs.push(getTwitch(roster.twitch));
 if(!jobs.length)return{configured:false,posts:[],featured:null,weeklyWindowDays:7,partial:false};
 const result=await Promise.allSettled(jobs);
 const all=result.flatMap(r=>r.status==="fulfilled"?r.value:[])
   .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))
   .filter((v,i,arr)=>arr.findIndex(x=>x.platform===v.platform&&x.videoId===v.videoId)===i);
 const posts=all.slice(0,9);
 const partial=result.some(r=>r.status==="rejected")||
   (roster.youtube.length>0&&!ytKey)||(roster.twitch.length>0&&(!twitchId||!twitchSecret));
 // Views totais acumuladas de vídeos publicados nos últimos 7 dias, não as views ganhas nesses dias.
 const now=Date.now();
 const ranked=!partial?all.filter(v=>{
   const at=Date.parse(v.publishedAt);
   return Number.isFinite(at)&&at>=now-WEEK_MS&&at<=now&&
     Number.isSafeInteger(v.viewCount)&&v.viewCount>=0;
 }).sort((a,b)=>b.viewCount-a.viewCount||Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||
   (a.platform+":"+a.videoId).localeCompare(b.platform+":"+b.videoId)):[];
 const featured=ranked[0]||null;
 if(partial)console.warn("NOWAY latest posts: some video providers unavailable");
 return{configured:true,posts,featured,weeklyWindowDays:7,partial};
}
module.exports=async function(req,res){
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Method not allowed"});}
 if(!cached||cached.until<Date.now()){
   const promise=collect();
   cached={promise,until:Date.now()+300000};
   promise.then(result=>{if(cached?.promise===promise)cached.until=Date.now()+(result.partial?300000:1800000);})
     .catch(()=>{if(cached?.promise===promise)cached=null;});
 }
 try{
   const data=await cached.promise;
   res.setHeader("Cache-Control",data.partial?"public, s-maxage=300, stale-while-revalidate=60":"public, s-maxage=1800, stale-while-revalidate=120");
   return res.status(200).json(data);
 }catch(err){
   console.error("NOWAY latest-posts error:",err.message);
   res.setHeader("Cache-Control","no-store");
   return res.status(503).json({configured:false,posts:[],error:"Serviço de vídeos indisponível."});
 }
};
