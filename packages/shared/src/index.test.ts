import { describe, expect, it } from "vitest";
import type { Task } from "./index.js";

describe("shared", () => {
  it("beschreibt Aufgaben mit Vergütung in Cent", () => {
    const task: Task = { id: "t1", type: "rating", prompt: "Wie war dein Tag?", reward: 5 };
    expect(task.reward).toBe(5);
  });
});
