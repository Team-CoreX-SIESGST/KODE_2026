const translations = {
    en: {
        recommendedAction: {
            LOW: 'Continue routine antenatal or newborn care and give standard counseling.',
            MEDIUM: 'Monitor closely, counsel danger signs, and schedule early follow-up.',
            HIGH: 'Refer to a higher facility within 24 hours and keep the patient under observation.',
            CRITICAL: 'Arrange immediate referral to an emergency obstetric or neonatal care facility.'
        },
        referral: {
            LOW: 'Routine care',
            MEDIUM: 'Monitor closely',
            HIGH: 'Referral within 24 hours',
            CRITICAL: 'Immediate referral'
        },
        conditions: {
            SEVERE_HYPERTENSION: 'Severe hypertension',
            POSSIBLE_PREECLAMPSIA: 'Possible pre-eclampsia',
            ECLAMPSIA_WARNING: 'Convulsions or eclampsia warning sign',
            ANTEPARTUM_BLEEDING: 'Bleeding in pregnancy',
            REDUCED_FETAL_MOVEMENT: 'Reduced or absent fetal movement',
            MATERNAL_FEVER: 'Maternal fever',
            MATERNAL_UNDERNUTRITION: 'Maternal undernutrition',
            SEVERE_ANEMIA: 'Severe anemia',
            RISING_BP: 'Rising blood pressure trend',
            REPEATED_FEVER: 'Repeated fever across visits',
            LOW_BIRTH_WEIGHT: 'Low birth weight',
            VERY_LOW_BIRTH_WEIGHT: 'Very low birth weight',
            NEONATAL_FEVER: 'Newborn fever or hypothermia',
            NEONATAL_BREATHING_DISTRESS: 'Newborn breathing difficulty',
            NEONATAL_DANGER_SIGNS: 'Newborn danger signs',
            POOR_WEIGHT_TREND: 'Poor newborn weight trend'
        }
    },
    hi: {
        recommendedAction: {
            LOW: 'नियमित गर्भावस्था या नवजात देखभाल जारी रखें और सामान्य सलाह दें।',
            MEDIUM: 'करीबी निगरानी रखें, खतरे के लक्षण समझाएं, और जल्दी फॉलो-अप तय करें।',
            HIGH: '24 घंटे के भीतर उच्च स्वास्थ्य केंद्र पर रेफर करें और निगरानी रखें।',
            CRITICAL: 'तुरंत आपातकालीन मातृ या नवजात देखभाल केंद्र पर रेफरल की व्यवस्था करें।'
        },
        referral: {
            LOW: 'नियमित देखभाल',
            MEDIUM: 'करीबी निगरानी',
            HIGH: '24 घंटे के भीतर रेफरल',
            CRITICAL: 'तत्काल रेफरल'
        },
        conditions: {
            SEVERE_HYPERTENSION: 'गंभीर उच्च रक्तचाप',
            POSSIBLE_PREECLAMPSIA: 'संभावित प्री-एक्लेम्पसिया',
            ECLAMPSIA_WARNING: 'दौरे या एक्लेम्पसिया का चेतावनी संकेत',
            ANTEPARTUM_BLEEDING: 'गर्भावस्था में रक्तस्राव',
            REDUCED_FETAL_MOVEMENT: 'भ्रूण की कम या अनुपस्थित हलचल',
            MATERNAL_FEVER: 'मातृ बुखार',
            MATERNAL_UNDERNUTRITION: 'मातृ कुपोषण',
            SEVERE_ANEMIA: 'गंभीर एनीमिया',
            RISING_BP: 'रक्तचाप बढ़ने की प्रवृत्ति',
            REPEATED_FEVER: 'कई विजिट में बार-बार बुखार',
            LOW_BIRTH_WEIGHT: 'जन्म के समय कम वजन',
            VERY_LOW_BIRTH_WEIGHT: 'जन्म के समय बहुत कम वजन',
            NEONATAL_FEVER: 'नवजात में बुखार या कम तापमान',
            NEONATAL_BREATHING_DISTRESS: 'नवजात में सांस लेने में कठिनाई',
            NEONATAL_DANGER_SIGNS: 'नवजात के खतरे के संकेत',
            POOR_WEIGHT_TREND: 'नवजात वजन बढ़ने की खराब प्रवृत्ति'
        }
    }
};

export const normalizeLanguage = (language = 'en') => {
    const code = String(language || 'en').toLowerCase().slice(0, 2);
    return translations[code] ? code : 'en';
};

export const getText = (language = 'en') => {
    const lang = normalizeLanguage(language);
    return translations[lang] || translations.en;
};

export const localizeCondition = (code, language = 'en') => {
    const text = getText(language);
    return text.conditions[code] || translations.en.conditions[code] || code;
};
