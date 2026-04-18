import json
from urllib import error, request

import streamlit as st


DEFAULT_BASE_URL = "http://localhost:5002"


ANM_REGISTER_TEMPLATE = {
    "name": "ANM Sushma",
    "username": "anm.sushma",
    "password": "anm123",
    "phoneNumber": "9876543210",
    "facilityName": "PHC Nabha",
    "serviceArea": "Nabha Block",
    "locationCoordinates": {"latitude": 30.3758, "longitude": 76.1529},
}

ANM_LOGIN_TEMPLATE = {"username": "anm.sushma", "password": "anm123"}

PATIENT_TEMPLATE = {
    "abhaId": "ABHA-1001",
    "name": "Meena Devi",
    "phoneNumber": "9123456789",
    "demographicData": {"ageYears": 24, "village": "Nabha", "district": "Patiala"},
    "pregnancyDetails": {
        "currentlyPregnant": True,
        "gravida": 2,
        "parity": 1,
        "gestationalAgeWeeks": 32,
    },
    "locationCoordinates": {"latitude": 30.3758, "longitude": 76.1529},
}

OTP_SEND_TEMPLATE = {"phoneNumber": "9123456789"}

OTP_VERIFY_TEMPLATE = {"phoneNumber": "9123456789", "otp": "123456"}

MATERNAL_VISIT_TEMPLATE = {
    "visitType": "MATERNAL",
    "language": "en",
    "maternal": {
        "vitals": {"bpSystolic": 168, "bpDiastolic": 112, "temperatureC": 38.6},
        "symptoms": {
            "swelling": True,
            "fever": True,
            "bleeding": False,
            "headache": True,
            "blurredVision": True,
            "convulsions": False,
            "reducedFetalMovement": True,
        },
        "observations": {
            "muacCm": 20.5,
            "fetalMovement": "REDUCED",
            "urineProtein": "THREE_PLUS",
            "hemoglobinGdl": 6.8,
            "gestationalAgeWeeks": 32,
        },
    },
}

NEONATAL_VISIT_TEMPLATE = {
    "visitType": "NEONATAL",
    "language": "en",
    "neonatal": {
        "symptoms": {
            "fever": True,
            "hypothermia": False,
            "fastBreathing": True,
            "chestIndrawing": True,
            "notFeeding": True,
            "lethargy": True,
            "convulsions": False,
        },
        "observations": {
            "ageDays": 3,
            "birthWeightKg": 1.9,
            "currentWeightKg": 1.8,
            "temperatureC": 38.1,
            "breathingRate": 68,
        },
    },
}

SYNC_TEMPLATE = {
    "visits": [
        {
            "clientGeneratedId": "offline-visit-001",
            "abhaId": "ABHA-1001",
            "visitType": "MATERNAL",
            "language": "en",
            "maternal": {
                "vitals": {"bpSystolic": 142, "bpDiastolic": 94, "temperatureC": 37.8},
                "symptoms": {
                    "swelling": True,
                    "fever": False,
                    "bleeding": False,
                    "headache": True,
                    "blurredVision": False,
                    "convulsions": False,
                    "reducedFetalMovement": False,
                },
                "observations": {
                    "muacCm": 22.5,
                    "fetalMovement": "NORMAL",
                    "urineProtein": "TRACE",
                    "gestationalAgeWeeks": 30,
                },
            },
        }
    ]
}


def pretty_json(data):
    return json.dumps(data, indent=2, ensure_ascii=False)


def parse_json_input(raw_text):
    return json.loads(raw_text) if raw_text.strip() else None


def api_request(method, base_url, path, payload=None, token=None):
    url = f"{base_url.rstrip('/')}{path}"
    headers = {"Accept": "application/json, text/plain"}
    body = None

    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = request.Request(url, data=body, headers=headers, method=method.upper())

    try:
        with request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8")
            return {
                "ok": True,
                "status": resp.status,
                "url": url,
                "data": parse_response_body(raw),
            }
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        return {
            "ok": False,
            "status": exc.code,
            "url": url,
            "data": parse_response_body(raw),
        }
    except error.URLError as exc:
        return {
            "ok": False,
            "status": None,
            "url": url,
            "data": {"message": f"Connection failed: {exc.reason}"},
        }


def parse_response_body(raw_text):
    if not raw_text:
        return {}
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        return {"raw": raw_text}


def show_response(response, store_key=None):
    if not response:
        return
    if response["ok"]:
        st.success(f"{response['status']} from {response['url']}")
    else:
        status_text = response["status"] if response["status"] is not None else "network error"
        st.error(f"{status_text} from {response['url']}")
    st.code(pretty_json(response["data"]), language="json")
    if store_key:
        st.session_state[store_key] = response


def json_editor(label, key, default_value, height=280):
    st.text_area(
        label,
        value=pretty_json(default_value),
        key=key,
        height=height,
    )
    try:
        return parse_json_input(st.session_state[key]), None
    except json.JSONDecodeError as exc:
        return None, str(exc)


