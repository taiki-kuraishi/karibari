import type { app } from "@karibari/api/server";

import { hc } from "hono/client";
import { z } from "zod";

import type { McpContext } from "../mcp-context";

import { AbstractTool } from "./abstract-tool";

const inputSchema = {
  html: z.string().describe("The HTML to submit as the initial version."),
  name: z.string().optional().describe("An optional project name."),
};

export class CreateProjectTool extends AbstractTool {
  public readonly name = "create_project";
  public readonly title = "Create project";
  public readonly description =
    "Submit HTML as a new project with its initial version. Use this for入稿.";
  public readonly inputSchema = inputSchema;

  private readonly context: McpContext;

  public constructor(context: McpContext) {
    super();
    this.context = context;
  }

  protected async execute(args: z.infer<z.ZodObject<typeof inputSchema>>): Promise<string> {
    const client = hc<typeof app>(this.context.apiBaseUrl);
    const response = await client.api.projects.$post(
      { json: { html: args.html, name: args.name } },
      { headers: { authorization: `Bearer ${this.context.token}` } },
    );
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    return JSON.stringify(await response.json());
  }
}
