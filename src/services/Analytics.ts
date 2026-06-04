// Copyright (c) 2026 Ethan Morgan. All Rights Reserved.

import { Console, Effect } from "effect"

export interface AnalyticsEvent {
  readonly functionName: string
  readonly status: "success" | "failure"
  readonly durationMs: number
}

class Analytics extends Effect.Service<Analytics>()("app/Analytics", {
  effect: Effect.gen(function*() {
    const track = Effect.fn("Analytics/track")((event: AnalyticsEvent) =>
      Console.log(
        `[analytics] function=${event.functionName} status=${event.status} durationMs=${event.durationMs}`
      ).pipe(Effect.asVoid)
    )

    return { track } as const
  })
}) {}

export { Analytics }
