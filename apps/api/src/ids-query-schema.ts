import * as v from "valibot";

const id = v.pipe(v.string(), v.nonEmpty());
const idOrIds = v.union([id, v.array(id)]);

// Hono hands a query key over as a string when it appears once and as an array when it repeats.
// The cap keeps a batch query (owner + ids) within D1's 100 bound parameters.
export const idsSchema = v.pipe(
  idOrIds,
  v.transform((value) => (typeof value === "string" ? [value] : value)),
  v.maxLength(50),
);
