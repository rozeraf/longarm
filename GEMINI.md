# Longarm Architecture

## Entry Point (`index.ts`)

- Creates bot instance.
- Calls `loader.ts` to register modules.
- Starts `scheduler.ts` for background jobs.
- Starts polling.
- Minimal logic, purely orchestration.

## Core System (`core/`)

- **bot.ts**: grammY instance initialization. Adds session middleware with authentication state.
- **auth.ts**: Middleware for every command.
  - Checks `user_id` against `WHITELISTED_USERS`.
  - Daily password authentication (password rotated at midnight and logged to console).
  - Authenticated sessions last until the next day.
- **loader.ts**: Iterates through `modules.ts`, calls `onLoad` for each module, and registers commands/jobs.
- **scheduler.ts**: Thin wrapper around `cron`. Handles jobs defined in modules.
- **types.ts**: Common interfaces for modules, commands, and jobs.

## Module System (`modules/`)

- **modules.ts**: A manual array of all active modules.
- **Module Structure**:
  - `modules/<name>/index.ts`: Declarative definition (name, commands, jobs, onLoad).
  - `modules/<name>/handlers.ts`: Implementation of command handlers.
- Modules should be isolated and independent.

## Technical Standards

- Use `grammy` for Telegram API.
- Use `cron` for scheduling.
- Use `bun` as runtime and package manager.
- Prefer declarative configuration over imperative logic where possible.
