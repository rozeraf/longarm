# Longarm Bot

Longarm is a modular, secure Telegram bot framework built with **Bun**, **TypeScript**, and **grammY**. It features a robust authentication system with whitelisted users and daily rotating passwords, alongside a flexible module-based architecture for easy extension.

## 🚀 Features

-   **Modular Architecture**: Easily add or remove functionality through self-contained modules.
-   **Secure by Design**:
    -   **User Whitelisting**: Only specified Telegram User IDs can interact with the bot.
    -   **Daily Password**: Authentication requires a daily rotating password (printed to the console at midnight).
-   **Integrated Scheduler**: Native support for Cron-based background jobs.
-   **Modern Stack**: Built with [Bun](https://bun.sh/) for performance and [grammY](https://grammy.dev/) for a powerful Telegram API experience.

---

## 🏗️ Architecture

The project is divided into two main parts:

### Core System (`/core`)
-   **`auth.ts`**: Manages user whitelisting and daily password challenges.
-   **`bot.ts`**: Initializes the grammY bot instance and session middleware.
-   **`loader.ts`**: Dynamically registers commands and jobs from active modules.
-   **`scheduler.ts`**: A wrapper around `cron` for managing background tasks.

### Module System (`/modules`)
Functionality is encapsulated in modules. Each module is located in `modules/<name>/` and defines:
-   **Commands**: Telegram bot commands (e.g., `/reboot`).
-   **Jobs**: Background tasks scheduled via Cron.
-   **onLoad**: Initialization logic for the module.

---

## 🛠️ Getting Started

### Prerequisites
-   [Bun](https://bun.sh/) installed on your system.
-   A Telegram Bot Token (obtained from [@BotFather](https://t.me/botfather)).

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/longarm.git
    cd longarm
    ```
2.  Install dependencies:
    ```bash
    bun install
    ```
3.  Set up environment variables:
    ```bash
    cp .env.example .env
    ```
    Edit `.env` and provide your `BOT_TOKEN` and `WHITELISTED_USERS` (comma-separated IDs).

### Running the Bot
```bash
# Development mode
bun run index.ts

# Production (using Bun's hot reload if desired)
bun index.ts
```

---

## 📦 Adding a Module

1.  Create a new directory in `modules/`.
2.  Define your module in `index.ts`:
    ```typescript
    import { ModuleDefinition } from "../../core/types";
    import { myHandler } from "./handlers";

    export const myModule: ModuleDefinition = {
      name: "my-module",
      commands: [
        { command: "hello", description: "Say hello", handler: myHandler }
      ],
    };
    ```
3.  Register your module in `modules/modules.ts`:
    ```typescript
    import { myModule } from "./my-module";
    export const modules = [myModule, ...];
    ```

---

## 📜 License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
