import type { MetaDb } from "@karibari/db";

import { factory, later } from "@factory-js/factory";
import { shares } from "@karibari/db";

import type { FactoryProps, FactoryReturn } from "../type";

import { fk } from "../faker";
import { createProjectsFactory } from "./projects-factory";

export const createSharesFactory = (db: MetaDb) =>
  factory
    .define<FactoryProps<"shares">, FactoryReturn<"shares">>(
      {
        props: {
          id: () => fk.string.uuid(),
          project_id: later<string>(),
          kind: () => "private",
          token: () => null,
          key_id: () => null,
        },
        vars: {},
      },
      async (props) => await db.insert(shares).values(props).returning().get(),
    )
    .props({
      project_id: async () => {
        const project = await createProjectsFactory(db).create();

        return project.id;
      },
    });
