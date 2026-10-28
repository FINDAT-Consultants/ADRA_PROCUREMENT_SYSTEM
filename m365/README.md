# ADRA Uganda — organizational Microsoft 365 storage

**Deployment status: NOT CONNECTED to ADRA's tenant yet.** The currently connected SharePoint profile is not the requested organizational work account. No live ADRA Lists or document library have been created.

## Architecture

The trusted Node.js backend uses Microsoft Graph with server-only credentials. Microsoft Entra ID authenticates organizational users. SharePoint Lists store structured procurement registers and an organizational SharePoint document library stores uploads. The source repository stores code only, never records, tenant secrets or document content.

The existing schema defines ten registers: requests, suppliers, supplier applications, approvals, payments, audit, delegations, authority matrix, documents metadata and user roles. The dedicated library must be named ADRA_Procurement_Documents.

**No personal OneDrive is permitted.** Provisioning refuses personal SharePoint URLs and only accepts the configured ADRA SharePoint hostname. Upload endpoints use a site document-library drive ID, not a signed-in user's drive.

## ADRA administrator setup

1. Open https://m365.cloud.microsoft/apps and sign in using cd@adraUGANDA.org under the **ADRA organizational Microsoft 365 tenant**. Confirm the identity and organizational directory. The Microsoft apps landing page itself does not give this application database access.
2. Choose or create an ADRA organizational SharePoint **team site** for procurement. Obtain its exact site URL, hostname and Microsoft Graph site ID.
3. In that site, create a **document library** named ADRA_Procurement_Documents. Set organizational access rules, retention, sensitivity and malware scanning policy.
4. Register the backend application in the **Microsoft Entra admin center**. An authorized ADRA tenant administrator must grant the appropriate Microsoft Graph application permissions and explicit site access. Prefer Sites.Selected and a site-specific assignment where supported. List/column provisioning may require Sites.Manage.All or elevated administrative provisioning. Avoid broad permanent tenant-wide permission.
5. Configure the Entra-protected API with a version 2 access-token audience and an authorized browser client. Require work-account sign-in, MFA and Conditional Access. Never use a browser token as an app-only Graph token.
6. Deploy Node.js 20+ to an organizational HTTPS host. Copy values from .env.example into server secret storage ONLY. Never commit .env.
7. Run these commands from the m365 folder: npm install, then npm run setup. It creates or checks the SharePoint Lists and columns, and discovers the precreated document library. Save its reported M365_LISTS_JSON and M365_DOCUMENT_DRIVE_ID values in server environment configuration.
8. An ADRA administrator must populate ADRA_UserRoles with one active role entry per Entra Object ID. Give each row unique RecordId and Title, set EntraObjectId, AppRole and IsActive=true. Restrict role-list edits to authorized ADRA security administrators. Do not trust role names from the browser.
9. Start with npm start. Validate the running backend and verify records and uploads in the **organizational** SharePoint site.

## API endpoints

- GET /health: health and organization site/library validation.
- GET /api/m365/me: verified Entra identity and organizational role.
- GET /api/m365/records/{register}: role-controlled SharePoint List records.
- POST /api/m365/requests: creates a new draft request for the signed-in requester.
- POST /api/m365/attachments: stores a file (requestId, filename, mimeType and dataBase64) up to 8 MiB in the ADRA site library and a corresponding documents-metadata record.
- POST /api/m365/manual-payments: manual-only payment register, disabled by default pending concurrency, reconciliation, correction/void and audit controls. No payment transfer or gateway is implemented.

All protected APIs require a valid Microsoft Entra bearer **access token** for the configured tenant and API audience.

## Operational limits

The legacy index.html, app.js and local-engine.js remain an offline demonstration. They use browser localStorage and local role selection; they have NOT been converted to real Entra sign-in or the new backend. Data in the browser is **not synchronized** to organizational SharePoint. Do not put financial or personal data into the prototype. Separate frontend integration and acceptance testing are required.

SharePoint Lists are not transactional SQL. Concurrency, record-level security, audit reliability, approval integrity and reconciliation must be addressed before processing live financial records. A file upload and its metadata record are two operations; unexpected interruptions can require cleanup. Keep Graph credentials on a trusted server and never in a public repository.

Official documentation:
- https://learn.microsoft.com/en-us/graph/api/list-create?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/driveitem-put-content?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/permissions-selected-overview
