# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

CRF system for a clinical research study on a Chinese herbal formula (荆防合剂) treating allergic rhinitis. Two separate apps in one repo:

- **`crf-backend/`** — FastAPI + PostgreSQL + SQLAlchemy + Alembic REST API. JWT auth.
- **`crf-system/`** — React 19 + TypeScript + Ant Design frontend (Vite). UI text is all Chinese.

In production the FastAPI app also serves the built frontend (`crf-system/dist`) same-origin via a `SPAStaticFiles` mount in `app/main.py` — no CORS in prod. In dev, Vite proxies `/api` → `http://localhost:8000` (`vite.config.ts`).

UI is in Chinese. Domain concepts (visits, patients, adverse events, centers) use medical/research terminology; keep Chinese labels/strings when working in frontend components.

## Commands

Backend (Python — the canonical interpreter is a conda env at `/opt/anaconda3/envs/crf/bin/python`, used by all scripts and deploy):

```bash
cd crf-backend
pip install -r requirements.txt
/opt/anaconda3/envs/crf/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000   # dev server
/opt/anaconda3/envs/crf/bin/python -m pytest                                  # all tests
/opt/anaconda3/envs/crf/bin/python -m pytest tests/test_api.py -k test_name   # single test
/opt/anaconda3/envs/crf/bin/python -m alembic revision --autogenerate -m "desc"   # new migration
/opt/anaconda3/envs/crf/bin/python -m alembic upgrade head                        # apply migrations
```

Frontend:

```bash
cd crf-system
npm install
npm run dev        # Vite dev server http://localhost:5173
npm run build      # tsc -b && vite build → dist/ (this is what prod serves)
npm run lint       # oxlint
```

Repo-root helper scripts (macOS-oriented; toggle the whole system on/off):

```bash
./start.sh               # build-if-missing + start backend + ngrok tunnel, print URLs/accounts
./start.sh rebuild       # rebuild frontend first
./deploy.sh up|lan|down|status|rebuild
```

`database.py` creates the engine at import time from `settings.DATABASE_URL` (pydantic-settings, `.env` in `crf-backend/`). After ALTERing models, remember `alembic revision --autogenerate` + `upgrade`.

## Data seeding & demo accounts

The DB starts empty. Two idempotent scripts populate it (`cd crf-backend`, run with the conda python):

- `scripts/seed_patients.py` — creates 12 patient records (3 per center 01–04) using each center's `doctor0X` account.
- `scripts/sync_patient_status.py` — aligns backend patient `status`/`randomization_no` with the frontend's seed dataset intent (fixes mismatches where backend says `screening` but the demo data shows completed visits).

Demo accounts (center `01` admin, `doctor0X` in centers `01`–`04`) and their passwords are printed by `start.sh` / `deploy.sh` (e.g. `admin / admin@crf2026`, `doctor01 / Doctor@0101`). Add center users via raw SQL `INSERT` with a bcrypt hash from `app.core.security.get_password_hash`.

## Backend architecture

- **Routers** in `app/routers/` (`auth`, `patients`, `visits`, `adverse_events`, `concomitant_meds`, `export`) are registered in `app/main.py` under prefix `/api/v1`. Pydantic schemas (Pydantic v2, `model_dump`) in `app/schemas/schemas.py`. All DB access goes through `Depends(get_db)`.
- **Auth & multi-center isolation**: `auth.get_current_active_user` is the auth dependency. `patients.check_patient_access` is imported by other routers — **every patient-scoped route must call it**. Role `admin` sees all centers; `doctor` is filtered to `center_id == current_user.center_id` (and `create_patient` forces the patient's center to the creator's). Frontend preserves this role distinction when querying.
- **Migrations** with Alembic in `crf-backend/alembic/`; one initial migration exists.

### The `visits` table is the heart of the CRF

A visit row = `patient_id` + `visit_no` (`V1`–`V6`) + `status` (`draft`/`submitted`) + **one JSON `data` column holding the entire form payload** for that visit. The backend stores the JSON verbatim and does not model individual form fields (except the eligibility keys below). V1 is auto-created empty when a patient is created.

