"use client";

import { motion } from "framer-motion";

export function AnimatedText({ text }: { text: string; language: "ar" | "en" }) {
  const words = text.split(" ");
  
  return (
    <span className="inline">
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          className="inline-block mr-2"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
