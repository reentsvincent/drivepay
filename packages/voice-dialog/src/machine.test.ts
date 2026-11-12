import type { Task } from "@drivepay/shared";
import { describe, expect, it } from "vitest";
import {
  MAX_ATTEMPTS,
  createInitialState,
  transition,
  type DialogEvent,
  type DialogState,
  type Effect,
} from "./machine.js";

const tasks: Task[] = [
  { id: "t1", type: "rating", prompt: "Wie zufrieden bist du mit deiner Route?", reward: 10 },
  { id: "t2", type: "survey_question", prompt: "Welche Musik hörst du?", reward: 25 },
];

/** Spielt eine Folge von Ereignissen ab und sammelt alle Effekte. */
function run(...events: DialogEvent[]): { state: DialogState; effects: Effect[] } {
  let state = createInitialState();
  const effects: Effect[] = [];
  for (const event of events) {
    const result = transition(state, event);
    state = result.state;
    effects.push(...result.effects);
  }
  return { state, effects };
}

function spoken(effects: Effect[]): string[] {
  return effects.flatMap((e) => (e.type === "speak" ? [e.text] : []));
}

const start: DialogEvent = { type: "start", tasks };
const heard = (text: string): DialogEvent => ({ type: "heard", text });
const valid = (answer: string): DialogEvent => ({ type: "validated", ok: true, answer });
const invalid = (reason: string): DialogEvent => ({ type: "validated", ok: false, reason });

describe("Start", () => {
  it("liest die erste Aufgabe vor und hört dann zu", () => {
    const { state, effects } = run(start);
    expect(state.phase).toBe("asking");
    expect(effects).toEqual([
      {
        type: "speak",
        text: "Fahrmodus gestartet. Es gibt 2 Aufgaben. Aufgabe 1, für 10 Cent. Wie zufrieden bist du mit deiner Route?",
      },
      { type: "listen" },
    ]);
  });

  it("beendet sofort, wenn es keine Aufgaben gibt", () => {
    const { state, effects } = run({ type: "start", tasks: [] });
    expect(state.phase).toBe("finished");
    expect(effects.at(-1)).toEqual({ type: "end", earned: 0 });
  });
});

describe("Antworten", () => {
  it("schickt eine Antwort zur Prüfung", () => {
    const { state, effects } = run(start, heard("Sehr zufrieden"));
    expect(state.phase).toBe("validating");
    expect(effects.at(-1)).toEqual({
      type: "validate",
      task: tasks[0],
      transcript: "Sehr zufrieden",
    });
  });

  it("ignoriert Sprache, während geprüft wird", () => {
    const { state, effects } = run(start, heard("Sehr zufrieden"), heard("hallo?"));
    expect(state.phase).toBe("validating");
    expect(effects.at(-1)?.type).toBe("validate");
  });

  it("fragt nach einer gültigen Antwort nach, ob sie richtig verstanden wurde", () => {
    const { state, effects } = run(start, heard("sehr zufrieden"), valid("5 von 5"));
    expect(state.phase).toBe("confirming");
    expect(spoken(effects).at(-1)).toBe("Ich habe verstanden: 5 von 5. Richtig?");
  });

  it("speichert bei „ja“, schreibt das Guthaben gut und geht zur nächsten Aufgabe", () => {
    const { state, effects } = run(start, heard("sehr zufrieden"), valid("5 von 5"), heard("Ja."));
    expect(effects).toContainEqual({ type: "submit", task: tasks[0], answer: "5 von 5" });
    expect(state.earned).toBe(10);
    expect(state.index).toBe(1);
    expect(state.phase).toBe("asking");
    expect(spoken(effects).at(-1)).toBe(
      "Gespeichert. Plus 10 Cent. Aufgabe 2, für 25 Cent. Welche Musik hörst du?",
    );
  });

  it("stellt die Aufgabe bei „nein“ erneut, ohne zu speichern", () => {
    const { state, effects } = run(start, heard("x"), valid("1 von 5"), heard("nein"));
    expect(effects.some((e) => e.type === "submit")).toBe(false);
    expect(state.phase).toBe("asking");
    expect(state.index).toBe(0);
    expect(state.pendingAnswer).toBeNull();
  });

  it("verlangt bei der Bestätigung ein klares „ja“ oder „nein“", () => {
    const { state, effects } = run(start, heard("x"), valid("5 von 5"), heard("vielleicht"));
    expect(state.phase).toBe("confirming");
    expect(spoken(effects).at(-1)).toBe("Bitte sag „ja“ oder „nein“.");
  });

  it("stellt die Aufgabe nach einer ungültigen Antwort mit Begründung erneut", () => {
    const { state, effects } = run(
      start,
      heard("blau"),
      invalid("Bitte nenne eine Zahl von 1 bis 5."),
    );
    expect(state.phase).toBe("asking");
    expect(state.attempts).toBe(1);
    expect(spoken(effects).at(-1)).toMatch(/^Bitte nenne eine Zahl von 1 bis 5\. Aufgabe 1/);
  });

  it(`überspringt die Aufgabe nach ${MAX_ATTEMPTS} ungültigen Antworten`, () => {
    const tries = Array.from({ length: MAX_ATTEMPTS }, () => [heard("blau"), invalid("Ungültig.")]);
    const { state } = run(start, ...tries.flat());
    expect(state.index).toBe(1);
    expect(state.attempts).toBe(0);
    expect(state.earned).toBe(0);
  });
});

