/**
 * Text-to-Speech hook using the browser SpeechSynthesis API.
 * architecture.md: "TTS for voice output uses the browser SpeechSynthesis API
 * (zero backend cost) with a fallback to a pre-recorded audio clip cache for
 * low-bandwidth areas."
 */

import { useState, useCallback, useRef, useEffect } from "react";

interface UseTTSOptions {
  lang?: string;
  rate?: number;
  audioUrl?: string; // fallback audio URL
}

export function useTTS(options: UseTTSOptions = {}) {
  const { lang = "en", rate = 0.9, audioUrl } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      stop();

      // Try SpeechSynthesis first
      if (isSupported) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === "hi" ? "hi-IN" : "en-US";
        utterance.rate = rate;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => {
          setIsSpeaking(false);
          // Fallback to audio URL if SpeechSynthesis fails
          if (audioUrl) {
            playAudioFallback(audioUrl);
          }
        };

        window.speechSynthesis.speak(utterance);
        return;
      }

      // Fallback: play pre-recorded audio
      if (audioUrl) {
        playAudioFallback(audioUrl);
      }
    },
    [isSupported, lang, rate, audioUrl, stop]
  );

  const playAudioFallback = useCallback((url: string) => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => setIsSpeaking(false);
    audio.onerror = () => setIsSpeaking(false);
    audio.play().catch(() => setIsSpeaking(false));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { speak, stop, isSpeaking, isSupported };
}