**Eligibility logic** (`app/routers/visits.py:check_eligibility`): on submitting `V1`, it reads `inclusionCriteria` (all 5 must pass) and `exclusionCriteria` (none of 6 may be true), writes an `eligibility` object into `visit.data`, and if eligible sets patient `status='treatment'` and `randomization_no = screening_no[-3:]`, else `status='screening_failed'`. Other routers treat visits as opaque JSON.

## Frontend architecture

- **State**: `src/store/PatientContext.tsx` — one React Context (`usePatientStore()`) with a typed `useReducer`; persisted to `localStorage` (key `crf_system_state`) to survive refresh. Bump `SCHEMA_VERSION` if the stored shape changes (stale cache is dropped only when `_v` mismatches).
- **API layer**: `src/api/http.ts` (axios instance, `baseURL '/api/v1'`, auto-attaches JWT, 401 → clears token + redirects `/login`) → `src/api/client.ts` (typed calls, backend **snake_case**) → `src/api/mappers.ts` (maps backend ↔ frontend **camelCase** types; backend `int` id ↔ frontend string id `pid_<int>` via `toFrontId`/`toBackendId`).
- **Types** in `src/types/`: `patient.ts`, `visit.ts`, `adverseEvent.ts`, `concomitantMed.ts` (also has `nonDrugTherapies`/completion). `Patient` is a rich nested structure; a visit's `VisitData` holds the many scoring sub-objects (vas/symptom four-scale/RQLQ/TCM/lab/etc.).
- **Scoring & validation** are frontend-computed: `src/utils/scoring.ts` (BMI, VAS totals, RQLQ, TCM, efficacy index, etc.) and `src/utils/validators.ts`. Reusable controlled form controls live in `src/components/` (VASSlider, SymptomScoreCard, RQLQForm, …), exposing `{ value?, onChange?, disabled? }` per `componentTypes.ts`, and must return the full object including derived `total` on change.
- **Pages**: `src/pages/PatientList` and `PatientDetail` with one `VisitVX.tsx` per visit (V1–V6).

### Dual-source patient data (the key merge to understand)

There are **two sources of patient truth** that the frontend reconciles by `screeningNo`:

1. **Backend `Patient` records** — flat, authoritative for `status`, `randomization_no`, `center_id`, and drive eligibility/export/center isolation. Loaded via `apiListPatients`.
2. **Local seed dataset** `src/mock/seedDataset.ts` — rich full form data (all visits' scores, demographics, AE/meds/etc.) generated by `createSeedDataset()` from `buildProfiles()` (3 patients per center, varied statuses/fill levels). This is what makes the demo look complete.

On `LOAD_PATIENTS` (in `PatientList/index.tsx`), `mergeSeedIntoBackend(seedPatients, backendList)` (`api/mappers.ts`) **uses the seed patient as the base and overlays backend fields** (`status` from backend wins over seed). So a patient shows backend identity + seed form data; new backend patients (no seed match) fall back to `backendToPatient` (mostly empty form). Edits via the store `UPDATE_*` dispatches.

Note: `patientToBackend` currently returns only demographic fields — visit form edits are kept in frontend state and are **not** persisted to the backend `visits.data` in the current integration (visit updates via `apiUpdateVisit` exist in `client.ts` but the store's `UPDATE_VISIT` dispatches don't route through it).

## Conventions

- Backend routes are `async def`, use type annotations, `Depends(get_db)`, `Depends(get_current_active_user)`; Pydantic V2 (`model_dump`).
- Naming case differs per side: **snake_case on the wire/backend, camelCase in frontend code** — map through `mappers.ts`, don't mix.
- Dates are stored as `YYYY-MM-DD` **strings** (not timestamps) in most backend columns and throughout frontend types.
- Backend `status` enum: `screening | treatment | followup | completed | withdrawn | screening_failed`. Frontend `PatientStatus` has no `screening_failed` — `mappers.ts` maps it to `screening`.