st.set_page_config(page_title="CDSS Backend Tester", layout="wide")

st.title("CDSS Backend Tester")
st.caption("Simple Streamlit harness for ANM auth, ABHA patients, CDSS assessments, dashboard, timeline, and sync.")

st.session_state.setdefault("base_url", DEFAULT_BASE_URL)
st.session_state.setdefault("anm_token", "")
st.session_state.setdefault("patient_id", "")
st.session_state.setdefault("patient_abha_id", PATIENT_TEMPLATE["abhaId"])
st.session_state.setdefault("latest_anm_token", "")
st.session_state.setdefault("latest_patient_id", "")
st.session_state.setdefault("latest_patient_abha_id", PATIENT_TEMPLATE["abhaId"])

with st.sidebar:
    st.header("Connection")
    st.text_input("Base URL", key="base_url")
    st.text_input("ANM Token", key="anm_token")
    st.text_input("Patient ID", key="patient_id")
    st.text_input("Patient ABHA ID", key="patient_abha_id")
    st.markdown("Tip: register/login ANM first, then create patient, then submit visits.")

tab_health, tab_anm, tab_patient, tab_assessment, tab_explore, tab_sync = st.tabs(
    ["Health", "ANM Auth", "Patient", "Assessment", "Dashboard & Timeline", "Offline Sync"]
)

with tab_health:
    st.subheader("Server checks")
    col1, col2, col3 = st.columns(3)
    if col1.button("GET /", use_container_width=True):
        show_response(api_request("GET", st.session_state.base_url, "/"))
    if col2.button("GET /api/health", use_container_width=True):
        show_response(api_request("GET", st.session_state.base_url, "/api/health"))
    if col3.button("Maternal Checklist", use_container_width=True):
        show_response(
            api_request(
                "GET",
                st.session_state.base_url,
                "/api/cdss/checklist?type=maternal&language=en",
            )
        )

    if st.button("Neonatal Checklist (Hindi)"):
        show_response(
            api_request(
                "GET",
                st.session_state.base_url,
                "/api/cdss/checklist?type=neonatal&language=hi",
            )
        )

with tab_anm:
    st.subheader("ANM register and login")
    left, right = st.columns(2)

    with left:
        anm_register_payload, anm_register_error = json_editor(
            "ANM Register Body", "anm_register_body", ANM_REGISTER_TEMPLATE
        )
        if anm_register_error:
            st.error(f"Invalid JSON: {anm_register_error}")
        if st.button("POST /api/anm/register", use_container_width=True):
            if anm_register_error:
                st.error("Fix the JSON first.")
            else:
                response = api_request(
                    "POST",
                    st.session_state.base_url,
                    "/api/anm/register",
                    payload=anm_register_payload,
                )
                if response["ok"] and isinstance(response["data"], dict):
                    st.session_state.latest_anm_token = response["data"].get("token", "")
                show_response(response)
                if st.session_state.latest_anm_token:
                    st.info("ANM token captured below. Paste it into the sidebar token field.")
                    st.code(st.session_state.latest_anm_token)

    with right:
        anm_login_payload, anm_login_error = json_editor(
            "ANM Login Body", "anm_login_body", ANM_LOGIN_TEMPLATE, height=180
        )
        if anm_login_error:
            st.error(f"Invalid JSON: {anm_login_error}")
        if st.button("POST /api/anm/login", use_container_width=True):
            if anm_login_error:
                st.error("Fix the JSON first.")
            else:
                response = api_request(
                    "POST",
                    st.session_state.base_url,
                    "/api/anm/login",
                    payload=anm_login_payload,
                )
                if response["ok"] and isinstance(response["data"], dict):
                    st.session_state.latest_anm_token = response["data"].get("token", "")
                show_response(response)
                if st.session_state.latest_anm_token:
                    st.info("ANM token captured below. Paste it into the sidebar token field.")
                    st.code(st.session_state.latest_anm_token)

        if st.button("GET /api/anm/me", use_container_width=True):
            show_response(
                api_request(
                    "GET",
                    st.session_state.base_url,
                    "/api/anm/me",
                    token=st.session_state.anm_token,
                )
            )

