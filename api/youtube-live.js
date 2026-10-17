// NOWAY / status de transmissões YouTube: apenas lives comprovadas.
const cache=new Map(), key=process.env.YOUTUBE_API_KEY||"";
const validHandle=/^[a-z0-9_.-]{3,30}$/i,validVideo=/^[a-z0-9_-]{11}$/i;
function playerFromHtml(text){
 const p=text.indexOf("ytInitialPlayerResponse");if(p<0)return null;
 const eq=text.indexOf("=",p+23);if(eq<0||eq-p>95)return null;
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
async function publicPage(handle){
 const target="https://www.youtube.com/@"+encodeURIComponent(handle)+"/live";
 const r=await fetch(target,{redirect:"follow",signal:AbortSignal.timeout(8000),
  headers:{"User-Agent":"Mozilla/5.0","Accept-Language":"en-US,en;q=0.8"}});
 if(!r.ok)throw Error("YouTube HTTP "+r.status);
 if(!["www.youtube.com","youtube.com"].includes(new URL(r.url||target).hostname))throw Error("Redirect outside YouTube");
 const p=playerFromHtml((await r.text()).slice(0,3000000));
 if(p?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails?.isLiveNow!==true)return null;
 const images=p?.videoDetails?.thumbnail?.thumbnails||[];
 return makeStream(handle,p?.videoDetails?.videoId,p?.videoDetails?.title,images[images.length-1]?.url);
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
 cache.set(handle,{until:Date.now()+(key?1200000:150000),promise});
 try{return await promise;}catch(e){cache.delete(handle);throw e;}
}
module.exports=async function(req,res){
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Method not allowed"});}
 const raw=typeof req.query?.handles==="string"?req.query.handles:"";
 const handles=[...new Set(raw.split(",").map(s=>s.trim().replace(/^@/,"").toLowerCase()).filter(s=>validHandle.test(s)))].slice(0,8);
 if(!handles.length)return res.status(200).json({configured:true,streams:[]});
 const checked=await Promise.allSettled(handles.map(get));
 if(checked.every(x=>x.status==="rejected")){
  res.setHeader("Cache-Control","no-store");
  return res.status(503).json({configured:true,streams:[],error:"Live status temporarily unavailable"});
 }
 res.setHeader("Cache-Control","public, s-maxage="+(key?1200:120)+", stale-while-revalidate=90");
 return res.status(200).json({configured:true,streams:checked.filter(x=>x.status==="fulfilled"&&x.value).map(x=>x.value)});
};
