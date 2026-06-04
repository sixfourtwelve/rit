// Copyright (c) 2026 Ethan Morgan. All Rights Reserved.

import { Effect } from "effect"
import { describe, it } from "vitest"

describe("Example Effect Test", () => {
  it.effect("should run a simple effect", () =>
    Effect.gen(function*() {
      const result = yield* Effect.succeed(42)
      expect(result).toBe(42)
    }))

  it.effect("should handle effect success", () =>
    Effect.gen(function*() {
      const add = (a: number, b: number) => Effect.succeed(a + b)
      const result = yield* add(2, 3)
      expect(result).toBe(5)
    }))

  it.effect("should handle effect failure", () =>
    Effect.gen(function*() {
      const failing = Effect.fail("Expected error")
      const result = yield* Effect.flip(failing)
      expect(result).toBe("Expected error")
    }))
})
