import {NDSEngine} from './emulator.mjs';
import {dbGet,dbPut,dbDelete,romIdentity} from './storage.mjs';
import {W,H,DEFAULT,clone,rects,screens,expanded,contains,conflicts,hit,inputsAt,held,deltaMapping,validState,arrangeRows,applyOpacity} from './layout.mjs?v=6';
const $=s=>document.querySelector(s),board=$('#board'),STORAGE='court-touch-layout-v1',controlLayers=new Map();
let ctx=board.getContext('2d');
if(/iPhone/i.test(navigator.userAgent||''))document.body.classList.add('iphone');
let state=clone(DEFAULT),selected='dpad',targets=false,editing=false,pointers=new Map(),keys=new Set(),history=[],drag=null,saveTimer,toastTimer,active=new Set(),scale=1;
try{const saved=localStorage.getItem(STORAGE);if(saved){const raw=JSON.parse(saved);state=validState(raw);if(raw.version===1){history.push(clone(state));arrangeRows(state);}}}catch{}
const names={dpad:'圆形摇杆',face:'ABXY',comboA:'L+R+A',comboB:'L+R+B',l:'L',r:'R',a:'A',b:'B',x:'X',y:'Y',menu:'MENU',select:'SELECT',start:'START',swap:'换屏键',main:'中央大屏',mini:'左上小屏',边界:'画布边界'};
const inputNames={left:'左',right:'右',up:'上',down:'下',reverseScreens:'换屏',menu:'菜单'};
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
function remember(){history.push(clone(state));if(history.length>40)history.shift();$('#undo').disabled=false;}
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(STORAGE,JSON.stringify(state));$('#saved').textContent='已自动保存到此浏览器';}catch{$('#saved').textContent='浏览器无法保存，请导出布局备份';}},180);}
function check(){const c=conflicts(state);$('#warning').hidden=!c.length;$('#warning').textContent=c.length?'触控区有重叠或越界：'+c.slice(0,4).map(([a,b])=>(names[a]||a)+' / '+(names[b]||b)).join('、')+'。画布外的部分不会响应；按键之间重叠时可调整间距。':'';return c;}
function release(){engine?.setInput(new Set(),null);pointers.clear();keys.clear();active.clear();drag=null;$('#live').textContent='等待按键';}
function updated(){release();$('#hideBottom').textContent=state.hideBottom?'显示下屏':'隐藏下屏';save();check();updateReadout();}
function swap(){remember();release();state.hideBottom=false;state.swapped=!state.swapped;$('#hideBottom').textContent='隐藏下屏';save();toast(state.swapped?'下屏放大，触控区域已移到大屏':'上屏放大，触控区域已移到小屏');}
function openPanel(){release();if(engine.running){engine.pause();resumeAfterPanel=true;}document.body.classList.add('panel');syncControls();}
$('#open').onclick=openPanel;$('#exitFocus').onclick=()=>{document.body.classList.remove('focus');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});openPanel();};
$('#close').onclick=()=>{document.body.classList.remove('panel');release();if(resumeAfterPanel&&!editing){engine.resume();resumeAfterPanel=false;}};
$('#targets').onclick=()=>{targets=!targets;$('#targets').setAttribute('aria-pressed',targets);};
$('#move').onclick=()=>{editing=!editing;release();if(editing){engine.pause();}else if(engine.loaded){engine.resume();}$('#move').setAttribute('aria-pressed',editing);toast(editing?'拖动按键或屏幕来挪位置；ABXY 每个键都能独立移动，可拖到画面上':'已切回试按模式');};
$('#focus').onclick=()=>{release();if(engine.loaded)engine.resume();editing=false;$('#move').setAttribute('aria-pressed','false');document.body.classList.remove('panel');document.body.classList.add('focus');if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});};
$('#swap').onclick=swap;
$('#rows').onclick=()=>{remember();arrangeRows(state);updated();syncControls();toast('ABXY 已排成两行，其他按键保持原位');};
$('#allOpacity').addEventListener('pointerdown',remember);$('#allOpacity').addEventListener('keydown',e=>{if(!e.repeat)remember();});$('#allOpacity').oninput=e=>{const n=Number(e.target.value);if(!Number.isFinite(n))return;applyOpacity(state,Math.max(0,Math.min(100,Math.round(n))));updated();syncControlValues();};
$('#selected').onchange=e=>{selected=e.target.value;syncControls();};
$('#undo').onclick=()=>{if(!history.length){toast('还没有可撤销的调整');return;}state=history.pop();updated();syncControls();toast('已撤销');};
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{remember();state=clone(DEFAULT);if(b.dataset.preset==='large'){state.dpad={x:60,y:214,size:160,padding:0,opacity:100};state.faces.forEach(f=>{f.x+=2;f.y+=2;f.size=58;f.padding=0;});}updated();syncControls();toast('已切换预设，可用“撤销调整”恢复');});
const getObject=()=>selected==='dpad'?state.dpad:['a','b','x','y'].includes(selected)?state.faces.find(f=>f.id===selected):['main','mini'].includes(selected)?state.screens[selected]:state.buttons.find(b=>b.id===selected);
function fields(){if(selected==='dpad')return[['size','摇杆直径',48,200],['padding','触控半径外扩',0,64],['x','水平位置',0,W],['y','垂直位置',0,H]];
 if(['a','b','x','y'].includes(selected))return[['size','圆键直径',24,96],['padding','触控外扩（每边）',0,32],['x','水平位置',0,W],['y','垂直位置',0,H]];
 if(['main','mini'].includes(selected))return[['width','画面宽度（保持 4:3）',80,500],['x','水平位置',0,W],['y','垂直位置',0,H]];
 return [['width','按钮宽度',36,240],['height','按钮高度',24,100],['padding','触控外扩（每边）',0,30],['x','水平位置',0,W],['y','垂直位置',0,H]];}
