## v2.24 — Embedded wallpaper

The portal wallpaper is embedded directly inside `public/index.html` as a Base64 WebP data URI. No separate wallpaper file is required.

# ADRA Uganda Procurement System v2.23 — Glass Design Update

This build preserves the procurement, approval, supplier onboarding, fraud-control, payment, electronic identity, role-governance and audit workflows while using the approved glassmorphism interface.

## Visual update
- ADRA Uganda branded green/teal glassmorphism theme
- Scenic, softly blurred procurement wallpaper based on the approved design direction
- Frosted sidebar, header, cards, tables and modal surfaces
- Redesigned Sign In, Staff Sign Up and Supplier Sign Up experience
- Premium role/access/fraud-control indicators
- Restyled Dashboard, New Request wizard, Approval Inbox and Supplier Verification screens
- Compact enterprise typography and responsive layout
- Existing role restrictions, workflow routing and security controls retained

# ADRA Uganda Procurement System v2.22 — Supplier Electronic Onboarding

This build keeps the existing procurement, approvals, payments, role governance, electronic identities, supplier codes and audit controls, and adds a separate electronic supplier registration and verification workflow.

## Supplier Portal

Suppliers do not choose an internal ADRA role. On the authentication screen choose **Supplier sign up** and create a supplier account using company name, contact person, username, password, email and phone number.

After sign-up, the supplier completes a dedicated due-diligence form covering:
- business registration and tax/TIN details;
- physical address and business type;
- directors / beneficial owners;
- goods and services supplied;
- experience and references;
- licences / permits;
- bank ownership details;
- conflict-of-interest declaration;
- anti-bribery / anti-corruption declaration;
- sanctions / debarment declaration;
- supporting evidence uploads.

At least three supporting documents are required before submission.

## Verification route

Supplier submission → **Supplier Verification Officer (Procurement / Supply Chain)** → **Finance Reviewer** → **Procurement Manager / Head of Procurement** → Verified / Rejected.

The supplier is scored against a 100-point matrix. The development threshold is 70%. Mandatory fraud-control criteria must also pass. The score supports, but does not replace, human verification.

Only after final acceptance does the system generate the official supplier code (for example `SUP-00021`) and add the supplier to the verified supplier master. Only verified suppliers are selectable as supplier references on procurement requests.

## Internal roles added

- Supplier Verification Officer — Department: Procurement / Supply Chain
- Procurement Manager — Department: Procurement / Supply Chain; title: Procurement Manager / Head of Procurement

Finance Reviewer remains independently responsible for bank and financial verification. The existing Developer-verification requirement for Finance Reviewer remains in force.

## Running the system

Extract the ZIP and open `public/index.html` in Chrome or Edge.


## v2.26 wallpaper update
Three Uganda landscape photographs from Wikimedia Commons are referenced directly inside `public/index.html` and used as rotating page backgrounds. See `WALLPAPER_SOURCES.md` for attribution and license details.

## Public repository security

This public source package does not publish a hard-coded Developer password. Production identity and privileged access must be configured through the organization’s approved authentication mechanism (for example Microsoft Entra ID/MFA).
