import { z } from "zod";

// Mirrors the API's per-field limits, so they reach the model through the JSON schema.
// The rule that full takes exactly one screen spans two fields; only the descriptions carry it.
export const typeInputSchema = z
  .enum(["canvas", "full"])
  .optional()
  .describe(
    "How the viewer shows the version. canvas (default) lays 1 to 20 screens side by side on a pan-and-zoom canvas, each in a frame of its declared width x height; content beyond the frame is cut off. full shows exactly 1 screen filling the browser window, where it can be scrolled and operated like a real page.",
  );

export const screensInputSchema = z
  .array(
    z.object({
      html: z.string().min(1).describe("A complete HTML document for this screen."),
      name: z.string().optional().describe("An optional screen name, such as Top or Pricing."),
      width: z
        .number()
        .int()
        .min(320)
        .max(3840)
        .optional()
        .describe("The frame width in px on the canvas, 320 to 3840. Defaults to 1440."),
      height: z
        .number()
        .int()
        .min(200)
        .max(20_000)
        .optional()
        .describe(
          "The frame height in px on the canvas, 200 to 20000. Defaults to 900. Declare the full height of the content, since anything below is cut off.",
        ),
    }),
  )
  .min(1)
  .max(20)
  .describe("The version's screens in display order: 1 to 20 for canvas, exactly 1 for full.");
