import type { ValidationTargets } from "hono/types";
import type { GenericSchema, GenericSchemaAsync } from "valibot";

import { vValidator } from "@hono/valibot-validator";

export const validator = <
  T extends GenericSchema | GenericSchemaAsync,
  Target extends keyof ValidationTargets,
>(
  target: Target,
  schema: T,
) =>
  // Returning undefined on success continues to the route handler.
  vValidator(target, schema, (result, c) =>
    result.success ? undefined : c.json({ cause: result.issues }, 400),
  );
