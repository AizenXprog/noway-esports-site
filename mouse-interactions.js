/* NOWAY / Interações v4.1 — cursor imediato, rastro curto e inclinação dos cards.
   Usa RAF apenas enquanto há movimento; nenhuma biblioteca, sem interferir em touch. */
(() => {
  'use strict';
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const lowPower = (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    Boolean(navigator.connection?.saveData);
  // On limited hardware prefer immediate native cursor; keep premium effects on capable devices.
  if (!fine.matches || reduced.matches || lowPower) return;

  const root = document.documentElement;
  const host = document.createElement('div');
  host.id = 'noway-cursor-fx';
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = '<div class="noway-pointer-glow"></div>' +
    '<div class="noway-pointer-reticle"><i></i><b></b></div>' +
    '<div class="noway-pointer-trail"></div>';
  document.body.appendChild(host);

  const glow = host.querySelector('.noway-pointer-glow');
  const reticle = host.querySelector('.noway-pointer-reticle');
  const trail = host.querySelector('.noway-pointer-trail');
  const dots = Array.from({length:7}, (_,i) => {
    const element = document.createElement('span');
    element.className = 'noway-pointer-particle';
    element.style.setProperty('--particle-size', (5.2-i*.48).toFixed(1)+'px');
    element.style.setProperty('--particle-opacity', (.64-i*.073).toFixed(2));
    trail.appendChild(element);
    return { element, x:0, y:0 };
  });

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const interactiveSelector='a,button,[role="button"],.player-card,input,textarea,select,label,summary';
  const textSelector='input,textarea,select,[contenteditable="true"]';
  const position=(el,x,y)=>{el.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0) translate(-50%,-50%)';};

  let currentX=0,currentY=0, glowX=0,glowY=0;
  let active=false,visible=!document.hidden,enabled=true,raf=0,lastFrame=0;
  let hoveredCard=null,cardRect=null,wasInteractive=false,wasEditing=false;

  function resetCard(){
    if (!hoveredCard)return;
    hoveredCard.style.setProperty('--noway-tilt-x','0deg');
    hoveredCard.style.setProperty('--noway-tilt-y','0deg');
    hoveredCard=null;cardRect=null;
  }
  function updateCard(target,x,y){
    const card=target?.closest?.('.player-card');
    if(card!==hoveredCard){
      resetCard();
      if(card){hoveredCard=card;cardRect=card.getBoundingClientRect();}
    }
    if(!cardRect||!cardRect.width||!cardRect.height)return;
    const dx=clamp((x-cardRect.left)/cardRect.width-.5,-.5,.5);
    const dy=clamp((y-cardRect.top)/cardRect.height-.5,-.5,.5);
    card.style.setProperty('--noway-tilt-x',(-dy*5.5).toFixed(2)+'deg');
    card.style.setProperty('--noway-tilt-y',(dx*5.5).toFixed(2)+'deg');
  }
  function hoverState(target){
    const isInteractive=Boolean(target?.closest?.(interactiveSelector));
    const isEditing=Boolean(target?.closest?.(textSelector));
    if(isInteractive!==wasInteractive){
      wasInteractive=isInteractive;
      host.classList.toggle('is-interactive',isInteractive);
      // Realce via CSS, sem escalar a mira e afetar o ponto de referência.
    }
    if(isEditing!==wasEditing){
      wasEditing=isEditing;
      host.classList.toggle('is-editing',isEditing);
    }
  }
  function start(){
    if(!enabled||!visible)return;
    if(!raf)raf=requestAnimationFrame(frame);
  }
  function pointerMove(event){
    if(!enabled||!visible||event.pointerType==='touch')return;
    const x=event.clientX,y=event.clientY;
    // Ao entrar no navegador após sair ou ocorrer salto brusco do cursor,
    // o rastro se reagrupa em vez de deixar partículas perdidas pelo caminho.
    if(active && Math.hypot(x-currentX,y-currentY)>95){
      glowX=x;glowY=y;
      dots.forEach(dot=>{dot.x=x;dot.y=y;position(dot.element,x,y);});
    }
    currentX=x;currentY=y;
    // A mira fica exatamente nas coordenadas do mouse real.
    position(reticle,x,y);
    if(!active){
      active=true;glowX=x;glowY=y;
      position(glow,x,y);
      dots.forEach(dot=>{dot.x=x;dot.y=y;position(dot.element,x,y);});
      host.classList.add('is-visible');
    }
    hoverState(event.target);
    updateCard(event.target,x,y);
    start();
  }

  function frame(time){
    raf=0;
    if(!enabled||!active||!visible)return;
    const dt=Math.max(8,Math.min(36,lastFrame?time-lastFrame:16));
    lastFrame=time;

    // O centro da mira é imediato; o brilho e o rastro permanecem próximos.
    // Limites de distância independem do alvo (jogador, botão, link ou fundo).
    const glowGain=1-Math.pow(.38,dt/16);
    glowX+=(currentX-glowX)*glowGain;
    glowY+=(currentY-glowY)*glowGain;
    const glowDistance=Math.hypot(currentX-glowX,currentY-glowY);
    if(glowDistance>15){
      glowX=currentX+(glowX-currentX)*15/glowDistance;
      glowY=currentY+(glowY-currentY)*15/glowDistance;
    }
    position(glow,glowX,glowY);

    let unsettled=Math.abs(currentX-glowX)+Math.abs(currentY-glowY);
    for(let i=0;i<dots.length;i++){
      const dot=dots[i];
      // Não perseguir a partícula anterior: isso provocava o rastro se soltar
      // da mira, especialmente durante transições entre áreas clicáveis.
      const response=.69-i*.038;
      const gain=1-Math.pow(1-response,dt/16);
      dot.x+=(currentX-dot.x)*gain;
      dot.y+=(currentY-dot.y)*gain;
      const distance=Math.hypot(currentX-dot.x,currentY-dot.y);
      const limit=9+i*3.0; // comprimento máximo do rastro: 27px
      if(distance>limit){
        dot.x=currentX+(dot.x-currentX)*limit/distance;
        dot.y=currentY+(dot.y-currentY)*limit/distance;
      }
      position(dot.element,dot.x,dot.y);
      unsettled+=Math.abs(currentX-dot.x)+Math.abs(currentY-dot.y);
    }
    if(unsettled>.8)start();
    else lastFrame=0;
  }

  function hide(){
    active=false;lastFrame=0;
    host.classList.remove('is-visible','is-interactive','is-editing');
    wasInteractive=false;wasEditing=false;
    resetCard();
    if(raf){cancelAnimationFrame(raf);raf=0;}
  }
  function applyPreferences(){
    enabled=fine.matches&&!reduced.matches;
    root.classList.toggle('noway-cursor-mode',enabled);
    if(!enabled)hide();
  }

  const modal=document.getElementById('playerModal');
  function syncLayer(){
    // O dialog nativo vive numa camada acima da página.
    const parent=modal?.open?modal:document.body;
    if(host.parentElement!==parent)parent.appendChild(host);
  }
  if(modal)new MutationObserver(syncLayer).observe(modal,{attributes:true,attributeFilter:['open']});

  document.addEventListener('pointermove',pointerMove,{passive:true});
  document.addEventListener('pointerover',event=>{
    if(active)hoverState(event.target);
  },{passive:true});
  document.addEventListener('pointerout',event=>{
    if(hoveredCard&&!hoveredCard.contains(event.relatedTarget))resetCard();
  },{passive:true});
  document.documentElement.addEventListener('mouseleave',hide);
  window.addEventListener('blur',hide);
  document.addEventListener('visibilitychange',()=>{
    visible=!document.hidden;
    if(!visible)hide();
  });
  fine.addEventListener?.('change',applyPreferences);
  reduced.addEventListener?.('change',applyPreferences);
  applyPreferences();
})();
