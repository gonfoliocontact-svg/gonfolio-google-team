'use strict';
(() => {
 const element=id=>document.getElementById(id);
 const status=message=>{element('status').textContent=message;};
 const params=new URLSearchParams(location.hash.slice(1));
 const state=params.get('state'),expected=params.get('account'),expectedFolder=params.get('folder');
 history.replaceState(null,'',location.pathname);
 const appRequest=!!state||!!expected;
 const bindingValid=(!expectedFolder||(params.getAll('folder').length===1&&/^[a-zA-Z0-9_-]{1,256}$/.test(expectedFolder)))&&(!appRequest||(params.getAll('state').length===1&&params.getAll('account').length===1&&/^[a-f0-9-]{36}$/i.test(state??'')&&/^[a-zA-Z0-9_-]{1,256}$/.test(expected??'')));
 let selecting=false,picker;
 function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('無法連線 Google，請檢查網路並重新整理。'));document.head.appendChild(s);});}
 async function json(path,token){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{const response=await fetch('https://www.googleapis.com/drive/v3/'+path,{headers:{Authorization:'Bearer '+token},signal:controller.signal,redirect:'error'});
   if(!response.ok)throw Error(response.status===401?'Google 授權已到期，請重新登入。':'無法讀取資料夾，請確認管理員已共用給目前 Google 帳戶。');
   return await response.json();
  }finally{clearTimeout(timer);}
 }
 function finish(){selecting=false;element('pick').disabled=false;}
 function fail(error){finish();status(error instanceof Error?error.message:'授權未完成，請重試。');}
 async function chosen(doc,token,account){
  if(!doc||doc.mimeType!=='application/vnd.google-apps.folder'||!/^[a-zA-Z0-9_-]{1,256}$/.test(doc.id))throw Error('請選擇一個資料夾。');
  if(expectedFolder&&doc.id!==expectedFolder)throw Error('請選擇邀請指定的團隊資料夾，沒有加入其他資料夾。');
  const folder=await json('files/'+encodeURIComponent(doc.id)+'?supportsAllDrives=true&fields=id,name,mimeType,trashed,capabilities(canAddChildren)',token);
  if(folder.id!==doc.id||folder.trashed||folder.mimeType!=='application/vnd.google-apps.folder')throw Error('選取的資料夾無法使用，請重新選擇。');
  const code='gonfolio-team:'+encodeURIComponent(JSON.stringify({v:1,provider:'google',folderId:folder.id}));
  element('result').value=code;element('result-panel').hidden=false;element('copy').disabled=false;
  const returnLink=element('return');
  if(appRequest){returnLink.href='work-camera://team-picker?'+new URLSearchParams({state,account,folderId:folder.id});returnLink.hidden=false;}
  status('已授權「'+folder.name+'」。'+(folder.capabilities?.canAddChildren?'可查看及上傳。':'目前只有查看權限；上傳須請管理員開放。')+(appRequest?'按「返回 App 確認加入」完成加入。':'複製代碼後，在工影簿的團隊頁貼上並核對權限。'));
 }
 async function authorized(response){
  if(response.error||!response.access_token)throw Error('Google 授權未完成，請重試。');
  const scopes=typeof response.scope==='string'?response.scope.trim().split(/\s+/):[];
  const allowed=['https://www.googleapis.com/auth/drive.file','openid','email','profile','https://www.googleapis.com/auth/userinfo.email','https://www.googleapis.com/auth/userinfo.profile'];
  if(!scopes.includes(allowed[0])||scopes.some(s=>!allowed.includes(s)))throw Error('這次登入不是小權限，已停止選擇資料夾。請重新登入。');
  const token=response.access_token;
  const identity=await json('about?fields=user(permissionId,emailAddress)',token);
  const account=identity.user?.permissionId;
  if(typeof account!=='string'||!account||(appRequest&&account!==expected))throw Error('網頁與 App 的 Google 帳戶不同，請重新選擇 App 使用的帳戶。');
  element('account').textContent=identity.user.emailAddress??'';
  const view=new google.picker.DocsView(google.picker.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true);
  const sharedDrives=new google.picker.DocsView(google.picker.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true).setEnableDrives(true);
  if(expectedFolder)view.setFileIds(expectedFolder);
  const builder=new google.picker.PickerBuilder().setAppId(window.GONFOLIO_PICKER.projectNumber).setDeveloperKey(window.GONFOLIO_PICKER.apiKey).setOAuthToken(token).setOrigin(location.origin).addView(view);
  if(!expectedFolder)builder.addView(sharedDrives);
  picker=builder.setCallback(data=>{
   if(data.action===google.picker.Action.PICKED){picker.dispose();picker=null;void chosen(data.docs?.[0],token,account).then(finish,fail);}
   else if(data.action===google.picker.Action.CANCEL){picker.dispose();picker=null;finish();status('已取消選擇，沒有加入團隊。');}
  }).build();picker.setVisible(true);
 }
 async function initialize(){
  const config=window.GONFOLIO_PICKER;
  if(!bindingValid)throw Error('這次加入連結已失效，請返回 App 重新開啟授權頁。');
  if(location.protocol!=='https:'||!config?.clientId||!config.apiKey||!/^\d+$/.test(config.projectNumber))throw Error('授權服務尚未完成設定，請使用 App 的「授權並選擇 Google 團隊資料夾」。');
  await Promise.all([load('https://accounts.google.com/gsi/client'),load('https://apis.google.com/js/api.js')]);
  await new Promise((resolve,reject)=>gapi.load('picker',{callback:resolve,onerror:()=>reject(Error('無法載入 Google 資料夾選擇器。')),timeout:20000,ontimeout:()=>reject(Error('Google 服務連線逾時，請重新整理。'))}));
  const client=google.accounts.oauth2.initTokenClient({client_id:config.clientId,scope:'https://www.googleapis.com/auth/drive.file',include_granted_scopes:false,error_callback:()=>fail(Error('登入視窗已關閉或遭瀏覽器阻擋，請重試。')),callback:response=>{void authorized(response).catch(fail);}});
  element('pick').onclick=()=>{if(selecting)return;selecting=true;element('pick').disabled=true;element('result-panel').hidden=true;element('return').hidden=true;element('return').removeAttribute('href');element('result').value='';element('account').textContent='';status('請在 Google 視窗登入並授權。');try{client.requestAccessToken({prompt:'select_account'});}catch{fail(Error('無法開啟 Google 登入，請允許此網站的彈出視窗。'));}};
  element('pick').disabled=false;status('請使用與工影簿相同的 Google 帳戶。管理員須先把團隊資料夾共用給你。');
 }
 element('copy').onclick=async()=>{try{await navigator.clipboard.writeText(element('result').value);status('代碼已複製，請返回工影簿貼上加入。');}catch{element('result').select();status('請長按已選取的代碼並複製。');}};
 void initialize().catch(error=>{element('pick').disabled=true;status(error.message||'授權服務無法載入，請重新整理。');});
})();
