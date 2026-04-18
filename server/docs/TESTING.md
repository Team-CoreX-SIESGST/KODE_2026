# Testing Guide

This is the fastest end-to-end review flow for the current backend.

Base URL:

- `http://localhost:5002`

## Recommended test order

1. Health check
2. Register ANM
3. Login ANM
4. Register patient
5. Create or fetch patient
6. Submit maternal visit
7. Submit second maternal visit for trend
8. Open dashboard
9. Open timeline
10. Submit neonatal visit
11. Test offline sync
12. Test patient OTP auth

## 1. Health check

### `GET /`

Expected:

```text
Server is running
```

### `GET /api/health`

Expected:

```json
{
  "status": "OK",
  "message": "API is healthy"
}
```

## 2. Register ANM

### `POST /api/anm/register`

```json
{
  "name": "ANM Sushma",
  "username": "anm.sushma",
  "password": "anm123",
  "phoneNumber": "9876543210",
  "facilityName": "PHC Nabha",
  "serviceArea": "Nabha Block",
  "locationCoordinates": {
    "latitude": 30.3758,
    "longitude": 76.1529
  }
}
```

Expected:

- 201 response
- token returned

## 3. Login ANM

### `POST /api/anm/login`

```json
{
  "username": "anm.sushma",
  "password": "anm123"
}
```

Expected:

- 200 response
- token returned

Use this token for all protected endpoints.

## 4. Register patient

### `POST /api/patient/register`

```json
{
  "name": "Meena Devi",
  "abhaId": "ABHA-1001",
  "healthId": "meena@abdm",
  "phoneNumber": "9123456789",
  "demographicData": {
    "ageYears": 24,
    "village": "Nabha",
    "district": "Patiala"
  },
  "pregnancyDetails": {
    "currentlyPregnant": true,
    "gravida": 2,
    "parity": 1,
    "gestationalAgeWeeks": 32
  },
  "locationCoordinates": {
    "latitude": 30.3758,
    "longitude": 76.1529
  }
}
```

Expected:

- 201 response
- patient record returned
- no patient token is returned here

## 5. Create or fetch patient

### `POST /api/cdss/patients`

```json
{
  "abhaId": "ABHA-1001",
  "name": "Meena Devi",
  "phoneNumber": "9123456789",
  "demographicData": {
    "ageYears": 24,
    "village": "Nabha",
    "district": "Patiala"
  },
  "pregnancyDetails": {
    "currentlyPregnant": true,
    "gravida": 2,
    "parity": 1,
    "gestationalAgeWeeks": 32
  },
  "locationCoordinates": {
    "latitude": 30.3758,
    "longitude": 76.1529
  }
}
```

Expected:

- patient record returned
- copy `patient._id`

## 6. Maternal high-risk test

### `POST /api/cdss/patients/PATIENT_ID/visits`

```json
{
  "visitType": "MATERNAL",
  "language": "en",
  "maternal": {
    "vitals": {
      "bpSystolic": 168,
      "bpDiastolic": 112,
      "temperatureC": 38.6
    },
    "symptoms": {
      "swelling": true,
      "fever": true,
      "bleeding": false,
      "headache": true,
      "blurredVision": true,
      "convulsions": false,
      "reducedFetalMovement": true
    },
    "observations": {
      "muacCm": 20.5,
      "fetalMovement": "REDUCED",
      "urineProtein": "THREE_PLUS",
      "hemoglobinGdl": 6.8,
      "gestationalAgeWeeks": 32
    }
  }
}
```

Review these fields:

- `assessment.riskLevel`
- `assessment.identifiedConditions`
- `assessment.reasons`
- `assessment.clinicalExplanation`
- `assessment.recommendedAction`
- `assessment.referral`
- `assessment.alerts`

This request should produce a high-severity result and usually a `CRITICAL` outcome because of severe hypertension plus multiple risk signals.

## 7. Trend and warning test

Submit another visit for the same patient.

### `POST /api/cdss/patients/PATIENT_ID/visits`

