import * as v from "valibot";

// oxlint-disable unicorn/max-nested-calls -- Keep the version shape together in one schema.
// Shared by both submission routes, so every version is checked against the same rules.
export const versionBodySchema = v.pipe(
  v.object({
    type: v.optional(v.picklist(["canvas", "full"]), "canvas"),
    screens: v.pipe(
      v.array(
        v.object({
          html: v.pipe(v.string(), v.nonEmpty()),
          name: v.optional(
            v.pipe(
              v.string(),
              v.trim(),
              v.transform((value) => (value === "" ? null : value)),
            ),
          ),
          width: v.optional(
            v.pipe(v.number(), v.integer(), v.minValue(320), v.maxValue(3840)),
            1440,
          ),
          height: v.optional(
            v.pipe(v.number(), v.integer(), v.minValue(200), v.maxValue(20_000)),
            900,
          ),
        }),
      ),
      v.minLength(1),
      // Also keeps the single screens insert within D1's 100 bound parameters (20 rows x 5 columns).
      v.maxLength(20),
    ),
  }),
  // A full version fills the browser window with one screen, so it cannot hold more.
  v.check(
    ({ type, screens }) => type === "canvas" || screens.length === 1,
    "A full version takes exactly one screen.",
  ),
);
// oxlint-enable unicorn/max-nested-calls
