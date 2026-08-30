import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: "en", label: t("common.english") },
    { code: "hi", label: t("common.hindi") },
  ];

  return (
    <div className="lang-switcher" role="radiogroup" aria-label="Language">
      {languages.map((lang) => (
        <button
          key={lang.code}
          className={`lang-btn ${i18n.language === lang.code ? "active" : ""}`}
          onClick={() => i18n.changeLanguage(lang.code)}
          role="radio"
          aria-checked={i18n.language === lang.code}
          type="button"
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
