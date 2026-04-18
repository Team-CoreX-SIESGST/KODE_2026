# CDSS Backend Docs

This folder documents the current backend implementation for the maternal and neonatal Clinical Decision Support System (CDSS).

All examples in these docs assume the backend is running at:

- `http://localhost:5002`

This matches the current local `.env` in this workspace.

## What is implemented

- Health endpoints
- ANM authentication
- ABHA-based patient create/update
- Patient OTP authentication
- Structured checklist metadata for maternal and neonatal flows
- CDSS patient create or fetch flow
- Maternal and neonatal visit storage
- Explainable decision engine
- Dashboard prioritization
- Patient visit history
- Risk timeline and trend analysis
- Offline sync endpoint
- English and Hindi output support

## Files in this folder

- `API.md` - endpoint-by-endpoint API reference with body formats
- `DECISION_ENGINE.md` - implemented rules, scoring, overrides, and explainability
- `TESTING.md` - working Requestly/Postman style test flow from start to finish
- `STREAMLIT_UI.md` - how to run the local Streamlit backend tester

## Current route groups

- `/`
- `/api/health`
- `/api/anm/*`
- `/api/patient/*`
- `/api/cdss/*`

## Current backend shape

- ANM account model
- Patient model with ABHA profile, demographics, pregnancy details, and CDSS summary
- Clinical visit model for maternal and neonatal assessments
- OTP request model

## Notes

- Protected routes require `Authorization: Bearer <token>`.
- CDSS protected routes currently use ANM auth.
- Patient tokens are issued only through OTP verification. Direct ABHA-ID login is disabled.
- The decision engine is rule-based and explainable. It is not a black-box ML model.
- A local Streamlit tester is available at `/Users/umairmomin/Desktop/KODE_2026/server/streamlit_app.py`.
