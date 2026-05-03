import type { ModuleDefinition } from "../../core/types";
import { photoHandler } from "./handlers";

export const cameraModule: ModuleDefinition = {
  name: "camera",
  commands: [
    {
      command: "photo",
      description: "Take a photo from the webcam",
      handler: photoHandler,
    },
  ],
};
