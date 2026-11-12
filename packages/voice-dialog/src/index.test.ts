import { describe, expect, it } from "vitest";
import { initialState } from "./index.js";

describe("voice-dialog", () => {
  it("startet im Ruhezustand", () => {
    expect(initialState).toBe("idle");
  });
});
