import type { Cents, Task } from "@drivepay/shared";
import { parseCommand } from "./commands.js";
import { speakAmount } from "./money.js";

/**
 * Die Dialog-Zustandsmaschine des Fahrmodus.
 *
 * Sie ist eine reine Funktion: (Zustand, Ereignis) → (neuer Zustand, Effekte).
 * Sie spricht nicht selbst und nimmt kein Audio auf. Stattdessen gibt sie
 * „Effekte“ zurück, die die App der Reihe nach ausführt (vorlesen, zuhören …).
 * Dadurch lässt sich der komplette Ablauf ohne Handy und ohne Mikrofon testen.
 */

/** Nach so vielen ungültigen Antworten wird die Aufgabe automatisch übersprungen. */
export const MAX_ATTEMPTS = 3;

export type Phase =
  | "idle" // Fahrmodus noch nicht gestartet
  | "asking" // Aufgabe wurde vorgelesen, wir warten auf die Antwort
  | "validating" // Antwort wird (z. B. von Claude) geprüft
  | "confirming" // Antwort wurde vorgelesen, wir warten auf „ja“ oder „nein“
  | "paused" // Fahrer hat „Pause“ gesagt
  | "finished"; // Alle Aufgaben erledigt oder Fahrer hat „Stopp“ gesagt

export interface DialogState {
  phase: Phase;
  tasks: readonly Task[];
  /** Index der aktuellen Aufgabe in `tasks`. */
  index: number;
  /** Bisher verdientes Guthaben in dieser Sitzung. */
  earned: Cents;
  /** Ungültige Antworten zur aktuellen Aufgabe. */
  attempts: number;
  /** Die geprüfte, normalisierte Antwort, die gerade bestätigt werden soll. */
  pendingAnswer: string | null;
  /** Phase vor der Pause, damit wir danach an der richtigen Stelle weitermachen. */
  pausedFrom: Phase | null;
}

export type DialogEvent =
  | { type: "start"; tasks: readonly Task[] }
  /** Die Spracherkennung hat etwas verstanden. */
  | { type: "heard"; text: string }
  /** Beim Zuhören kam nichts (Zeitüberschreitung). */
  | { type: "silence" }
  /** Ergebnis der Antwortprüfung. */
  | { type: "validated"; ok: true; answer: string }
  | { type: "validated"; ok: false; reason: string };

export type Effect =
  | { type: "speak"; text: string }
  | { type: "listen" }
  | { type: "validate"; task: Task; transcript: string }
  | { type: "submit"; task: Task; answer: string }
  | { type: "end"; earned: Cents };

export interface Transition {
  state: DialogState;
  effects: Effect[];
}

export function createInitialState(): DialogState {
  return {
    phase: "idle",
    tasks: [],
    index: 0,
    earned: 0,
    attempts: 0,
    pendingAnswer: null,
    pausedFrom: null,
  };
}

export function transition(state: DialogState, event: DialogEvent): Transition {
  switch (event.type) {
    case "start":
      return startSession(event.tasks);
    case "heard":
      return onHeard(state, event.text);
    case "silence":
      return onSilence(state);
    case "validated":
      return event.ok ? onValid(state, event.answer) : onInvalid(state, event.reason);
  }
}

// ---------------------------------------------------------------------------
// Ereignisse
// ---------------------------------------------------------------------------

function startSession(tasks: readonly Task[]): Transition {
  const state: DialogState = { ...createInitialState(), tasks };
  if (tasks.length === 0) {
    return finish(state, "Gerade gibt es keine Aufgaben. Versuch es später noch einmal.");
  }
  return ask(state, `Fahrmodus gestartet. Es gibt ${tasks.length} Aufgaben.`);
}

function onHeard(state: DialogState, text: string): Transition {
  const command = parseCommand(text);

  if (state.phase === "paused") {
    if (command === "resume") return resume(state);
    if (command === "stop") return finish(state);
    return { state, effects: [{ type: "listen" }] };
  }

  if (state.phase !== "asking" && state.phase !== "confirming") {
    // Während der Prüfung oder vor dem Start ignorieren wir Sprache.
    return { state, effects: [] };
  }

  switch (command) {
    case "stop":
      return finish(state);
    case "pause":
      return {
        state: { ...state, phase: "paused", pausedFrom: state.phase },
        effects: [
          { type: "speak", text: "Pause. Sag „weiter“, wenn es weitergehen soll." },
          { type: "listen" },
        ],
      };
    case "skip":
      return next(state, "Übersprungen.");
    case "repeat":
      return repeat(state);
  }

  if (state.phase === "confirming") {
    if (command === "yes") return submit(state);
    if (command === "no") return ask({ ...state, pendingAnswer: null }, "Okay, noch einmal.");
    return {
      state,
      effects: [{ type: "speak", text: "Bitte sag „ja“ oder „nein“." }, { type: "listen" }],
    };
  }

  // Phase "asking": alles, was kein Befehl ist, ist eine Antwort.
  return {
    state: { ...state, phase: "validating" },
    effects: [{ type: "validate", task: currentTask(state), transcript: text }],
  };
}

