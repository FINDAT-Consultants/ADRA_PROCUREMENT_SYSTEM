# Microsoft 365 Production Integration

The local package deliberately contains no ADRA Uganda tenant secrets.

For organizational production deployment:

1. Replace the local passwordless role switcher with Microsoft Entra ID authentication.
2. Require MFA for Finance and approver groups using the organization's licensed mechanism.
3. Map user identities/groups to Requester, Program Approver, Finance Reviewer, Final Approver, Accounts, Audit and Administrator roles.
4. Store authoritative transaction/supporting-document data on the approved organizational platform.
5. If SharePoint is used, maintain dedicated registers equivalent to Payment Requests, Financial Approval Matrix, Delegated Authority Register and Finance Approval Audit Log.
6. If Power Automate is used for Teams/Outlook approvals, call the same controlled workflow states and retain the backend audit event for each response.
7. Replace demonstration authority limits with the formally approved ADRA Uganda Delegation of Authority.
8. Restrict production database/file-system access and back up the authoritative data store.
9. Keep submitted request fields and documents immutable during an active approval cycle except through the explicit Return for Correction path.
10. Do not use copied signature images as authorization evidence.