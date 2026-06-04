// Copyright (c) 2026 Ethan Morgan. All Rights Reserved.

export type NetworkMode = "none" | "bridge"

export interface FunctionRuntimeConfig {
  readonly cpu: number
  readonly environment: Readonly<Record<string, string>>
  readonly maxPayloadBytes: number
  readonly memoryMb: number
  readonly networkMode: NetworkMode
  readonly readOnlyRootFs: boolean
  readonly timeoutMs: number
}

export type FunctionRuntimeOverrides = Partial<FunctionRuntimeConfig>

export const DEFAULT_FUNCTION_RUNTIME_CONFIG: FunctionRuntimeConfig = {
  cpu: 0.25,
  environment: {},
  maxPayloadBytes: 1024 * 1024,
  memoryMb: 256,
  networkMode: "none",
  readOnlyRootFs: true,
  timeoutMs: 30_000
}
