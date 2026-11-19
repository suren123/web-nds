class CourtAudio extends AudioWorkletProcessor{
 constructor(){super();this.l=new Float32Array(8192);this.r=new Float32Array(8192);this.head=0;this.length=0;this.port.onmessage=({data:d})=>{if(d.clear){this.length=0;this.head=0;return;}const a=d.samples;if(!a)return;for(let i=0;i<a.length;i+=2){if(this.length===8192){this.head=(this.head+1)%8192;this.length--;}const j=(this.head+this.length)%8192;this.l[j]=a[i]/32768;this.r[j]=a[i+1]/32768;this.length++;}};}
 process(inputs,outputs){const o=outputs[0];for(let i=0;i<o[0].length;i++){if(!this.length)break;o[0][i]=this.l[this.head];if(o[1])o[1][i]=this.r[this.head];this.head=(this.head+1)%8192;this.length--;}return true;}
}
registerProcessor('court-audio',CourtAudio);