with tab_patient:
    st.subheader("ABHA patient flow")
    left, right = st.columns(2)

    with left:
        patient_payload, patient_error = json_editor(
            "Create or Fetch CDSS Patient Body", "patient_body", PATIENT_TEMPLATE
        )
        if patient_error:
            st.error(f"Invalid JSON: {patient_error}")
        if st.button("POST /api/cdss/patients", use_container_width=True):
            if patient_error:
                st.error("Fix the JSON first.")
            else:
                response = api_request(
                    "POST",
                    st.session_state.base_url,
                    "/api/cdss/patients",
                    payload=patient_payload,
                    token=st.session_state.anm_token,
                )
                if response["ok"] and isinstance(response["data"], dict):
                    patient = response["data"].get("patient", {})
                    st.session_state.latest_patient_id = patient.get("_id", "")
                    st.session_state.latest_patient_abha_id = patient.get("abhaId", st.session_state.patient_abha_id)
                show_response(response)
                if st.session_state.latest_patient_id:
                    st.info("Patient values captured below. Paste them into the sidebar if needed.")
                    st.code(
                        pretty_json(
                            {
                                "patient_id": st.session_state.latest_patient_id,
                                "patient_abha_id": st.session_state.latest_patient_abha_id,
                            }
                        ),
                        language="json",
                    )

        if st.button("POST /api/patient/register", use_container_width=True):
            if patient_error:
                st.error("Fix the JSON first.")
            else:
                show_response(
                    api_request(
                        "POST",
                        st.session_state.base_url,
                        "/api/patient/register",
                        payload=patient_payload,
                    )
                )

    with right:
        otp_send_payload, otp_send_error = json_editor(
            "Patient OTP Send Body", "otp_send_body", OTP_SEND_TEMPLATE, height=140
        )
        otp_verify_payload, otp_verify_error = json_editor(
            "Patient OTP Verify Body", "otp_verify_body", OTP_VERIFY_TEMPLATE, height=160
        )

        st.info("Patient tokens are issued only through OTP verification.")

        col1, col2 = st.columns(2)
        if col1.button("POST /api/patient/otp/send", use_container_width=True):
            if otp_send_error:
                st.error("Fix the OTP send JSON first.")
            else:
                show_response(
                    api_request(
                        "POST",
                        st.session_state.base_url,
                        "/api/patient/otp/send",
                        payload=otp_send_payload,
                    )
                )

        if col2.button("POST /api/patient/otp/verify", use_container_width=True):
            if otp_verify_error:
                st.error("Fix the OTP verify JSON first.")
            else:
                show_response(
                    api_request(
                        "POST",
                        st.session_state.base_url,
                        "/api/patient/otp/verify",
                        payload=otp_verify_payload,
                    )
                )

with tab_assessment:
    st.subheader("Submit maternal or neonatal assessments")
    st.info("Set Patient ID in the sidebar or create/fetch a patient first.")
    maternal_col, neonatal_col = st.columns(2)

    with maternal_col:
        maternal_payload, maternal_error = json_editor(
            "Maternal Visit Body", "maternal_visit_body", MATERNAL_VISIT_TEMPLATE, height=400
        )
        if st.button("POST Maternal Visit", use_container_width=True):
            if not st.session_state.patient_id:
                st.error("Patient ID is required.")
            elif maternal_error:
                st.error("Fix the maternal JSON first.")
            else:
                show_response(
                    api_request(
                        "POST",
                        st.session_state.base_url,
                        f"/api/cdss/patients/{st.session_state.patient_id}/visits",
                        payload=maternal_payload,
                        token=st.session_state.anm_token,
                    )
                )

    with neonatal_col:
        neonatal_payload, neonatal_error = json_editor(
            "Neonatal Visit Body", "neonatal_visit_body", NEONATAL_VISIT_TEMPLATE, height=400
        )
        if st.button("POST Neonatal Visit", use_container_width=True):
            if not st.session_state.patient_id:
                st.error("Patient ID is required.")
            elif neonatal_error:
                st.error("Fix the neonatal JSON first.")
            else:
                show_response(
                    api_request(
                        "POST",
                        st.session_state.base_url,
                        f"/api/cdss/patients/{st.session_state.patient_id}/visits",
                        payload=neonatal_payload,
                        token=st.session_state.anm_token,
                    )
                )

with tab_explore:
    st.subheader("Dashboard, history, and timeline")
    top_left, top_mid, top_right = st.columns(3)

    if top_left.button("GET Dashboard", use_container_width=True):
        show_response(
            api_request(
                "GET",
                st.session_state.base_url,
                "/api/cdss/dashboard",
                token=st.session_state.anm_token,
            )
        )

    if top_mid.button("GET Patient Visits", use_container_width=True):
        if not st.session_state.patient_id:
            st.error("Patient ID is required.")
        else:
            show_response(
                api_request(
                    "GET",
                    st.session_state.base_url,
                    f"/api/cdss/patients/{st.session_state.patient_id}/visits",
                    token=st.session_state.anm_token,
                )
            )

    if top_right.button("GET Timeline", use_container_width=True):
        if not st.session_state.patient_id:
            st.error("Patient ID is required.")
        else:
            show_response(
                api_request(
                    "GET",
                    st.session_state.base_url,
                    f"/api/cdss/patients/{st.session_state.patient_id}/timeline",
                    token=st.session_state.anm_token,
                )
            )

with tab_sync:
    st.subheader("Offline sync")
    sync_payload, sync_error = json_editor("Sync Body", "sync_body", SYNC_TEMPLATE, height=420)
    if st.button("POST /api/cdss/sync/visits", use_container_width=True):
        if sync_error:
            st.error("Fix the sync JSON first.")
        else:
            show_response(
                api_request(
                    "POST",
                    st.session_state.base_url,
                    "/api/cdss/sync/visits",
                    payload=sync_payload,
                    token=st.session_state.anm_token,
                )
            )
