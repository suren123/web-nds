const DB='court-nds-v1';
let opening;
function open(){return opening||=(new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>resolve(r.result);r.onerror=()=>{opening=null;reject(r.error);};}));}
export async function dbGet(key){const db=await open();return new Promise((res,rej)=>{const r=db.transaction('data').objectStore('data').get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
export async function dbPut(key,value){const db=await open();return new Promise((res,rej)=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(value,key);tx.oncomplete=()=>res();tx.onabort=tx.onerror=()=>rej(tx.error||Error('本地存储失败'));});}
export async function dbDelete(key){const db=await open();return new Promise((res,rej)=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').delete(key);tx.oncomplete=()=>res();tx.onabort=tx.onerror=()=>rej(tx.error);});}
export async function romIdentity(file){
 if(!/\.nds$/i.test(file.name)||file.size<512||file.size>536870912)throw Error('请选择未压缩的 .nds 文件（最大 512 MB）');
 const header=await file.slice(0,512).arrayBuffer(),v=new DataView(header);
 for(const off of [0x20,0x30]){const pos=v.getUint32(off,true),size=v.getUint32(off+12,true);if(pos<512||!size||pos+size>file.size)throw Error('NDS 文件头无效，文件可能不完整');}
 const digest=await crypto.subtle.digest('SHA-256',header);
 return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('')+'-'+file.size;
}
