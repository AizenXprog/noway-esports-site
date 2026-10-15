/* NOWAY — cursor reativo global / edição 3.
   Rastro, retículo e iluminação contínuos em todo o site.
   Usa apenas transforms, sem inclinar cards nem interferir no layout. */
(() => {
  "use strict";
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  if (!finePointer.matches || reduceMotion.matches) return;

  const root = document.documentElement;
  const host = document.createElement("div");
  host.id = "noway-cursor-fx";
  host.setAttribute("aria-hidden", "true");
  host.innerHTML =
    '<div class="noway-pointer-glow"></div>' +
    '<div class="noway-pointer-reticle"><i></i><b></b></div>' +
    '<div class="noway-pointer-trail"></div>';
  document.body.appendChild(host);

  const glow = host.querySelector(".noway-pointer-glow");
  const reticle = host.querySelector(".noway-pointer-reticle");
  const container = host.querySelector(".noway-pointer-trail");
  const dots = Array.from({length:11},(_,i)=>{
    const dot=document.createElement("span");
    dot.className="noway-pointer-particle";
    dot.style.setProperty("--particle-size",Math.max(2.1,7.2-i*.47).toFixed(1)+"px");
    dot.style.setProperty("--particle-opacity",(0.75-i*.054).toFixed(3));
    container.appendChild(dot);
    return {element:dot,x:0,y:0};
  });

  let targetX=-100, targetY=-100, x=-100,y=-100, glowX=-100,glowY=-100;
  let active=false, inter=false, raf=0, lastFrame=0;
  let visible=true;
  function getInteractive(target){
    return !!target?.closest?.('a,button,[role="button"],.player-card,input,textarea,select,label,summary');
  }
  function getEditing(target){
    return !!target?.closest?.('input,textarea,select,[contenteditable="true"]');
  }

  function onPointer(event){
    if (event.pointerType==="touch") return;
    targetX=event.clientX;
    targetY=event.clientY;
    if (!active){
      active=true;
      x=glowX=targetX;y=glowY=targetY;
      dots.forEach(dot=>{dot.x=targetX;dot.y=targetY;});
      host.classList.add("is-visible");
    }
    inter=getInteractive(event.target);
    host.classList.toggle("is-interactive",inter);
    host.classList.toggle("is-editing",getEditing(event.target));
    if (!raf && visible) raf=requestAnimationFrame(frame);
  }

  function frame(now){
    raf=0;
    if (!active || !visible)return;
    // Quando o browser limita os frames, o easing continua estável.
    const dt=Math.min(48,Math.max(8,lastFrame?now-lastFrame:16));
    lastFrame=now;
    const chase=1-Math.pow(.79,dt/16);
    const follow=1-Math.pow(.88,dt/16);
    x+=(targetX-x)*chase; y+=(targetY-y)*chase;
    glowX+=(targetX-glowX)*follow;
    glowY+=(targetY-glowY)*follow;
    const amount=inter?1.26:1;
    reticle.style.transform="translate3d("+x.toFixed(1)+"px,"+y.toFixed(1)+"px,0) translate(-50%,-50%) scale("+amount+")";
    glow.style.transform="translate3d("+glowX.toFixed(1)+"px,"+glowY.toFixed(1)+"px,0) translate(-50%,-50%)";
    let tx=x,ty=y;
    for(let i=0;i<dots.length;i++){
      const dot=dots[i];
      const k=1-Math.pow(.52+(i/dots.length)*.40,dt/16);
      dot.x+=(tx-dot.x)*k;dot.y+=(ty-dot.y)*k;
      dot.element.style.transform="translate3d("+dot.x.toFixed(1)+"px,"+dot.y.toFixed(1)+"px,0) translate(-50%,-50%)";
      tx=dot.x;ty=dot.y;
    }
    raf=requestAnimationFrame(frame);
  }

  function hide(){
    active=false;lastFrame=0;
    host.classList.remove("is-visible","is-interactive","is-editing");
    if(raf){cancelAnimationFrame(raf);raf=0;}
  }
  function resume(){if(active && !raf && visible)raf=requestAnimationFrame(frame);}
  function preferenceChange(){
    // Nunca esconder o ponteiro nativo quando o usuário passa a touch/reduced motion.
    const enabled=finePointer.matches&&!reduceMotion.matches;
    root.classList.toggle("noway-cursor-mode",enabled);
    if(!enabled)hide();
  }

  const playerModal=document.getElementById("playerModal");
  function positionLayer(){
    // <dialog> fica no top layer do navegador: o efeito acompanha o jogador no modal.
    const parent=playerModal?.open?playerModal:document.body;
    if(host.parentElement!==parent)parent.appendChild(host);
  }
  if(playerModal){
    new MutationObserver(positionLayer).observe(playerModal,{attributes:true,attributeFilter:["open"]});
  }

  document.addEventListener("pointermove",onPointer,{passive:true});
  document.addEventListener("pointerover",event=>{
    if (!active)return;
    host.classList.toggle("is-interactive",getInteractive(event.target));
    host.classList.toggle("is-editing",getEditing(event.target));
  },{passive:true});
  document.documentElement.addEventListener("mouseleave",hide);
  window.addEventListener("blur",hide);
  document.addEventListener("visibilitychange",()=>{
    visible=!document.hidden;
    if(!visible)hide();
    else resume();
  });
  finePointer.addEventListener?.("change",preferenceChange);
  reduceMotion.addEventListener?.("change",preferenceChange);
  // Ativa somente depois dos elementos serem criados; sem JS o cursor nativo permanece.
  preferenceChange();
})();
