import { createApiClient } from "@karibari/api/client";
import { z } from "zod";

import type { McpContext } from "../mcp-context";

import { AbstractTool } from "./abstract-tool";

const inputSchema = {
  projectId: z.string().describe("The target project id."),
  versionId: z.string().optional().describe("The version id. Defaults to the latest version."),
};

export class ListScreensTool extends AbstractTool {
  public readonly name = "list_screens";
  public readonly title = "List screens";
  public readonly description =
    "List a version's type and screen ids, names, and dimensions without HTML. Omit versionId for the latest version. Use get_screen_content to read one screen's HTML.";
  public readonly inputSchema = inputSchema;

  private readonly context: McpContext;

  public constructor(context: McpContext) {
    super();
    this.context = context;
  }

  protected async execute(args: z.infer<z.ZodObject<typeof inputSchema>>) {
    const client = createApiClient(this.context.apiBaseUrl);
    const versionsResponse = await client.api.projects[":project_id"].versions.$get(
      { param: { project_id: args.projectId } },
      { headers: { authorization: `Bearer ${this.context.token}` } },
    );

    if (!versionsResponse.ok) {
      throw new Error(`API responded with ${versionsResponse.status}`);
    }
    const { versions } = await versionsResponse.json();
    let version = versions.at(-1);

    if (args.versionId !== undefined) {
      version = versions.find((entry) => entry.id === args.versionId);
    }

    if (!version) {
      throw new Error("Version not found");
    }
    const response = await client.api.projects[":project_id"].versions[":version_id"].screens.$get(
      { param: { project_id: args.projectId, version_id: version.id } },
      { headers: { authorization: `Bearer ${this.context.token}` } },
    );

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }
    const { screens } = await response.json();
    return JSON.stringify({ versionId: version.id, type: version.type, screens });
  }
}
