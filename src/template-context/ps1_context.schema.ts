import { z } from "zod";
import { commonContextSchema, fragmentSchema } from "./common_context.schema";

const ps1ArtifactSchema = fragmentSchema.omit({
  checksum: true,
});

export const ps1ContextSchema = commonContextSchema.extend({
  artifacts: z.array(ps1ArtifactSchema).min(1),
});

export type Ps1Context = z.input<typeof ps1ContextSchema>;
