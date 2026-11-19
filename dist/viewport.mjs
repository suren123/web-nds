// Safari emits intermediate viewport sizes during rotation/browser-bar animation.
// Commit after the burst; never turn visualViewport offsets into page padding.
export function installViewport({win=window,doc=document,onResize=()=>{},delay=160}={}){
 const style=doc.documentElement.style;
 let timer,previous='',anchorPending=false;
 const typing=()=>['INPUT','TEXTAREA','SELECT'].includes(doc.activeElement?.tagName)||doc.activeElement?.isContentEditable;
 if(win.navigator?.standalone||win.matchMedia?.('(display-mode: standalone)').matches)doc.body.classList.add('standalone');
 function settle(){
  const visual=win.visualViewport;
  // Preserve pinch zoom; editing with the software keyboard must remain scrollable.
  if(visual&&Math.abs((visual.scale||1)-1)>.01)return;
  const width=Math.round(win.innerWidth),height=Math.round(visual?.height||win.innerHeight);
  if(width>0&&height>0){
   const next=width+':'+height;
   if(next!==previous){style?.setProperty('--app-height',height+'px');if(previous)onResize();previous=next;}
  }
  if(anchorPending&&!typing()){
   anchorPending=false;
   win.scrollTo?.({top:0,left:0,behavior:'instant'});
  }
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(settle,delay);}
 function anchor(){anchorPending=true;schedule();}
 function rotate(){onResize();anchor();}
 win.addEventListener('resize',schedule);
 win.visualViewport?.addEventListener('resize',schedule);
 win.addEventListener('orientationchange',rotate);
 win.screen?.orientation?.addEventListener('change',rotate);
 win.addEventListener('pageshow',schedule);
 doc.addEventListener('focusout',schedule);
 doc.addEventListener('fullscreenchange',anchor);
 settle();
 return {anchor};
}
