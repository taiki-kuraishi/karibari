import { createApiClient } from "@karibari/api/client";
import { z } from "zod";

import type { McpContext } from "../mcp-context";

import { AbstractTool } from "./abstract-tool";

const inputSchema = {
  projectId: z.string().describe("The target project id."),
  versionId: z.string().describe("The version id returned by list_versions."),
};

export class ListCommentsTool extends AbstractTool {
  public readonly name = "list_comments";
  public readonly title = "List comments";
  public readonly description = "List a version's comments. Use this forコメント取得.";
  public readonly inputSchema = inputSchema;

  private readonly context: McpContext;

  public constructor(context: McpContext) {
    super();
    this.context = context;
  }

  protected async execute(args: z.infer<z.ZodObject<typeof inputSchema>>): Promise<string> {
    const client = createApiClient(this.context.apiBaseUrl);
    const response = await client.api.projects[":project_id"].versions[":version_id"].comments.$get(
      { param: { project_id: args.projectId, version_id: args.versionId } },
      { headers: { authorization: `Bearer ${this.context.token}` } },
    );
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    return JSON.stringify(await response.json());
  }
}
