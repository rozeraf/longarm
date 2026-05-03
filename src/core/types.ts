import type { Context, SessionFlavor } from "grammy";
import type { ConversationFlavor, Conversation } from "@grammyjs/conversations";

export interface SessionData {
    authenticated: boolean;
}

export type BotContext = Context &
    SessionFlavor<SessionData> &
    ConversationFlavor<Context & SessionFlavor<SessionData>>;
export type BotConversation = Conversation<BotContext, BotContext>;
export interface CommandDefinition {
    command: string;
    description?: string;
    handler: (ctx: BotContext) => Promise<void> | void;
}

export interface CallbackDefinition {
    trigger: string | RegExp;
    handler: (ctx: BotContext) => Promise<void> | void;
}

export interface JobDefinition {
    cronTime: string;
    handler: () => Promise<void> | void;
}

export interface ModuleDefinition {
    name: string;
    commands?: CommandDefinition[];
    callbacks?: CallbackDefinition[];
    jobs?: JobDefinition[];
    onLoad?: () => Promise<void> | void;
}
