// Copyright (c) 2026 Ethan Morgan. All Rights Reserved.

import { Effect } from "effect"

import type { FunctionHandler } from "./types"

const handler: FunctionHandler<{ readonly name: string }, { readonly message: string }, never> = (input, _context) =>
  Effect.gen(function*() {
    return { message: `Hello ${input.name}` } as const
  })

export default handler
