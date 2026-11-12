/**
 * Zustände des Sprach-Dialogs. Die eigentliche Zustandsmaschine folgt in Meilenstein 2.
 */
export type DialogState = "idle" | "reading" | "listening" | "validating" | "confirming";

export const initialState: DialogState = "idle";