```json
{
  "visitType": "MATERNAL",
  "language": "en",
  "maternal": {
    "vitals": {
      "bpSystolic": 150,
      "bpDiastolic": 98,
      "temperatureC": 38.2
    },
    "symptoms": {
      "swelling": true,
      "fever": true,
      "bleeding": false,
      "headache": true,
      "blurredVision": false,
      "convulsions": false,
      "reducedFetalMovement": false
    },
    "observations": {
      "muacCm": 22,
      "fetalMovement": "NORMAL",
      "urineProtein": "TWO_PLUS",
      "gestationalAgeWeeks": 31
    }
  }
}
```

Expected:

- trend-related alert appears after repeated visits
- repeated fever may add history alert
- rising BP pattern may appear in alerts and factors

## 8. Dashboard test

### `GET /api/cdss/dashboard`

Expected:

- patient appears in dashboard
- patient is tagged with latest risk

## 9. Timeline test

### `GET /api/cdss/patients/PATIENT_ID/timeline`

Expected:

- visit list in chronological order
- maternal trend arrays, for example:
  - `bpSystolic`
  - `bpDiastolic`
  - `temperatureC`
  - `muacCm`
  - `fetalMovement`

## 10. Neonatal test

### `POST /api/cdss/patients/PATIENT_ID/visits`

```json
{
  "visitType": "NEONATAL",
  "language": "en",
  "neonatal": {
    "symptoms": {
      "fever": true,
      "hypothermia": false,
      "fastBreathing": true,
      "chestIndrawing": true,
      "notFeeding": true,
      "lethargy": true,
      "convulsions": false
    },
    "observations": {
      "ageDays": 3,
      "birthWeightKg": 1.9,
      "currentWeightKg": 1.8,
      "temperatureC": 38.1,
      "breathingRate": 68
    }
  }
}
```

Expected:

- danger signs flagged
- breathing distress flagged
- referral urgency escalated

## 11. Offline sync test

### `POST /api/cdss/sync/visits`

```json
{
  "visits": [
    {
      "clientGeneratedId": "offline-visit-001",
      "abhaId": "ABHA-1001",
      "visitType": "MATERNAL",
      "language": "en",
      "maternal": {
        "vitals": {
          "bpSystolic": 142,
          "bpDiastolic": 94,
          "temperatureC": 37.8
        },
        "symptoms": {
          "swelling": true,
          "fever": false,
          "bleeding": false,
          "headache": true,
          "blurredVision": false,
          "convulsions": false,
          "reducedFetalMovement": false
        },
        "observations": {
          "muacCm": 22.5,
          "fetalMovement": "NORMAL",
          "urineProtein": "TRACE",
          "gestationalAgeWeeks": 30
        }
      }
    }
  ]
}
```

## 12. Patient OTP auth

### `POST /api/patient/otp/send`

```json
{
  "phoneNumber": "9123456789"
}
```

### `POST /api/patient/otp/verify`

```json
{
  "phoneNumber": "9123456789",
  "otp": "123456"
}
```

Expected:

- OTP send succeeds when Twilio is configured
- OTP verify returns the patient token
- direct `POST /api/patient/login` is intentionally unavailable

Expected:

- `SYNCED` status returned
- same `clientGeneratedId` reused later should result in `DUPLICATE_IGNORED`

## 11. Multilingual test

### `POST /api/cdss/patients/PATIENT_ID/visits`

```json
{
  "visitType": "MATERNAL",
  "language": "hi",
  "maternal": {
    "vitals": {
      "bpSystolic": 165,
      "bpDiastolic": 110
    },
    "symptoms": {
      "swelling": true,
      "fever": false,
      "bleeding": false,
      "headache": true,
      "blurredVision": true,
      "convulsions": false,
      "reducedFetalMovement": false
    },
    "observations": {
      "fetalMovement": "NORMAL",
      "urineProtein": "THREE_PLUS",
      "gestationalAgeWeeks": 34
    }
  }
}
```

Expected:

- Hindi action text
- Hindi referral text
- Hindi condition labels where localized

## Suggested review checklist

- ANM auth works
- ABHA patient flow works
- Maternal risk output is explainable
- Neonatal risk output is explainable
- Dashboard prioritizes higher risk first
- Timeline shows trends across visits
- Offline sync prevents duplicate re-save
- Hindi localization is returned when requested
