// Provision only inside an explicitly configured ADRA organizational SharePoint site.
// Does not use /me/drive, OneDrive or a personal site.
import 'dotenv/config';
import {graph, graphPages, site} from './graph.js';
import {defs, DOCUMENT_LIBRARY} from './schema.js';

const base='/sites/'+site();

function assertOrganizationalSite(info) {
  if(!info?.webUrl) throw new Error('SHAREPOINT_SITE_ID was not resolved.');
  const url=new URL(info.webUrl);
  if(!url.hostname.endsWith('.sharepoint.com') ||
     url.hostname.includes('-my.sharepoint.com') ||
     /\/personal\//i.test(url.pathname)) {
    throw new Error('Refusing personal OneDrive/SharePoint site: '+url.hostname);
  }
  const expected=(process.env.SHAREPOINT_HOSTNAME||'').toLowerCase();
  if(!expected) throw new Error('Set SHAREPOINT_HOSTNAME to the approved ADRA organization SharePoint hostname.');
  if(url.hostname.toLowerCase()!==expected) throw new Error('Site hostname differs from approved organization hostname.');
  return info.webUrl;
}
function checkColumns(def, existing) {
  const names=new Set(existing.map(c=>String(c.name).toLowerCase()));
  return def.columns.filter(c=>!names.has(c.name.toLowerCase()));
}
async function main() {
  const info=await graph(base);
  const webUrl=assertOrganizationalSite(info);
  const lists=await graphPages(base+'/lists?$select=id,displayName,list',500);
  const byName=new Map(lists.map(x=>[x.displayName.toLowerCase(),x]));
  const listIds={};
  for(const [key,definition] of Object.entries(defs)) {
    let item=byName.get(definition.name.toLowerCase());
    if(!item) {
      item=await graph(base+'/lists',{method:'POST',body:{
        displayName:definition.name,
        list:{template:'genericList'},
        columns:definition.columns
      }});
      console.log('Created list '+definition.name);
    } else {
      if(item.list?.template && item.list.template!=='genericList') {
        throw new Error(definition.name+' exists but is not a generic list.');
      }
      const cols=await graphPages(base+'/lists/'+encodeURIComponent(item.id)+'/columns',100);
      for(const column of checkColumns(definition,cols)) {
        await graph(base+'/lists/'+encodeURIComponent(item.id)+'/columns',{method:'POST',body:column});
        console.log('Added column '+definition.name+'.'+column.name);
      }
      console.log('Verified list '+definition.name);
    }
    listIds[key]=item.id;
  }
  // Explicitly require a dedicated SharePoint SITE document library; never choose a user's drive.
  const drives=await graphPages(base+'/drives',200);
  const library=drives.find(d=>d.name===DOCUMENT_LIBRARY && d.driveType==='documentLibrary');
  if(!library) {
    console.log('Lists are ready. An ADRA SharePoint site owner must create a document library named '+DOCUMENT_LIBRARY+' in '+webUrl);
    console.log('M365_LISTS_JSON='+JSON.stringify(listIds));
    throw new Error('Document library not found. Create it in the organizational SharePoint site, then rerun setup.');
  }
  console.log('Organizational SharePoint site: '+webUrl);
  console.log('M365_LISTS_JSON='+JSON.stringify(listIds));
  console.log('M365_DOCUMENT_DRIVE_ID='+library.id);
  console.log('Setup validated. Add the displayed IDs to the SERVER environment only.');
}
main().catch(err=>{console.error('Provisioning failed: '+err.message);process.exitCode=1});
