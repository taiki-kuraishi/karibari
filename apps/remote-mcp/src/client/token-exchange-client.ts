import { Result } from "better-result";
import { z } from "zod";

import {
  ExchangeClientRejectedError,
  ExchangeRequestError,
  ExchangeResponseError,
  ExchangeSecretError,
  ExchangeServerError,
  SubjectTokenRejectedError,
} from "../errors/token-exchange-errors";

const TOKEN_EXCHANGE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:token-exchange";
const ACCESS_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:access_token";

const successSchema = z.object({ access_token: z.string().min(1) });
const errorSchema = z.object({ error: z.string() });

interface TokenExchangeClientConfig {
  clientId: string;
  clientSecret: { get: () => Promise<string> };
  // RFC 8707 resource the exchanged token is issued for.
  resource: string;
  timeoutMs: number;
  tokenUrl: string;
}

// RFC 8693 token exchange against the auth Worker's `POST /oauth2/token`.
export class TokenExchangeClient {
  private readonly config: TokenExchangeClientConfig;

  public constructor(config: TokenExchangeClientConfig) {
    this.config = config;
  }

  public exchange = async (args: { subjectToken: string }) =>
    Result.gen(async function* (this: TokenExchangeClient) {
      // Read the client secret from the Secrets Store
      const secret = yield* await Result.tryPromise({
        try: async () => await this.config.clientSecret.get(),
        catch: (cause) =>
          new ExchangeSecretError({ cause, message: "failed to read the client secret" }),
      });

      // Post the exchange request with client_secret_basic authentication
      const response = yield* await Result.tryPromise({
        try: async () =>
          await fetch(this.config.tokenUrl, {
            body: new URLSearchParams({
              grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
              resource: this.config.resource,
              subject_token: args.subjectToken,
              subject_token_type: ACCESS_TOKEN_TYPE,
            }),
            headers: { authorization: this.basicAuthorization(secret) },
            method: "POST",
            signal: AbortSignal.timeout(this.config.timeoutMs),
          }),
        catch: (cause) =>
          new ExchangeRequestError({ cause, message: "token exchange request failed" }),
      });

      // Turn a refusal into the error kind the route answers differently
      if (!response.ok) {
        return Result.err(await this.toRejection(response));
      }

      // Read the issued token
      const json = yield* await Result.tryPromise({
        try: async () => await response.json(),
        catch: (cause) =>
          new ExchangeResponseError({ cause, message: "token exchange response is not JSON" }),
      });
      const parsed = yield* Result.try({
        try: () => successSchema.parse(json),
        catch: (cause) =>
          new ExchangeResponseError({ cause, message: "token exchange response is malformed" }),
      });

      return Result.ok(parsed.access_token);
    }, this);

  private readonly basicAuthorization = (secret: string) =>
    `Basic ${btoa(`${encodeURIComponent(this.config.clientId)}:${encodeURIComponent(secret)}`)}`;

  private readonly toRejection = async (response: Response) => {
    const body = errorSchema.safeParse(await response.json().catch(() => null));
    const error = body.success ? body.data.error : undefined;

    if (response.status === 400 && error === "invalid_request") {
      return new SubjectTokenRejectedError({ message: "subject_token was rejected by auth" });
    }

    if (
      error === "invalid_client" ||
      error === "unauthorized_client" ||
      error === "invalid_target"
    ) {
      return new ExchangeClientRejectedError({
        error,
        message: `auth refused the exchange client: ${error}`,
      });
    }

    return new ExchangeServerError({
      message: `auth answered ${response.status} to the token exchange`,
      status: response.status,
    });
  };
}
