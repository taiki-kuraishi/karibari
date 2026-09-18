import { TaggedError } from "better-result";

// oxlint-disable-next-line unicorn/throw-new-error -- TaggedError is a class factory, not a throw expression.
export class AuthUnavailableError extends TaggedError("AuthUnavailableError")<{
  cause: unknown;
  message: string;
}> {}
