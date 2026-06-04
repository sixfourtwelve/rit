import { basename, resolve } from "node:path"
import { pathToFileURL } from "node:url"

import { Console, Effect } from "effect"

import type { FunctionHandler } from "../functions/types"
import { Analytics } from "../services/Analytics"
import { ContainerBuilder } from "../services/ContainerBuilder"
import { type BuildPolicy, ContainerRunner, type RunMode } from "../services/ContainerRunner"

const runMode: RunMode = process.env.RIT_RUN_MODE === "docker" ? "docker" : "simulate"
const buildPolicy: BuildPolicy = process.env.RIT_BUILD_POLICY === "always"
  ? "always"
  : process.env.RIT_BUILD_POLICY === "never"
  ? "never"
  : "if-not-present"

const handlerModulePath = process.env.RIT_HANDLER_MODULE ?? "examples/functions/hello/index.ts"
const functionName = basename(handlerModulePath).replace(/\.[cm]?tsx?$/, "")

type AnyHandler = FunctionHandler<unknown, unknown, unknown, never>

const loadHandler = (modulePath: string): Effect.Effect<AnyHandler, string> =>
  Effect.tryPromise({
    try: async () => {
      const module = await import(pathToFileURL(resolve(modulePath)).href)
      return module.default as AnyHandler
    },
    catch: () => `Unable to import handler at ${modulePath}`
  })

const parseEvent = (raw: string): Effect.Effect<unknown, string> =>
  Effect.try({
    try: () => JSON.parse(raw) as unknown,
    catch: () => "RIT_EVENT_JSON must be valid JSON"
  })

export const program = Effect.gen(function*() {
  const analytics = yield* Analytics
  const containerBuilder = yield* ContainerBuilder
  const containerRunner = yield* ContainerRunner

  const event = yield* parseEvent(
    process.env.RIT_EVENT_JSON ??
      JSON.stringify({ body: { name: "Ethan", something: "Cooking" }, name: "Docker", path: "/hello" })
  )
  const handler = yield* loadHandler(handlerModulePath)

  const handlerResult = yield* handler(event, {
    requestId: `req-${Date.now()}`,
    startedAt: Date.now()
  })

  const container = yield* containerBuilder.build({
    functionName,
    handlerModulePath,
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
    functionName,
    status: runResult.exitCode === 0 ? "success" : "failure"
  })

  yield* Console.log(`Local handler result: ${JSON.stringify(handlerResult)}`)
  yield* Console.log(`Container output: ${runResult.stdout}`)
})
