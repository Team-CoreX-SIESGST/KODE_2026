/**
 * Bilingual negotiation scripts for ANM use when a patient refuses referral.
 * Each script is provided in English (en) and Hindi (hi).
 * Tone: respectful, empathetic, community-aware.
 */

const SCRIPTS = {
    HUSBAND_AWAY: {
        en: {
            opening:
                'I understand your husband is away and you feel you cannot make this decision alone. That is completely natural.',
            points: [
                'Your health and your baby\'s health cannot wait. As a mother you have the right and the strength to make this decision.',
                'We can contact your husband by phone right now so he can give his full support.',
                'A neighbour, your mother, or any trusted family member can accompany you — you will never travel alone.',
                'Government scheme JSY/JSSK covers all costs, so there is no financial burden on the family.'
            ],
            closing:
                'Let us call your husband together. His first wish will also be that you and the baby are safe.'
        },
        hi: {
            opening:
                'मैं समझती हूँ कि आपके पति अभी घर पर नहीं हैं और आप अकेले यह निर्णय लेने में हिचकिचा रही हैं। यह बिल्कुल स्वाभाविक है।',
            points: [
                'आपकी और आपके बच्चे की सेहत इंतज़ार नहीं कर सकती। एक माँ के रूप में आपको यह निर्णय लेने का पूरा अधिकार है।',
                'हम अभी आपके पति को फ़ोन करके उनसे बात कर सकते हैं — वे ज़रूर सहमत होंगे।',
                'आपकी माँ, पड़ोसन या कोई भी भरोसेमंद महिला आपके साथ जा सकती है — आप अकेली नहीं जाएँगी।',
                'JSY/JSSK सरकारी योजना के तहत सभी खर्च सरकार देती है, परिवार पर कोई बोझ नहीं पड़ेगा।'
            ],
            closing:
                'चलिए साथ में पति जी को फ़ोन करते हैं। उनकी पहली चाहत भी यही होगी कि आप और बच्चा सुरक्षित रहें।'
        }
    },

    COST: {
        en: {
            opening:
                'I hear your concern about money. Let me explain the support the government provides — this referral should cost your family nothing.',
            points: [
                'Under JSY (Janani Suraksha Yojana) and JSSK, all delivery and emergency care is free at government hospitals, including medicines and tests.',
                'You will also receive a cash incentive after the delivery to help the family.',
                'The 108 ambulance service is free — no transport cost.',
                'I will personally help you with all the paperwork so you receive every benefit you are entitled to.'
            ],
            closing:
                'Your safety is priceless. The government has already made these arrangements so that cost is never a reason to stay home.'
        },
        hi: {
            opening:
                'मैं आपकी पैसों की चिंता समझती हूँ। मुझे बताने दीजिए — यह रेफरल आपके परिवार पर कोई खर्च नहीं डालेगा।',
            points: [
                'JSY (जननी सुरक्षा योजना) और JSSK के तहत सरकारी अस्पताल में प्रसव, आपातकालीन देखभाल, दवाइयाँ और जाँच — सब मुफ़्त है।',
                'प्रसव के बाद आपको नकद प्रोत्साहन भी मिलेगा जिससे घर को थोड़ी मदद होगी।',
                '108 एम्बुलेंस सेवा पूरी तरह मुफ़्त है — आने-जाने का कोई खर्च नहीं।',
                'सारे कागज़ात मैं खुद भरने में आपकी मदद करूँगी ताकि आपको हर सुविधा मिले।'
            ],
            closing:
                'आपकी जान की कोई कीमत नहीं। सरकार ने पहले से ही इन्तज़ाम कर रखा है — पैसा कभी कारण नहीं होना चाहिए।'
        }
    },

    FEAR: {
        en: {
            opening:
                'It is completely natural to feel scared about going to the hospital. Many women feel the same way, and your feelings are valid.',
            points: [
                'Hospitals today are very different — there are trained nurses and doctors who are there to help you, not frighten you.',
                'Thousands of mothers in this district have delivered safely in the hospital and returned home healthy with their babies.',
                'The risk of staying home when there is a warning sign is far greater than the discomfort of going to the hospital.',
                'I will stay with you and accompany you every step of the way.'
            ],
            closing:
                'Your fear shows how much you care. Let us face it together so you and your baby come home safe.'
        },
        hi: {
            opening:
                'अस्पताल जाने का डर लगना बिल्कुल स्वाभाविक है। बहुत-सी माँयें ऐसा महसूस करती हैं — आपकी भावनाएँ सच्ची हैं।',
            points: [
                'आज के अस्पताल बहुत बदल गए हैं — वहाँ प्रशिक्षित नर्सें और डॉक्टर हैं जो आपकी देखभाल के लिए हैं।',
                'इस ज़िले में हज़ारों माँयें सुरक्षित प्रसव करवाकर अपने बच्चे के साथ घर वापस आई हैं।',
                'चेतावनी के संकेत होने पर घर पर रहना अस्पताल जाने से कहीं ज़्यादा ख़तरनाक है।',
                'मैं आपके साथ रहूँगी और हर क़दम पर आपका साथ दूँगी।'
            ],
            closing:
                'आपका डर इस बात का सबूत है कि आप कितनी परवाह करती हैं। चलिए साथ मिलकर इसका सामना करते हैं।'
        }
    },

    TRANSPORT: {
        en: {
            opening:
                'Transport is a real challenge in our area, but there are concrete solutions we can use right now.',
            points: [
                'I can call the 108 emergency ambulance immediately — it is free and will reach you within the hour.',
                'The ASHA worker and I can arrange a vehicle through the block health office if needed.',
                'If you wait, the condition can worsen and the journey may become much harder — earlier is safer.',
                'We can also arrange for a family member to be called ahead so someone is waiting at the hospital.'
            ],
            closing:
                'Let me make the call right now. Transport will not be an obstacle to your safety.'
        },
        hi: {
            opening:
                'हमारे इलाक़े में आना-जाना मुश्किल होता है, यह सच है — लेकिन इसके ठोस हल मौजूद हैं।',
            points: [
                'मैं अभी 108 आपातकालीन एम्बुलेंस बुला सकती हूँ — यह मुफ़्त है और एक घंटे के अंदर आ जाएगी।',
                'ज़रूरत पड़ने पर आशा कार्यकर्ता और मैं ब्लॉक स्वास्थ्य कार्यालय से गाड़ी का इन्तज़ाम कर सकती हैं।',
                'देर करने से स्थिति बिगड़ सकती है और सफ़र और भी मुश्किल हो सकता है — जल्दी जाना ज़्यादा सुरक्षित है।',
                'हम परिवार के किसी सदस्य को अस्पताल पहले भेज सकते हैं ताकि वहाँ कोई आपका इंतज़ार करे।'
            ],
            closing:
                'मुझे अभी फ़ोन करने दीजिए। आपकी सुरक्षा में यातायात रुकावट नहीं बनेगी।'
        }
    },

    FAMILY_PRESSURE: {
        en: {
            opening:
                'I respect that your family\'s opinion matters greatly to you. Let me speak with them together — they love you and want you to be safe.',
            points: [
                'In our culture, taking care of the mother is one of the highest duties of a family. Going to the hospital is fulfilling that duty.',
                'If anything happens to you at home, the entire family will carry that grief. Referral protects everyone.',
                'Many elders, once they understand the risk, become the strongest advocates for going to the hospital.',
                'Let me explain the medical situation to your mother-in-law or the senior family member so they can support this decision.'
            ],
            closing:
                'A family that loves you will want you safe. Let us talk to them together — I am here to help.'
        },
        hi: {
            opening:
                'मैं समझती हूँ कि परिवार की राय आपके लिए बहुत ज़रूरी है। चलिए साथ में उनसे बात करते हैं — वे आपसे प्यार करते हैं और चाहते हैं कि आप ठीक रहें।',
            points: [
                'हमारी संस्कृति में माँ की देखभाल करना परिवार का सबसे बड़ा फ़र्ज़ है। अस्पताल जाना उसी फ़र्ज़ को निभाना है।',
                'अगर घर पर कुछ हो गया तो उसका दर्द पूरा परिवार ताउम्र उठाएगा। रेफरल सबकी रक्षा करता है।',
                'कई बड़े-बुजुर्ग, जब ख़तरे को समझते हैं, तो अस्पताल जाने के सबसे बड़े समर्थक बन जाते हैं।',
                'मुझे सास जी या घर के बड़े सदस्य को चिकित्सकीय स्थिति समझाने दीजिए — वे ज़रूर मान जाएँगे।'
            ],
            closing:
                'जो परिवार आपसे प्यार करता है, वह आपकी सुरक्षा चाहेगा। चलिए मिलकर बात करते हैं।'
        }
    },

    OTHER: {
        en: {
            opening:
                'I can see you have something on your mind that is making this difficult. Please help me understand — I am here to listen, not to judge.',
            points: [
                'Whatever the concern is, let us talk about it so we can find a solution together.',
                'My only goal is to make sure you and your baby are safe.',
                'There is no problem so big that we cannot work through it together.',
                'You have come this far — let us take this one step together.'
            ],
            closing:
                'Tell me what is worrying you most. We will face it side by side.'
        },
        hi: {
            opening:
                'मुझे लग रहा है कि कोई बात है जो आपको रोक रही है। मुझे बताइए — मैं सुनने के लिए हूँ, कोई फ़ैसला करने के लिए नहीं।',
            points: [
                'कोई भी बात हो, चलिए मिलकर बात करते हैं ताकि हम साथ मिलकर हल निकाल सकें।',
                'मेरा एकमात्र लक्ष्य यह है कि आप और आपका बच्चा सुरक्षित रहें।',
                'कोई भी समस्या इतनी बड़ी नहीं जिसे हम मिलकर न सुलझा सकें।',
                'आप इतनी दूर आई हैं — बस यह एक क़दम और साथ चलते हैं।'
            ],
            closing:
                'मुझे बताइए आपको सबसे ज़्यादा किस बात की चिंता है। हम कंधे से कंधा मिलाकर इसका सामना करेंगे।'
        }
    }
};

