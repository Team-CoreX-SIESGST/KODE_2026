import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const { default: patientRoutes } = await import('../src/routes/patientRoutes.js');
const { validateBody } = await import('../src/middleware/validate.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');
const { validateAnmRegister } = await import('../src/validators/requestValidators.js');
const { loginAnm } = await import('../src/controllers/anmController.js');
const { createCdssVisit, getCdssTimeline, syncCdssVisits } = await import('../src/controllers/cdssController.js');
const { default: AnmAccount } = await import('../src/models/AnmAccount.js');
const { default: Patient } = await import('../src/models/Patient.js');
const { default: ClinicalVisit } = await import('../src/models/ClinicalVisit.js');

const ANM_ID = '507f1f77bcf86cd799439011';
const OTHER_ANM_ID = '507f1f77bcf86cd799439012';
const PATIENT_ID = '507f191e810c19729de860ea';
const VISIT_ID = '507f1f77bcf86cd799439013';

const currentAnm = {
    _id: ANM_ID,
    name: 'ANM Test',
    username: 'anm.test',
    phoneNumber: '9999999999',
    facilityName: 'PHC Test',
    serviceArea: 'Test Area',
    locationCoordinates: { latitude: 30.1, longitude: 76.1 }
};

const restores = [];

const makeFindQuery = (result) => ({
    sort() {
        return makeSortedQuery(result);
    },
    limit() {
        return Promise.resolve(result);
    },
    select() {
        return Promise.resolve(result);
    },
    then(resolve, reject) {
        return Promise.resolve(result).then(resolve, reject);
    }
});

const makeSortedQuery = (result) => ({
    limit() {
        return Promise.resolve(result);
    },
    select() {
        return Promise.resolve(result);
    },
    then(resolve, reject) {
        return Promise.resolve(result).then(resolve, reject);
    }
});

const patch = (target, key, replacement) => {
    const original = target[key];
    target[key] = replacement;
    restores.push(() => {
        target[key] = original;
    });
};

const createReq = (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: undefined,
    authRole: undefined,
    validatedBody: undefined,
    ...overrides
});

const createRes = () => ({
    statusCode: 200,
    body: undefined,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(payload) {
        this.body = payload;
        return this;
    },
    send(payload) {
        this.body = payload;
        return this;
    }
});

const invoke = async (handler, reqOverrides = {}) => {
    const req = createReq(reqOverrides);
    const res = createRes();
    let forwardedError;

    try {
        await handler(req, res, (error) => {
            if (error) forwardedError = error;
        });
    } catch (error) {
        forwardedError = error;
    }

    if (forwardedError) {
        errorHandler(forwardedError, req, res, () => {});
    }

    return { req, res };
};

afterEach(() => {
    while (restores.length) {
        restores.pop()();
    }
});

test('patient router no longer exposes POST /login', () => {
    const hasLoginRoute = patientRoutes.stack.some((layer) => layer.route?.path === '/login');
    assert.equal(hasLoginRoute, false);
});

