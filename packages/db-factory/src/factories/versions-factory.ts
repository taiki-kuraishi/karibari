import type { MetaDb } from "@karibari/db";

import { factory, later } from "@factory-js/factory";
import { versions } from "@karibari/db";

import type { FactoryProps, FactoryReturn } from "../type";

import { fakeUnixTimestamp, fk } from "../faker";
import { createProjectsFactory } from "./projects-factory";

export const createVersionsFactory = (db: MetaDb) =>
  factory
    .define<FactoryProps<"versions">, FactoryReturn<"versions">>(
      {
        props: {
          id: () => fk.string.uuid(),
          project_id: later<string>(),
          created_at: () => fakeUnixTimestamp(),
        },
        vars: {},
      },
      async (props) => await db.insert(versions).values(props).returning().get(),
    )
    .props({
      project_id: async () => {
        const project = await createProjectsFactory(db).create();

        return project.id;
      },
    });
