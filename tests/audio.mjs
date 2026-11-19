import assert from 'node:assert/strict';
import {NDSEngine} from '../dist/emulator.mjs';
let contexts=0,connected=0,attempts=0;
class AudioContextMock{
 constructor(){contexts++;this.state='suspended';this.destination={};}
 resume(){attempts++;this.state='running';return Promise.resolve();}
 createScriptProcessor(){return {connect:()=>connected++};}
}
globalThis.window={AudioContext:AudioContextMock};
globalThis.document={createElement:()=>({getContext:()=>({})})};
const engine=new NDSEngine({onStatus:()=>{},onError:()=>{},onFPS:()=>{}});
engine.loaded=true;engine.worker={messages:[],postMessage(d){this.messages.push(d);}};
engine.resume();await engine.audioSetup;
assert.equal(engine.audio.state,'running');assert.equal(contexts,1);assert.equal(connected,1);
engine.audio.state='suspended';engine.pause();engine.resume();await Promise.resolve();
assert.equal(engine.audio.state,'running');assert.equal(contexts,1);assert.equal(connected,1);assert.equal(attempts,2);
engine.audio.state='interrupted';await engine.sound();assert.equal(engine.audio.state,'running');assert.equal(attempts,3);
engine.audio.state='closed';await engine.sound();assert.equal(contexts,2);assert.equal(connected,2);
engine.setMuted(true);engine.audio.state='suspended';await engine.sound();assert.equal(engine.audio.state,'suspended');
console.log('PASS audio: background suspension, foreground resume, interrupted context, closed context and mute');
