import { describe, expect, it } from "vitest";
import { parseCommand } from "./commands.js";
import { speakAmount } from "./money.js";

describe("parseCommand", () => {
  it.each([
    ["Wiederholen!", "repeat"],
    ["noch mal", "repeat"],
    ["Überspringen", "skip"],
    ["Pause.", "pause"],
    ["weiter", "resume"],
    ["STOPP", "stop"],
    ["Ja", "yes"],
    ["genau", "yes"],
    ["Nein!", "no"],
  ])("erkennt „%s“ als %s", (text, command) => {
    expect(parseCommand(text)).toBe(command);
  });

  it.each(["ja, aber nur selten", "Ich mache gleich Pause", "Rock", ""])(
    "behandelt „%s“ als Antwort, nicht als Befehl",
    (text) => {
      expect(parseCommand(text)).toBeNull();
    },
  );
});

describe("speakAmount", () => {
  it.each([
    [5, "5 Cent"],
    [100, "1 Euro"],
    [250, "2 Euro 50"],
    [1205, "12 Euro 5"],
  ])("%i Cent → „%s“", (cents, text) => {
    expect(speakAmount(cents)).toBe(text);
  });
});
