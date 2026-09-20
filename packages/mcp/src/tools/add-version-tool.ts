import type { app } from "@karibari/api/server";

import { hc } from "hono/client";
import { z } from "zod";

import type { McpContext } from "../mcp-context";

import { AbstractTool } from "./abstract-tool";

const inputSchema = {
  html: z.string().describe("The HTML to save as a new version."),
  projectId: z.string().describe("The target project id."),
};

export class AddVersionTool extends AbstractTool {
  public readonly name = "add_version";
  public readonly title = "Add version";
  public readonly description =
    "Save HTML as a new version of an existing project. Use this for編集; versions are immutable.";
  public readonly inputSchema = inputSchema;

  private readonly context: McpContext;

  public constructor(context: McpContext) {
    super();
    this.context = context;
  }

  protected async execute(args: z.infer<z.ZodObject<typeof inputSchema>>): Promise<string> {
    const client = hc<typeof app>(this.context.apiBaseUrl);
    const response = await client.api.projects[":project_id"].versions.$post(
      { json: { html: args.html }, param: { project_id: args.projectId } },
      { headers: { authorization: `Bearer ${this.context.token}` } },
    );
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    return JSON.stringify(await response.json());
  }
}
