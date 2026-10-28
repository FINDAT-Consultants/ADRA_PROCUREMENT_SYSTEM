// SharePoint Lists are the authoritative registers; documents live in a separate library.
// Each structured register has indexed identifiers and typed reporting columns.
const t=(name, indexed=false)=>({name,text:{maxLength:255},...(indexed?{indexed:true}:{})});
const n=name=>({name,number:{decimalPlaces:'automatic'}});
const d=name=>({name,dateTime:{format:'dateTime'}});
const payload={name:'Payload',text:{allowMultipleLines:true,appendChangesToExistingText:false,linesForEditing:6}};
const base=[t('RecordId',true),t('Status',true),t('ActorId',true),d('UpdatedAt'),payload];
const defs={
 requests:{name:'ADRA_Requests',columns:[...base,t('RequestType'),t('RequesterId',true),t('SupplierId'),t('Project'),t('Currency'),n('Amount')]},
 suppliers:{name:'ADRA_Suppliers',columns:[...base,t('SupplierCode',true),t('TaxId'),t('ContactEmail')]},
 supplierApplications:{name:'ADRA_SupplierApplications',columns:[...base,t('ApplicantId',true),t('CompanyName')]},
 approvals:{name:'ADRA_Approvals',columns:[...base,t('RequestId',true),t('Stage'),t('Decision'),d('ActionAt')]},
 payments:{name:'ADRA_Payments',columns:[...base,t('RequestId',true),n('Amount'),t('Currency'),t('Method'),t('Reference'),d('PaymentDate'),{name:'Voided',boolean:{}}]},
 audit:{name:'ADRA_Audit',columns:[...base,t('EntityType'),t('EntityId',true),t('Operation'),d('EventAt')]},
 delegations:{name:'ADRA_Delegations',columns:[...base,t('PrincipalId',true),t('DelegateId'),d('StartDate'),d('EndDate')]},
 authorityMatrix:{name:'ADRA_AuthorityMatrix',columns:[...base,t('RequestType'),t('Currency'),n('MinAmount'),n('MaxAmount')]},
 documents:{name:'ADRA_Documents',columns:[...base,t('RequestId',true),t('FileName'),t('DriveItemId'),t('MimeType'),n('SizeBytes'),t('UploadedBy'),d('UploadedAt')]},
 userRoles:{name:'ADRA_UserRoles',columns:[...base,t('EntraObjectId',true),t('AppRole'),{name:'IsActive',boolean:{}}]}
};
const DOCUMENT_LIBRARY='ADRA_Procurement_Documents';
export {defs,DOCUMENT_LIBRARY};
