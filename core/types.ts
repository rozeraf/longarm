import type { Context, SessionFlavor } from "grammy";

export interface SessionData {
  authenticatedAt?: string;
}

export type BotContext = Context & SessionFlavor<SessionData>;

export interface CommandDefinition {
  command: string;
  description?: string;
  handler: (ctx: BotContext) => Promise<void> | void;
}

export interface JobDefinition {
  cronTime: string;
  handler: () => Promise<void> | void;
}

export interface ModuleDefinition {
  name: string;
  commands?: CommandDefinition[];
  jobs?: JobDefinition[];
  onLoad?: () => Promise<void> | void;
}
