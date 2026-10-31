'use strict';
(() => {
 const el=id=>document.getElementById(id),params=new URLSearchParams(location.hash.slice(1));
 history.replaceState(null,'',location.pathname);
 try{
  const code=params.get('code');
  if([...params.keys()].some(key=>key!=='code')||params.getAll('code').length!==1||!code||code.length>2048||!code.startsWith('gonfolio-team:'))throw Error();
  const value=JSON.parse(decodeURIComponent(code.slice(14))),id=x=>typeof x==='string'&&/^[a-zA-Z0-9_!.-]{1,256}$/.test(x);
  if(!value||value.v!==1||!['google','onedrive'].includes(value.provider)||!id(value.folderId)||(value.provider==='onedrive'&&!id(value.driveId)))throw Error();
  // Normalize to a locator only. Never forward identity, authority or credentials from an invite.
  if(value.layout!==undefined&&(value.layout!=='member-date'||value.provider!=='google'))throw Error();
  const normalized='gonfolio-team:'+encodeURIComponent(JSON.stringify({v:1,provider:value.provider,folderId:value.folderId,...(value.provider==='onedrive'?{driveId:value.driveId}:{}),...(value.layout?{layout:value.layout}:{})}));
  el('status').textContent='這是 '+(value.provider==='google'?'Google Drive':'OneDrive')+' 團隊邀請。';
  el('code').value=normalized;el('fallback').hidden=false;
  el('open').href='work-camera://join-team?'+new URLSearchParams({code:normalized});el('open').hidden=false;
  el('copy').onclick=async()=>{try{await navigator.clipboard.writeText(normalized);el('status').textContent='已複製，請在 App「團隊 → 加入團隊」貼上。';}catch{el('code').select();el('status').textContent='請長按已選取的代碼並複製。';}};
 }catch{el('status').textContent='加入連結無效，請向團長索取新的連結。';}
})();
