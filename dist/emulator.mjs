export const KEY_ORDER=['right','left','down','up','select','start','b','a','y','x','l','r'];
export function keyMask(keys){let n=0;for(const k of keys){const i=KEY_ORDER.indexOf(k);if(i>=0)n|=1<<i;}return n;}
export class NDSEngine{
 constructor({onSave,onStatus,onError,onFPS}){Object.assign(this,{onSave,onStatus,onError,onFPS});this.screens=[0,1].map(()=>Object.assign(document.createElement('canvas'),{width:256,height:192}));this.contexts=this.screens.map(c=>c.getContext('2d'));this.pending=new Map();this.seq=0;this.queue=[];this.offset=0;this.muted=false;}
 async sound(){try{if(!this.audio){this.audio=new (window.AudioContext||window.webkitAudioContext)({sampleRate:44100,latencyHint:'interactive'});this.audio.resume();if(this.audio.audioWorklet){try{await this.audio.audioWorklet.addModule('audio-worklet.js');this.node=new AudioWorkletNode(this.audio,'court-audio',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});}catch{}}if(!this.node){this.node=this.audio.createScriptProcessor(2048,0,2);this.node.onaudioprocess=e=>{const l=e.outputBuffer.getChannelData(0),r=e.outputBuffer.getChannelData(1);for(let i=0;i<l.length;i++){const a=this.queue[0];if(!a)break;l[i]=a[this.offset++]/32768;r[i]=a[this.offset++]/32768;if(this.offset>=a.length){this.offset=0;this.queue.shift();}}};}this.node.connect(this.audio.destination);}await this.audio.resume();}catch{this.onStatus('声音暂不可用，游戏仍可运行');}}
 clearAudio(){this.node?.port?.postMessage({clear:true});this.queue=[];this.offset=0;}
 setMuted(v){this.muted=v;this.clearAudio();}
 setInput(keys,touch){if(this.loaded)this.worker.postMessage({type:'input',mask:keyMask(keys),touch});}
 async load(file,save){
  this.stop();this.worker=new Worker('nds-worker.js');this.loaded=false;
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{reject(Error('内核加载超时，请联网后重试'));this.stop();},45000);
   this.worker.onerror=()=>{clearTimeout(timeout);reject(Error('内核加载失败，请检查离线缓存或重新联网'));this.onError('内核加载失败');};
   this.worker.onmessage=({data:d})=>{
    if(d.type==='ready')this.worker.postMessage({type:'load',file,save});
    else if(d.type==='loaded'){clearTimeout(timeout);this.loaded=true;resolve();}
    else if(d.type==='error'){clearTimeout(timeout);this.running=false;reject(Error(d.message));this.onError(d.message);}
    else if(d.type==='frame'){
     for(let i=0;i<2;i++)this.contexts[i].putImageData(new ImageData(new Uint8ClampedArray(d.pixels.buffer,i*196608,196608),256,192),0,0);
     if(this.running&&!this.muted&&this.audio?.state==='running'){if(this.node?.port)this.node.port.postMessage({samples:d.audio},[d.audio.buffer]);else{if(this.queue.length>6){this.queue=[];this.offset=0;}this.queue.push(d.audio);}}
    }else if(d.type==='save'){
     const promise=d.bytes.length?Promise.resolve(this.onSave(d.bytes)):Promise.resolve();
     promise.then(()=>{this.pending.get(d.id)?.resolve(d.bytes);this.pending.delete(d.id);}).catch(e=>{this.pending.get(d.id)?.resolve(d.bytes);this.pending.delete(d.id);this.onError('存档未能写入手机，请立即导出备份');});
    }else if(d.type==='fps')this.onFPS(d.value);
   };
  });
 }
 resume(){if(!this.loaded)return;this.clearAudio();this.running=true;this.worker.postMessage({type:'resume'});}
 pause(){this.running=false;this.clearAudio();this.worker?.postMessage({type:'pause'});}
 save(){if(!this.loaded)return Promise.resolve(new Uint8Array());const id=++this.seq;return new Promise((resolve,reject)=>{const t=setTimeout(()=>{this.pending.delete(id);reject(Error('读取存档超时'));},5000);this.pending.set(id,{resolve:v=>{clearTimeout(t);resolve(v);},reject:e=>{clearTimeout(t);reject(e);}});this.worker.postMessage({type:'save',id});});}
 stop(){this.running=false;this.loaded=false;this.clearAudio();this.worker?.terminate();this.worker=null;for(const p of this.pending.values())p.reject(Error('模拟器已关闭'));this.pending.clear();}
}
