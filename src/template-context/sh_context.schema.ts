import { z } from "zod";
import { commonContextSchema, fragmentSchema } from "./common_context.schema";

const VersionSchema = z.strictObject({
  major: z.number().int().nonnegative(),
  series: z.number().int().nonnegative(),
});

const runtimeConditionsSchema = z.strictObject({
  min_glibc_version: VersionSchema.optional(),
  min_musl_version: VersionSchema.optional(),
  rosetta2: z.boolean().optional(),
});

const platformEntrySchema = z.strictObject({
  runtime_conditions: runtimeConditionsSchema,
  archive_idx: z.number().int().nonnegative(),
});

const platformSupportSchema = z.strictObject({
  archives: z.array(fragmentSchema).min(1),
  platforms: z.record(z.string(), z.array(platformEntrySchema).min(1)),
  // No updater support, always empty
  updaters: z.tuple([]).default([]),
});

const shArtifactSchema = fragmentSchema.pick({
  target_triple: true,
});

export const shContextSchema = commonContextSchema.extend({
  artifacts: z.array(shArtifactSchema).min(1),
  platform_support: platformSupportSchema,
});

export type ShContext = z.input<typeof shContextSchema>;
export type LibcVersion = z.input<typeof VersionSchema>;
