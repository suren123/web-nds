import assert from 'node:assert/strict';
import {installViewport} from '../dist/viewport.mjs';
const events=()=>({listeners:{},addEventListener(k,f){(this.listeners[k]??=[]).push(f);},emit(k){for(const f of this.listeners[k]||[])f();}});
const win=Object.assign(events(),{innerWidth:402,innerHeight:760,visualViewport:Object.assign(events(),{height:700,scale:1}),navigator:{standalone:true},scrollTo(v){scrolls.push(v);}});
const writes=[],scrolls=[];let releases=0;
const classes=new Set(),doc=Object.assign(events(),{body:{classList:{add:v=>classes.add(v)}},documentElement:{style:{setProperty:(...args)=>writes.push(args)}}});
const viewport=installViewport({win,doc,delay:5,onResize:()=>releases++});
const settle=()=>new Promise(r=>setTimeout(r,15));
assert.ok(classes.has('standalone'));assert.deepEqual(writes,[['--app-height','700px']]);
// One size commit for an entire rotation burst; clear held keys and scroll once.
win.emit('orientationchange');
for(const height of [640,510,390,350]){win.innerWidth=874;win.visualViewport.height=height;win.emit('resize');win.visualViewport.emit('resize');}
assert.equal(writes.length,1);await settle();assert.equal(writes.length,2);assert.deepEqual(writes.at(-1),['--app-height','350px']);assert.equal(scrolls.length,1);assert.ok(releases>0);
// Identical geometry and browser chrome animations do not repeatedly scroll the page.
win.emit('resize');await settle();assert.equal(writes.length,2);assert.equal(scrolls.length,1);
win.visualViewport.height=380;win.visualViewport.emit('resize');await settle();assert.equal(writes.length,3);assert.equal(scrolls.length,1);
// A return to portrait while editing must not steal keyboard focus or scroll.
doc.activeElement={tagName:'INPUT'};win.innerWidth=402;win.visualViewport.height=400;win.emit('orientationchange');await settle();assert.equal(scrolls.length,1);
doc.activeElement=null;win.visualViewport.height=700;doc.emit('focusout');await settle();assert.equal(scrolls.length,2);
// Pinch zoom is not mistaken for a smaller game viewport; anchoring waits for it to end.
win.visualViewport.scale=2;win.visualViewport.height=350;viewport.anchor();await settle();assert.equal(scrolls.length,2);assert.deepEqual(writes.at(-1),['--app-height','700px']);
win.visualViewport.scale=1;win.visualViewport.height=700;win.visualViewport.emit('resize');await settle();assert.equal(scrolls.length,3);
console.log('PASS viewport: coalesced rotation, scroll anchoring, keyboard/zoom preservation and standalone detection');
