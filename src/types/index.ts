// Copyright (c) 2026 Ethan Morgan. All Rights Reserved.

export type { FunctionHandler, HandlerContext } from "../functions/types"
export { RIT_FUNCTION_CONFIG_FILE, type RitContainerConfig, type RitFunctionConfig } from "./function-config"
export {
  DEFAULT_FUNCTION_RUNTIME_CONFIG,
  type FunctionRuntimeConfig,
  type FunctionRuntimeOverrides,
  type NetworkMode
} from "./runtime"

export interface RitFunctionEvent {
  readonly body?: string
  readonly headers?: Readonly<Record<string, string>>
  readonly path: string
}

export interface RitFunctionResponse {
  readonly body: string
  readonly headers?: Readonly<Record<string, string>>
  readonly statusCode: number
}
