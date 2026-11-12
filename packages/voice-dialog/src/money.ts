import type { Cents } from "@drivepay/shared";

/**
 * Formuliert einen Betrag so, dass er sich gut vorlesen lässt.
 * Beispiele: 5 → „5 Cent“, 100 → „1 Euro“, 250 → „2 Euro 50“.
 */
export function speakAmount(cents: Cents): string {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  if (euros === 0) return `${rest} Cent`;
  if (rest === 0) return `${euros} Euro`;
  return `${euros} Euro ${rest}`;
}
