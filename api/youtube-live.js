// NOWAY / status de transmissões YouTube: apenas lives comprovadas.
const cache=new Map(), key=process.env.YOUTUBE_API_KEY||"";
const validHandle=/^[a-z0-9_.-]{3,30}$/i,validVideo=/^[a-z0-9_-]{11}$/i;
function assignedObject(text,marker){
 const p=text.indexOf(marker);if(p<0)return null;
 const eq=text.indexOf("=",p+marker.length);if(eq<0||eq-(p+marker.length)>35)return null;
 const start=text.indexOf("{",eq+1);if(start<0||start-eq>25)return null;
 let depth=0,str=false,escape=false;
 for(let i=start;i<Math.min(text.length,start+2000000);i++){
  const c=text[i];if(str){if(escape)escape=false;else if(c==="\\")escape=true;else if(c==='"')str=false;}
  else if(c==='"')str=true;else if(c==="{")depth++;else if(c==="}"&&--depth===0){
   try{return JSON.parse(text.slice(start,i+1));}catch{return null;}
  }
 }return null;
}
function thumb(v){try{const u=new URL(v);return u.protocol==="https:"&&["i.ytimg.com","img.youtube.com"].includes(u.hostname)?u.href:"";}catch{return"";}}
function makeStream(handle,id,title,image){
 if(!validVideo.test(id||""))return null;
 return{handle,platform:"youtube",videoId:id,title:String(title||"").slice(0,180),thumbnail:thumb(image),url:"https://www.youtube.com/watch?v="+id};
}
// O YouTube pode responder /live com a página do canal em vez de um player.
// Verificamos os dois formatos: player em reprodução E selo LIVE NOW no catálogo de streams.
function liveFromChannel(handle,data){
 if(!data||typeof data!=="object")return null;
 const stack=[data];let visited=0;
 while(stack.length&&visited++<100000){
  const item=stack.pop();if(!item||typeof item!=="object")continue;
  const video=item.videoRenderer||item.gridVideoRenderer;
  if(video&&validVideo.test(video.videoId||"")){
   const badges=(video.badges||[]).map(x=>x.metadataBadgeRenderer?.style);
   const overlay=(video.thumbnailOverlays||[]).map(x=>x.thumbnailOverlayTimeStatusRenderer?.style);
   if(badges.includes("BADGE_STYLE_TYPE_LIVE_NOW")||overlay.includes("LIVE")){
    const title=video.title?.runs?.map(x=>x.text).join("")||video.title?.simpleText||"";
    const pics=video.thumbnail?.thumbnails||[];
    return makeStream(handle,video.videoId,title,pics[pics.length-1]?.url);
   }
  }
  for(const child of Array.isArray(item)?item:Object.values(item)){
   if(child&&typeof child==="object")stack.push(child);
  }
 }
 return null;
}
async function youtubeHtml(target){
 const r=await fetch(target,{redirect:"follow",signal:AbortSignal.timeout(7000),
  headers:{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36","Accept-Language":"en-US,en;q=0.9"}});
 if(!r.ok)throw Error("YouTube HTTP "+r.status);
 if(!["www.youtube.com","youtube.com"].includes(new URL(r.url||target).hostname))throw Error("Redirect outside YouTube");
 return (await r.text()).slice(0,3500000);
}
async function publicPage(handle){
 const channel="https://www.youtube.com/@"+encodeURIComponent(handle);
 const responses=await Promise.allSettled([youtubeHtml(channel+"/live"),youtubeHtml(channel+"/streams")]);
 for(const attempt of responses){
  if(attempt.status!=="fulfilled")continue;
  const html=attempt.value;
  const p=assignedObject(html,"ytInitialPlayerResponse");
  const liveInfo=p?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails;
  // isLiveContent pode ser verdadeiro em replays. Apenas isLiveNow/isLive prova live ativa.
  if((liveInfo?.isLiveNow===true||p?.videoDetails?.isLive===true)&&
   !liveInfo?.endTimestamp&&!p?.videoDetails?.isUpcoming){
   const pictures=p?.videoDetails?.thumbnail?.thumbnails||[];
   const live=makeStream(handle,p?.videoDetails?.videoId,p?.videoDetails?.title,pictures[pictures.length-1]?.url);
   if(live)return live;
  }
  const listed=liveFromChannel(handle,assignedObject(html,"ytInitialData"));
  if(listed)return listed;
 }
 if(responses.every(x=>x.status==="rejected"))throw Error("YouTube public status unavailable");
 return null;
}
async function api(path,fields){
 const q=new URL("https://www.googleapis.com/youtube/v3/"+path);
 Object.entries(fields).forEach(([k,v])=>q.searchParams.set(k,String(v)));q.searchParams.set("key",key);
 const r=await fetch(q.toString(),{signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error("YouTube API HTTP "+r.status);return r.json();
}
async function official(handle){
 const c=await api("channels",{part:"id",forHandle:"@"+handle});
 const id=c?.items?.[0]?.id;if(!/^UC[a-z0-9_-]{22}$/i.test(id||""))return null;
 const r=await api("search",{part:"snippet",channelId:id,type:"video",eventType:"live",maxResults:3});
 const v=(Array.isArray(r.items)?r.items:[]).find(x=>validVideo.test(x.id?.videoId||"")&&x.snippet?.liveBroadcastContent==="live");
 return v?makeStream(handle,v.id.videoId,v.snippet?.title,v.snippet?.thumbnails?.high?.url||v.snippet?.thumbnails?.medium?.url):null;
}
async function get(handle){
 const hit=cache.get(handle);if(hit&&hit.until>Date.now())return hit.promise;
 const promise=(async()=>{
  if(key){try{return await official(handle);}catch(e){console.warn("NOWAY YouTube API unavailable:",e.message);}}
  return publicPage(handle);
 })();
 cache.set(handle,{until:Date.now()+(key?1200000:60000),promise});
 try{return await promise;}catch(e){cache.delete(handle);throw e;}
}
module.exports=async function(req,res){
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Method not allowed"});}
 const raw=typeof req.query?.handles==="string"?req.query.handles:"";
 const handles=[...new Set(raw.split(",").map(s=>s.trim().replace(/^@/,"").toLowerCase()).filter(s=>validHandle.test(s)))].slice(0,8);
 if(!handles.length)return res.status(200).json({configured:true,streams:[]});
 const checked=await Promise.allSettled(handles.map(get));
 const diagnostic=req.query?.diagnostic==="1";
 const checks=checked.map((item,index)=>({
  channel:handles[index],
  state:item.status==="rejected"?"unavailable":item.value?"live":"not_detected"
 }));
 const streams=checked.filter(x=>x.status==="fulfilled"&&x.value).map(x=>x.value);
 if(checked.every(x=>x.status==="rejected")){
  res.setHeader("Cache-Control","no-store");
  return res.status(503).json({
   configured:true,streams:[],error:"Live status temporarily unavailable",
   ...(diagnostic?{diagnostic:{source:key?"youtube_data_api":"public_page",apiConfigured:!!key,checks}}:{})
  });
 }
 res.setHeader("Cache-Control",diagnostic?"no-store":"public, s-maxage="+(key?1200:60)+", stale-while-revalidate=90");
 return res.status(200).json({
  configured:true,streams,
  ...(diagnostic?{diagnostic:{
    source:key?"youtube_data_api":"public_page",apiConfigured:!!key,
    checks,description:"not_detected nao comprova que o canal esteja offline; consultas publicas podem nao detectar lives."
  }}:{})
 });
};
