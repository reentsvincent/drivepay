/**
 * Sprachbefehle, die der Fahrer jederzeit sagen kann.
 *
 * Ein Befehl wird nur erkannt, wenn die GANZE Äußerung dem Befehl entspricht.
 * So wird z. B. „ja, aber nur selten“ als Antwort behandelt und nicht als „ja“.
 */
export type Command = "repeat" | "skip" | "pause" | "resume" | "stop" | "yes" | "no";

const PHRASES: Record<Command, readonly string[]> = {
  repeat: ["wiederholen", "wiederhole", "nochmal", "noch mal", "noch einmal", "wie bitte"],
  skip: [
    "überspringen",
    "überspring",
    "nächste",
    "nächste frage",
    "nächste aufgabe",
    "weiter zur nächsten",
  ],
  pause: ["pause", "pause machen", "kurz pause"],
  resume: ["weiter", "weitermachen", "fortsetzen", "los geht's", "los gehts"],
  stop: ["stopp", "stop", "beenden", "aufhören", "fahrmodus beenden", "schluss"],
  yes: ["ja", "jawohl", "richtig", "genau", "korrekt", "stimmt", "passt"],
  no: ["nein", "falsch", "nicht richtig", "stimmt nicht", "nee", "nö"],
};

const LOOKUP = new Map<string, Command>(
  Object.entries(PHRASES).flatMap(([command, phrases]) =>
    phrases.map((phrase) => [phrase, command as Command] as const),
  ),
);

/** Kleinschreibung, Satzzeichen weg, Leerraum vereinheitlichen. */
export function normalizeUtterance(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"„“]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Liefert den erkannten Befehl oder `null`, wenn die Äußerung eine normale Antwort ist. */
export function parseCommand(text: string): Command | null {
  return LOOKUP.get(normalizeUtterance(text)) ?? null;
}
