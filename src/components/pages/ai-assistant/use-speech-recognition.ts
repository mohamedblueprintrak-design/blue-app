"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  SpeechRecognitionEvent,
  SpeechRecognitionInstance,
  WindowWithSpeech,
} from "./types";

// Check speech recognition support (safe for SSR)
function getSpeechRecognitionSupport(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as WindowWithSpeech;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

// Speech Recognition hook
export function useSpeechRecognition(isAr: boolean) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => getSpeechRecognitionSupport());
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const supportedRef = useRef(isSupported);

  useEffect(() => {
    if (!supportedRef.current) return;

    const w = window as WindowWithSpeech;
    const SpeechRecognitionClass = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = isAr ? "ar-AE" : "en-US";
    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, [isAr]);

  const startListening = useCallback(
    (onResult: (text: string, isFinal: boolean) => void) => {
      if (!recognitionRef.current) return;

      const recognition = recognitionRef.current;
      recognition.lang = isAr ? "ar-AE" : "en-US";
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        const last = results[results.length - 1];
        const text = last[0].transcript;
        onResult(text, last.isFinal);
      };
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.start();
    },
    [isAr]
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return { isListening, isSupported, startListening, stopListening };
}
