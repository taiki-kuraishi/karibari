import type { MetaDb } from "@karibari/db";

import { factory, later } from "@factory-js/factory";
import { comments } from "@karibari/db";

import type { FactoryProps, FactoryReturn } from "../type";

import { fakeUnixTimestamp, fk } from "../faker";
import { createVersionsFactory } from "./versions-factory";

export const createCommentsFactory = (db: MetaDb) =>
  factory
    .define<FactoryProps<"comments">, FactoryReturn<"comments">>(
      {
        props: {
          id: () => fk.string.uuid(),
          project_id: later<string>(),
          version_id: later<string>(),
          parent_id: () => null,
          screen_id: () => null,
          author: () => fk.string.uuid(),
          source: () => "mcp" as const,
          target: () => `#${fk.string.alpha(8)}`,
          body: () => fk.lorem.sentence(),
          created_at: () => fakeUnixTimestamp(),
          updated_at: () => null,
          resolved_at: () => null,
        },
        vars: {},
      },
      async (props) => await db.insert(comments).values(props).returning().get(),
    )
    .props({
      version_id: async () => {
        const version = await createVersionsFactory(db).create();

        return version.id;
      },
      project_id: async ({ props }) => {
        const versionId = await props.version_id;
        const version = await db.query.versions.findFirst({
          columns: { project_id: true },
          where: (table, { eq }) => eq(table.id, versionId),
        });
        if (!version) {
          throw new Error(`Version ${versionId} was not created`);
        }

        return version.project_id;
      },
    });
