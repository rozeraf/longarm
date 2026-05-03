import type { ModuleDefinition } from "../../core/types";
import { rebootHandler, shutdownHandler } from "./handlers";

export const powerModule: ModuleDefinition = {
  name: "power",
  commands: [
    {
      command: "reboot",
      description: "Reboot the system",
      handler: rebootHandler,
    },
    {
      command: "shutdown",
      description: "Shut down the system",
      handler: shutdownHandler,
    },
  ],
};
