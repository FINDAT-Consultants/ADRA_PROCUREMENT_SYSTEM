const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const DBKEY='adraProcurementBrowserDB_v222', SESSIONKEY='adraProcurementSession_v222';
const store=new Map(),storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const context={window:{},localStorage:storage,Date,Math,JSON,Promise,console,Blob,atob,setTimeout};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../local-engine.js'),'utf8'),context);
const api=context.window.ADRA_LOCAL_ENGINE.api;
function getDB(){return JSON.parse(store.get(DBKEY));}
function putDB(db){store.set(DBKEY,JSON.stringify(db));}
function asUser(id){store.set(SESSIONKEY,id);}
const today=new Date().toISOString().slice(0,10);
async function request(body){return await api('/api/transactions/PR-TEST/payment',{method:'POST',body:JSON.stringify({...body,signatureConfirmed:true})});}
async function mustReject(fn,message){let rejected=false;try{await fn()}catch(e){rejected=true;if(message)assert(e.message.includes(message),`Unexpected error: ${e.message}`);}assert(rejected,'Expected request to be rejected');}
async function run(){
 await api('/api/auth/session');
 let db=getDB();db.transactions.push({id:'PR-TEST',type:'Supplier Payment',status:'Fully Approved',currentStage:'Completed',amount:1000,currency:'UGX',payee:'Sample Payee',requester:'u1',finalApprovalDate:new Date().toISOString(),paymentProcessed:false,locked:true});putDB(db);
 asUser('u1');await mustReject(()=>request({paymentAmount:1000,paymentDate:today,paymentMethod:'Bank Transfer',paymentReference:'BR001'}),'Accounts');
 asUser('u5');await mustReject(()=>request({paymentAmount:400,paymentDate:today,paymentMethod:'Bank Transfer',paymentReference:'BR001'}),'Developer-verified');
 asUser('dev');await api('/api/admin/users/u5/verify-role',{method:'POST',body:'{}'});
 asUser('u5');let t=(await request({paymentAmount:400,paymentDate:today,paymentMethod:'Bank Transfer',paymentReference:'BR001',note:'First installment'})).transaction;
 assert.equal(t.status,'Partially Paid');assert.equal(t.paymentTotal,400);assert.equal(t.paymentRemaining,600);assert.equal(t.paymentEntries.length,1);
 await mustReject(()=>request({paymentAmount:700,paymentDate:today,paymentMethod:'Bank Transfer',paymentReference:'BR002'}),'exceed');
 await mustReject(()=>request({paymentAmount:100,paymentDate:today,paymentMethod:'Bank Transfer',paymentReference:'BR001'}),'already');
 await mustReject(()=>request({paymentAmount:100,paymentDate:'2029-01-01',paymentMethod:'Bank Transfer',paymentReference:'BR003'}),'future');
 const first=t.paymentEntries[0].id;
 await mustReject(()=>request({entryId:first,paymentAmount:500,paymentDate:today,paymentMethod:'Cash',paymentReference:'REC001'}),'reason');
 t=(await request({entryId:first,paymentAmount:500,paymentDate:today,paymentMethod:'Cash',paymentReference:'REC001',reason:'Corrected amount using receipt'})).transaction;
 assert.equal(t.paymentRemaining,500);
 // Online payment options have been removed at both form and API validation layers.
 for(const oldMethod of ['Visa','Mastercard','MTN MoMo','Airtel Money']){
  await mustReject(()=>request({paymentAmount:500,paymentDate:today,paymentMethod:oldMethod,paymentReference:'OLD-'+oldMethod}),'Electronic payment options');
 }
 t=(await request({paymentAmount:500,paymentDate:today,paymentMethod:'Bank Deposit',paymentReference:'DEP-999'})).transaction;
 assert.equal(t.status,'Paid');assert.equal(t.paymentProcessed,true);assert.equal(t.paymentRemaining,0);
 await mustReject(()=>request({paymentAmount:1,paymentDate:today,paymentMethod:'Cash',paymentReference:'REC002'}),'exceed');
 await mustReject(()=>request({action:'void',entryId:first}),'reason');
 t=(await request({action:'void',entryId:first,reason:'Receipt reversed at bank'})).transaction;
 assert.equal(t.status,'Partially Paid');assert.equal(t.paymentRemaining,500);assert(t.paymentEntries[0].voidedAt);
 await mustReject(()=>request({entryId:first,paymentAmount:1,paymentDate:today,paymentMethod:'Cash',paymentReference:'REC003',reason:'Retry'}),'Voided');
 t=(await request({paymentAmount:500,paymentDate:today,paymentMethod:'Bank Transfer',paymentReference:'BR004'})).transaction;
 assert.equal(t.status,'Paid');
 db=getDB();const au=db.audit.filter(x=>x.requestId==='PR-TEST');assert.equal(au.length,5);assert(au.every(x=>x.signature&&x.paymentChange));
 console.log('PASS: electronic payment methods rejected; accounts-only creation, partial/full totals, overpayment, duplicate refs, date validation, reason-required correction, voids and signed audit.');
 db.transactions.push({id:'PR-LEGACY',type:'Supplier Payment',status:'Paid',currentStage:'Paid',amount:1400,currency:'UGX',paymentProcessed:true,paymentMethod:'Visa',bankReference:'LEG-100',paymentDate:today});putDB(db);
 await api('/api/bootstrap');db=getDB();let legacy=db.transactions.find(x=>x.id==='PR-LEGACY');assert.equal(legacy.paymentEntries.length,1);assert.equal(legacy.paymentTotal,1400);assert.equal(legacy.paymentEntries[0].method,'Visa');
 await api('/api/bootstrap');legacy=getDB().transactions.find(x=>x.id==='PR-LEGACY');assert.equal(legacy.paymentEntries.length,1);
 console.log('PASS: migrated paid records are preserved once, without duplicate entries.');
}
run().catch(e=>{console.error(e);process.exit(1)});
