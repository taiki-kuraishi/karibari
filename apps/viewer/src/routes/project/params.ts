import { parseAsString } from "nuqs";

// Nuqs defaults to `replace`; picking a version must be reachable with the back button.
export const projectParams = {
  v: parseAsString.withOptions({ history: "push" }),
};
