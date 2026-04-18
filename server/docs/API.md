# API Reference

Base URL used in examples:

- `http://localhost:5002`

Protected endpoints require:

```http
Authorization: Bearer YOUR_ANM_TOKEN
Content-Type: application/json
```

Error responses use a stable shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "human readable message"
  }
}
```

## Health

### `GET /`

Purpose:
- Base server health check

Body:
- none

Expected response:

```text
Server is running
```

### `GET /api/health`

Purpose:
- API health check

Body:
- none

Expected response:

```json
{
  "status": "OK",
  "message": "API is healthy"
}
```

## ANM Routes

### `POST /api/anm/register`

Purpose:
- Register a frontline ANM user

Body:

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

Key response fields:

```json
{
  "_id": "ANM_ID",
  "name": "ANM Sushma",
  "username": "anm.sushma",
  "phoneNumber": "9876543210",
  "facilityName": "PHC Nabha",
  "serviceArea": "Nabha Block",
  "locationCoordinates": {
    "latitude": 30.3758,
    "longitude": 76.1529
  },
  "token": "JWT_TOKEN"
}
```

### `POST /api/anm/login`

Purpose:
- Log in an ANM user

Body:

```json
{
  "username": "anm.sushma",
  "password": "anm123"
}
```

### `GET /api/anm/me`

Purpose:
- Fetch current ANM profile

Body:
- none

### `PUT /api/anm/update`

Purpose:
- Update ANM profile

Body:

```json
{
  "facilityName": "CHC Nabha",
  "serviceArea": "Nabha Rural",
  "locationCoordinates": {
    "latitude": 30.38,
    "longitude": 76.15
  }
}
```

### `GET /api/anm/patients`

Purpose:
- List patients assigned to the logged-in ANM

Body:
- none

## Patient Routes

### `POST /api/patient/register`

Purpose:
- Register a patient by ABHA ID
- This route does not issue a patient token

Body:

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

### `POST /api/patient/otp/send`

Purpose:
- Send OTP to a patient mobile number linked to ABHA record

Body:

```json
{
  "phoneNumber": "9123456789"
}
```

### `POST /api/patient/otp/verify`

Purpose:
- Verify patient OTP and return patient token

Body:

```json
{
  "phoneNumber": "9123456789",
  "otp": "123456"
}
```

### `GET /api/patient/me`

Purpose:
- Fetch current patient profile

Body:
- none

### `PUT /api/patient/update`

Purpose:
- Update patient demographics or pregnancy details

Body:

```json
{
  "name": "Meena Devi",
  "phoneNumber": "9123456789",
  "demographicData": {
    "ageYears": 25,
    "village": "Nabha",
    "district": "Patiala",
    "maritalStatus": "Married"
  },
  "pregnancyDetails": {
    "currentlyPregnant": true,
    "gravida": 2,
    "parity": 1,
    "gestationalAgeWeeks": 33,
    "expectedDeliveryDate": "2026-06-20"
  }
}
```

## CDSS Checklist Routes

### `GET /api/cdss/checklist?type=maternal&language=en`

Purpose:
- Return structured step-by-step checklist metadata for maternal assessment

Body:
- none

### `GET /api/cdss/checklist?type=neonatal&language=hi`

Purpose:
- Return structured step-by-step checklist metadata for neonatal assessment

Body:
- none

## CDSS Patient Routes

### `POST /api/cdss/patients`

Purpose:
- Create or fetch patient for CDSS workflow and assign the patient to current ANM if unassigned
- If a patient is already assigned to another ANM, this route returns `403`

Body:

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

Key response fields:

```json
{
  "created": true,
  "patient": {
    "_id": "PATIENT_ID",
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
    }
  }
}
```

## CDSS Visit Routes

### `POST /api/cdss/patients/:patientId/visits`

Purpose:
- Store a maternal or neonatal visit
- Pull last 3 to 5 visits
- Run decision engine
- Return explainable output

### Maternal example body

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

### Neonatal example body

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

Key response fields:

```json
{
  "duplicate": false,
  "visitId": "VISIT_ID",
  "patient": {
    "_id": "PATIENT_ID",
    "abhaId": "ABHA-1001",
    "name": "Meena Devi"
  },
  "assessment": {
    "riskLevel": "CRITICAL",
    "score": 145,
    "identifiedConditions": [
      "Severe hypertension",
      "Possible pre-eclampsia"
    ],
    "reasons": [
      "BP is 168 / 112 mmHg."
    ],
    "clinicalExplanation": [
      "Very high blood pressure in pregnancy can lead to seizures, stroke, placental complications, and maternal or fetal death."
    ],
    "recommendedAction": "Arrange immediate referral to an emergency obstetric or neonatal care facility.",
    "referral": {
      "urgency": "IMMEDIATE",
      "message": "Immediate referral",
      "followUpWindowHours": 0
    },
    "alerts": [
      "BP is increasing over time - risk may increase."
    ]
  }
}
```

### `GET /api/cdss/patients/:patientId/visits`

Purpose:
- Return stored visit history

Body:
- none

### `GET /api/cdss/patients/:patientId/visits?type=MATERNAL`

Purpose:
- Filter visit history by type

Body:
- none

### `GET /api/cdss/patients/:patientId/timeline`

Purpose:
- Return risk timeline and vital trend arrays

Body:
- none

Key response shape:

```json
{
  "timeline": [
    {
      "visitId": "VISIT_ID",
      "visitDate": "2026-04-18T12:00:00.000Z",
      "visitType": "MATERNAL",
      "riskLevel": "HIGH",
      "score": 67,
      "conditions": [
        "Severe hypertension"
      ],
      "alerts": []
    }
  ],
  "trends": {
    "maternal": {
      "bpSystolic": [120, 130, 150],
      "bpDiastolic": [80, 84, 96],
      "temperatureC": [37.2, 37.8, 38.4],
      "muacCm": [23, 22.5, 22],
      "fetalMovement": ["NORMAL", "NORMAL", "REDUCED"]
    },
    "neonatal": {
      "birthWeightKg": [2.1],
      "currentWeightKg": [2.0, 1.9],
      "temperatureC": [36.5, 38.1],
      "breathingRate": [54, 68]
    }
  }
}
```

### `GET /api/cdss/dashboard`

Purpose:
- Return ANM-scoped patient summary list sorted by risk priority

Body:
- none

## Offline Sync

### `POST /api/cdss/sync/visits`

Purpose:
- Sync offline-captured assessments
- Ignore duplicates using `clientGeneratedId`

Body:

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
    },
    {
      "clientGeneratedId": "offline-visit-002",
      "abhaId": "ABHA-1001",
      "visitType": "NEONATAL",
      "language": "en",
      "neonatal": {
        "symptoms": {
          "fever": false,
          "hypothermia": true,
          "fastBreathing": true,
          "chestIndrawing": false,
          "notFeeding": false,
          "lethargy": false,
          "convulsions": false
        },
        "observations": {
          "ageDays": 5,
          "birthWeightKg": 2.1,
          "currentWeightKg": 2.0,
          "temperatureC": 35.2,
          "breathingRate": 62
        }
      }
    }
  ]
}
```

Key response fields:

```json
{
  "count": 2,
  "results": [
    {
      "clientGeneratedId": "offline-visit-001",
      "status": "SYNCED",
      "visitId": "VISIT_ID",
      "patientId": "PATIENT_ID",
      "riskLevel": "HIGH",
      "score": 37
    }
  ]
}
```
