export const FILE_SCOPE='https://www.googleapis.com/auth/drive.file';
export function validateScopes(scope){
 const scopes=String(scope||'').split(/\s+/).filter(Boolean);
 const allowed=new Set([FILE_SCOPE,'openid','email','profile','https://www.googleapis.com/auth/userinfo.email','https://www.googleapis.com/auth/userinfo.profile']);
 if(!scopes.includes(FILE_SCOPE)||scopes.some(s=>!allowed.has(s)))throw Error('測試無效：憑證包含額外權限，或缺少 drive.file。沒有執行上傳。');
 return [...new Set(scopes)].sort();
}
export function validateManifest(value){
 const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,256}$/.test(x);
 const email=x=>typeof x==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
 if(!value||value.v!==1||!id(value.root)||!id(value.dateFolder)||!id(value.run)||!email(value.owner)||!email(value.member)||value.owner===value.member||value.root===value.dateFolder||!/^\d{4}-\d{2}-\d{2}$/.test(value.date))throw Error('測試資料格式無效。');
 if(value.memberDate&&!id(value.memberDate))throw Error('測試資料夾 ID 無效。');
 if(!Array.isArray(value.files)||value.files.length>30||value.files.some(f=>!id(f.id)||!id(f.parent)||!['owner','member'].includes(f.role)||!Number.isSafeInteger(f.size)||f.size<1||!/^[a-f0-9]{64}$/.test(f.sha256)||!/^probe-[a-z0-9-]+\.jpg$/.test(f.name)))throw Error('測試照片資料無效。');
 if(value.files.some(f=>![value.root,value.dateFolder,value.memberDate].includes(f.parent)))throw Error('照片不在測試目的地。');
 return value;
}
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function matchesFile(file,metadata,hash){return metadata.id===file.id&&metadata.name===file.name&&metadata.mimeType==='image/jpeg'&&metadata.trashed===false&&Number(metadata.size)===file.size&&metadata.parents?.length===1&&metadata.parents[0]===file.parent&&hash===file.sha256;}
