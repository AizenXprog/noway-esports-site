/* NOWAY — interações leves para ponteiro/mouse.
   Sem bibliotecas externas. Não roda em touch ou com redução de movimento ativa. */
(() => {
  'use strict';
  const pointerQuery=window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!pointerQuery.matches || motionQuery.matches) return;

  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const roster=document.getElementById('roster');

  function updateCard(card,event) {
    const rect=card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x=clamp((event.clientX-rect.left)/rect.width,0,1);
    const y=clamp((event.clientY-rect.top)/rect.height,0,1);
    card.style.setProperty('--noway-mouse-x',(x*100).toFixed(1)+'%');
    card.style.setProperty('--noway-mouse-y',(y*100).toFixed(1)+'%');
    // Apenas dois graus para não deformar fotografias nem dificultar a leitura.
    card.style.setProperty('--noway-tilt-x',((.5-y)*3.2).toFixed(2)+'deg');
    card.style.setProperty('--noway-tilt-y',((x-.5)*3.2).toFixed(2)+'deg');
  }
  function resetCard(card) {
    card.style.setProperty('--noway-tilt-x','0deg');
    card.style.setProperty('--noway-tilt-y','0deg');
  }

  // Event delegation: funciona mesmo após filtrar e renderizar novamente os jogadores.
  if (roster) {
    roster.addEventListener('pointermove',event=>{
      if (event.pointerType==='touch') return;
      const card=event.target.closest('.player-card');
      if (card && roster.contains(card)) updateCard(card,event);
    },{passive:true});
    roster.addEventListener('pointerout',event=>{
      const card=event.target.closest('.player-card');
      if (card && !card.contains(event.relatedTarget)) resetCard(card);
    });
  }

  const hero=document.querySelector('.hero');
  if (hero) {
    hero.addEventListener('pointermove',event=>{
      if (event.pointerType==='touch') return;
      const rect=hero.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx=clamp((event.clientX-rect.left)/rect.width-.5,-.5,.5);
      const ny=clamp((event.clientY-rect.top)/rect.height-.5,-.5,.5);
      hero.style.setProperty('--noway-hero-x',(nx*16).toFixed(1)+'px');
      hero.style.setProperty('--noway-hero-y',(ny*13).toFixed(1)+'px');
    },{passive:true});
    hero.addEventListener('pointerleave',()=>{
      hero.style.setProperty('--noway-hero-x','0px');
      hero.style.setProperty('--noway-hero-y','0px');
    });
  }

  document.querySelectorAll('.hero-cta .btn,.contact-actions .btn').forEach(button=>{
    button.addEventListener('pointermove',event=>{
      if (event.pointerType==='touch') return;
      const rect=button.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x=clamp((event.clientX-rect.left)/rect.width-.5,-.5,.5);
      const y=clamp((event.clientY-rect.top)/rect.height-.5,-.5,.5);
      button.style.setProperty('--noway-btn-x',(x*6).toFixed(1)+'px');
      button.style.setProperty('--noway-btn-y',(y*5).toFixed(1)+'px');
    },{passive:true});
    button.addEventListener('pointerleave',()=>{
      button.style.setProperty('--noway-btn-x','0px');
      button.style.setProperty('--noway-btn-y','0px');
    });
  }

  // Se a pessoa alterar a preferência de animação ou usar outro ponteiro,
  // tudo retorna ao estado neutro sem exigir recarregar a página.
  const resetAll=()=>{
    if (pointerQuery.matches && !motionQuery.matches) return;
    document.querySelectorAll('.player-card').forEach(resetCard);
    hero?.style.setProperty('--noway-hero-x','0px');
    hero?.style.setProperty('--noway-hero-y','0px');
    document.querySelectorAll('.hero-cta .btn,.contact-actions .btn').forEach(button=>{
      button.style.setProperty('--noway-btn-x','0px');
      button.style.setProperty('--noway-btn-y','0px');
    });
  };
  pointerQuery.addEventListener?.('change',resetAll);
  motionQuery.addEventListener?.('change',resetAll);
})();
