// Copyright (c) 2026 Ethan Morgan. All Rights Reserved.

import { Effect } from "effect"

import type { FunctionHandler, RitFunctionEvent, RitFunctionResponse } from "@rit/types"

type HelloBody = {
  name: string
  something: string
}

type HelloEvent = RitFunctionEvent<HelloBody>

const handler: FunctionHandler<HelloEvent, RitFunctionResponse, string> = (
  event,
  context
) =>
  Effect.gen(function*() {
    if (event.path.trim().length === 0) {
      return yield* Effect.fail("Path is required")
    }

    const {
      name,
      something
    } = event.body ?? { name: "World", something: "nothing" }

    return {
      body: JSON.stringify({
        message: `You gave me name=${name} and something=${something}`,
        requestId: context.requestId
      }),
      statusCode: 200
    } as const
  })

export default handler
