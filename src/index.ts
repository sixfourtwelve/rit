// Copyright (c) 2026 Ethan Morgan. All Rights Reserved.

import { BunRuntime } from "@effect/platform-bun"
import { Console, Effect, Layer } from "effect"

import handler from "./functions/hello-handler"
import { Analytics } from "./services/Analytics"
import { ContainerBuilder } from "./services/ContainerBuilder"
import { ContainerRunner } from "./services/ContainerRunner"

const runMode = process.env.RIT_RUN_MODE === "docker" ? "docker" : "simulate"
const buildPolicy = process.env.RIT_BUILD_POLICY === "always"
  ? "always"
  : process.env.RIT_BUILD_POLICY === "never"
  ? "never"
  : "if-not-present"

const program = Effect.gen(function*() {
  const analytics = yield* Analytics
  const containerBuilder = yield* ContainerBuilder
  const containerRunner = yield* ContainerRunner

  const event = { name: "Docker" } as const

  const handlerResult = yield* handler(event, {
    requestId: `req-${Date.now()}`,
    startedAt: Date.now()
  })

  const container = yield* containerBuilder.build({
    functionName: "hello-handler",
    handlerModulePath: "src/functions/hello-handler.ts",
    runtime: {
      cpu: 0.5,
      timeoutMs: 15_000
    }
  })

  const runResult = yield* containerRunner.run({
    container,
    buildPolicy,
    mode: runMode,
    payload: event
  })

  yield* analytics.track({
    durationMs: runResult.durationMs,
    functionName: "hello-handler",
    status: runResult.exitCode === 0 ? "success" : "failure"
  })

  yield* Console.log(`Local handler result: ${JSON.stringify(handlerResult)}`)
  yield* Console.log(`Container output: ${runResult.stdout}`)
})

program.pipe(
  Effect.provide(Layer.mergeAll(Analytics.Default, ContainerBuilder.Default, ContainerRunner.Default)),
  Effect.catchAll((error) => Console.error(`Pipeline failed: ${error}`)),
  Effect.scoped,
  BunRuntime.runMain({ disablePrettyLogger: true })
)
