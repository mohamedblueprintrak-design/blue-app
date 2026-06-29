"use client";

import { useState, useCallback } from "react";

// Text-to-Speech hook
export function useSpeechSynthesis() {
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const speak = useCallback((text: string, msgId: string, isAr: boolean) => {
    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\*\*/g, "")
      .replace(/###/g, "")
      .replace(/##/g, "")
      .replace(/#/g, "")
      .replace(/  • /g, "")
      .replace(/\n{2,}/g, ". ");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = isAr ? "ar-AE" : "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    if (isAr) {
      const arVoice = voices.find((v) => v.lang.startsWith("ar"));
      if (arVoice) utterance.voice = arVoice;
    } else {
      const enVoice = voices.find((v) => v.lang.startsWith("en"));
      if (enVoice) utterance.voice = enVoice;
    }

    utterance.onstart = () => setSpeakingMsgId(msgId);
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeakingMsgId(null);
  }, []);

  return { speakingMsgId, speak, stop };
}
