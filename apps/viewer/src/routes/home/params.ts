import { parseAsInteger } from "nuqs";

// Nuqs defaults to `replace`; moving between pages must be reachable with the back button.
export const homeParams = {
  page: parseAsInteger.withDefault(1).withOptions({ history: "push" }),
};
