import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import hi from "./hi.json";
import pa from "./pa.json";
import mr from "./mr.json";
import ur from "./ur.json";
import ta from "./ta.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    pa: { translation: pa },
    mr: { translation: mr },
    ur: { translation: ur },
    ta: { translation: ta },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
