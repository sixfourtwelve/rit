import { spawn } from "node:child_process"

import { Effect } from "effect"

import type { BuiltContainer } from "./ContainerBuilder"

export type RunMode = "docker" | "simulate"

export interface RunContainerInput {
  readonly container: BuiltContainer
  readonly mode?: RunMode
  readonly payload: unknown
  readonly simulatedDurationMs?: number
}

export interface ContainerRunResult {
  readonly command: string
  readonly durationMs: number
  readonly exitCode: number
  readonly stderr: string
  readonly stdout: string
}

interface CommandResult {
  readonly code: number
  readonly stderr: string
  readonly stdout: string
  readonly timedOut: boolean
}

const executeCommand = (params: {
  readonly args: ReadonlyArray<string>
  readonly input?: string
  readonly timeoutMs?: number
}): Promise<CommandResult> =>
  new Promise((resolvePromise, rejectPromise) => {
    const [command, ...args] = params.args
    if (command === undefined) {
      rejectPromise(new Error("Command is required"))
      return
    }

    const child = spawn(command, args, {
      stdio: "pipe"
    })

    let stdout = ""
    let stderr = ""
    let timedOut = false

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })

    child.on("error", (error) => {
      rejectPromise(error)
    })

    const timeout = params.timeoutMs === undefined
      ? undefined
      : setTimeout(() => {
        timedOut = true
        child.kill("SIGKILL")
      }, params.timeoutMs)

    child.on("close", (code) => {
      if (timeout !== undefined) {
        clearTimeout(timeout)
      }

      resolvePromise({
        code: code ?? -1,
        stderr,
        stdout,
        timedOut
      })
    })

    if (params.input !== undefined) {
      child.stdin.write(params.input)
    }

    child.stdin.end()
  })

const toPayloadString = (payload: unknown): string => {
  if (typeof payload === "string") {
    return payload
  }

  return JSON.stringify(payload)
}

class ContainerRunner extends Effect.Service<ContainerRunner>()("app/ContainerRunner", {
  effect: Effect.gen(function*() {
    const run = Effect.fn("ContainerRunner/run")((input: RunContainerInput) => {
      if (input.container.imageTag.trim().length === 0) {
        return Effect.fail("Container image tag is required")
      }

      const payloadString = toPayloadString(input.payload)
      if (payloadString.length > input.container.runtime.maxPayloadBytes) {
        return Effect.fail("Payload exceeds runtime.maxPayloadBytes")
      }

      const mode = input.mode ?? "simulate"
      if (mode === "simulate") {
        const durationMs = input.simulatedDurationMs ?? 20
        if (durationMs > input.container.runtime.timeoutMs) {
          return Effect.fail("Container execution timed out")
        }

        const args = [
          "docker run --rm",
          `--memory=${input.container.runtime.memoryMb}m`,
          `--cpus=${input.container.runtime.cpu}`,
          `--network=${input.container.runtime.networkMode}`,
          input.container.runtime.readOnlyRootFs ? "--read-only" : "",
          input.container.imageTag
        ].filter((part) => part.length > 0)

        const startedAt = Date.now()
        const command = args.join(" ")
        const stdout = `Simulated ${command} with payload ${payloadString}`

        return Effect.succeed(
          {
            command,
            durationMs: Date.now() - startedAt,
            exitCode: 0,
            stderr: "",
            stdout
          } as const
        )
      }

      return Effect.tryPromise({
        try: async () => {
          const startedAt = Date.now()

          const build = await executeCommand({
            args: ["docker", "build", "-t", input.container.imageTag, "-f", "-", "."],
            input: input.container.dockerfile
          })

          if (build.code !== 0) {
            throw new Error(`Docker build failed: ${build.stderr || build.stdout}`)
          }

          const envArgs = Object.entries(input.container.runtime.environment).flatMap(([key, value]) => [
            "-e",
            `${key}=${value}`
          ])

          const runArgs = [
            "docker",
            "run",
            "--rm",
            `--memory=${input.container.runtime.memoryMb}m`,
            `--cpus=${input.container.runtime.cpu}`,
            `--network=${input.container.runtime.networkMode}`,
            ...(input.container.runtime.readOnlyRootFs ? ["--read-only"] : []),
            ...envArgs,
            "-e",
            `RIT_HANDLER_MODULE=${input.container.handlerModulePath}`,
            "-e",
            `RIT_EVENT_JSON=${payloadString}`,
            "-e",
            `RIT_REQUEST_ID=req-${Date.now()}`,
            input.container.imageTag
          ]

          const runResult = await executeCommand({
            args: runArgs,
            timeoutMs: input.container.runtime.timeoutMs
          })

          if (runResult.timedOut) {
            throw new Error("Container execution timed out")
          }

          return {
            command: runArgs.join(" "),
            durationMs: Date.now() - startedAt,
            exitCode: runResult.code,
            stderr: runResult.stderr.trim(),
            stdout: runResult.stdout.trim()
          } as const
        },
        catch: (error) => `Docker mode failed: ${String(error)}`
      })
    })

    return { run } as const
  })
}) {}

export { ContainerRunner }
