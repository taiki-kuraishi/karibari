import { createApiClient } from "@karibari/api/client";
import { z } from "zod";

import type { McpContext } from "../mcp-context";

import { AbstractTool } from "./abstract-tool";

const inputSchema = {
  projectId: z.string().describe("The target project id."),
  versionId: z.string().describe("The version id returned by list_screens."),
  screenId: z.string().describe("The screen id returned by list_screens."),
};

export class GetScreenContentTool extends AbstractTool {
  public readonly name = "get_screen_content";
  public readonly title = "Get screen content";
  public readonly description =
    "Read the submitted HTML of one screen. Use list_screens to resolve the version and screen ids first.";
  public readonly inputSchema = inputSchema;

  private readonly context: McpContext;

  public constructor(context: McpContext) {
    super();
    this.context = context;
  }

  protected async execute(args: z.infer<z.ZodObject<typeof inputSchema>>) {
    const client = createApiClient(this.context.apiBaseUrl);
    const response = await client.api.projects[":project_id"].versions[":version_id"].screens[
      ":screen_id"
    ].content.$get(
      {
        param: {
          project_id: args.projectId,
          version_id: args.versionId,
          screen_id: args.screenId,
        },
      },
      { headers: { authorization: `Bearer ${this.context.token}` } },
    );

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }
    return response.text();
  }
}
