// NOWAY / Últimos postados e destaque semanal: somente vídeos públicos reais do elenco.
(() => {
 const grid=document.getElementById("nowayLatestGrid"),status=document.getElementById("nowayLatestStatus"),
   retry=document.getElementById("nowayLatestRetry"),weekly=document.getElementById("nowayWeeklyFeatured");
 const team=window.NOWAY_DATA?.team||[];
 if(!grid||!status||!retry||!weekly)return;
 const REFRESH_MS=5*60*1000;
 const FEATURED_CACHE_KEY="noway.roster_last_confirmed_feature_v1";
 let busy=false,last=0,started=false;
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const member=id=>team.find(p=>p.id===id&&!p.vacancy);
 const validVideo=p=>p&&member(p.memberId)&&(p.platform==="youtube"?/^[a-z0-9_-]{11}$/i.test(String(p.videoId||"")):
   p.platform==="twitch"&&/^\d+$/.test(String(p.videoId||"")));
 const link=p=>p.platform==="youtube"?"https://www.youtube.com/watch?v="+p.videoId:"https://www.twitch.tv/videos/"+p.videoId;
 const same=(a,b)=>a&&b&&a.platform===b.platform&&String(a.videoId)===String(b.videoId);

 const count=n=>Number.isSafeInteger(n)&&n>=0?n.toLocaleString("pt-BR"):"—";
 function cachedChampion(){
   try{
     const data=JSON.parse(localStorage.getItem(FEATURED_CACHE_KEY)||"null");
     const v=data?.video;
     return validVideo(v)&&Number.isSafeInteger(v.viewCount)&&v.viewCount>=0?v:null;
   }catch{return null;}
 }
 function saveChampion(v){
   try{
     if(!validVideo(v)||!Number.isSafeInteger(v.viewCount)||v.viewCount<0)return;
     // Somente informações públicas fornecidas por resposta oficial confirmada.
     const data={platform:v.platform,memberId:v.memberId,videoId:v.videoId,viewCount:v.viewCount,
       publishedAt:v.publishedAt,title:v.title,thumbnail:v.thumbnail};
     localStorage.setItem(FEATURED_CACHE_KEY,JSON.stringify({savedAt:new Date().toISOString(),video:data}));
   }catch{/* Armazenamento opcional, sem bloquear a vitrine. */}
 }

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
 function renderWeekly(featured,partial,configured){
   const confirmed=!partial&&validVideo(featured)&&Number.isSafeInteger(featured.viewCount)&&featured.viewCount>=0;
   if(confirmed)saveChampion(featured);
   const remembered=!confirmed&&Boolean(cachedChampion());
   if(remembered)featured=cachedChampion();
   const ok=confirmed||remembered;
   if(!ok){
     const title=!configured?"AGUARDANDO CONEXÃO DOS CANAIS.":partial?
       "ATUALIZANDO OS DADOS DE AUDIÊNCIA.":"NENHUM VÍDEO DISPONÍVEL.";
     const note=partial?"A classificação aguarda os dados oficiais de todos os canais.":
       "O destaque aparecerá quando encontrarmos visualizações públicas nos canais do elenco.";
     weekly.innerHTML='<div class="nw-weekly-empty"><span class="nw-weekly-eyebrow">✦ RECORDISTA DA NOWAY</span><strong>'+
       title+'</strong><p>'+note+'</p></div>';
     return;
   }
   const person=member(featured.memberId),yt=featured.platform==="youtube",src=image(featured.thumbnail);
   weekly.innerHTML='<a class="nw-weekly-card'+(remembered?' is-last-confirmed':'')+'" href="'+esc(link(featured))+'" target="_blank" rel="noopener noreferrer"'+
     ' aria-label="Assistir destaque da semana: '+esc(featured.title)+' de '+esc(person.name)+'">'+
     '<span class="nw-weekly-art">'+(src?'<img src="'+esc(src)+'" alt="" loading="lazy">':'<span class="nw-post-no-thumb">NOWAY / DESTAQUE</span>')+
     '<span class="nw-weekly-play" aria-hidden="true">▶</span><span class="nw-weekly-tag">★ Nº 1 EM VISUALIZAÇÕES</span></span>'+
     '<span class="nw-weekly-copy"><span class="nw-weekly-eyebrow">'+(remembered?'◆ ÚLTIMO LÍDER CONFIRMADO':'★ DESTAQUE PRINCIPAL')+' · '+(yt?"YOUTUBE":"TWITCH")+'</span>'+
     '<strong class="nw-weekly-title">'+esc(featured.title)+'</strong>'+
     '<span class="nw-weekly-author">'+esc(person.name)+' <span>· '+esc(when(featured.publishedAt))+'</span></span>'+
     '<span class="nw-weekly-count"><strong>'+count(featured.viewCount)+'</strong><small>VISUALIZAÇÕES REAIS</small></span>'+
     '<span class="nw-weekly-rule"><span class="nw-weekly-streak">◆ '+(remembered?'ÚLTIMA LEITURA DISPONÍVEL':'LÍDER DE AUDIÊNCIA')+'</span> '+(remembered?'Aguardando nova confirmação das plataformas.':'Permanece em destaque até outro vídeo do elenco ultrapassar suas visualizações.')+'</span>'+
     '<span class="nw-weekly-cta">ASSISTIR DESTAQUE ↗</span></span></a>';
 }
 function render(posts,featured){
   const safe=posts.filter(validVideo);
   grid.innerHTML=safe.map(post=>{
     const person=member(post.memberId),yt=post.platform==="youtube",top=same(post,featured);
     const src=image(post.thumbnail),date=when(post.publishedAt);
     return '<a class="nw-post-card'+(top?' is-weekly-top':'')+'" href="'+esc(link(post))+
       '" target="_blank" rel="noopener noreferrer" aria-label="Assistir vídeo de '+esc(person.name)+'">'+
       '<span class="nw-post-thumb">'+(src?'<img src="'+esc(src)+'" alt="" loading="lazy">':'<span class="nw-post-no-thumb">NOWAY / PLAY</span>')+
       '<span class="nw-post-play" aria-hidden="true">▶</span><span class="nw-post-source">'+(yt?"YOUTUBE":"TWITCH")+'</span>'+
       (top?'<span class="nw-post-top-label">★ MAIS VISTO DA NOWAY</span>':'')+'</span>'+
       '<span class="nw-post-details"><span class="nw-post-author"><strong>'+esc(person.name)+'</strong><span>'+
       esc(post.kind||"VÍDEO")+(date?" · "+esc(date):"")+'</span></span>'+
       '<strong class="nw-post-title">'+esc(post.title)+'</strong>'+
       (Number.isSafeInteger(post.viewCount)&&post.viewCount>=0?
         '<span class="nw-post-viewcount">'+count(post.viewCount)+' VISUALIZAÇÕES</span>':'')+
       '<span class="nw-post-watch">ASSISTIR VÍDEO ↗</span></span></a>';
   }).join("");
   return safe.length;
 }
 async function load(force=false){
   if(busy||(!force&&last&&Date.now()-last<REFRESH_MS))return;
   if(!force&&document.hidden)return;
   busy=true;retry.hidden=true;status.textContent="ATUALIZANDO VÍDEOS E VISUALIZAÇÕES…";
   try{
     const response=await fetch("/api/latest-posts");
     if(!response.ok)throw Error("HTTP "+response.status);
     const data=await response.json();
     const winner=!data.partial&&validVideo(data.featured)?data.featured:null;
     renderWeekly(winner,Boolean(data.partial),Boolean(data.configured));
     const countPosts=render(Array.isArray(data.posts)?data.posts:[],winner||(data.partial?cachedChampion():null));
     const checked=Date.parse(data.checkedAt||"");
     const clock=Number.isFinite(checked)?" · ATUALIZADO ÀS "+new Date(checked).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"";
     if(countPosts)status.textContent="VÍDEOS E GRAVAÇÕES DOS JOGADORES DA NOWAY"+(data.partial?" · ALGUNS CANAIS INDISPONÍVEIS":"")+clock;
     else if(data.partial)status.textContent="NÃO FOI POSSÍVEL CONSULTAR TODOS OS CANAIS AGORA."+clock;
     else status.textContent=(data.configured?"NENHUM VÍDEO RECENTE ENCONTRADO NOS CANAIS CADASTRADOS.":"AGUARDANDO CONFIGURAÇÃO DOS CANAIS DE VÍDEO.")+clock;
     retry.hidden=false;last=Date.now();
   }catch{
     status.textContent="NÃO FOI POSSÍVEL CARREGAR AS PUBLICAÇÕES AGORA.";
     renderWeekly(null,true,true);retry.hidden=false;
   }finally{busy=false;}
 }
 retry.addEventListener("click",()=>load(true));
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&started)load();});
 window.addEventListener("focus",()=>{if(started)load();});
 // Atualiza automaticamente enquanto a aba está ativa; não mantém downloads em abas ocultas.
 setInterval(()=>{if(started&&!document.hidden)load();},60*1000);
 if("IntersectionObserver" in window){
   const obs=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){obs.disconnect();started=true;load();}},{rootMargin:"650px"});
   obs.observe(weekly);
 }else {started=true;load();}
})();