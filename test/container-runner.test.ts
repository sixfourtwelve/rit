import { describe, it } from "@effect/vitest"
import { Effect } from "effect"

import type { BuiltContainer } from "../src/services/ContainerBuilder"
import { ContainerRunner } from "../src/services/ContainerRunner"
import { DEFAULT_FUNCTION_RUNTIME_CONFIG } from "../src/types/runtime"

const builtContainer: BuiltContainer = {
  dockerfile: "FROM oven/bun:1",
  handlerModulePath: "examples/functions/hello/index.ts",
  imageTag: "test-handler:latest",
  runtime: {
    ...DEFAULT_FUNCTION_RUNTIME_CONFIG,
    cpu: 0.5,
    maxPayloadBytes: 20,
    memoryMb: 256,
    timeoutMs: 100
  }
}

describe("ContainerRunner", () => {
  it.effect("runs in simulate mode", () =>
    Effect.gen(function*() {
      const runner = yield* ContainerRunner

      const result = yield* runner.run({
        container: builtContainer,
        mode: "simulate",
        payload: { ok: true }
      })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Simulated docker run")
      expect(result.command).toContain("--memory=256m")
    }).pipe(Effect.provide(ContainerRunner.Default)))

  it("fails when payload exceeds maxPayloadBytes", async () => {
    const program = Effect.gen(function*() {
      const runner = yield* ContainerRunner

      return yield* Effect.flip(
        runner.run({
          container: builtContainer,
          mode: "simulate",
          payload: { message: "this payload is definitely too large" }
        })
      )
    }).pipe(Effect.provide(ContainerRunner.Default))

    const error = await Effect.runPromise(program)
    expect(error).toContain("Payload exceeds runtime.maxPayloadBytes")
  })

  it("fails when simulate duration exceeds timeout", async () => {
    const program = Effect.gen(function*() {
      const runner = yield* ContainerRunner

      return yield* Effect.flip(
        runner.run({
          container: builtContainer,
          mode: "simulate",
          payload: "ok",
          simulatedDurationMs: 101
        })
      )
    }).pipe(Effect.provide(ContainerRunner.Default))

    const error = await Effect.runPromise(program)
    expect(error).toContain("Container execution timed out")
  })
})
