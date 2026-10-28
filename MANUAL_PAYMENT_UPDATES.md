# Manual payments ONLY — ADRA Uganda Procurement System

## What was replaced

The former **electronic payment** options have been removed from the Payments screens. There is no Visa / Mastercard checkout, mobile-money payment button, electronic-payment brand logo, online payment gateway, or in-app transfer function. The system **only records payment details entered manually** by authorized staff.

The manual register contains **Bank Transfer (already confirmed elsewhere)**, **Bank Deposit**, **Cash**, **Cheque**, and **Other** as payment record methods. Selecting Bank Transfer is *not* an electronic transfer action — it only describes a payment that has already occurred outside the app. Previously recorded electronic-method names can remain visible in historical entries for audit purposes but cannot be selected for new or corrected entries.

## Who can enter / change payment details

- Verified **Accounts** staff: can add, correct and void payment records on previously approved requests.
- **Developer**: administrative access for the same tasks and Account-role verification.
- **All other roles**: can view only records already permitted to them; cannot update payments.

To enable Accounts payment editing, use **Developer → User & Role Management** and verify the Accounts staff member. New Accounts accounts are not authorized until their role has been verified.

## Steps

1. Complete the usual request approvals. The request must be **Fully Approved**, **Partially Paid**, or **Paid**.
2. The Accounts user opens **Payments → Manual payment updates**, then chooses **Update payment**.
3. Manually enter **Amount paid**, **Actual payment date**, **Payment method**, **Payment / receipt reference** and optional **Remarks**. Tick the confirmation checkbox to attest that evidence was checked, then choose **Record payment**.
4. The approved amount is never changed. Amounts are added to the ledger and **Outstanding balance** is recalculated. A part-paid request shows **Partially Paid**; it changes to **Paid** when the balance reaches zero.
5. For mistakes, **Edit** a payment with a reason, or **Void** it with a reason. Payment changes and identities appear in the audit history. Both payment corrections and voids preserve the original record in the audit trail.

## Upgrading / historical records

Existing paid records are migrated once into manual ledger entries without deleting original payment history. Previously recorded electronic-method labels may still be displayed in the history so old records remain understandable. New entries and corrections accept only the five manual record methods listed above.

## Tests and limitations

Run `node tests/manual-payments.test.js` from this directory. To open the offline demo, launch `index.html` in a modern browser.

**Deployment warning:** This project is a local-browser prototype. It uses browser localStorage to store user and payment records, and its account/role checks are implemented locally. This is **not secure multi-user accounting software**. Before using it operationally, move user authentication, authorization, payments and audit records to a shared trusted server/database with MFA and properly enforced server-side access controls. **No money is sent or received by the app.**
