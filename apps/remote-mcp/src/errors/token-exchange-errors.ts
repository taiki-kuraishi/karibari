import { TaggedError } from "better-result";

// oxlint-disable-next-line unicorn/throw-new-error -- TaggedError is a class factory, not a throw expression.
export class SubjectTokenRejectedError extends TaggedError("SubjectTokenRejectedError")<{
  message: string;
}> {}

// The exchange client itself is refused (`invalid_client`, `unauthorized_client`, `invalid_target`).
// Re-authenticating the user cannot fix it, so it must not become a challenge.
// oxlint-disable-next-line unicorn/throw-new-error -- TaggedError is a class factory, not a throw expression.
export class ExchangeClientRejectedError extends TaggedError("ExchangeClientRejectedError")<{
  error: string;
  message: string;
}> {}

// oxlint-disable-next-line unicorn/throw-new-error -- TaggedError is a class factory, not a throw expression.
export class ExchangeServerError extends TaggedError("ExchangeServerError")<{
  status: number;
  message: string;
}> {}

// oxlint-disable-next-line unicorn/throw-new-error -- TaggedError is a class factory, not a throw expression.
export class ExchangeRequestError extends TaggedError("ExchangeRequestError")<{
  cause: unknown;
  message: string;
}> {}

// oxlint-disable-next-line unicorn/throw-new-error -- TaggedError is a class factory, not a throw expression.
export class ExchangeResponseError extends TaggedError("ExchangeResponseError")<{
  cause: unknown;
  message: string;
}> {}

// oxlint-disable-next-line unicorn/throw-new-error -- TaggedError is a class factory, not a throw expression.
export class ExchangeSecretError extends TaggedError("ExchangeSecretError")<{
  cause: unknown;
  message: string;
}> {}
