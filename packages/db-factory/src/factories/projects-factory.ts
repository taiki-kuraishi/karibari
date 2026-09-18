import type { MetaDb } from "@karibari/db";

import { factory, later } from "@factory-js/factory";
import { projects } from "@karibari/db";

import type { FactoryProps, FactoryReturn } from "../type";

import { fakeUnixTimestamp, fk } from "../faker";

export const createProjectsFactory = (db: MetaDb) =>
  factory
    .define<FactoryProps<"projects">, FactoryReturn<"projects">>(
      {
        props: {
          id: () => fk.string.uuid(),
          name: () => fk.company.name(),
          owner: () => fk.string.uuid(),
          created_at: () => fakeUnixTimestamp(),
          updated_at: later<number>(),
        },
        vars: {},
      },
      async (props) => await db.insert(projects).values(props).returning().get(),
    )
    .props({ updated_at: async ({ props }) => await props.created_at });
