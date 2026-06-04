// Copyright (c) 2026 Ethan Morgan. All Rights Reserved.

import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./setupTests.ts"]
  }
})
