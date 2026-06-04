# rit

A TypeScript project built with the Effect library. This repository provides a foundation for building applications using modern JavaScript runtimes like Bun or Node.js, including lambda-like function handlers that can be packaged and run in containers.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (Recommended) OR [Node.js](https://nodejs.org/)
- A package manager compatible with `pnpm`

### Installation

Clone the repository and install dependencies:

```bash
# If using pnpm as specified in devEngines
pnpm install

# Alternative: npm install or yarn install if preferred
```

## Project Structure

- **`src/`**: Main application source code
- **`examples/`**: Example lambda-like handlers (default export handler returning `Effect.gen`)
- **`test/`**: Test files (using Vitest)
- **`dist/`**: Built output directory
- **`tsconfig.json`**: TypeScript configuration
- **`vitest.config.ts`**: Testing configuration

## Function Configuration (`rit.function.json`)

Each function directory can define a `rit.function.json` file. This is loaded automatically when building/running a function container.

```json
{
  "container": {
    "baseImage": "oven/bun:1"
  },
  "runtime": {
    "memoryMb": 256,
    "cpu": 0.5,
    "timeoutMs": 15000,
    "networkMode": "none",
    "readOnlyRootFs": true,
    "maxPayloadBytes": 262144,
    "environment": {
      "RIT_ENV": "development"
    }
  }
}
```

`BuildContainerInput.runtime` values override values from `rit.function.json`.

Run mode is controlled with `RIT_RUN_MODE`:
- `simulate` (default): no real docker execution
- `docker`: builds and runs the container for real

```bash
# Simulated
pnpm start

# Real docker mode
RIT_RUN_MODE=docker pnpm start
```

## Available Commands

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Start the development server with hot-reloading (requires Bun) |
| `pnpm start` | Run the application using Bun without watch mode |
| `pnpm build` | Build and bundle the project for production |
| `pnpm test` | Run all tests using Vitest in watch mode |
| `pnpm coverage` | Run tests and generate code coverage report |
| `pnpm lint` | Lint TypeScript files with ESLint |
| `pnpm lint:fix` | Auto-fix issues found by ESLint (where possible) |

## Tech Stack & Dependencies

### Core Runtime Libraries
- **Effect**: A type-safe programming model for writing robust applications in Node.js, Bun, and Deno. Includes platform integration (`@effect/platform`, `@effect/platform-bun`).
- **TypeScript**: Strongly-typed JavaScript development with version 6+.

### Development & Build Tools
- **Bun**: High-performance runtime and package manager (primary dev engine).
- **tsdown**: TypeScript bundler for building the project.
- **Vitest**: Fast testing framework integrated directly into your Node.js environment, built on top of Vitest's core features.
- **ESLint**: Static code analysis tool with specific rules configured in `eslint.config.mjs`.

### Quality & Formatting Tools (Configured)
- **.editorconfig / .prettierignore**: Code style consistency enforcement.
