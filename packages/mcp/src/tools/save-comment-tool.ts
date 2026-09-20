import type { app } from "@karibari/api/server";

import { hc } from "hono/client";
import { z } from "zod";

import type { McpContext } from "../mcp-context";

import { AbstractTool } from "./abstract-tool";

const inputSchema = {
  body: z.string().describe("The comment text."),
  projectId: z.string().describe("The target project id."),
  target: z.string().describe("An opaque element selector within the version."),
  versionId: z.string().describe("The target version id."),
};

export class SaveCommentTool extends AbstractTool {
  public readonly name = "save_comment";
  public readonly title = "Save comment";
  public readonly description =
    "Save an element-level comment on a version. Use this forコメント保存.";
  public readonly inputSchema = inputSchema;

  private readonly context: McpContext;

  public constructor(context: McpContext) {
    super();
    this.context = context;
  }

  protected async execute(args: z.infer<z.ZodObject<typeof inputSchema>>): Promise<string> {
    const client = hc<typeof app>(this.context.apiBaseUrl);
    const response = await client.api.projects[":project_id"].comments.$post(
      {
        json: { body: args.body, target: args.target, versionId: args.versionId },
        param: { project_id: args.projectId },
      },
      { headers: { authorization: `Bearer ${this.context.token}` } },
    );
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    return JSON.stringify(await response.json());
  }
}
