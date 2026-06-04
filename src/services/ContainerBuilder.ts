import { access, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"

import { Effect } from "effect"

import { RIT_FUNCTION_CONFIG_FILE, type RitFunctionConfig } from "../types/function-config"
import {
  DEFAULT_FUNCTION_RUNTIME_CONFIG,
  type FunctionRuntimeConfig,
  type FunctionRuntimeOverrides
} from "../types/runtime"

export interface BuildContainerInput {
  readonly baseImage?: string
  readonly functionName: string
  readonly handlerModulePath: string
  readonly runtime?: FunctionRuntimeOverrides
}

export interface BuiltContainer {
  readonly dockerfile: string
  readonly handlerModulePath: string
  readonly imageTag: string
  readonly runtime: FunctionRuntimeConfig
}

type LoadFunctionConfigError = {
  readonly _tag: "LoadFunctionConfigError"
  readonly cause: unknown
}

const validateRuntimeConfig = (runtime: FunctionRuntimeConfig): Effect.Effect<void, string> => {
  if (runtime.memoryMb < 64 || runtime.memoryMb > 10_240) {
    return Effect.fail("runtime.memoryMb must be between 64 and 10240")
  }

  if (runtime.cpu <= 0 || runtime.cpu > 8) {
    return Effect.fail("runtime.cpu must be between 0 and 8")
  }

  if (runtime.timeoutMs < 100 || runtime.timeoutMs > 900_000) {
    return Effect.fail("runtime.timeoutMs must be between 100 and 900000")
  }

  if (runtime.maxPayloadBytes <= 0) {
    return Effect.fail("runtime.maxPayloadBytes must be greater than 0")
  }

  return Effect.void
}

const normalizeRuntimeConfig = (
  fromConfigFile: FunctionRuntimeOverrides | undefined,
  fromInput: FunctionRuntimeOverrides | undefined
): FunctionRuntimeConfig => ({
  ...DEFAULT_FUNCTION_RUNTIME_CONFIG,
  ...fromConfigFile,
  ...fromInput,
  environment: {
    ...DEFAULT_FUNCTION_RUNTIME_CONFIG.environment,
    ...(fromConfigFile?.environment ?? {}),
    ...(fromInput?.environment ?? {})
  }
})

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

const unknownKeys = (value: Record<string, unknown>, allowed: ReadonlyArray<string>): ReadonlyArray<string> =>
  Object.keys(value).filter((key) => !allowed.includes(key))

const validateFunctionConfigShape = (value: unknown, configPath: string): Effect.Effect<RitFunctionConfig, string> => {
  if (!isRecord(value)) {
    return Effect.fail(`Invalid config in ${configPath}: root must be an object`)
  }

  const rootUnknown = unknownKeys(value, ["container", "runtime"])
  if (rootUnknown.length > 0) {
    return Effect.fail(`Invalid config in ${configPath}: unknown root keys: ${rootUnknown.join(", ")}`)
  }

  if (value.container !== undefined) {
    if (!isRecord(value.container)) {
      return Effect.fail(`Invalid config in ${configPath}: container must be an object`)
    }

    const containerUnknown = unknownKeys(value.container, ["baseImage"])
    if (containerUnknown.length > 0) {
      return Effect.fail(`Invalid config in ${configPath}: unknown container keys: ${containerUnknown.join(", ")}`)
    }
  }

  if (value.runtime !== undefined) {
    if (!isRecord(value.runtime)) {
      return Effect.fail(`Invalid config in ${configPath}: runtime must be an object`)
    }

    const runtimeUnknown = unknownKeys(value.runtime, [
      "cpu",
      "environment",
      "maxPayloadBytes",
      "memoryMb",
      "networkMode",
      "readOnlyRootFs",
      "timeoutMs"
    ])

    if (runtimeUnknown.length > 0) {
      return Effect.fail(`Invalid config in ${configPath}: unknown runtime keys: ${runtimeUnknown.join(", ")}`)
    }

    if (value.runtime.environment !== undefined) {
      if (!isRecord(value.runtime.environment)) {
        return Effect.fail(`Invalid config in ${configPath}: runtime.environment must be an object`)
      }

      for (const [key, envValue] of Object.entries(value.runtime.environment)) {
        if (typeof envValue !== "string") {
          return Effect.fail(
            `Invalid config in ${configPath}: runtime.environment.${key} must be a string`
          )
        }
      }
    }
  }

  return Effect.succeed(value as RitFunctionConfig)
}

const loadFunctionConfig = (handlerModulePath: string): Effect.Effect<RitFunctionConfig | void, string> => {
  const configPath = join(dirname(handlerModulePath), RIT_FUNCTION_CONFIG_FILE)

  return Effect.tryPromise<string, LoadFunctionConfigError>({
    try: async () => {
      await access(configPath)
      return await readFile(configPath, "utf8")
    },
    catch: (cause) => ({ _tag: "LoadFunctionConfigError", cause })
  }).pipe(
    Effect.catchAll((error) => {
      if ((error.cause as NodeJS.ErrnoException).code === "ENOENT") {
        return Effect.void
      }

      return Effect.fail(`Unable to load function config at ${configPath}`)
    }),
    Effect.flatMap((configText) => {
      if (configText === undefined) {
        return Effect.void
      }

      return Effect.try({
        try: () => JSON.parse(configText) as unknown,
        catch: () => `Invalid JSON in ${configPath}`
      }).pipe(Effect.flatMap((config) => validateFunctionConfigShape(config, configPath)))
    })
  )
}

class ContainerBuilder extends Effect.Service<ContainerBuilder>()("app/ContainerBuilder", {
  effect: Effect.gen(function*() {
    const build = Effect.fn("ContainerBuilder/build")((input: BuildContainerInput) => {
      if (input.functionName.trim().length === 0) {
        return Effect.fail("Function name cannot be empty")
      }

      return loadFunctionConfig(input.handlerModulePath).pipe(
        Effect.flatMap((config) => {
          const runtime = normalizeRuntimeConfig(config?.runtime, input.runtime)

          return validateRuntimeConfig(runtime).pipe(
            Effect.flatMap(() => {
              const baseImage = input.baseImage ?? config?.container?.baseImage ?? "oven/bun:1"
              const imageTag = `${input.functionName.toLowerCase()}:latest`
              const envLines = Object.entries(runtime.environment).map(([key, value]) => `ENV ${key}=${value}`)
              const dockerfile = [
                `FROM ${baseImage}`,
                "WORKDIR /app",
                ...envLines,
                `ENV RIT_HANDLER_MODULE=${input.handlerModulePath}`,
                "COPY . .",
                "RUN bun install",
                "CMD [\"bun\", \"run\", \"src/runtime/invoke.ts\"]"
              ].join("\n")

              return Effect.succeed(
                {
                  dockerfile,
                  handlerModulePath: input.handlerModulePath,
                  imageTag,
                  runtime
                } as const
              )
            })
          )
        })
      )
    })

    return { build } as const
  })
}) {}

export { ContainerBuilder }
