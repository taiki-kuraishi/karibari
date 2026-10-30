import { createApiClient } from "@karibari/api/client";
import { z } from "zod";

import type { McpContext } from "../mcp-context";

import { AbstractTool } from "./abstract-tool";

const inputSchema = {
  body: z.string().describe("The reply text."),
  commentId: z
    .string()
    .describe("The thread's first comment id (parent_id null) from list_comments."),
  projectId: z.string().describe("The target project id."),
  versionId: z.string().describe("The version id returned by list_versions."),
};

export class ReplyCommentTool extends AbstractTool {
  public readonly name = "reply_comment";
  public readonly title = "Reply to comment";
  public readonly description =
    "Reply to a comment thread. Replies attach only to a thread's first comment and inherit its target.";
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
    const response = await comment.replies.$post(
      {
        json: { body: args.body },
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
