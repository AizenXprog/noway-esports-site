/* NOWAY — últimos resultados publicados pela organização. 
   Dados publicados são retornados por função segura, sem acesso aos relatórios internos. */
(function(){
  "use strict";
  const root=document.getElementById("nowayRecentResults");
  const refresh=document.getElementById("nowayResultsRefresh");
  if(!root)return;
  const endpoint="https://vdipsufzlqmnprbjiojb.supabase.co/rest/v1/rpc/noway_public_recent_matches";
  const apikey="sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e";
  const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const resultName={vitoria:"VITÓRIA",derrota:"DERROTA",empate:"EMPATE"};
  const matchName={scrim:"SCRIM",disputa:"DISPUTA",partida:"PARTIDA"};
  const dateString=ts=>{
    try{return new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"short",year:"numeric"}).format(new Date(ts));}
    catch{return "—";}
  };
  let refreshing=false;
  async function loadResults(){
    if(refreshing)return;
    refreshing=true;
    loadResults.lastRun=Date.now();
    if(refresh)refresh.disabled=true;
    root.setAttribute("aria-busy","true");
    root.innerHTML='<div class="noway-results-empty">Atualizando resultados oficiais...</div>';
    try{
      const response=await fetch(endpoint,{
        method:"POST",headers:{"apikey":apikey,"Content-Type":"application/json"},
        body:JSON.stringify({p_limit:6}),cache:"no-store",credentials:"omit"
      });
      if(!response.ok)throw Error("Não foi possível consultar os confrontos");
      const data=await response.json();
      if(!Array.isArray(data))throw Error("Resposta inesperada do servidor");
      root.innerHTML=data.length?data.map((game,i)=>{
        const result=resultName[game.result]||"RESULTADO";
        const score=Number.isInteger(game.our_score)&&Number.isInteger(game.opponent_score)?
          game.our_score+" : "+game.opponent_score:"— : —";
        const maps=Array.isArray(game.maps)?game.maps:[];
        return '<article class="noway-results-card '+escape(game.result)+'">'+
          '<div class="noway-results-card-top"><span>CONFRONTO '+String(i+1).padStart(2,"0")+
          ' / '+escape(dateString(game.played_at))+'</span>'+
          '<div class="nw-result-badges">'+(game.featured?'<span class="nw-result-featured">★ DESTAQUE</span>':"")+
          '<strong>'+escape(result)+'</strong></div></div>'+
          '<div class="noway-results-scoreboard"><div class="noway-results-team home"><span>NOWAY ESPORTS</span><b>NOWAY</b></div>'+
          '<div class="noway-results-final"><strong>'+escape(score)+'</strong><span>MD'+escape(game.best_of||1)+' / FINAL</span></div>'+
          '<div class="noway-results-team rival"><span>ADVERSÁRIO</span><b>'+escape(game.opponent||"A DEFINIR")+'</b></div></div>'+
          '<div class="noway-results-card-bottom"><span>'+escape(matchName[game.match_type]||"PARTIDA")+
          ' · '+escape(game.competition||"COMPETITIVO")+'</span>'+
          (maps.length?'<div>'+maps.map(map=>
            '<span class="noway-results-map">'+escape(map.name)+' <b>'+escape(map.our_rounds)+'–'+escape(map.opponent_rounds)+'</b></span>'
           ).join("")+'</div>':'')+'</div>'+
          '</article>';
      }).join(""):'<div class="noway-results-empty"><span>00 / REGISTROS</span>'+
        '<strong>A HISTÓRIA AINDA ESTÁ SENDO ESCRITA.</strong>'+
        '<p>Assim que a NOWAY registrar uma partida finalizada, o placar aparecerá aqui automaticamente.</p></div>';
    }catch(error){
      root.innerHTML='<div class="noway-results-empty"><strong>RESULTADOS INDISPONÍVEIS.</strong>'+
        '<p>Não foi possível carregar o histórico agora. Tente atualizar em alguns instantes.</p></div>';
      console.warn("NOWAY resultados públicos:",error?.message||error);
    }finally{
      root.removeAttribute("aria-busy");
      if(refresh)refresh.disabled=false;
      refreshing=false;
    }
  }
  refresh?.addEventListener("click",loadResults);
  setInterval(()=>{if(!document.hidden&&Date.now()-loadResults.lastRun>300000)loadResults();},60000);
  loadResults();
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden&&Date.now()-loadResults.lastRun>120000){loadResults.lastRun=Date.now();loadResults();}
  });
})();
