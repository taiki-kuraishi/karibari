import { comments } from "./comments";
import { projects } from "./projects";
import { shares } from "./shares";
import { versions } from "./versions";

export * from "./comments";
export * from "./projects";
export * from "./shares";
export * from "./versions";

export const schemas = { projects, versions, comments, shares };
