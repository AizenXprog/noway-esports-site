/* NOWAY · homenagem temporária ao Ace.
   Exibida exclusivamente no perfil do jogador durante 7 dias:
   15/10/2026 12h20 até 22/10/2026 12h20 (horário de Brasília).
   Não altera o conteúdo permanente da biografia. */
(function(){
  "use strict";
  const START=Date.parse("2026-10-15T12:20:00-03:00");
  const END=Date.parse("2026-10-22T12:20:00-03:00");
  const modal=document.getElementById("playerModal");
  const baseOpen=window.showProfile;
  if(!modal||typeof baseOpen!=="function")return;
  let raf=0,effectLayer=null,resizeListener=null,timeout=0;
  let currentToken=0;

  function active(){
    const now=Date.now();
    return now>=START&&now<END;
  }
  function stopEffects(){
    currentToken++;
    if(raf){cancelAnimationFrame(raf);raf=0;}
    if(timeout){clearTimeout(timeout);timeout=0;}
    if(resizeListener){window.removeEventListener("resize",resizeListener);resizeListener=null;}
    if(effectLayer){effectLayer.remove();effectLayer=null;}
    modal.classList.remove("has-ace-celebration");
  }
  function addCelebrationCard(){
    const content=modal.querySelector(".modal-body");
    if(!content)return;
    const role=content.querySelector(".modal-role");
    const card=document.createElement("section");
    card.className="ace-celebration-card";
    card.setAttribute("role","note");
    card.setAttribute("aria-label","Homenagem especial ao Ace pela paternidade");
    card.innerHTML=
      '<div class="ace-celebration-eyebrow"><span class="ace-celebration-star" aria-hidden="true">✦</span> HOMENAGEM ESPECIAL / NOWAY ESPORTS <span aria-hidden="true">✦</span></div>'+
      '<h3>PARABÉNS<span>, PAPAI!</span></h3>'+
      '<div class="ace-celebration-line" aria-hidden="true"></div>'+
      '<p class="ace-celebration-lead">Ace, hoje a maior conquista acontece fora do servidor.</p>'+
      '<p>Ser pai é começar uma história de amor, descobertas e momentos que ficam para sempre. A NOWAY e os amigos que estão ao seu lado estão muito felizes por você e por essa nova fase.</p>'+
      '<p>Obrigado por fazer parte da nossa equipe, pela dedicação, pela parceria e por tudo que acrescenta à nossa caminhada. Sua presença aqui importa muito para nós.</p>'+
      '<p>Aproveite cada instante desse momento tão especial com a sua família. Que não faltem carinho, saúde, alegria e boas lembranças nesse novo capítulo.</p>'+
      '<strong class="ace-celebration-signature">Com carinho, a NOWAY e seus amigos. <span>♥</span></strong>';
    if(role)role.insertAdjacentElement("afterend",card);
    else content.prepend(card);
    modal.classList.add("has-ace-celebration");
  }
  function startEffects(){
    if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)return;
    const token=++currentToken;
    const overlay=document.createElement("div");
    overlay.className="ace-celebration-effects";
    overlay.setAttribute("aria-hidden","true");
    const canvas=document.createElement("canvas");
    overlay.appendChild(canvas);
    modal.appendChild(overlay);
    effectLayer=overlay;
    const ctx=canvas.getContext("2d",{alpha:true});
    if(!ctx){overlay.remove();effectLayer=null;return;}

    let width=0,height=0,particles=[],confetti=[],last=0;
    const random=(min,max)=>min+Math.random()*(max-min);
    const colors=["#f2ff00","#f8ff66","#fff7b7","#f9d836","#0c100d","#141917"];
    function resize(){
      if(token!==currentToken)return;
      const rect=modal.getBoundingClientRect();
      const dpr=Math.min(window.devicePixelRatio||1,2);
      width=Math.max(1,rect.width);height=Math.max(1,rect.height);
      canvas.width=Math.round(width*dpr);
      canvas.height=Math.round(height*dpr);
      canvas.style.width=width+"px";
      canvas.style.height=height+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    resize();
    resizeListener=resize;
    window.addEventListener("resize",resize);
    for(let i=0;i<125;i++){
      const dark=i%5===0;
      confetti.push({
        x:random(0,width),y:random(-height*.9,-5),vx:random(-.75,.75),
        vy:random(1.4,3.2),rot:random(0,Math.PI*2),spin:random(-.10,.10),
        size:random(4,9),dark,color:dark?"#080a09":(i%4===0?"#f7d300":"#f2ff00"),
        phase:random(0,Math.PI*2)
      });
    }
    function explode(cx,cy){
      const count=52;
      for(let i=0;i<count;i++){
        const angle=i*(Math.PI*2/count)+random(-.07,.07);
        const speed=random(1.7,5.5);
        const color=colors[i%colors.length];
        particles.push({
          x:cx,y:cy,px:cx,py:cy,
          vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
          age:0,life:random(42,85),color,dark:color==="#0c100d"||color==="#141917",
          radius:random(1.1,2.2)
        });
      }
    }
    const bursts=[.08,.53,1.02,1.47,2.11,2.72,3.25,4.15,4.85,5.5];
    let fired=0,start=null;
    function frame(time){
      if(token!==currentToken||!modal.open)return stopEffects();
      if(start===null)start=time;
      const elapsed=time-start;
      const step=Math.min((time-(last||time))/16.6667,2);
      last=time;
      while(fired<bursts.length&&elapsed>=bursts[fired]*1000){
        const x=width*random(.12,.88),y=height*random(.10,.54);
        explode(x,y);fired++;
      }
      ctx.clearRect(0,0,width,height);
      for(const p of confetti){
        p.y+=p.vy*step;p.x+=(p.vx+Math.sin(p.y*.011+p.phase)*.32)*step;p.rot+=p.spin*step;
        if(p.y>height+15){p.y=-15;p.x=random(0,width);}
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
        ctx.fillStyle=p.color;
        if(p.dark){
          ctx.strokeStyle="#f2ff00";ctx.lineWidth=.9;
          ctx.strokeRect(-p.size*.55,-p.size*.33,p.size*1.1,p.size*.65);
        }
        ctx.fillRect(-p.size*.55,-p.size*.33,p.size*1.1,p.size*.65);
        ctx.restore();
      }
      particles=particles.filter(p=>p.age<p.life);
      for(const p of particles){
        p.px=p.x;p.py=p.y;
        p.x+=p.vx*step;p.y+=p.vy*step;
        p.vx*=Math.pow(.982,step);p.vy=p.vy*Math.pow(.982,step)+.038*step;
        p.age+=step;
        const alpha=Math.max(0,1-p.age/p.life);
        ctx.globalAlpha=alpha;
        ctx.beginPath();ctx.moveTo(p.px,p.py);ctx.lineTo(p.x,p.y);
        ctx.lineWidth=p.dark?3:2.5;
        ctx.strokeStyle=p.dark?"#f2ff00":p.color;
        ctx.stroke();
        ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);
        ctx.fillStyle=p.color;
        ctx.fill();
        if(p.dark){ctx.strokeStyle="#f2ff00";ctx.lineWidth=1;ctx.stroke();}
      }
      ctx.globalAlpha=1;
      if(elapsed<7200)raf=requestAnimationFrame(frame);
      else{
        if(resizeListener){window.removeEventListener("resize",resizeListener);resizeListener=null;}
        if(effectLayer){effectLayer.remove();effectLayer=null;}
        raf=0;
      }
    }
    raf=requestAnimationFrame(frame);
    timeout=setTimeout(()=>{
      if(token===currentToken&&raf){cancelAnimationFrame(raf);raf=0;}
      if(token===currentToken&&effectLayer){effectLayer.remove();effectLayer=null;}
      if(resizeListener){window.removeEventListener("resize",resizeListener);resizeListener=null;}
      timeout=0;
    },9000);
  }

  window.showProfile=function(person){
    stopEffects();
    baseOpen(person);
    if(person?.id!=="ace"||!active())return;
    addCelebrationCard();
    requestAnimationFrame(()=>{
      if(modal.open&&person?.id==="ace"&&active())startEffects();
    });
  };
  modal.addEventListener("close",stopEffects);
  modal.addEventListener("cancel",stopEffects);
})();
