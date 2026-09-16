import { z } from "zod";

import { AbstractTool } from "./abstract-tool";

const inputSchema = {
  a: z.number().describe("The first addend."),
  b: z.number().describe("The second addend."),
};

export class AddTool extends AbstractTool {
  public readonly name = "add";
  public readonly title = "Add two numbers";
  public readonly description =
    "Add two numbers and return their sum. Use this for plain arithmetic on values the " +
    "caller has already resolved; the tool reads and writes nothing outside its arguments.";
  public readonly inputSchema = inputSchema;

  // oxlint-disable-next-line class-methods-use-this -- abstract contract requires an instance method
  protected async execute(args: z.infer<z.ZodObject<typeof inputSchema>>): Promise<string> {
    const { a, b } = args;

    return `${String(a)} + ${String(b)} = ${String(a + b)}`;
  }
}
