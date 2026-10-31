import { parseAsString, parseAsStringLiteral } from "nuqs";

// Nuqs defaults to `replace`; picking a version must be reachable with the back button.
// The comment tab stays on `replace`: flipping a filter is not a step to go back through.
export const projectParams = {
  c: parseAsStringLiteral(["open", "all"] as const).withDefault("open"),
  v: parseAsString.withOptions({ history: "push" }),
};
