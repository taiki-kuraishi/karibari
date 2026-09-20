import type { app } from "@karibari/api/server";

import { hc } from "hono/client";
import { z } from "zod";

import type { McpContext } from "../mcp-context";

import { AbstractTool } from "./abstract-tool";

const inputSchema = {
  projectId: z.string().describe("The target project id."),
  versionId: z.string().optional().describe("The version id. Omits to the latest version URL."),
};

export class GetProjectUrlTool extends AbstractTool {
  public readonly name = "get_project_url";
  public readonly title = "Get project URL";
  public readonly description =
    "Get the viewer URL for an owned project. Self-use only: builds /p/:id plus ?v= without invite or signed params.";
  public readonly inputSchema = inputSchema;

  private readonly context: McpContext;

  public constructor(context: McpContext) {
    super();
    this.context = context;
  }

  protected async execute(args: z.infer<z.ZodObject<typeof inputSchema>>): Promise<string> {
    const client = hc<typeof app>(this.context.apiBaseUrl);
    const headers = { authorization: `Bearer ${this.context.token}` };
    const projectResponse = await client.api.projects[":project_id"].$get(
      { param: { project_id: args.projectId } },
      { headers },
    );
    if (!projectResponse.ok) {
      throw new Error(`API responded with ${projectResponse.status}`);
    }
    const sharesResponse = await client.api.projects[":project_id"].shares.$get(
      { param: { project_id: args.projectId } },
      { headers },
    );
    if (!sharesResponse.ok) {
      throw new Error(`API responded with ${sharesResponse.status}`);
    }
    const sharesBody = (await sharesResponse.json()) as { shares: unknown[] };

    const url =
      args.versionId === undefined
        ? `/p/${args.projectId}`
        : `/p/${args.projectId}?v=${args.versionId}`;

    return JSON.stringify({
      projectId: args.projectId,
      shareCount: sharesBody.shares.length,
      url,
      ...(args.versionId === undefined ? {} : { versionId: args.versionId }),
    });
  }
}
