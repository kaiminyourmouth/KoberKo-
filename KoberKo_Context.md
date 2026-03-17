# KoberKo — Project Context
> Current repo context document for the finished prototype.
> Use this as a high-level orientation file for future work on KoberKo.

---

## What KoberKo Is

KoberKo is a Filipino-first, offline-capable PhilHealth guidance web app for patients and families.

It helps users answer practical questions like:

- Magkano ang babayaran ng PhilHealth para sa kondisyong ito?
- Direct filing ba ito o reimbursement?
- Ano ang mga dokumentong kailangan?
- Ano ang eksaktong sasabihin sa billing?
- Saan may accredited na ospital malapit sa akin?
- Eligible ba ako base sa contribution timing?

KoberKo is designed for three real-life moments:

1. **Before admission**
2. **At admission or billing**
3. **After discharge / reimbursement / denied claims**

---

## Product Goal

Reduce PhilHealth confusion at the exact moment families need answers most.

KoberKo is not trying to replace PhilHealth. It is a guidance layer that translates circulars, package rules, hospital realities, and claim steps into language ordinary Filipino families can act on.

---

## Current App Structure

### Bottom Navigation

The live app uses **4 bottom tabs**:

1. `Intake`
2. `Find`
3. `Guide`
4. `Account`

### Account Subviews

The `Account` tab can open two full-screen subviews:

- `Saved`
- `Chat`

So the practical information architecture is:

- Intake
- Find
- Guide
- Account
  - Saved
  - Chat

---

## Core User Flows

### 1. Intake

Scenario-based guided flow for users who may not yet know the exact condition or next step.

Current Intake capabilities include:

- scenario selection
- patient relationship capture
- condition selection
- membership selection
- hospital level / type / room selection
- optional hospital city + hospital autocomplete
- after-discharge claim denial / reimbursement guidance
- billing-counter fast mode

### 2. Find

Direct coverage lookup for users who already know the condition.

Current Find capabilities include:

- condition search and browse
- condition detail bottom sheet
- membership / hospital / room selection
- optional actual-bill input
- hospital finder on result screen
- confidence badges on coverage amounts

### 3. Guide

Action-oriented follow-up tab.

Depending on context, it shows either:

- direct-filing billing scripts and document guidance
or
- reimbursement guide and deadlines

### 4. Account

Utility and reference area.

Current Account capabilities include:

- language settings
- default membership
- eligibility checker
- Konsulta explainer
- ePhilHealth portal shortcuts
- HMO + PhilHealth explainer
- Saved results entry point
- AI Chat entry point

---

## Key Features in the Finished Prototype

- offline-capable PWA after first load
- bilingual EN / FIL interface
- static hospital database with accredited hospital finder
- PhilHealth coverage engine with data-confidence labeling
- Zero Balance Billing / No Balance Billing logic
- hospital-level, hospital-type, and room-type aware result logic
- Malasakit Center guidance
- physician accreditation warnings
- annual benefit limits
- dependent eligibility reminders
- reimbursement and appeals guidance
- AI chat grounded against local KoberKo data
- validator layer for AI output
- accuracy test suite and data audit utilities

---

## Data Model

KoberKo is intentionally **static-data-first**.

Main datasets live in `src/data/` and include:

- `conditions.json`
- `benefits.json`
- `condition_details.json`
- `documents.json`
- `scripts.json`
- `membership_types.json`
- `benefit_limits.json`
- `dependent_rules.json`
- `zbb_hospitals.json`
- `nbb_rules.json`
- `reimbursement.json`
- `claim_denial.json`
- `konsulta.json`
- `not_covered.json`
- `hospitals.json`
- `philhealth_sources.json`

Core engines live in `src/engine/` and include:

- `coverage.js`
- `hospitalSearch.js`
- `eligibilityCheck.js`
- `validator.js`

---

## Accuracy Model

KoberKo uses three confidence states in coverage data:

- `verified`
- `estimated`
- `needs_check`

### Meaning

- `verified` = directly grounded in official PhilHealth sources used by the repo
- `estimated` = best available working figure, but not pinned line-for-line to an official source yet
- `needs_check` = broader condition label or package situation where a single flat amount is too risky to overclaim

The app surfaces those states in the UI and the AI is instructed to respect them.

---

## Source Grounding

KoberKo’s current data is grounded primarily in official PhilHealth materials, including:

- PhilHealth Circular 2024-0037 Annex A
- PhilHealth Circular 2024-0037 Annex B
- PhilHealth Circular 2024-0032
- PhilHealth Circular 2024-0014
- PhilHealth Circular 2024-0035
- PhilHealth Circular 2024-0036
- PhilHealth Circular 2025-0001
- PhilHealth circular archives
- PhilHealth benefits pages

Not every condition is modeled as a perfect one-to-one official package.
Where the app uses broader layperson labels than the official package structure, it should stay cautious rather than pretend false certainty.

---

## Current Demo-Safe Example

Use this as the baseline sample scenario:

- Condition: `Community-Acquired Pneumonia (moderate risk)`
- Member type: `SSS`
- Hospital level: `Level 2`
- Expected PhilHealth amount: `₱29,250`
- Direct filing: `YES`

If the user is in a DOH hospital and chooses `WARD`, the ZBB logic should show zero out-of-pocket.

---

## Membership Model

The app now supports a broader membership set than the early build:

- `SSS`
- `GSIS`
- `VOLUNTARY`
- `OFW`
- `NHTS`
- `SPONSORED`
- `SENIOR`
- `LIFETIME`
- `PWD`
- `KASAMBAHAY`

Important nuance:

- `PWD` affects discounts but eligibility still depends on the underlying membership situation
- `SENIOR`, `LIFETIME`, `NHTS`, `SPONSORED`, and `KASAMBAHAY` have no standard contribution-check requirement in the same way as employed/voluntary flows

---

## Hospital Model

KoberKo distinguishes among:

- hospital level
- hospital type
- room type
- specific selected hospital, if available

Hospital type logic matters because:

- `DOH + WARD` can trigger ZBB
- government hospitals may trigger NBB for eligible members
- private hospitals usually follow regular case-rate + co-pay behavior

The hospital database is a large static local dataset and is intentionally chunked separately at build time.

---

## Important Limitations

- KoberKo is a **guidance tool**, not an official PhilHealth portal.
- The app should never guarantee claim approval.
- Medical advice is out of scope.
- Some conditions are broader than a single official package variant.
- AI features are optional and require internet plus a configured API key.
- Core static features should still work offline after first load.

---

## Repo Notes

- `.env.local` should never be committed
- `dist/` should not be committed for repo review
- `node_modules/` should not be committed
- `README.md` is the main judge-facing summary
- this file is for project orientation, not for live user-facing content

---

## Working Principles for Future Updates

1. Prefer official PhilHealth sources over inference.
2. If a condition is too broad for a single exact amount, label it cautiously.
3. Do not remove confidence signaling just to make the UI look cleaner.
4. Keep the app usable offline.
5. Keep the language understandable for stressed families, not just technical reviewers.
