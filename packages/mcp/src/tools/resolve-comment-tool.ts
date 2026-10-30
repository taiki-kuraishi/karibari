import { createApiClient } from "@karibari/api/client";
import { z } from "zod";

import type { McpContext } from "../mcp-context";

import { AbstractTool } from "./abstract-tool";

const inputSchema = {
  commentId: z
    .string()
    .describe("The thread's first comment id (parent_id null) from list_comments."),
  projectId: z.string().describe("The target project id."),
  resolved: z.boolean().describe("true resolves the thread; false reopens it."),
  versionId: z.string().describe("The version id returned by list_versions."),
};

export class ResolveCommentTool extends AbstractTool {
  public readonly name = "resolve_comment";
  public readonly title = "Resolve comment";
  public readonly description =
    "Resolve or reopen a comment thread, e.g. after fixing what it asked for. Applies to a thread's first comment only.";
  public readonly inputSchema = inputSchema;

  private readonly context: McpContext;

  public constructor(context: McpContext) {
    super();
    this.context = context;
  }

  protected async execute(args: z.infer<z.ZodObject<typeof inputSchema>>): Promise<string> {
    const client = createApiClient(this.context.apiBaseUrl);
    const comment =
      client.api.projects[":project_id"].versions[":version_id"].comments[":comment_id"];
    const response = await comment.resolution.$patch(
      {
        json: { resolved: args.resolved },
        param: {
          comment_id: args.commentId,
          project_id: args.projectId,
          version_id: args.versionId,
        },
      },
      { headers: { authorization: `Bearer ${this.context.token}` } },
    );
    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    return JSON.stringify(await response.json());
  }
}
