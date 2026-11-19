export const W=874,H=402;
export const DEFAULT={"version":2,"hideBottom":false,"swapped":false,"dpad":{"x":68,"y":236,"size":141,"padding":38,"opacity":85},"faces":[{"id":"x","x":700,"y":211,"size":62,"padding":4,"opacity":85},{"id":"y","x":609,"y":205,"size":62,"padding":4,"opacity":85},{"id":"a","x":705,"y":311,"size":62,"padding":4,"opacity":85},{"id":"b","x":610,"y":312,"size":62,"padding":4,"opacity":85}],"screens":{"main":{"x":255,"y":89,"width":400},"mini":{"x":42,"y":70,"width":160}},"buttons":[{"id":"l","label":"L","x":32,"y":12,"width":160,"height":44,"padding":0,"inputs":["l"],"opacity":85},{"id":"r","label":"R","x":698,"y":3,"width":170,"height":44,"padding":0,"inputs":["r"],"opacity":85},{"id":"comboA","label":"L + R + A","x":614,"y":130,"width":170,"height":46,"padding":0,"inputs":["l","r","a"],"opacity":85},{"id":"comboB","label":"L + R + B","x":617,"y":74,"width":170,"height":46,"padding":0,"inputs":["l","r","b"],"opacity":85},{"id":"menu","label":"MENU","x":215,"y":12,"width":84,"height":36,"padding":0,"inputs":["menu"],"opacity":85},{"id":"select","label":"SELECT","x":321,"y":3,"width":88,"height":36,"padding":0,"inputs":["select"],"opacity":85},{"id":"start","label":"START","x":442,"y":3,"width":84,"height":36,"padding":0,"inputs":["start"],"opacity":85},{"id":"swap","label":"SWAP","x":556,"y":8,"width":114,"height":36,"padding":0,"inputs":["reverseScreens"],"opacity":85}],"controlsOpacity":85};
export const clone=v=>JSON.parse(JSON.stringify(v));
export function rects(s){
 const d=s.dpad;
 const a=[{id:'dpad',kind:'dpad',x:d.x,y:d.y,width:d.size,height:d.size,padding:d.padding,opacity:d.opacity??100}];
 for(const f of s.faces)a.push({...f,kind:'face',label:f.id.toUpperCase(),inputs:[f.id],width:f.size,height:f.size});
 return a.concat(s.buttons.map(b=>({...b,kind:'button'})));
}
export function screens(s){return Object.entries(s.screens).map(([id,r])=>({id,...r,height:r.width*.75,touch:(id==='main')===s.swapped})).filter(r=>!s.hideBottom||!r.touch);}
export const expanded=r=>({x:r.x-r.padding,y:r.y-r.padding,width:r.width+2*r.padding,height:r.height+2*r.padding,shape:r.kind==='dpad'?'circle':'rect'});
export const contains=(r,p)=>r.shape==='circle'?Math.hypot(p.x-r.x-r.width/2,p.y-r.y-r.height/2)<=r.width/2:p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.width&&p.y<r.y+r.height;
export function overlap(a,b){if(a.shape==='circle'&&b.shape==='circle')return Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2)<(a.width+b.width)/2;if(a.shape==='circle'||b.shape==='circle'){const c=a.shape==='circle'?a:b,r=c===a?b:a,cx=c.x+c.width/2,cy=c.y+c.height/2;return Math.hypot(cx-Math.max(r.x,Math.min(cx,r.x+r.width)),cy-Math.max(r.y,Math.min(cy,r.y+r.height)))<c.width/2;}return Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>0.01&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>0.01;}

export function conflicts(s){const a=rects(s).map(r=>({...expanded(r),id:r.id,isScreen:false})).concat(screens(s).map(r=>({...r,isScreen:true})));const out=[];
 for(let i=0;i<a.length;i++){const r=a[i];if(r.x<0||r.y<0||r.x+r.width>W||r.y+r.height>H)out.push([r.id,'边界']);for(let j=i+1;j<a.length;j++)if(r.isScreen===a[j].isScreen&&overlap(r,a[j]))out.push([r.id,a[j].id]);}return out;}
