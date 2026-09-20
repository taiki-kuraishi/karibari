import type { app } from "@karibari/api/server";

import { hc } from "hono/client";

import type { McpContext } from "../mcp-context";

import { AbstractTool } from "./abstract-tool";

const inputSchema = {};

export class ListProjectsTool extends AbstractTool {
  public readonly name = "list_projects";
  public readonly title = "List projects";
  public readonly description =
    "List the caller's projects. Use this to resolve a project before reading " +
    "its versions, comments, or shares.";
  public readonly inputSchema = inputSchema;

  private readonly context: McpContext;

  public constructor(context: McpContext) {
    super();
    this.context = context;
  }

  protected async execute(): Promise<string> {
    const client = hc<typeof app>(this.context.apiBaseUrl);
    const response = await client.api.projects.$get({
      header: { authorization: `Bearer ${this.context.token}` },
    });
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    return JSON.stringify(await response.json());
  }
}
