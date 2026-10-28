import test from 'node:test';
import assert from 'node:assert/strict';
import {defs,DOCUMENT_LIBRARY} from './schema.js';

test('all procurement registers have unique names and expected columns',()=>{
  assert.equal(Object.keys(defs).length,10);
  const names=Object.values(defs).map(x=>x.name);
  assert.equal(new Set(names).size,names.length);
  for(const [key,def] of Object.entries(defs)){
    assert.match(def.name,/^ADRA_[A-Za-z]+$/);
    for(const required of ['RecordId','Status','ActorId','UpdatedAt','Payload']){
      assert.ok(def.columns.some(x=>x.name===required),key+' missing '+required);
    }
    const columns=def.columns.map(x=>x.name);
    assert.equal(columns.length,new Set(columns).size,key+' has duplicate column names');
  }
});
test('manual payments carry audit and ledger reference fields',()=>{
  const cols=defs.payments.columns.map(x=>x.name);
  for(const f of ['RequestId','Amount','Currency','Method','Reference','PaymentDate','Voided'])
    assert.ok(cols.includes(f));
});
test('all upload metadata is stored in a dedicated organization document register',()=>{
  const cols=defs.documents.columns.map(x=>x.name);
  for(const f of ['RequestId','FileName','DriveItemId','MimeType','SizeBytes','UploadedBy','UploadedAt'])
    assert.ok(cols.includes(f));
  assert.equal(DOCUMENT_LIBRARY,'ADRA_Procurement_Documents');
});
test('authorization is based on Entra object ID and active role',()=>{
  const cols=defs.userRoles.columns.map(x=>x.name);
  assert.ok(cols.includes('EntraObjectId'));
  assert.ok(cols.includes('AppRole'));
  assert.ok(cols.includes('IsActive'));
});
