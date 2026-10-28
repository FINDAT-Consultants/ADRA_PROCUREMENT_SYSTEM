// Organization-only Microsoft 365 API. Never send an app secret or Graph application token to a browser.
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import {randomUUID} from 'node:crypto';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {graph,graphPages,listPath,site} from './graph.js';
import {defs} from './schema.js';

const requireEnv=n=>{if(!process.env[n])throw new Error('Missing '+n);return process.env[n]};
const TENANT=requireEnv('AZURE_TENANT_ID');
const AUDIENCE=requireEnv('AZURE_API_AUDIENCE');
const ORIGIN=requireEnv('ALLOWED_ORIGIN');
const HOST=requireEnv('SHAREPOINT_HOSTNAME').toLowerCase();
const IDS=JSON.parse(requireEnv('M365_LISTS_JSON'));
const DRIVE=requireEnv('M365_DOCUMENT_DRIVE_ID');
for(const name of Object.keys(defs))if(!IDS[name])throw new Error('M365_LISTS_JSON missing '+name);
const jwks=createRemoteJWKSet(new URL('https://login.microsoftonline.com/'+encodeURIComponent(TENANT)+'/discovery/v2.0/keys'));
const app=express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({limit:'12mb'}));
app.use((req,res,next)=>{
  const origin=req.headers.origin;
  if(origin && origin!==ORIGIN)return res.status(403).json({error:'Unapproved browser origin'});
  if(origin)res.setHeader('Access-Control-Allow-Origin',ORIGIN);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Headers','authorization,content-type');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  if(req.method==='OPTIONS')return res.sendStatus(204);
  next();
});

