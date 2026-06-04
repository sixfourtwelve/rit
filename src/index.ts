// Copyright (c) 2026 Ethan Morgan. All Rights Reserved.

import { BunRuntime } from "@effect/platform-bun"
import { Console, Effect, Layer } from "effect"

import { program } from "./app/program"
import { Analytics } from "./services/Analytics"
import { ContainerBuilder } from "./services/ContainerBuilder"
import { ContainerRunner } from "./services/ContainerRunner"

program.pipe(
  Effect.provide(Layer.mergeAll(Analytics.Default, ContainerBuilder.Default, ContainerRunner.Default)),
  Effect.catchAll((error) => Console.error(`Pipeline failed: ${error}`)),
  Effect.scoped,
  BunRuntime.runMain({ disablePrettyLogger: true })
)
