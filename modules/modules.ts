import type { ModuleDefinition } from "../core/types";
import { powerModule } from "./power";
import { cameraModule } from "./camera";
import { sshModule } from "./ssh";

export const modules: ModuleDefinition[] = [
  powerModule,
  cameraModule,
  sshModule,
];