function setValue(key,n,min,max){const o=getObject();if(!Number.isFinite(n))return;n=Math.round(Math.max(min,Math.min(max,n)));if((['dpad','a','b','x','y'].includes(selected))&&key==='size'){const delta=n-o.size;o.x-=delta/2;o.y-=delta/2;}o[key]=n;if(['comboA','comboB'].includes(selected)&&['width','height'].includes(key))for(const b of state.buttons.filter(b=>['comboA','comboB'].includes(b.id)))b[key]=n;updated();syncControlValues();}
function syncControlValues(){$('#allOpacity').value=state.controlsOpacity;$('#allOpacityValue').textContent=state.controlsOpacity+'%';const o=getObject();for(const [key]of fields()){const el=$('#c-'+key),nu=$('#n-'+key);if(el)el.value=o[key];if(nu)nu.value=o[key];}updateReadout();}
function syncControls(){const container=$('#controls');container.replaceChildren();$('#selected').value=selected;
 for(const [key,label,min,max]of fields()){
  const wrap=document.createElement('div');wrap.className='control';const head=document.createElement('div');head.className='control-head';const lab=document.createElement('label');lab.textContent=label;lab.htmlFor='c-'+key;head.append(lab);const stepper=document.createElement('div');stepper.className='stepper';
  const dec=document.createElement('button');dec.textContent='−';dec.setAttribute('aria-label',label+'减一');const inc=document.createElement('button');inc.textContent='+';inc.setAttribute('aria-label',label+'加一');const num=document.createElement('input');num.type='number';num.id='n-'+key;num.min=min;num.max=max;num.step=1;num.inputMode='numeric';num.setAttribute('aria-label',label+'数值');
  stepper.append(dec,num,inc);head.append(stepper);const range=document.createElement('input');range.type='range';range.id='c-'+key;range.min=min;range.max=max;range.step=1;range.setAttribute('aria-label',label);
  range.addEventListener('pointerdown',remember);range.addEventListener('keydown',e=>{if(!e.repeat)remember();});range.oninput=e=>setValue(key,+e.target.value,min,max);num.onfocus=remember;num.onchange=e=>{setValue(key,Number(e.target.value),min,max);syncControlValues();};dec.onclick=()=>{remember();setValue(key,getObject()[key]-1,min,max);};inc.onclick=()=>{remember();setValue(key,getObject()[key]+1,min,max);};wrap.append(head,range);container.append(wrap);
 }syncControlValues();check();}
