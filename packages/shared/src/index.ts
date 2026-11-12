/** Art einer Aufgabe, die dem Fahrer vorgelesen wird. */
export type TaskType = "survey_question" | "voice_recording" | "rating";

/** Betrag in Cent, um Rundungsfehler bei Geldbeträgen zu vermeiden. */
export type Cents = number;

export interface Task {
  id: string;
  type: TaskType;
  /** Text, der dem Fahrer vorgelesen wird. */
  prompt: string;
  reward: Cents;
}
