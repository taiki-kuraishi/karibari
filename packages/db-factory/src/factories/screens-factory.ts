import type { MetaDb } from "@karibari/db";

import { factory, later } from "@factory-js/factory";
import { screens } from "@karibari/db";

import type { FactoryProps, FactoryReturn } from "../type";

import { fk } from "../faker";
import { createVersionsFactory } from "./versions-factory";

export const createScreensFactory = (db: MetaDb) =>
  factory
    .define<FactoryProps<"screens">, FactoryReturn<"screens">>(
      {
        props: {
          id: () => fk.string.uuid(),
          version_id: later<string>(),
          name: () => fk.word.noun(),
          width: () => 1440,
          height: () => 900,
        },
        vars: {},
      },
      async (props) => await db.insert(screens).values(props).returning().get(),
    )
    .props({
      version_id: async () => {
        const version = await createVersionsFactory(db).create();

        return version.id;
      },
    });