function onSilence(state: DialogState): Transition {
  if (state.phase === "paused") return { state, effects: [{ type: "listen" }] };
  if (state.phase !== "asking" && state.phase !== "confirming") return { state, effects: [] };
  return repeat(state, "Ich habe nichts gehört.");
}

function onValid(state: DialogState, answer: string): Transition {
  if (state.phase !== "validating") return { state, effects: [] };
  return {
    state: { ...state, phase: "confirming", pendingAnswer: answer },
    effects: [{ type: "speak", text: confirmationText(answer) }, { type: "listen" }],
  };
}

function onInvalid(state: DialogState, reason: string): Transition {
  if (state.phase !== "validating") return { state, effects: [] };
  const attempts = state.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    return next(state, `${reason} Wir überspringen diese Aufgabe.`);
  }
  return ask({ ...state, attempts }, reason);
}

// ---------------------------------------------------------------------------
// Bausteine
// ---------------------------------------------------------------------------

function currentTask(state: DialogState): Task {
  const task = state.tasks[state.index];
  if (!task) throw new Error(`Keine Aufgabe an Position ${state.index}`);
  return task;
}

function confirmationText(answer: string): string {
  return `Ich habe verstanden: ${answer}. Richtig?`;
}

/** Liest die aktuelle Aufgabe vor (optional mit Einleitung) und hört dann zu. */
function ask(state: DialogState, intro?: string): Transition {
  const task = currentTask(state);
  const text = [intro, `Aufgabe ${state.index + 1}, für ${speakAmount(task.reward)}.`, task.prompt]
    .filter(Boolean)
    .join(" ");
  return {
    state: { ...state, phase: "asking", pausedFrom: null },
    effects: [{ type: "speak", text }, { type: "listen" }],
  };
}

/** Wiederholt das Letzte, was der Fahrer gehört hat: die Aufgabe oder die Rückfrage. */
function repeat(state: DialogState, intro?: string): Transition {
  if (state.phase === "confirming" && state.pendingAnswer !== null) {
    const text = [intro, confirmationText(state.pendingAnswer)].filter(Boolean).join(" ");
    return { state, effects: [{ type: "speak", text }, { type: "listen" }] };
  }
  return ask(state, intro);
}

function resume(state: DialogState): Transition {
  const resumed: DialogState = { ...state, phase: state.pausedFrom ?? "asking", pausedFrom: null };
  return repeat(resumed, "Weiter geht's.");
}

function submit(state: DialogState): Transition {
  const task = currentTask(state);
  const answer = state.pendingAnswer ?? "";
  const earned = state.earned + task.reward;
  const result = next({ ...state, earned }, `Gespeichert. Plus ${speakAmount(task.reward)}.`);
  return { state: result.state, effects: [{ type: "submit", task, answer }, ...result.effects] };
}

/** Geht zur nächsten Aufgabe oder beendet die Sitzung, wenn keine mehr da ist. */
function next(state: DialogState, intro: string): Transition {
  const index = state.index + 1;
  const base: DialogState = { ...state, index, attempts: 0, pendingAnswer: null };
  if (index >= state.tasks.length) {
    return finish(base, `${intro} Das war die letzte Aufgabe.`);
  }
  return ask(base, intro);
}

function finish(state: DialogState, intro?: string): Transition {
  const summary =
    state.earned > 0
      ? `Du hast in dieser Fahrt ${speakAmount(state.earned)} verdient.`
      : "In dieser Fahrt wurde noch nichts verdient.";
  const text = [intro, "Fahrmodus beendet.", summary].filter(Boolean).join(" ");
  return {
    state: { ...state, phase: "finished", pausedFrom: null },
    effects: [
      { type: "speak", text },
      { type: "end", earned: state.earned },
    ],
  };
}
