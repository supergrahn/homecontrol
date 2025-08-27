import * as Localization from "expo-localization";
/* eslint-disable import/no-named-as-default-member */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import no from "./locales/no.json";

const resources = { en: { translation: en }, no: { translation: no } };
const locales = Localization.getLocales();
const rawLang =
  locales && locales.length > 0 && locales[0].languageCode
    ? locales[0].languageCode.toLowerCase()
    : "en";
// Normalize Norwegian variants (nb/nn) to 'no'
const deviceLanguage = rawLang === "nb" || rawLang === "nn" ? "no" : rawLang;

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage, // default language
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