describe("Befehle", () => {
  it("„wiederholen“ liest die Aufgabe noch einmal vor", () => {
    const { state, effects } = run(start, heard("Wiederholen"));
    expect(state.phase).toBe("asking");
    expect(spoken(effects)).toHaveLength(2);
    expect(spoken(effects)[1]).toContain("Wie zufrieden bist du mit deiner Route?");
  });

  it("„wiederholen“ bei der Bestätigung wiederholt die Rückfrage", () => {
    const { effects } = run(start, heard("x"), valid("5 von 5"), heard("noch mal"));
    expect(spoken(effects).at(-1)).toBe("Ich habe verstanden: 5 von 5. Richtig?");
  });

  it("„überspringen“ geht ohne Guthaben zur nächsten Aufgabe", () => {
    const { state } = run(start, heard("überspringen"));
    expect(state.index).toBe(1);
    expect(state.earned).toBe(0);
  });

  it("„Pause“ und „weiter“ setzen an derselben Stelle fort", () => {
    const paused = run(start, heard("x"), valid("5 von 5"), heard("Pause"));
    expect(paused.state.phase).toBe("paused");

    const resumed = run(start, heard("x"), valid("5 von 5"), heard("Pause"), heard("weiter"));
    expect(resumed.state.phase).toBe("confirming");
    expect(spoken(resumed.effects).at(-1)).toBe(
      "Weiter geht's. Ich habe verstanden: 5 von 5. Richtig?",
    );
  });

  it("in der Pause wird alles außer „weiter“ und „stopp“ ignoriert", () => {
    const { state, effects } = run(start, heard("Pause"), heard("Sehr zufrieden"));
    expect(state.phase).toBe("paused");
    expect(effects.at(-1)).toEqual({ type: "listen" });
  });

  it("„stopp“ beendet den Fahrmodus und nennt das Guthaben", () => {
    const { state, effects } = run(
      start,
      heard("x"),
      valid("5 von 5"),
      heard("ja"),
      heard("Stopp!"),
    );
    expect(state.phase).toBe("finished");
    expect(spoken(effects).at(-1)).toBe(
      "Fahrmodus beendet. Du hast in dieser Fahrt 10 Cent verdient.",
    );
    expect(effects.at(-1)).toEqual({ type: "end", earned: 10 });
  });
});

describe("Stille", () => {
  it("wiederholt die Aufgabe, wenn nichts gehört wurde", () => {
    const { state, effects } = run(start, { type: "silence" });
    expect(state.phase).toBe("asking");
    expect(spoken(effects).at(-1)).toMatch(/^Ich habe nichts gehört\. Aufgabe 1/);
  });
});

describe("Komplette Fahrt", () => {
  it("erledigt alle Aufgaben und endet mit der Zusammenfassung", () => {
    const { state, effects } = run(
      start,
      heard("sehr zufrieden"),
      valid("5 von 5"),
      heard("ja"),
      heard("meistens Rock"),
      valid("Rock"),
      heard("genau"),
    );
    expect(state.phase).toBe("finished");
    expect(state.earned).toBe(35);
    expect(effects.filter((e) => e.type === "submit")).toHaveLength(2);
    expect(spoken(effects).at(-1)).toBe(
      "Gespeichert. Plus 25 Cent. Das war die letzte Aufgabe. Fahrmodus beendet. Du hast in dieser Fahrt 35 Cent verdient.",
    );
  });
});
