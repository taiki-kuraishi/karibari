import { createApiClient } from "@karibari/api/client";
import { z } from "zod";

import type { McpContext } from "../mcp-context";

import { screensInputSchema, typeInputSchema } from "../version-input-schema";
import { AbstractTool } from "./abstract-tool";

const inputSchema = {
  projectId: z.string().describe("The target project id."),
  type: typeInputSchema,
  screens: screensInputSchema,
};

export class AddVersionTool extends AbstractTool {
  public readonly name = "add_version";
  public readonly title = "Add version";
  public readonly description =
    "Save HTML screens as a new version of an existing project. Choose type canvas to compare several screens side by side, each in a declared width x height frame (overflow is cut off), or type full to show one screen filling the browser window so it can be operated. Send every screen the version should show, since versions are immutable and share nothing with earlier ones. Use this for編集.";
  public readonly inputSchema = inputSchema;

  private readonly context: McpContext;

  public constructor(context: McpContext) {
    super();
    this.context = context;
  }

  protected async execute(args: z.infer<z.ZodObject<typeof inputSchema>>): Promise<string> {
    const client = createApiClient(this.context.apiBaseUrl);
    const response = await client.api.projects[":project_id"].versions.$post(
      { json: { type: args.type, screens: args.screens }, param: { project_id: args.projectId } },
      { headers: { authorization: `Bearer ${this.context.token}` } },
    );
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    return JSON.stringify(await response.json());
  }
}
