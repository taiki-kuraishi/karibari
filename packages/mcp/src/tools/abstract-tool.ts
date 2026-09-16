import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { z, ZodRawShape } from "zod";

// `@modelcontextprotocol/sdk` 1.30.0 turns a thrown handler error into `isError: true`, so
// `execute()` throws instead of mapping errors itself (docs/servers/errors.md).
export abstract class AbstractTool {
  public abstract readonly name: string;
  public abstract readonly title: string;
  public abstract readonly description: string;
  public abstract readonly inputSchema: ZodRawShape;

  public register(server: McpServer): void {
    server.registerTool(
      this.name,
      { description: this.description, inputSchema: this.inputSchema, title: this.title },
      async (args): Promise<CallToolResult> => ({
        content: [{ text: await this.execute(args), type: "text" as const }],
      }),
    );
  }

  protected abstract execute(args: z.infer<z.ZodObject<typeof this.inputSchema>>): Promise<string>;
}
