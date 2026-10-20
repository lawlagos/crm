// SHA-256 puro para fingerprints e IDs estáveis no V8 do Apps Script, sem APIs de Node.
export function sha256(text:string):string{
  const bytes:number[]=[];
  for(const char of text){const point=char.codePointAt(0)!;if(point<128)bytes.push(point);else if(point<2048)bytes.push(192|(point>>>6),128|(point&63));else if(point<65536)bytes.push(224|(point>>>12),128|((point>>>6)&63),128|(point&63));else bytes.push(240|(point>>>18),128|((point>>>12)&63),128|((point>>>6)&63),128|(point&63));}
  const bits=bytes.length*8;bytes.push(128);while(bytes.length%64!==56)bytes.push(0);
  const high=Math.floor(bits/4294967296);for(let shift=24;shift>=0;shift-=8)bytes.push((high>>>shift)&255);for(let shift=24;shift>=0;shift-=8)bytes.push((bits>>>shift)&255);
  const constants=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const hash=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];const rotate=(n:number,b:number)=>(n>>>b)|(n<<(32-b));
  for(let offset=0;offset<bytes.length;offset+=64){
    const words:number[]=[];for(let i=0;i<16;i++){const at=offset+i*4;words[i]=(bytes[at]<<24)|(bytes[at+1]<<16)|(bytes[at+2]<<8)|bytes[at+3];}
    for(let i=16;i<64;i++){const a=words[i-15],b=words[i-2];words[i]=(words[i-16]+(rotate(a,7)^rotate(a,18)^(a>>>3))+words[i-7]+(rotate(b,17)^rotate(b,19)^(b>>>10)))|0;}
    let[a,b,c,d,e,f,g,h]=hash;
    for(let i=0;i<64;i++){const first=(h+(rotate(e,6)^rotate(e,11)^rotate(e,25))+((e&f)^(~e&g))+constants[i]+words[i])|0;const second=((rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c)))|0;h=g;g=f;f=e;e=(d+first)|0;d=c;c=b;b=a;a=(first+second)|0;}
    [a,b,c,d,e,f,g,h].forEach((word,index)=>{hash[index]=(hash[index]+word)|0;});
  }
  return hash.map(word=>(word>>>0).toString(16).padStart(8,'0')).join('');
}
function canonical(value:unknown):string{if(value===undefined)return'null';if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return`[${value.map(canonical).join(',')}]`;const record=value as Record<string,unknown>;return`{${Object.keys(record).sort().map(key=>`${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;}
export function fingerprint(value:unknown):string{return sha256(canonical(value));}
export function occurrenceId(seriesId:unknown,index:number):string{const hash=sha256(`central:occurrence:${seriesId}:${index}`);return`${hash.slice(0,8)}-${hash.slice(8,12)}-8${hash.slice(13,16)}-${((parseInt(hash[16],16)&3)|8).toString(16)}${hash.slice(17,20)}-${hash.slice(20,32)}`;}
