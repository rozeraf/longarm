import { bot } from "../../core/bot";
import { createConversation } from "@grammyjs/conversations";
import type { ModuleDefinition } from "../../core/types";
import {
  sshCommand,
  sshCallbackHandler,
  customUserConversation,
  customPortConversation,
} from "./handlers";

export const sshModule: ModuleDefinition = {
  name: "ssh",
  onLoad: () => {
    bot.use(createConversation(customUserConversation, "ssh-custom-user"));
    bot.use(createConversation(customPortConversation, "ssh-custom-port"));
  },
  commands: [
    {
      command: "ssh",
      description: "Manage SSH connections",
      handler: sshCommand,
    },
  ],
  callbacks: [
    {
      trigger: /^ssh:/,
      handler: sshCallbackHandler,
    },
  ],
};
