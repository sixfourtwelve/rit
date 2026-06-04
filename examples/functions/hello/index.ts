// Copyright (c) 2026 Ethan Morgan. All Rights Reserved.

import { Effect } from "effect"

import type { FunctionHandler, RitFunctionEvent, RitFunctionResponse } from "@rit/types"

const handler: FunctionHandler<RitFunctionEvent, RitFunctionResponse, string> = (event, context) =>
  Effect.gen(function*() {
    if (event.path.trim().length === 0) {
      return yield* Effect.fail("Path is required")
    }

    const name = event.body?.trim().length ? event.body : "world"

    return {
      body: JSON.stringify({
        message: `Test this ${name}`,
        requestId: context.requestId
      }),
      statusCode: 200
    } as const
  })

export default handler
