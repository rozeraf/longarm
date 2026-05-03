# Longarm

A modular, self-hosted Telegram bot for remote PC management. Built with [Bun](https://bun.sh/), TypeScript, and [grammY](https://grammy.dev/).

Longarm runs as a systemd service on your machine and gives you secure remote access to it through Telegram — screenshots, power control, SSH connection helpers, and more.

---

## Features

- **Modular architecture** — functionality is split into self-contained modules. Adding or removing a feature is a matter of a single import.
- **Secure by default** — all commands are gated behind user ID whitelisting and a static hashed password (scrypt + constant-time comparison). No plaintext secrets.
- **Inline-first UX** — interactions happen through inline keyboards inside a single message. No keyboard clutter, no chat spam.
- **Scheduler** — modules can declare cron-based background jobs alongside their commands.
- **Tailscale integration** — the SSH module checks Tailscale status and returns a ready-to-use connection string for use in Termux or any SSH client.

---

## Stack

| | |
|---|---|
| Runtime | [Bun](https://bun.sh/) |
| Telegram framework | [grammY](https://grammy.dev/) |
| Conversations | [@grammyjs/conversations](https://grammy.dev/plugins/conversations) |
| Language | TypeScript |
| Process manager | systemd |

---

## Project Structure

```
longarm/
├── index.ts              # Entry point
├── core/
│   ├── auth.ts           # Whitelist + password middleware
│   ├── bot.ts            # grammY bot instance, session setup
│   ├── loader.ts         # Module registration
│   ├── scheduler.ts      # Cron job runner
│   └── types.ts          # Shared types: BotContext, ModuleDefinition, etc.
└── modules/
    ├── modules.ts        # Module registry (single import list)
    ├── ssh/              # Tailscale + SSH connection helper
    ├── power/            # Shutdown, reboot, sleep, lock
    └── camera/           # Webcam snapshot
```

Each module lives in its own directory with an `index.ts` (module definition) and `handlers.ts` (logic).

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- A Telegram bot token from [@BotFather](https://t.me/botfather)
- Your Telegram user ID (get it from [@userinfobot](https://t.me/userinfobot))
- `tailscale` CLI installed and authenticated (for the SSH module)

### Installation

```bash
git clone https://github.com/yourusername/longarm.git
cd longarm
bun install
```

### Configuration

```bash
cp .env.example .env
```

`.env` accepts the following variables:

```env
BOT_TOKEN=your_bot_token_here
WHITELISTED_USERS=123456789
PASSWORD_HASH=salt:hash
```

To generate `PASSWORD_HASH`:

```bash
node -e "
const { scryptSync, randomBytes } = require('crypto');
const salt = randomBytes(16).toString('hex');
const hash = scryptSync('your_password', salt, 64).toString('hex');
console.log(salt + ':' + hash);
"
```

### Running

```bash
# Development
bun run index.ts

# Production — run as a systemd service (see below)
```

---

## Running as a systemd Service

Create `/etc/systemd/system/longarm.service`:

```ini
[Unit]
Description=Longarm Telegram Bot
After=network-online.target tailscaled.service
Wants=network-online.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/home/your_username/longarm
EnvironmentFile=/home/your_username/longarm/.env
ExecStart=/home/your_username/.bun/bin/bun run index.ts
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now longarm
sudo systemctl status longarm
```

Logs:

```bash
journalctl -u longarm -f
```

---

## Adding a Module

1. Create a directory under `modules/`:

```
modules/
└── my-module/
    ├── index.ts
    └── handlers.ts
```

2. Define the module in `index.ts`:

```typescript
import type { ModuleDefinition } from "../../core/types";
import { myHandler } from "./handlers";

export const myModule: ModuleDefinition = {
    name: "my-module",
    commands: [
        {
            command: "hello",
            description: "Say hello",
            handler: myHandler,
        },
    ],
};
```

3. Register it in `modules/modules.ts`:

```typescript
import { myModule } from "./my-module";

export const modules = [
    myModule,
    // ...other modules
];
```

That's it. The loader picks it up automatically on next start.

---

## Authentication

All commands pass through `authMiddleware` automatically — you never wire it manually in a module.

The middleware does two things in order:

1. Checks if the sender's user ID is in `WHITELISTED_USERS`. If not, the message is silently ignored.
2. Checks if the session is authenticated. If not, prompts for the password. On success, marks the session as authenticated for the lifetime of the bot process.

The password is stored as a scrypt-derived hash in `PASSWORD_HASH`. It is never stored or logged in plaintext.

---

## License

MIT — see [LICENSE](LICENSE).
