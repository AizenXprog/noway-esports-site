// NOWAY: vídeos recentes consultados com dados públicos, nunca simulados.
(() => {
 const grid=document.getElementById("nowayLatestGrid"),status=document.getElementById("nowayLatestStatus"),retry=document.getElementById("nowayLatestRetry");
 const team=window.NOWAY_DATA?.team||[];
 if(!grid||!status)return;
 let busy=false,last=0;
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const member=id=>team.find(p=>p.id===id&&!p.vacancy);
 function image(url){
   try{const u=new URL(url);return u.protocol==="https:"&&["i.ytimg.com","img.youtube.com","static-cdn.jtvnw.net"].includes(u.hostname)?u.href:"";}catch{return"";}
 }
 function when(date){
   const time=Date.parse(date),age=Date.now()-time;
   if(!Number.isFinite(time))return"";
   if(age>=0&&age<86400000)return"HOJE";
   if(age>=86400000&&age<172800000)return"ONTEM";
   if(age>=0&&age<2592000000)return"HÁ "+Math.floor(age/86400000)+" DIAS";
   return new Date(time).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase();
 }
 function render(posts){
   const safe=posts.filter(p=>member(p.memberId)&&
     (p.platform==="youtube"?/^[a-z0-9_-]{11}$/i.test(String(p.videoId||"")):
       p.platform==="twitch"&&/^\d+$/.test(String(p.videoId||""))));
   grid.innerHTML=safe.map(post=>{
     const player=member(post.memberId),yt=post.platform==="youtube";
     const link=yt?"https://www.youtube.com/watch?v="+post.videoId:"https://www.twitch.tv/videos/"+post.videoId;
     const thumb=image(post.thumbnail),date=when(post.publishedAt);
     return '<a class="nw-post-card" href="'+esc(link)+'" target="_blank" rel="noopener noreferrer" aria-label="Assistir vídeo de '+esc(player.name)+'">'
     +'<span class="nw-post-thumb">'+(thumb?'<img src="'+esc(thumb)+'" alt="" loading="lazy">':'<span class="nw-post-no-thumb">NOWAY / PLAY</span>')
     +'<span class="nw-post-play" aria-hidden="true">▶</span><span class="nw-post-source">'+(yt?"YOUTUBE":"TWITCH")+'</span></span>'
     +'<span class="nw-post-details"><span class="nw-post-author"><strong>'+esc(player.name)+'</strong><span>'+esc(post.kind||"VÍDEO")+(date?" · "+esc(date):"")+'</span></span>'
     +'<strong class="nw-post-title">'+esc(post.title)+'</strong><span class="nw-post-watch">ASSISTIR VÍDEO ↗</span></span></a>';
   }).join("");
   return safe.length;
 }
 async function load(force=false){
   if(busy||(!force&&last&&Date.now()-last<1800000))return;
   busy=true;retry.hidden=true;status.textContent="BUSCANDO PUBLICAÇÕES DO ELENCO…";
   try{
     const response=await fetch("/api/latest-posts");
     if(!response.ok)throw Error("HTTP "+response.status);
     const data=await response.json(),count=render(Array.isArray(data.posts)?data.posts:[]);
     if(count)status.textContent="VÍDEOS E GRAVAÇÕES DOS JOGADORES DA NOWAY"+(data.partial?" · ALGUNS CANAIS INDISPONÍVEIS":"");
     else if(data.partial)status.textContent="NÃO FOI POSSÍVEL CONSULTAR TODOS OS CANAIS AGORA.";
     else status.textContent=data.configured?"NENHUM VÍDEO RECENTE ENCONTRADO NOS CANAIS CADASTRADOS.":"AGUARDANDO CONFIGURAÇÃO DOS CANAIS DE VÍDEO.";
     retry.hidden=Boolean(count&&!data.partial);last=Date.now();
   }catch{status.textContent="NÃO FOI POSSÍVEL CARREGAR AS PUBLICAÇÕES AGORA.";retry.hidden=false;}
   finally{busy=false;}
 }
 retry.addEventListener("click",()=>load(true));
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&last)load();});
 if("IntersectionObserver" in window){
   const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load();}},{rootMargin:"650px"});
   observer.observe(grid);
 }else load();
})();