export function hit(s,p){if(p.ignored)return null;const a=rects(s);if(p.stick===true){const r=a[0];return contains(expanded(r),p)?r:null;}let found=a.filter(r=>(r.kind!=='dpad'||p.stick!==false)&&contains(expanded(r),p));if(found.length>1)found.sort((a,b)=>Math.hypot(p.x-a.x-a.width/2,p.y-a.y-a.height/2)-Math.hypot(p.x-b.x-b.width/2,p.y-b.y-b.height/2));return found[0]||screens(s).find(r=>contains(r,p))||null;}
export function inputsAt(r,p){if(!r)return[];if(r.kind==='dpad'){if(!contains(expanded(r),p))return[];const dx=p.x-r.x-r.width/2,dy=p.y-r.y-r.height/2;if(Math.hypot(dx,dy)<r.width*.1)return[];const sector=(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8;return [['right'],['right','down'],['down'],['left','down'],['left'],['left','up'],['up'],['right','up']][sector];}return r.inputs||[];}
export function applyOpacity(s,value){s.controlsOpacity=value;s.dpad.opacity=value;for(const b of [...s.faces,...s.buttons])b.opacity=value;return s;}

export function held(s,pointers){const result=new Set();for(const p of pointers){const r=hit(s,p);for(const x of inputsAt(r,p))result.add(x);}return result;}
export function deltaMapping(s){s={...s,hideBottom:false};const items=rects(s).map(r=>({inputs:r.kind==='dpad'?{up:'up',down:'down',left:'left',right:'right'}:r.inputs,frame:{x:r.x,y:r.y,width:r.width,height:r.height},extendedEdges:{top:r.padding,bottom:r.padding,left:r.padding,right:r.padding}}));
 const scr=screens(s),touch=scr.find(r=>r.touch);items.push({inputs:{x:'touchScreenX',y:'touchScreenY'},frame:{x:touch.x,y:touch.y,width:touch.width,height:touch.height},extendedEdges:{top:0,bottom:0,left:0,right:0}});
 return {mappingSize:{width:W,height:H},items,screens:scr.map(r=>({inputFrame:{x:0,y:r.touch?192:0,width:256,height:192},outputFrame:{x:r.x,y:r.y,width:r.width,height:r.height}})),translucent:false};}
export function arrangeRows(s){const cx=s.faces.reduce((n,f)=>n+f.x+f.size/2,0)/4,cy=s.faces.reduce((n,f)=>n+f.y+f.size/2,0)/4,gap=Math.max(88,...s.faces.map(f=>f.size+2*f.padding+12));for(const [id,dx,dy]of [['y',-1,-1],['x',1,-1],['b',-1,1],['a',1,1]]){const f=s.faces.find(f=>f.id===id);f.x=cx+dx*gap/2-f.size/2;f.y=cy+dy*gap/2-f.size/2;}return s;}
export function validState(input){const x=input?.layout||input;if(!x||![1,2].includes(x.version))throw Error('文件不是调校台导出的布局');const s=clone(DEFAULT);const num=(v,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('布局数值超出范围');return v;};
 if(typeof x.swapped!=='boolean')throw Error('屏幕状态无效');s.swapped=x.swapped;s.hideBottom=x.hideBottom===true;
 for(const k of ['x','y','size','padding'])s.dpad[k]=num(x.dpad?.[k],0,k==='padding'?80:k==='size'?240:k==='x'?W:H);
 s.dpad.opacity=num(x.dpad?.opacity??100,0,100);
 if(s.dpad.size<48)throw Error('方向键过小');
 if(x.version===1){const f={};for(const k of ['cx','cy','size','spacing','padding'])f[k]=num(x.face?.[k],0,k==='padding'?40:k==='size'?100:k==='spacing'?130:k==='cx'?W:H);if(f.size<24||f.spacing<24)throw Error('圆键尺寸无效');s.faces=[['x',0,-1],['y',-1,0],['a',1,0],['b',0,1]].map(([id,dx,dy])=>({id,x:f.cx+dx*f.spacing-f.size/2,y:f.cy+dy*f.spacing-f.size/2,size:f.size,padding:f.padding,opacity:85}));}
 else{if(!Array.isArray(x.faces)||x.faces.length!==4||new Set(x.faces.map(f=>f.id)).size!==4)throw Error('四键数据不完整');for(const f of s.faces){const src=x.faces.find(z=>z.id===f.id);for(const k of ['x','y','size','padding','opacity'])f[k]=num(src?.[k],k==='size'?24:0,k==='x'?W:k==='y'?H:k==='size'?100:k==='padding'?40:100);}}
 for(const id of ['main','mini'])for(const k of ['x','y','width'])s.screens[id][k]=num(x.screens?.[id]?.[k],k==='width'?60:0,k==='y'?H:W);
 if(!Array.isArray(x.buttons)||x.buttons.length!==s.buttons.length)throw Error('按键数据不完整');
 for(const b of s.buttons){const src=x.buttons.find(z=>z.id===b.id);for(const k of ['x','y','width','height','padding'])b[k]=num(src?.[k],['width','height'].includes(k)?20:0,k==='padding'?40:k==='height'?160:k==='y'?H:W);}
 for(const b of s.buttons)b.opacity=num(x.buttons.find(z=>z.id===b.id)?.opacity??100,0,100);
 const comboA=s.buttons.find(b=>b.id==='comboA'),comboB=s.buttons.find(b=>b.id==='comboB');comboB.width=comboA.width;comboB.height=comboA.height;
 applyOpacity(s,num(x.controlsOpacity??x.faces?.find(f=>f.id==='a')?.opacity??85,0,100));
 return s;
}
