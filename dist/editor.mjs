import {W,H,rects,expanded,overlap,clone,CUSTOM_IDS} from './layout.mjs?v=0.0.1';
export const circleControls=s=>rects(s).filter(r=>r.kind==='face'||r.kind==='custom');
export const objectFor=(s,id)=>id==='dpad'?s.dpad:s.faces.find(r=>r.id===id)||s.buttons.find(r=>r.id===id)||s.screens[id];
export function geometry(s,id){return rects(s).find(r=>r.id===id)||{id,...s.screens[id],height:s.screens[id].width*.75};}
export function snapPosition(s,id,x,y){const r=geometry(s,id),step=s.editor.gridSize,guides=[];x=Math.max(0,Math.min(W-r.width,x));y=Math.max(0,Math.min(H-r.height,y));if(!s.editor.snap)return{x:Math.round(x),y:Math.round(y),guides};
 const candidates=rects(s).filter(v=>v.id!==id);
 function axis(value,size,key){let best=null;for(const other of candidates){const os=key==='x'?other.width:other.height;for(const a of [0,.5,1])for(const b of [0,.5,1]){const target=other[key]+os*b-size*a,delta=Math.abs(target-value);if(delta<=5&&(!best||delta<best.delta))best={target,delta,line:other[key]+os*b};}}if(best){guides.push({axis:key,value:best.line});return best.target;}return Math.round(value/step)*step;}
 return{x:Math.max(0,Math.min(W-r.width,axis(x,r.width,'x'))),y:Math.max(0,Math.min(H-r.height,axis(y,r.height,'y'))),guides};
}
export function alignControls(s,ids,mode){const rs=rects(s).filter(r=>ids.includes(r.id));if(rs.length<2)throw Error('请至少选择两个按键');const axis=mode==='horizontal'||mode==='space-x'?'x':'y';
 if(mode==='horizontal'||mode==='vertical'){const coordinate=axis==='x'?'y':'x',dim=axis==='x'?'height':'width',center=rs.reduce((n,r)=>n+r[coordinate]+r[dim]/2,0)/rs.length;for(const r of rs)objectFor(s,r.id)[coordinate]=center-r[dim]/2;}
 else{if(rs.length<3)throw Error('等间距排列需要至少三个按键');const dim=axis==='x'?'width':'height';rs.sort((a,b)=>a[axis]-b[axis]);const first=rs[0][axis],last=rs.at(-1)[axis]+rs.at(-1)[dim],total=rs.reduce((n,r)=>n+r[dim],0),gap=(last-first-total)/(rs.length-1);if(gap<0)throw Error('当前间距不足，请先拉开两端按键');let pos=first;for(const r of rs){objectFor(s,r.id)[axis]=pos;pos+=r[dim]+gap;}}
 return s;
}
export function arrangeEight(s){const order=['y','x','comboA','custom3','b','a','comboB','custom4'],size=s.circleSize,pad=Math.max(...circleControls(s).map(r=>r.padding)),gap=Math.max(size+2*pad+8,78),left=Math.min(550,W-(3*gap+size+pad)),top=Math.min(205,H-(gap+size+pad));order.forEach((id,i)=>{const o=objectFor(s,id);o.x=left+(i%4)*gap;o.y=top+Math.floor(i/4)*gap;});return s;}
export function placeAddedControls(s){
 // Existing controls retain their positions. Place only the two newly introduced controls.
 const pending=new Set(['custom3','custom4']);
 for(const id of pending){const o=objectFor(s,id),r=geometry(s,id),occupied=rects(s).filter(z=>z.id!==id&&(!pending.has(z.id)||z.id==='custom3'&&id==='custom4')).map(expanded);let chosen=null;
 for(let y=56;y<=H-r.height-r.padding;y+=8)for(let x=W-r.width-r.padding;x>=r.padding;x-=8){const test=expanded({...r,x,y});if(!occupied.some(z=>overlap(test,z))){const score=Math.hypot(x-o.x,y-o.y);if(!chosen||score<chosen.score)chosen={x,y,score};}}
 if(chosen){o.x=chosen.x;o.y=chosen.y;}
 }
 return s;
}