test('ANM register validation rejects malformed payloads with stable error shape', async () => {
    const middleware = validateBody(validateAnmRegister);
    const { res } = await invoke(middleware, {
        body: { name: 'Incomplete' }
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('ANM login returns a token for valid credentials', async () => {
    patch(AnmAccount, 'findOne', async ({ username }) => {
        if (username !== 'anm.test') return null;
        return {
            ...currentAnm,
            matchPassword: async (password) => password === 'anm123'
        };
    });

    const { res } = await invoke(loginAnm, {
        body: { username: 'anm.test', password: 'anm123' },
        validatedBody: { username: 'anm.test', password: 'anm123' }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.username, 'anm.test');
    assert.ok(res.body.token);
});

test('CDSS visit scoring returns explainable risk output for an assigned patient', async () => {
    const patient = {
        _id: PATIENT_ID,
        abha_profile: {
            healthIdNumber: 'ABHA-1001',
            healthId: 'meena@abdm',
            name: 'Meena Devi',
            mobile: '9123456789'
        },
        demographicData: { ageYears: 24, village: 'Nabha', district: 'Patiala' },
        pregnancyDetails: { currentlyPregnant: true, gravida: 2, parity: 1, gestationalAgeWeeks: 32 },
        locationCoordinates: { latitude: 30.3758, longitude: 76.1529 },
        anmWorkerId: ANM_ID,
        cdssSummary: null,
        save: async function () {
            return this;
        }
    };

    patch(Patient, 'findById', async () => patient);
    patch(ClinicalVisit, 'find', () =>
        makeFindQuery([
            {
                _id: '507f1f77bcf86cd799439020',
                patient: PATIENT_ID,
                visitType: 'MATERNAL',
                visitDate: new Date('2026-04-01T10:00:00.000Z'),
                maternal: { vitals: { bpSystolic: 144, bpDiastolic: 92 }, symptoms: {}, observations: {} },
                assessment: { riskLevel: 'HIGH', score: 40, alerts: [] }
            }
        ])
    );
    patch(ClinicalVisit, 'create', async (doc) => ({
        _id: VISIT_ID,
        ...doc
    }));

    const { res } = await invoke(createCdssVisit, {
        params: { patientId: PATIENT_ID },
        user: currentAnm,
        authRole: 'anm',
        validatedBody: {
            visitType: 'MATERNAL',
            language: 'en',
            maternal: {
                vitals: { bpSystolic: 152, bpDiastolic: 98, temperatureC: 37.9 },
                symptoms: {
                    swelling: true,
                    headache: true,
                    blurredVision: true,
                    reducedFetalMovement: true
                },
                observations: {
                    muacCm: 22.3,
                    fetalMovement: 'REDUCED',
                    urineProtein: 'THREE_PLUS',
                    hemoglobinGdl: 9.8,
                    gestationalAgeWeeks: 33
                }
            }
        }
    });

    assert.equal(res.statusCode, 201);
    assert.ok(['HIGH', 'CRITICAL'].includes(res.body.assessment.riskLevel));
    assert.ok(res.body.assessment.reasons.length > 0);
    assert.ok(res.body.assessment.clinicalExplanation.length > 0);
});

test('CDSS timeline returns chronological history and trend arrays for an assigned patient', async () => {
    const patient = {
        _id: PATIENT_ID,
        abha_profile: {
            healthIdNumber: 'ABHA-1001',
            name: 'Meena Devi',
            mobile: '9123456789'
        },
        demographicData: {},
        pregnancyDetails: {},
        locationCoordinates: { latitude: 30.3758, longitude: 76.1529 },
        anmWorkerId: ANM_ID,
        cdssSummary: { latestRiskLevel: 'MEDIUM' }
    };

    patch(Patient, 'findById', async () => patient);
    patch(ClinicalVisit, 'find', () =>
        makeFindQuery([
            {
                _id: '507f1f77bcf86cd799439031',
                patient: PATIENT_ID,
                visitType: 'MATERNAL',
                visitDate: new Date('2026-04-01T10:00:00.000Z'),
                maternal: {
                    vitals: { bpSystolic: 120, bpDiastolic: 80, temperatureC: 37.1 },
                    observations: { muacCm: 23.2, fetalMovement: 'NORMAL' }
                },
                assessment: { riskLevel: 'LOW', score: 0, identifiedConditions: [], alerts: [] }
            },
            {
                _id: '507f1f77bcf86cd799439032',
                patient: PATIENT_ID,
                visitType: 'MATERNAL',
                visitDate: new Date('2026-04-05T10:00:00.000Z'),
                maternal: {
                    vitals: { bpSystolic: 130, bpDiastolic: 86, temperatureC: 37.5 },
                    observations: { muacCm: 22.8, fetalMovement: 'REDUCED' }
                },
                assessment: {
                    riskLevel: 'MEDIUM',
                    score: 24,
                    identifiedConditions: ['Rising blood pressure trend'],
                    alerts: ['BP is increasing over time - risk may increase.']
                }
            }
        ])
    );

    const { res } = await invoke(getCdssTimeline, {
        params: { patientId: PATIENT_ID },
        user: currentAnm,
        authRole: 'anm'
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.timeline.length, 2);
    assert.deepEqual(res.body.trends.maternal.bpSystolic, [120, 130]);
    assert.deepEqual(res.body.trends.maternal.fetalMovement, ['NORMAL', 'REDUCED']);
});

test('CDSS patient routes reject access to patients owned by a different ANM', async () => {
    const foreignPatient = {
        _id: PATIENT_ID,
        abha_profile: { healthIdNumber: 'ABHA-1001', name: 'Meena Devi' },
        anmWorkerId: OTHER_ANM_ID
    };

    patch(Patient, 'findById', async () => foreignPatient);

    const { res } = await invoke(getCdssTimeline, {
        params: { patientId: PATIENT_ID },
        user: currentAnm,
        authRole: 'anm'
    });

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error.code, 'PATIENT_ACCESS_FORBIDDEN');
});

test('Offline sync returns DUPLICATE_IGNORED without mutating the stored visit', async () => {
    let saveCalls = 0;
    const patient = {
        _id: PATIENT_ID,
        abha_profile: {
            healthIdNumber: 'ABHA-1001',
            name: 'Meena Devi',
            mobile: '9123456789'
        },
        anmWorkerId: ANM_ID,
        save: async function () {
            saveCalls += 1;
            return this;
        }
    };
    const existingVisit = {
        _id: VISIT_ID,
        patient: PATIENT_ID,
        syncStatus: 'RECEIVED',
        assessment: { riskLevel: 'MEDIUM', score: 30 }
    };

    patch(Patient, 'findOne', async ({ 'abha_profile.healthIdNumber': abhaId }) =>
        abhaId === 'ABHA-1001' ? patient : null
    );
    patch(ClinicalVisit, 'findOne', async ({ clientGeneratedId }) =>
        clientGeneratedId === 'offline-visit-001' ? existingVisit : null
    );

    const { res } = await invoke(syncCdssVisits, {
        user: currentAnm,
        authRole: 'anm',
        validatedBody: {
            visits: [
                {
                    clientGeneratedId: 'offline-visit-001',
                    abhaId: 'ABHA-1001',
                    visitType: 'MATERNAL',
                    language: 'en',
                    maternal: {
                        vitals: { bpSystolic: 142, bpDiastolic: 94, temperatureC: 37.8 },
                        symptoms: { headache: true },
                        observations: { gestationalAgeWeeks: 30 }
                    }
                }
            ]
        }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.results[0].status, 'DUPLICATE_IGNORED');
    assert.equal(saveCalls, 0);
    assert.equal(existingVisit.syncStatus, 'RECEIVED');
});
