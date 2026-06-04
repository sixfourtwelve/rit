import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

import { Console, Effect } from "effect"

import type { FunctionHandler, HandlerContext } from "../functions/types"

type UnknownHandler = FunctionHandler<unknown, unknown, unknown, never>

const loadHandler = (handlerModulePath: string) =>
  Effect.tryPromise({
    try: async () => {
      const resolvedPath = resolve(handlerModulePath)
      const module = await import(pathToFileURL(resolvedPath).href)
      return module.default as UnknownHandler
    },
    catch: () => `Unable to import handler module: ${handlerModulePath}`
  })

const parseEvent = (eventJson: string) =>
  Effect.try({
    try: () => JSON.parse(eventJson) as unknown,
    catch: () => "RIT_EVENT_JSON is not valid JSON"
  })

const program = Effect.gen(function*() {
  const handlerModulePath = process.env.RIT_HANDLER_MODULE

  if (handlerModulePath === undefined || handlerModulePath.trim().length === 0) {
    return yield* Effect.fail("RIT_HANDLER_MODULE is required")
  }

  const eventJson = process.env.RIT_EVENT_JSON ?? "{}"
  const event = yield* parseEvent(eventJson)
  const handler = yield* loadHandler(handlerModulePath)

  const context: HandlerContext = {
    requestId: process.env.RIT_REQUEST_ID ?? `req-${Date.now()}`,
    startedAt: Date.now()
  }

  const result = yield* handler(event, context)
  yield* Console.log(JSON.stringify(result))
})

Effect.runPromise(program).catch((error) => {
  console.error(error)
  process.exit(1)
})
