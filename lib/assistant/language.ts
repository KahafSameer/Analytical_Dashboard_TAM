/**
 * Detects the reply language from the user's latest message so every model (including backup
 * providers that follow language instructions less reliably) gets an explicit target.
 */
export type ReplyLanguage = "urdu-script" | "roman-urdu" | "english";

const ROMAN_URDU_WORDS = new Set([
  "hai", "hain", "ho", "hon", "kya", "kia", "kahan", "kahaan", "kitna", "kitni", "kitne", "kaun", "kon", "konsa", "konsi",
  "kab", "kyun", "kyon", "kaise", "kesay", "mein", "main", "mai", "ka", "ki", "ke", "ko", "se", "aur", "ya", "nahi", "nahin",
  "bhi", "wala", "wali", "wale", "sab", "zyada", "ziada", "kam", "batao", "bataen", "bataiye", "dikhao", "chahiye", "tak",
  "iska", "iski", "iske", "unka", "unki", "yeh", "ye", "woh", "wo", "abhi", "kharch", "kharcha", "raqam", "rakam", "fasla", "door",
]);

export function detectReplyLanguage(message: string): ReplyLanguage {
  const letters = message.replace(/[^\p{L}]/gu, "");
  if (!letters) return "english";
  const arabicScript = (message.match(/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g) ?? []).length;
  if (arabicScript / letters.length > 0.3) return "urdu-script";
  const words = message.toLowerCase().match(/[a-z]+/g) ?? [];
  if (!words.length) return "english";
  const romanUrdu = words.filter((word) => ROMAN_URDU_WORDS.has(word)).length;
  // Two or more marker words, or a high share in short questions, indicates Roman Urdu/Hindi.
  return romanUrdu >= 2 || (romanUrdu >= 1 && words.length <= 4) ? "roman-urdu" : "english";
}

export function replyLanguageInstruction(language: ReplyLanguage): string {
  switch (language) {
    case "urdu-script": return "Reply language: Urdu written in Urdu (Arabic) script. Write all prose in Urdu script; only proper names, abbreviations, numbers and units may stay as they are.";
    case "roman-urdu": return "Reply language: Roman Urdu (Urdu written in Latin letters, e.g. \"Yeh project Murree mein hai\"). Do not reply in English.";
    case "english": return "Reply language: English.";
  }
}
