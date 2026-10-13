import { createApiClient } from "@karibari/api/client";
import { z } from "zod";

import type { McpContext } from "../mcp-context";

import { screensInputSchema, typeInputSchema } from "../version-input-schema";
import { AbstractTool } from "./abstract-tool";

const inputSchema = {
  name: z.string().optional().describe("An optional project name."),
  type: typeInputSchema,
  screens: screensInputSchema,
};

export class CreateProjectTool extends AbstractTool {
  public readonly name = "create_project";
  public readonly title = "Create project";
  public readonly description =
    "Submit HTML screens as a new project with its initial version. Choose type canvas to compare several screens side by side, each in a declared width x height frame (overflow is cut off), or type full to show one screen filling the browser window so it can be operated. Use this for入稿.";
  public readonly inputSchema = inputSchema;

  private readonly context: McpContext;

  public constructor(context: McpContext) {
    super();
    this.context = context;
  }

  protected async execute(args: z.infer<z.ZodObject<typeof inputSchema>>): Promise<string> {
    const client = createApiClient(this.context.apiBaseUrl);
    const response = await client.api.projects.$post(
      { json: { name: args.name, type: args.type, screens: args.screens } },
      { headers: { authorization: `Bearer ${this.context.token}` } },
    );
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    return JSON.stringify(await response.json());
  }
}