const route=fn=>(req,res,next)=>Promise.resolve().then(()=>fn(req,res)).catch(next);
const fieldList=k=>listPath(IDS[k]);
const allItems=async k=>graphPages(fieldList(k)+'/items?$expand=fields&$top=200',5000);
const rows=async k=>(await allItems(k)).map(x=>({graphId:x.id,etag:x['@odata.etag'],...x.fields}));
const append=async(k,fields)=>graph(fieldList(k)+'/items',{method:'POST',body:{fields:{Title:String(fields.RecordId),...fields}}});
const err=(code,message)=>Object.assign(new Error(message),{status:code});
async function findOne(k,id){
  const matches=(await rows(k)).filter(x=>x.RecordId===id);
  if(matches.length>1)throw err(409,'Duplicate record identifier in SharePoint: '+id);
  return matches[0]||null;
}
async function audit(who,kind,id,event,details={}){
  const recordId=randomUUID();
  return append('audit',{RecordId:recordId,Status:'Recorded',ActorId:who,UpdatedAt:new Date().toISOString(),
    EntityType:kind,EntityId:id,Operation:event,EventAt:new Date().toISOString(),Payload:JSON.stringify(details)});
}
async function verifyBearer(req,res,next){
  try{
    const match=/^Bearer ([\w.-]+)$/.exec(req.headers.authorization||'');
    if(!match)throw err(401,'Microsoft Entra access token required');
    const {payload}=await jwtVerify(match[1],jwks,{
      issuer:'https://login.microsoftonline.com/'+TENANT+'/v2.0',audience:AUDIENCE
    });
    if(payload.tid!==TENANT||typeof payload.oid!=='string')throw err(403,'Organization identity required');
    const assigned=(await rows('userRoles')).filter(x=>x.EntraObjectId===payload.oid&&x.IsActive===true);
    if(assigned.length!==1)throw err(403,'Your ADRA procurement role has not been assigned or is not unique.');
    req.identity={id:payload.oid,role:assigned[0].AppRole,displayName:payload.name||'ADRA user'};
    next();
  }catch(e){next(e)}
}
const allowed=(identity,roles)=>{
  if(!roles.includes(identity.role))throw err(403,'Role not permitted for this operation');
};
const oversight=['Developer','Auditor','Procurement Officer','Accounts','Finance Reviewer','Program Approver','Final Approver'];
function canRead(k,who){
  if(k==='audit')return ['Developer','Auditor'].includes(who.role);
  if(k==='userRoles')return who.role==='Developer';
  if(k==='payments')return ['Developer','Accounts','Auditor','Finance Reviewer'].includes(who.role);
  if(k==='supplierApplications')return ['Developer','Auditor','Procurement Officer','Supplier Verification Officer','Finance Reviewer','Final Approver'].includes(who.role);
  if(k==='approvals'||k==='delegations'||k==='authorityMatrix')return ['Developer','Auditor','Program Approver','Finance Reviewer','Final Approver'].includes(who.role);
  if(k==='suppliers')return ['Developer','Auditor','Procurement Officer','Administration','Finance Reviewer','Final Approver'].includes(who.role);
  if(k==='requests'||k==='documents')return ['Developer','Auditor','Procurement Officer','Accounts','Finance Reviewer','Program Approver','Final Approver','Administration','Requester'].includes(who.role);
  return false;
}
const safeText=(v,max=255)=>String(v??'').trim().slice(0,max);
const safePayload=(data)=>{
  if(!data || typeof data!=='object'||Array.isArray(data))throw err(400,'Details must be an object');
  const s=JSON.stringify(data);
  if(s.length>32000)throw err(413,'Record exceeds allowed details size');
  return s;
};
async function siteCheck(){
  const s=await graph('/sites/'+site());
  const url=new URL(s.webUrl);
  if(url.hostname.toLowerCase()!==HOST || HOST.includes('-my.sharepoint.com') || /\/personal\//i.test(url.pathname)){
    throw Error('Refusing non-organizational SharePoint site');
  }
  const siteDrives=await graphPages('/sites/'+site()+'/drives',200);
  const d=siteDrives.find(x=>x.id===DRIVE);
  if(!d||d.driveType!=='documentLibrary'||!d.webUrl||new URL(d.webUrl).hostname.toLowerCase()!==HOST){
    throw Error('M365_DOCUMENT_DRIVE_ID is not a library in the approved organization');
  }
}
await siteCheck();
app.get('/health',(req,res)=>res.json({service:'ADRA Microsoft 365 API',storage:'Organizational SharePoint',ready:true}));
app.use('/api/m365',verifyBearer);
app.get('/api/m365/me',route(async(req,res)=>res.json(req.identity)));
app.get('/api/m365/records/:kind',route(async(req,res)=>{
  const k=req.params.kind;
  if(!Object.hasOwn(defs,k))throw err(404,'Unknown register');
  if(!canRead(k,req.identity))throw err(403,'Register access denied');
  let results=await rows(k);
  if(req.identity.role==='Requester' || req.identity.role==='Administration'){
    if(k==='requests')results=results.filter(x=>x.RequesterId===req.identity.id);
    else if(k==='documents')results=results.filter(x=>x.UploadedBy===req.identity.id);
    else throw err(403,'Register not available to this role');
  }
  res.json({kind:k,records:results});
}));
app.post('/api/m365/requests',route(async(req,res)=>{
  const who=req.identity;
  allowed(who,['Administration','Requester','Developer']);
  const v=req.body||{};
  const type=safeText(v.requestType,120),currency=safeText(v.currency,3);
  const amount=Number(v.amount);
  if(!type||!/^[A-Z]{3}$/.test(currency)||!Number.isFinite(amount)||amount<0||amount>1e12)
    throw err(400,'Valid request type, ISO currency and non-negative amount are required');
  const id=randomUUID(), now=new Date().toISOString();
  const fields={RecordId:id,Status:'Draft',ActorId:who.id,RequesterId:who.id,UpdatedAt:now,
    RequestType:type,SupplierId:safeText(v.supplierId),Project:safeText(v.project),
    Currency:currency,Amount:amount,Payload:safePayload(v.details||{})};
  await append('requests',fields);
  await audit(who.id,'requests',id,'Created',{status:'Draft'});
  res.status(201).json({id,status:'Draft'});
}));
app.post('/api/m365/manual-payments',route(async(req,res)=>{
  const who=req.identity;
  allowed(who,['Accounts','Developer']);
  if(process.env.M365_MANUAL_PAYMENT_WRITES!=='enabled')
    throw err(503,'Manual payment writes are disabled pending approved concurrency and reconciliation controls');
  const v=req.body||{}, amount=Number(v.amount);
  const requestId=safeText(v.requestId,100), reference=safeText(v.reference,150);
  const method=safeText(v.method,50);
  const permitted=['Bank Transfer','Bank Deposit','Cash','Cheque','Other'];
  const paymentDate=safeText(v.paymentDate,10);
  const parsed=Date.parse(paymentDate+'T12:00:00Z');
  if(!requestId||!reference||!permitted.includes(method)||!Number.isFinite(amount)||amount<=0||
     !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)||!Number.isFinite(parsed)||parsed>Date.now()+86400000||
     v.evidenceConfirmed!==true)
    throw err(400,'Request, payment reference, actual payment date, evidence confirmation, method and positive amount required');
  const request=await findOne('requests',requestId);
  if(!request || !['Fully Approved','Partially Paid'].includes(request.Status))
    throw err(409,'Payment may be recorded only for an approved request');
  const paid=(await rows('payments')).filter(x=>x.RequestId===requestId&&x.Voided!==true)
    .reduce((sum,x)=>sum+Number(x.Amount||0),0);
  if(Math.round((paid+amount)*100)>Math.round(Number(request.Amount)*100))
    throw err(409,'Payment would exceed the approved amount');
  const id=randomUUID(), now=new Date().toISOString();
  await append('payments',{RecordId:id,Status:'Recorded',ActorId:who.id,UpdatedAt:now,
    RequestId:requestId,Amount:amount,Currency:request.Currency,Method:method,
    Reference:reference,PaymentDate:paymentDate+'T12:00:00Z',Voided:false,Payload:safePayload({notes:safeText(v.notes,1000),
      evidenceConfirmed:v.evidenceConfirmed===true})});
  await audit(who.id,'payments',id,'Manual payment recorded',{requestId,amount,method,reference});
  res.status(201).json({id,status:'Recorded',balance:Number(request.Amount)-paid-amount});
}));
app.post('/api/m365/attachments',route(async(req,res)=>{
  const who=req.identity,v=req.body||{};
  const requestId=safeText(v.requestId,100), filename=safeText(v.filename,160);
  const request=await findOne('requests',requestId);
  if(!request)throw err(404,'Procurement request not found');
  if(!oversight.includes(who.role)&&request.RequesterId!==who.id)
    throw err(403,'Cannot upload to another requester record');
  if(!['Draft','Returned for Correction'].includes(request.Status))
    throw err(409,'Supporting documents are locked after submission');
  if(!/^[^/\\]+[.](pdf|docx|xlsx|png|jpg|jpeg|txt)$/i.test(filename))
    throw err(400,'Allowed formats: PDF, DOCX, XLSX, PNG, JPG, JPEG, TXT');
  const input=String(v.dataBase64||'');
  if(!input||input.length>11500000||!/^[A-Za-z0-9+/]+={0,2}$/.test(input)||input.length%4!==0)
    throw err(413,'A valid Base64 file up to 8 MiB is required');
  const data=Buffer.from(input,'base64');
  if(!data.length||data.length>8*1024*1024)throw err(413,'File size exceeds 8 MiB');
  const id=randomUUID(), name=id+'-'+filename.replace(/[^a-zA-Z0-9._-]/g,'_');
  const driveItem=await graph('/drives/'+encodeURIComponent(DRIVE)+'/root:/'+encodeURIComponent(name)+':/content',
    {method:'PUT',body:data,headers:{'Content-Type':'application/octet-stream'}});
  const now=new Date().toISOString();
  await append('documents',{RecordId:id,Status:'Uploaded',ActorId:who.id,UpdatedAt:now,
    RequestId:requestId,FileName:filename,DriveItemId:driveItem.id,MimeType:safeText(v.mimeType,120),
    SizeBytes:data.length,UploadedBy:who.id,UploadedAt:now,
    Payload:JSON.stringify({webUrl:driveItem.webUrl,siteId:site(),driveId:DRIVE})});
  await audit(who.id,'documents',id,'Uploaded',{requestId,filename,bytes:data.length});
  res.status(201).json({id,driveItemId:driveItem.id,webUrl:driveItem.webUrl});
}));
app.use((e,req,res,next)=>{
  const code=Number(e.status)||500;
  if(code>=500)console.error('ADRA API failure:',e.message);
  res.status(code>=400&&code<600?code:500).json({error:code>=500?'Server or Microsoft 365 operation failed':e.message});
});
const port=Number(process.env.PORT||3000);
app.listen(port,()=>console.log('ADRA organization-only API listening on '+port));
