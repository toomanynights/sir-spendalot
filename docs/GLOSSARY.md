# Sir Spendalot — Glossary

Canonical terms for user-facing text. When writing UI copy, prefer the medieval term over the plain one unless the plain term is listed as canonical here.

---

## Core Concepts

| Plain term | Sir Spendalot term | Notes |
|---|---|---|
| Transaction | **Chronicle** (noun), **Deed** (action) | "Chronicle" for records in a list; "Deed" when the user is performing an action ("Record Thy Deed", "Inscribe Deed") |
| Prediction / Scheduled expense | **Prophecy** | Plural: **Prophecies** |
| Account balance area / account management | **Treasury** | The page and concept |
| Financial forecast | **Prophecy** / **Forecast** | "Prophecy" for individual predictions; "Forecast" acceptable in technical settings labels |
| Delete (soft, restorable) | **Strike** | Past tense: **struck**. Chronicles only — these can be restored |
| Delete (hard, permanent) | **Smite** | Past tense: **smote**. Accounts, categories, payment methods — permanent, irreversible |
| Deleted state badge | **(struck)** | Chronicles table only |
| Checkup / reconcile | **Reckoning** / **Reconcile** | Both are used; "Reconcile" on buttons, "Reckoning" in modal body and history |

---

## Page & Card Headers

| Location | Canonical text |
|---|---|
| Dashboard card — record expense | "Record Thy Deed" |
| Dashboard card — upcoming predictions | "Future Prophecies" |
| Dashboard card — recent transactions | "Recent Chronicles" |
| Dashboard card — balance summary | "This Day's Fortune" |
| Dashboard card — lowest forecast | "Thy Lowest Fortunes" |
| Quick Entry card — form | "Record Thy Deeds" |
| Quick Entry card — pending | "Prophecies Awaiting" |
| Analytics — composition | "Spending Composition" |
| Analytics — daily trend | "Daily Spending" |
| Analytics — monthly bar chart | "Monthly Chronicle" |
| Analytics — balance history | "Treasury Over Time" |
| Settings — forecast config | "Forecast & Reckoning" |
| Settings — notifications | "Notifications & Checkups" |
| Settings — CSV importer | "Import the Annals" |
| Settings — backup/restore | "Data Operations" |

---

## Buttons & Actions

| Action | Canonical text |
|---|---|
| Submit a new expense (dashboard) | "Inscribe Deed" (button), loading: "Inscribing..." |
| Submit batch of expenses (quick entry) | "Record all deeds" (button), loading: "Inscribing…" |
| Save forecast/threshold settings | "Seal settings" (button), loading: "Sealing..." |
| Save notification settings | "Save notifications" |
| Soft-delete a chronicle | button title: "Strike this chronicle" |
| Show soft-deleted chronicles in filter | "Show struck chronicles" |
| Hard-delete an account/category/payment method | button title: "Smite", confirm: `Smite {type} "{name}"?` |
| Delete modal (with reassignment) | modal title: `Smite {type} — {name}`, button: "Reassign & smite" |
| Backup data | "Preserve the Annals" |
| Wipe all data | "Raze the Annals" |
| Confirm a prophecy instance | "Confirm" |
| Skip a prophecy instance | "Skip" |

---

## Validation & Error Messages

All validation errors shown to the user should start with **"Hark!"** — this applies consistently across all forms.

| Context | Message |
|---|---|
| No amount / no category | "Hark! Thou must provide an amount and a category." |
| Amount not positive | "Hark! Use a positive amount greater than zero." |
| Payment method required | "Hark! Thy realm requires a payment method on this deed." |
| Subcategory required | "Hark! Thy realm requires a subcategory on this deed." |
| Invalid amount (batch) | "Hark! Some deeds bear an invalid amount (must be positive)." |
| Invalid prophecy amount (batch) | "Hark! Some prophecies bear an invalid amount (must be positive)." |
| Missing category (batch) | "Hark! Some deeds lack a category." |
| Missing payment method (batch) | "Hark! Some deeds lack a payment method (required by realm settings)." |
| Missing subcategory (batch) | "Hark! Some deeds lack a subcategory (required by realm settings)." |
| No treasury selected | "Hark! No treasury is selected." |
| Generic save failure | "Alas! The record could not be inscribed." |

---

## Terms Intentionally Left Plain

These are widely understood financial or technical terms where medieval lingo would reduce clarity:

- **Payment Method** — too embedded in financial literacy
- **Settings** (page name) — universal navigation convention
- **Spending** — neutral, core project term (used in "Spending Composition", "Daily Spending")
- **Notifications** (section header) — technical term users must recognise
- **CSV Import** — technical tool, audience already knows what CSV is
- **Current** / **Savings** (account types) — standard financial categories
- **Cancel** — universal UX convention; do not replace with medieval alternatives
- **Date** / **Amount** / **Category** (table column headers) — scannable data labels, not prose

---

## Ellipsis Usage

Use `...` in placeholder text where the prompt is an **invitation into a personal field** — the ellipsis creates a deferential pause, as if waiting for the user's word.

**Correct:** `"Thy name..."`, `"Thy notes on this deed..."`, `"Thy secret phrase..."`  
**Avoid:** amount fields, date fields, or any field where the prompt is a directive rather than an invitation.

---

*Last updated: 2026-05-13*
