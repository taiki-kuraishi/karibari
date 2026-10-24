import { createApiClient } from "@karibari/api/client";
import { z } from "zod";

import type { McpContext } from "../mcp-context";

import { AbstractTool } from "./abstract-tool";

const inputSchema = {
  projectId: z.string().describe("The target project id."),
};

export class ListVersionsTool extends AbstractTool {
  public readonly name = "list_versions";
  public readonly title = "List versions";
  public readonly description =
    "List a project's versions in creation order. Use this to resolve a version id before " +
    "reading its comments or screens.";
  public readonly inputSchema = inputSchema;

  private readonly context: McpContext;

  public constructor(context: McpContext) {
    super();
    this.context = context;
  }

  protected async execute(args: z.infer<z.ZodObject<typeof inputSchema>>): Promise<string> {
    const client = createApiClient(this.context.apiBaseUrl);
    const response = await client.api.projects[":project_id"].versions.$get(
      { param: { project_id: args.projectId } },
      { headers: { authorization: `Bearer ${this.context.token}` } },
    );
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    return JSON.stringify(await response.json());
  }
}
