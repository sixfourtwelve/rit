import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { describe, it } from "@effect/vitest"
import { Effect } from "effect"

import { ContainerBuilder } from "../src/services/ContainerBuilder"

describe("ContainerBuilder", () => {
  it.effect("loads rit.function.json and merges runtime overrides", () =>
    Effect.gen(function*() {
      const builder = yield* ContainerBuilder

      const built = yield* builder.build({
        functionName: "hello-handler",
        handlerModulePath: resolve("examples/functions/hello/index.ts"),
        runtime: {
          cpu: 0.5,
          timeoutMs: 15_000
        }
      })

      expect(built.runtime.memoryMb).toBe(256)
      expect(built.runtime.maxPayloadBytes).toBe(1_048_576)
      expect(built.runtime.cpu).toBe(0.5)
      expect(built.runtime.timeoutMs).toBe(15_000)
      expect(built.dockerfile).toContain("CMD [\"bun\", \"run\", \"src/runtime/invoke.ts\"]")
    }).pipe(Effect.provide(ContainerBuilder.Default)))

  it("fails when config contains unknown keys", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "rit-test-"))
    const handlerPath = join(tempDir, "index.ts")
    const configPath = join(tempDir, "rit.function.json")

    await writeFile(handlerPath, "export default null\n")
    await writeFile(
      configPath,
      JSON.stringify({
        runtime: {
          madeUpOption: true
        }
      })
    )

    const program = Effect.gen(function*() {
      const builder = yield* ContainerBuilder

      return yield* Effect.flip(
        builder.build({
          functionName: "bad-function",
          handlerModulePath: handlerPath
        })
      )
    }).pipe(Effect.provide(ContainerBuilder.Default))

    const error = await Effect.runPromise(program)
    expect(error).toContain("unknown runtime keys")

    await rm(tempDir, { force: true, recursive: true })
  })
})
