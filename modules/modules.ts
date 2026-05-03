import type { ModuleDefinition } from "../core/types";
import { powerModule } from "./power";
import { cameraModule } from "./camera";

export const modules: ModuleDefinition[] = [powerModule, cameraModule];
