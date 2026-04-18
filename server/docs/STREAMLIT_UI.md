# Streamlit UI

A simple Streamlit app is available to manually test the backend from a browser.

File:

- `/Users/umairmomin/Desktop/KODE_2026/server/streamlit_app.py`

## What it covers

- health checks
- ANM register/login
- patient create or fetch
- patient OTP send and verify
- maternal visit submission
- neonatal visit submission
- dashboard
- visit history
- timeline
- offline sync

## Run it

From the server folder:

```bash
cd /Users/umairmomin/Desktop/KODE_2026/server
streamlit run streamlit_app.py
```

If `streamlit` is not on your shell path, use:

```bash
python3 -m streamlit run streamlit_app.py
```

## Backend URL

The sidebar defaults to:

- `http://localhost:5002`

Change it in the sidebar if your backend is running on another port.

## Suggested test flow

1. Open the `Health` tab and verify `/` and `/api/health`
2. Register or login an ANM in `ANM Auth`
3. Create or fetch a patient in `Patient`
4. Copy or confirm the generated patient ID in the sidebar
5. Submit a maternal visit in `Assessment`
6. Open `Dashboard & Timeline`
7. Submit a neonatal visit if needed
8. Test `Offline Sync`

## Notes

- The app stores ANM token and patient ID in Streamlit session state.
- Protected requests automatically use the token from the sidebar.
- Patient tokens are issued through OTP verification only.
- All request bodies are editable JSON blocks so you can tweak values quickly.
