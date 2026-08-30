import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTTS } from "@/hooks/useTTS";

interface AudioPlayButtonProps {
  text: string;
  lang?: string;
  audioUrl?: string;
}

export default function AudioPlayButton({ text, lang, audioUrl }: AudioPlayButtonProps) {
  const { t, i18n } = useTranslation();
  const { speak, stop, isSpeaking } = useTTS({
    lang: lang || i18n.language,
    audioUrl,
  });

  const handleClick = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  return (
    <button
      className={`audio-btn ${isSpeaking ? "playing" : ""}`}
      onClick={handleClick}
      type="button"
      aria-label={isSpeaking ? t("advisory.stopBtn") : t("advisory.listenBtn")}
    >
      {isSpeaking ? (
        <>
          <VolumeX size={22} strokeWidth={2.5} />
          {t("advisory.stopBtn")}
        </>
      ) : (
        <>
          <Volume2 size={22} strokeWidth={2.5} />
          {t("advisory.listenBtn")}
        </>
      )}
    </button>
  );
}