function updateReadout(){const o=getObject();let text;if(selected==='dpad')text=`摇杆直径 ${o.size} · 圆形触控直径 ${o.size+2*o.padding}`;else if(['a','b','x','y'].includes(selected))text=`可见 ${o.size} × ${o.size} · 实际触控 ${o.size+2*o.padding} × ${o.size+2*o.padding}`;else if(['main','mini'].includes(selected))text=`画面 ${o.width} × ${o.width*.75} · 比例 4:3`;else text=`可见 ${o.width} × ${o.height} · 实际触控 ${o.width+2*o.padding} × ${o.height+2*o.padding}`;$('#sizeReadout').textContent=text+'（布局坐标）'+(['comboA','comboB'].includes(selected)?' · 两个组合键的宽高同步，位置独立调整':'');}
function exportData(){return {app:'Court Touch Lab',version:2,referenceSize:{width:W,height:H},device:'iPhone 17 Pro landscape',savedAt:new Date().toISOString(),layout:state,deltaMapping:deltaMapping(state),warnings:conflicts(state),note:'网页布局参数；摇杆使用圆形触控。deltaMapping 仅作位置尺寸参考，不包含网页摇杆的圆形触控逻辑。'};}
function json(){return JSON.stringify(exportData(),null,2);}
$('#download').onclick=()=>{const blob=new Blob([json()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Delta-NDS-我的手感.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('已导出；可把 JSON 文件发回聊天');};
$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(json());toast('已复制完整布局参数');}catch{const t=$('#fallback');t.hidden=false;t.value=json();t.focus();t.select();toast('请长按下方文本框，选择全选并复制');}};
$('#import').onclick=()=>$('#file').click();$('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>200000)throw Error('文件太大，请选择布局 JSON');const s=validState(JSON.parse(await f.text()));remember();state=s;updated();syncControls();toast('布局已导入');}catch(err){toast(err.message||'无法读取此文件');}e.target.value='';};
function point(e){const r=board.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
function choose(r){selected=r.id;$('#selected').value=selected;syncControls();}
board.addEventListener('pointerdown',e=>{e.preventDefault();board.setPointerCapture(e.pointerId);const p=point(e),r=hit(state,p);if(editing){if(!r||drag)return;remember();choose(r);drag={id:e.pointerId,start:p,original:clone(getObject())};return;}
 p.stick=r?.id==='dpad';if(p.stick&&[...pointers.values()].some(v=>v.stick))p.ignored=true;pointers.set(e.pointerId,p);if(r?.id==='swap'){swap();}if(r?.id==='menu')openGame();updateActive();});
board.addEventListener('pointermove',e=>{if(editing&&drag?.id===e.pointerId){const p=point(e),o=getObject(),a=drag.original;const dx=p.x-drag.start.x,dy=p.y-drag.start.y;o.x=Math.round(Math.max(0,Math.min(W,a.x+dx)));o.y=Math.round(Math.max(0,Math.min(H,a.y+dy)));syncControlValues();check();save();return;}if(pointers.has(e.pointerId)){e.preventDefault();const previous=pointers.get(e.pointerId);pointers.set(e.pointerId,{...point(e),stick:previous.stick,ignored:previous.ignored});updateActive();}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])board.addEventListener(type,e=>{pointers.delete(e.pointerId);if(drag?.id===e.pointerId)drag=null;updateActive();});
for(const type of ['touchstart','touchmove','touchend','gesturestart','gesturechange','gestureend'])board.addEventListener(type,e=>{if(e.cancelable)e.preventDefault();if(type==='touchstart')window.getSelection?.()?.removeAllRanges();},{passive:false});
for(const type of ['contextmenu','selectstart','dragstart'])document.addEventListener(type,e=>{if(!e.target?.closest?.('input,textarea,[contenteditable=true]'))e.preventDefault();});
window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});window.addEventListener('resize',release);
const keyboard={Shift:'select',ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',z:'b',x:'a',a:'y',s:'x',q:'l',w:'r',Enter:'start'};
window.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('focus','panel');editing=false;$('#move').setAttribute('aria-pressed',false);release();return;}if($('#gameDialog').open||document.body.classList.contains('panel')||editing||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;const k=keyboard[e.key];if(k){e.preventDefault();keys.add(k);updateActive();}});window.addEventListener('keyup',e=>{const k=keyboard[e.key];if(k){keys.delete(k);updateActive();}});
function updateActive(){if(editing)return;active=held(state,pointers.values());for(const k of keys)active.add(k);$('#live').textContent=active.size?'按下：'+[...active].map(k=>inputNames[k]||k.toUpperCase()).join(' + ')+(pointers.size?' · '+pointers.size+' 指':''):'等待按键';let touch=null;for(const p of pointers.values()){const r=hit(state,p);if(r?.touch){touch={x:Math.min(255,Math.max(0,Math.floor((p.x-r.x)/r.width*256))),y:Math.min(191,Math.max(0,Math.floor((p.y-r.y)/r.height*192)))};break;}}engine.setInput(active,touch);}
function circle(x,y,r,fill,stroke){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}
function round(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function text(t,x,y,size=12,color='#e9f3ed',align='center',weight=500){ctx.fillStyle=color;ctx.font=`${weight} ${size}px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(t,x,y);}
function draw(){
 const box=board.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,3);const bw=Math.round(box.width*dpr),bh=Math.round(box.height*dpr);if(board.width!==bw||board.height!==bh){board.width=bw;board.height=bh;}ctx.setTransform(board.width/W,0,0,board.height/H,0,0);scale=box.width/W;$('#scale').textContent='显示比例 '+Math.round(scale*100)+'%';
 ctx.fillStyle='#102a35';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#1c3d48';ctx.lineWidth=1;for(let x=-H;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,H);ctx.lineTo(x+H,0);ctx.stroke();}
 for(const s of screens(state)){round(s.x-5,s.y-5,s.width+10,s.height+10,8,'#061b24','#2c5260');ctx.fillStyle='#0a2430';ctx.fillRect(s.x,s.y,s.width,s.height);
  ctx.save();ctx.beginPath();ctx.rect(s.x,s.y,s.width,s.height);ctx.clip();
  if(engine.loaded){ctx.imageSmoothingEnabled=false;ctx.drawImage(engine.screens[s.touch?1:0],s.x,s.y,s.width,s.height);}else{text(s.touch?'下屏 · 支持触摸':'上屏 · 原版游戏画面',s.x+s.width/2,s.y+s.height*.4,Math.min(16,s.width/10),'#b8d7de');text('点顶部「游戏」导入 .nds',s.x+s.width/2,s.y+s.height*.65,Math.min(12,s.width/14),'#8baeb6');}
  if(s.touch)for(const p of pointers.values())if(contains(s,p)&&hit(state,p)?.id===s.id){ctx.strokeStyle='#c4ec72';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.stroke();text('触摸',p.x,p.y-22,11,'#c4ec72');}ctx.restore();
 }
 const all=rects(state);for(const r of all){const on=r.kind==='dpad'?['up','down','left','right'].some(k=>active.has(k)):r.inputs.every(k=>active.has(k));const isCombo=r.id==='comboA'||r.id==='comboB';let color=isCombo?(r.id==='comboA'?'#c4ec72':'#8ad6e8'):(on?'#386772':'#163844');
  const mainContext=ctx,pad=6,ratio=board.width/W,lw=r.width+pad*2,lh=r.height+pad*2;
  let layer=controlLayers.get(r.id);if(!layer){const canvas=document.createElement('canvas');layer={canvas,context:canvas.getContext('2d')};controlLayers.set(r.id,layer);}
  const width=Math.ceil(lw*ratio),height=Math.ceil(lh*ratio);if(layer.canvas.width!==width||layer.canvas.height!==height){layer.canvas.width=width;layer.canvas.height=height;}
  ctx=layer.context;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);ctx.setTransform(width/lw,0,0,height/lh,-(r.x-pad)*width/lw,-(r.y-pad)*height/lh);
  if(r.kind==='dpad'){
   const cx=r.x+r.width/2,cy=r.y+r.height/2,R=r.width/2;
   circle(cx,cy,R,'#0b232d','#416575');circle(cx,cy,R*.78,'#173844','#2c5260');circle(cx,cy,R*.2,'#1d4350');
   let vx=(active.has('right')?1:0)-(active.has('left')?1:0),vy=(active.has('down')?1:0)-(active.has('up')?1:0);
   const finger=[...pointers.values()].find(p=>!p.ignored&&hit(state,p)?.id==='dpad');
   if(finger){vx=(finger.x-cx)/R;vy=(finger.y-cy)/R;}const len=Math.hypot(vx,vy),factor=len?Math.min(1,len)*R*.52/len:0;
   for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]])circle(cx+dx*R*.88,cy+dy*R*.88,2,'#88adb7');
   circle(cx+vx*factor,cy+vy*factor+3,R*.36,'#061b24');circle(cx+vx*factor,cy+vy*factor,R*.36,on?'#74b8c5':'#3d6674',on?'#c4ec72':'#8db1ba');
  }else{ctx.save();const radius=r.kind==='face'?r.width/2:12;round(r.x,r.y+3,r.width,r.height,radius,'#071c25');round(r.x,r.y,r.width,r.height,radius,color,on?'#e3ffbb':isCombo?null:'#2c5260');text(r.label,r.x+r.width/2,r.y+r.height/2,r.kind==='face'?26:isCombo?17:['l','r'].includes(r.id)?21:12,isCombo?'#102a35':'#e9f3ed',undefined,700);if(on){ctx.strokeStyle='#e3ffbb';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(r.x-2,r.y-2,r.width+4,r.height+4,radius+2);ctx.stroke();}ctx.restore();}
  ctx=mainContext;ctx.save();ctx.globalAlpha=state.controlsOpacity/100;ctx.drawImage(layer.canvas,r.x-pad,r.y-pad,lw,lh);ctx.restore();
 }
 if(targets||editing){const bad=new Set(conflicts(state).flat());ctx.setLineDash([5,4]);for(const r of all){const f=expanded(r);ctx.fillStyle=bad.has(r.id)?'#ff9b6220':'#8ad6e80d';if(r.kind==='dpad'){ctx.beginPath();ctx.arc(r.x+r.width/2,r.y+r.height/2,f.width/2,0,Math.PI*2);ctx.fill();}else ctx.fillRect(f.x,f.y,f.width,f.height);ctx.strokeStyle=bad.has(r.id)?'#ffb17f':'#8ad6e8';ctx.lineWidth=1;if(r.kind==='dpad'){ctx.beginPath();ctx.arc(r.x+r.width/2,r.y+r.height/2,f.width/2,0,Math.PI*2);ctx.stroke();}else ctx.strokeRect(f.x,f.y,f.width,f.height);}ctx.setLineDash([]);}
 if(editing){const chosen=all.filter(r=>r.id===selected).concat(screens(state).filter(r=>r.id===selected));for(const r of chosen){ctx.strokeStyle='#c4ec72';ctx.lineWidth=2;if(r.kind==='dpad'){ctx.beginPath();ctx.arc(r.x+r.width/2,r.y+r.height/2,r.width/2+5,0,Math.PI*2);ctx.stroke();}else ctx.strokeRect(r.x-5,r.y-5,r.width+10,r.height+10);}text('挪位置模式 · 拖动按键或屏幕',W/2,13,10,'#c4ec72');}
 requestAnimationFrame(draw);
}

let gameId=null,gameFile=null,busy=false,resumeAfterPanel=false;
const engine=new NDSEngine({
 onSave:async bytes=>{if(!gameId)return;await dbPut('save:'+gameId,bytes);$('#saveStatus').textContent='游戏存档已保存在此设备 · '+new Date().toLocaleTimeString();},
 onStatus:t=>{$('#gameStatus').textContent=t;},onError:t=>{$('#gameStatus').textContent=t;toast(t);},
 onFPS:n=>{$('#fps').textContent=n.toFixed(0)+' FPS';}
});
function openGame(){release();engine.pause();$('#gameDialog').showModal();$('#resumeGame').disabled=!engine.loaded;}
$('#gameOpen').onclick=openGame;
$('#gameClose').onclick=()=>$('#gameDialog').close();
$('#gameDialog').addEventListener('close',()=>{release();if(engine.loaded&&!editing&&!document.hidden)engine.resume();});
$('#resumeGame').onclick=()=>{$('#gameDialog').close();$('#focus').click();engine.sound();};
$('#pauseGame').onclick=()=>{if(!engine.loaded){openGame();return;}if(engine.running){openGame();}else{engine.sound();engine.resume();}};
$('#hideBottom').onclick=()=>{remember();release();state.hideBottom=!state.hideBottom;if(state.hideBottom)state.swapped=false;updated();$('#hideBottom').textContent=state.hideBottom?'显示下屏':'隐藏下屏';};
$('#mute').onchange=e=>{engine.setMuted(e.target.checked);if(!e.target.checked)engine.sound();};
function downloadBytes(bytes,name,type='application/octet-stream'){const url=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);}
function controlsBusy(value){busy=value;for(const id of ['chooseROM','recentROM','restoreSave','backupSave'])$('#'+id).disabled=value;}
async function refreshRecent(){try{const entry=await dbGet('recent');$('#recentROM').disabled=!entry||busy;$('#recentROM').textContent=entry?'继续：'+entry.name:'尚未保留离线游戏';$('#romStatus').textContent=entry?'离线游戏已保留：'+entry.name:'导入时可选择把游戏保留在此设备';}catch{$('#romStatus').textContent='此浏览器无法使用本地游戏存储';}}
async function loadGame(file,keep=true,saveOverride){
 if(busy)return;controlsBusy(true);release();engine.pause();$('#gameStatus').textContent='正在读取游戏…';
 try{
  const id=await romIdentity(file);
  if(engine.loaded)await engine.save();
  const save=saveOverride||await dbGet('save:'+id);
  gameId=id;gameFile=file;
  await engine.load(file,save);$('#gameTitle').textContent=file.name;
  if(keep){try{await dbPut('recent',{name:file.name,file});navigator.storage?.persist?.().catch(()=>{});$('#romStatus').textContent='离线游戏已保留：'+file.name;}catch{$('#romStatus').textContent='游戏可运行，但本地空间不足，未保留离线副本';toast('未能保留游戏，请下次重新选择文件');}}
  $('#gameStatus').textContent='已载入 · 游戏和存档仅在此设备处理';$('#resumeGame').disabled=false;
  $('#gameDialog').close();document.body.classList.remove('panel');editing=false;$('#move').setAttribute('aria-pressed','false');$('#focus').click();engine.resume();return true;
 }catch(e){$('#gameStatus').textContent=e.message;toast(e.message);$('#resumeGame').disabled=!engine.loaded;return false;}
 finally{controlsBusy(false);refreshRecent();}
}
$('#chooseROM').onclick=()=>{engine.sound();$('#romFile').click();};
$('#romFile').onchange=e=>{const f=e.target.files[0];if(f)loadGame(f,$('#keepROM').checked);e.target.value='';};
$('#recentROM').onclick=async()=>{engine.sound();try{const r=await dbGet('recent');if(r)await loadGame(new File([r.file],r.name),false);}catch{toast('无法读取本地游戏，请重新导入');}};
$('#backupSave').onclick=async()=>{try{if(!engine.loaded)throw Error('请先载入游戏');const b=await engine.save();if(!b.length)throw Error('尚无游戏存档，请先在游戏内保存');downloadBytes(b,gameFile.name.replace(/\.nds$/i,'')+'.dsv');toast('已导出游戏存档');}catch(e){toast(e.message);}};
$('#restoreSave').onclick=()=>{if(!engine.loaded){toast('请先载入对应游戏');return;}$('#saveFile').click();};
$('#saveFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{if(f.size<16||f.size>16777216)throw Error('存档尺寸不正确');const b=new Uint8Array(await f.arrayBuffer());const tail=new TextDecoder().decode(b.slice(-16));if(!tail.includes('DESMUME SAVE'))throw Error('请选择本站导出的 .dsv 存档');if(!confirm('将替换当前游戏的存档并重新载入。建议先导出旧存档。继续吗？'))return;if(await loadGame(gameFile,false,b)){await dbPut('save:'+gameId,b);toast('存档已导入，需在游戏菜单读取进度');}}catch(err){toast(err.message);}};
$('#forgetROM').onclick=async()=>{if(!confirm('移除手机里保留的游戏文件？游戏存档和按键布局会保留。'))return;try{await dbDelete('recent');await refreshRecent();toast('离线游戏副本已移除');}catch{toast('移除失败，请重试');}};
window.addEventListener('blur',()=>{if(engine.loaded){engine.pause();$('#gameStatus').textContent='已暂停，点击继续游戏';}});
window.addEventListener('pagehide',()=>engine.pause());
document.addEventListener('visibilitychange',()=>{if(document.hidden){release();engine.pause();}else if(engine.loaded&&!$('#gameDialog').open)openGame();});
board.addEventListener('pointerdown',()=>{if(engine.loaded&&!engine.running&&!editing&&!$('#gameDialog').open&&!document.body.classList.contains('panel')){engine.sound();engine.resume();}});
async function offlineStatus(){
 if(!('serviceWorker' in navigator)){$('#offlineStatus').textContent='此浏览器不支持离线缓存';return;}
 try{
  $('#offlineStatus').textContent='正在准备离线文件…';
  const registration=await navigator.serviceWorker.register('sw.js',{updateViaCache:'none'});
  await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('缓存超时')),25000))]);
  const worker=registration.active||navigator.serviceWorker.controller;
  const channel=new MessageChannel();channel.port1.onmessage=({data:d})=>{$('#offlineStatus').textContent=d.ready?'模拟器离线文件已就绪':'缓存不完整，请联网后点「检查离线文件」';};
  worker.postMessage({type:'status',repair:navigator.onLine},[channel.port2]);
 }catch{$('#offlineStatus').textContent='离线缓存未完成，请保持联网并重试';}
}
$('#checkOffline').onclick=offlineStatus;
$('#updateApp').onclick=async()=>{try{if(engine.loaded){if(!confirm('更新会重新载入页面，请先在游戏内保存进度。现在更新吗？'))return;engine.pause();await engine.save();}location.assign('update.html?v='+Date.now());}catch{toast('更新前保存失败，请先导出存档');}};

$('#hideBottom').textContent=state.hideBottom?'显示下屏':'隐藏下屏';
syncControls();$('#undo').disabled=!history.length;requestAnimationFrame(draw);refreshRecent();offlineStatus();
