# Decision Engine

This backend uses a rule-based, explainable decision engine.

It does not use a black-box model.

## Inputs used

The engine evaluates:

1. Current visit data
2. Historical visits
3. Rule-based danger conditions
4. Weighted scoring
5. Combination logic
6. Emergency overrides

## Risk levels

The final output is one of:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

## Referral mapping

- `LOW` -> routine care
- `MEDIUM` -> monitor closely
- `HIGH` -> referral within 24 hours
- `CRITICAL` -> immediate referral

## Maternal rules currently implemented

### Severe hypertension

Triggered when:

- systolic BP `>= 160`, or
- diastolic BP `>= 110`

Effect:

- emergency override
- final risk can become `CRITICAL`

### Hypertension

Triggered when:

- systolic BP `>= 140`, or
- diastolic BP `>= 90`

Effect:

- adds high-weight factor

### Convulsions

Triggered when:

- `symptoms.convulsions = true`

Effect:

- emergency override
- final risk can become `CRITICAL`

### Bleeding in pregnancy

Triggered when:

- `symptoms.bleeding = true`

Effect:

- emergency override
- final risk can become `CRITICAL`

### Reduced or absent fetal movement

Triggered when:

- `observations.fetalMovement = "REDUCED"` or `"ABSENT"`
- or `symptoms.reducedFetalMovement = true`

Effect:

- `ABSENT` is treated as emergency override
- `REDUCED` raises severity to high

### Maternal fever

Triggered when:

- `symptoms.fever = true`
- or temperature `>= 38`

Effect:

- adds medium or high risk factor

### Maternal undernutrition

Triggered when MUAC is:

- `< 21 cm` -> high
- `< 23 cm` -> medium

### Severe anemia

Triggered when:

- hemoglobin `< 7 g/dL`

Effect:

- high severity factor

### Possible pre-eclampsia

Combination logic:

- high BP, plus
- headache or blurred vision or swelling or significant urine protein

Effect:

- high severity factor

### Bleeding plus severe abdominal pain

Combination logic:

- `bleeding = true`
- and `severeAbdominalPain = true`

Effect:

- critical combination factor

## Maternal history and trend logic

### Rising BP trend

Triggered when recent visits show a rising pattern in the last 3 values.

Effect:

- adds alert:
  - `BP is increasing over time - risk may increase.`

### Repeated fever

Triggered when fever is present now and in one or more previous visits.

Effect:

- adds alert:
  - `Fever is repeated across visits - assess for persistent infection.`

## Neonatal rules currently implemented

### Very low birth weight

Triggered when:

- birth weight `< 1.5 kg`

Effect:

- emergency override
- final risk can become `CRITICAL`

### Low birth weight

Triggered when:

- birth weight `< 2.5 kg`

Effect:

- high severity factor

### Neonatal danger signs

Triggered when:

- convulsions are present
- or poor feeding plus lethargy

Effect:

- emergency override

### Breathing distress

Triggered when:

- chest indrawing
- or fast breathing
- or breathing rate `>= 60`

Effect:

- chest indrawing can push to `CRITICAL`

### Neonatal fever or hypothermia

Triggered when:

- fever is reported
- or temperature `>= 38`
- or hypothermia is reported
- or temperature `< 35.5`

Effect:

- high severity factor

## Neonatal history and trend logic

### Poor weight trend

Triggered when recent weights fail to improve over time.

Effect:

- alert:
  - `Newborn weight is not improving over time.`

### Repeated temperature abnormality

Triggered when fever or hypothermia is present across multiple visits.

Effect:

- alert:
  - `Temperature abnormality is repeated across newborn visits.`

## Explainability output

Each assessment returns:

- `riskLevel`
- `score`
- `identifiedConditions`
- `reasons`
- `clinicalExplanation`
- `recommendedAction`
- `referral`
- `alerts`
- `factors`
- `trendSummary`
- `language`
- `engineVersion`

## Language support

Current localized outputs:

- English: `en`
- Hindi: `hi`

Localized parts:

- condition labels
- recommended action
- referral label

## Current engine version

- `cdss-mnh-rules-v1`
