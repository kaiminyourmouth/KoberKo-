# KoberKo — Alamin ang Iyong PhilHealth Coverage

KoberKo is an offline-capable PhilHealth guidance web app for Filipino patients and families. It helps users understand what PhilHealth may pay, whether direct filing should apply, what documents to prepare, which hospitals are accredited, and what to say at billing when a claim is being mishandled.

## Why It Exists

Millions of Filipinos are covered by PhilHealth, but many families only learn what their benefits mean when they are already at admission, at billing, or after discharge. KoberKo is designed to reduce that confusion with a Filipino-first, scenario-based flow that works even with weak connectivity after first load.

## Core Features

- PhilHealth coverage lookup for common inpatient conditions and selected Z-benefits
- Direct filing, reimbursement, and claim-denial guidance
- Zero Balance Billing / No Balance Billing guidance for government hospitals
- Eligibility checker for contribution-dependent membership types
- Accredited hospital finder with static offline data
- Condition explainers in plain language
- Billing scripts and red-flag responses in English and Filipino
- Smart Intake and AI chat layered on top of grounded local data
- PWA support with offline caching after first load

## Built With

- React + Vite
- `vite-plugin-pwa`
- Static JSON datasets and client-side rules engines
- localStorage for saved state
- Optional Groq API integration for AI chat and smart intake, now proxied through a backend so the API key is not exposed to the browser

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Optional: enable AI features by creating `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Then add your Groq key:

```bash
GROQ_API_KEY=your_key_here
```

3. Start the full app (frontend + backend proxy):

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

5. Run the production server locally after building:

```bash
npm run start
```

## Verification

Run the main checks with:

```bash
npm run build
npm run test:accuracy
```

For browser-based end-to-end checks, start the app and run:

```bash
npm run dev
npm run test:e2e
```

## Accuracy Approach

KoberKo uses local static data grounded in official PhilHealth sources, including:

- PhilHealth Circular 2024-0037 Annex A and Annex B
- PhilHealth Circular 2024-0032
- PhilHealth Circular 2024-0014
- PhilHealth Circular 2024-0035
- PhilHealth Circular 2024-0036
- PhilHealth Circular 2025-0001
- PhilHealth benefits and circular archives

The app explicitly marks data confidence in the UI:

- `Verified` for amounts directly pinned to official PhilHealth sources
- `Estimated` for best-available working figures that still need confirmation
- `Check first` for condition labels that are broader than a single official package variant

AI responses are additionally grounded against KoberKo's own local data and validated before display.

## Important Limitations

- KoberKo is a guidance tool, not an official PhilHealth portal.
- PhilHealth can still require eligibility verification, complete documents, and accredited facilities.
- Some broad conditions map to multiple official package variants; those are intentionally labeled more cautiously.
- AI features are optional and require internet plus a configured server-side API key. Core app features still work offline after first load.
- This app does not provide medical advice.

## Demo Scenario

Sample scenario:

- Condition: Community-Acquired Pneumonia (moderate risk)
- Member: SSS employed
- Hospital level: Level 2
- Expected PhilHealth amount: `₱29,250`
- Direct filing: `YES`

## Offline Test

1. Open the app in Chrome.
2. Visit the app once while online.
3. Open DevTools → Network.
4. Switch the network to `Offline`.
5. Reload the app.
6. Repeat a coverage flow and confirm the core static features still work.

## Repo Notes

- `.env.local` is intentionally not committed.
- `dist/`, `node_modules/`, and test artifacts are ignored and should not be included in the repo judges review.
- Historical build/context markdown files in this workspace are archival references, not the current source of truth for app behavior.
