// Microsoft Graph service-to-service client. No browser credentials or tenant secrets.
const API='https://graph.microsoft.com/v1.0';
const requireEnv=name=>{const value=process.env[name];if(!value)throw new Error('Missing environment setting '+name);return value;};
const tenant=()=>requireEnv('AZURE_TENANT_ID');
let cached;
export async function token(){
 if(cached && cached.expires>Date.now()+120000)return cached.access;
 const data=new URLSearchParams({client_id:requireEnv('AZURE_CLIENT_ID'),client_secret:requireEnv('AZURE_CLIENT_SECRET'),scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'});
 const response=await fetch('https://login.microsoftonline.com/'+encodeURIComponent(tenant())+'/oauth2/v2.0/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:data});
 if(!response.ok)throw new Error('Microsoft Entra token request failed: HTTP '+response.status);
 const j=await response.json();cached={access:j.access_token,expires:Date.now()+j.expires_in*1000};return cached.access;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function graph(path,{method='GET',body,headers={}}={}){
 if(!path.startsWith('/') && !path.startsWith(API+'/'))throw new Error('Invalid Graph path');
 const url=path.startsWith(API)?path:API+path;
 if(!url.startsWith(API+'/'))throw new Error('Unapproved Graph URL');
 for(let attempt=0;attempt<5;attempt++){
  const bearer=await token();
  const options={method,headers:{Authorization:'Bearer '+bearer,...headers}};
  if(body!==undefined){
   if(body instanceof Uint8Array || Buffer.isBuffer(body)){
    options.body=body;options.headers['Content-Type'] ||= 'application/octet-stream';
   }else{options.body=JSON.stringify(body);options.headers['Content-Type']='application/json';}
  }
  const res=await fetch(url,options);
  if([429,502,503,504].includes(res.status)&&attempt<4){
   const delay=Math.min(15000,Math.max(1000,Number(res.headers.get('retry-after')||1)*1000));
   await sleep(delay);continue;
  }
  if(!res.ok){let msg=(await res.text()).slice(0,600);throw Object.assign(new Error('Microsoft Graph HTTP '+res.status+': '+msg),{status:res.status});}
  if(res.status===204)return {};
  return res.json();
 }
}
export async function graphPages(path,max=10000){
 const all=[];let next=path;
 while(next){const p=await graph(next);all.push(...(p.value||[]));if(all.length>max)throw new Error('Microsoft Graph result exceeds configured retrieval limit');next=p['@odata.nextLink']||null;}
 return all;
}
export const site=()=>encodeURIComponent(requireEnv('SHAREPOINT_SITE_ID'));
export const listPath=id=>'/sites/'+site()+'/lists/'+encodeURIComponent(id);
export const safeFolder=name=>String(name).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80);