const SUPPORTED_LANGUAGES = ['en', 'hi'];
const DEFAULT_LANGUAGE = 'en';

/**
 * Returns a negotiation script object for the given refusal reason and language.
 * Falls back to English if the language is not supported.
 *
 * @param {string} refusalReason - One of the REFUSAL_REASONS enum values.
 * @param {string} [language='en'] - Language code ('en' | 'hi').
 * @returns {{ reason: string, language: string, script: object } | null}
 */
export const getNegotiationScript = (refusalReason, language = 'en') => {
    const lang = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
    const scriptSet = SCRIPTS[refusalReason];
    if (!scriptSet) return null;
    return {
        reason: refusalReason,
        language: lang,
        script: scriptSet[lang]
    };
};

/**
 * Returns scripts in all supported languages for a given refusal reason.
 *
 * @param {string} refusalReason
 * @returns {object}
 */
export const getAllLanguageScripts = (refusalReason) => {
    const scriptSet = SCRIPTS[refusalReason];
    if (!scriptSet) return null;
    return {
        reason: refusalReason,
        scripts: Object.fromEntries(SUPPORTED_LANGUAGES.map((lang) => [lang, scriptSet[lang]]))
    };
};

export const SUPPORTED_REFUSAL_REASONS = Object.keys(SCRIPTS);
