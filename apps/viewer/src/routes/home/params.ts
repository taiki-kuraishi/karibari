import { parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs";

export const sortKeys = ["updated", "created", "name"] as const;

// Moving between pages and picking a sort order must be reachable with the back button.
export const homeParams = {
  page: parseAsInteger.withDefault(1).withOptions({ history: "push" }),
  q: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(sortKeys).withDefault("updated").withOptions({ history: "push" }),
};
