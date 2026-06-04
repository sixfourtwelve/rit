// Copyright (c) 2026 Ethan Morgan. All Rights Reserved.

import type { FunctionRuntimeOverrides } from "./runtime"

export const RIT_FUNCTION_CONFIG_FILE = "rit.function.json"

export interface RitContainerConfig {
  readonly baseImage?: string
}

export interface RitFunctionConfig {
  readonly container?: RitContainerConfig
  readonly runtime?: FunctionRuntimeOverrides
}
