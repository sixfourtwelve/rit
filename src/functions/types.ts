// Copyright (c) 2026 Ethan Morgan. All Rights Reserved.

import type { Effect } from "effect/Effect"

export interface HandlerContext {
  readonly requestId: string
  readonly startedAt: number
}

export type FunctionHandler<Input, Output, Error = string, Requirements = never> = (
  input: Input,
  context: HandlerContext
) => Effect<Output, Error, Requirements>
