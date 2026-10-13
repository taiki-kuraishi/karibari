import type { OAuthProviderExtension } from "@better-auth/oauth-provider";
import type { User } from "better-auth";

import { APIError } from "better-auth/api";

export const tokenExchangeGrantType = "urn:ietf:params:oauth:grant-type:token-exchange";
const accessTokenType = "urn:ietf:params:oauth:token-type:access_token";

// Openid would make the exchanged token valid for userinfo and mint an ID token; offline_access
// Would mint a refresh token. Neither belongs on a short-lived token handed to another service.
const droppedScopes: Record<string, true> = { openid: true, offline_access: true };

// A declaration with an explicit `never` return: only that form narrows control flow at call sites.
function tokenError(args: { description: string; error: string }): never {
  throw new APIError("BAD_REQUEST", { error: args.error, error_description: args.description });
}

const readString = (value: unknown): string | undefined => {
  if (typeof value !== "string" || value === "") {
    return undefined;
  }

  return value;
};

const audiences = (aud: unknown): string[] => {
  if (typeof aud === "string") {
    return [aud];
  }

  if (Array.isArray(aud)) {
    return aud.filter((item) => typeof item === "string");
  }

  return [];
};

// RFC 8693 token exchange: trades an access token whose audience is `sourceAudience` for one whose
// Audience is only `targetAudience`. Only `allowedClientIds` may exchange: DCR lets anyone register
// A client and DCR never links one to the target resource, so the grant alone is no gate. A client
// That exchanges must be linked to the target resource out of band.
export const createTokenExchangeExtension = (args: {
  allowedClientIds: readonly string[];
  sourceAudience: string;
  targetAudience: string;
}): OAuthProviderExtension => ({
  grants: {
    [tokenExchangeGrantType]: async ({ ctx, provider }) => {
      const { client } = await provider.authenticateClient();

      if (!args.allowedClientIds.includes(client.clientId)) {
        tokenError({
          error: "unauthorized_client",
          description: "Client may not use token exchange",
        });
      }

      // `authenticateClient` already rejects a client that lacks this grant (unauthorized_client).

      const body: Record<string, unknown> = ctx.body ?? {};
      const subjectToken = readString(body.subject_token);

      if (subjectToken === undefined) {
        tokenError({ error: "invalid_request", description: "subject_token is required" });
      }

      if (body.subject_token_type !== accessTokenType) {
        tokenError({ error: "invalid_request", description: "Unsupported subject_token_type" });
      }

      if (body.resource !== args.targetAudience) {
        tokenError({ error: "invalid_target", description: "resource must be the API audience" });
      }

      const payload = await Promise.resolve(provider.validateAccessToken(subjectToken)).catch(
        () => undefined,
      );

      if (
        !payload?.active ||
        typeof payload.sub !== "string" ||
        !audiences(payload.aud).includes(args.sourceAudience)
      ) {
        tokenError({
          error: "invalid_request",
          description: "subject_token is not a valid MCP token",
        });
      }

      const user = await ctx.context.adapter.findOne<User>({
        model: "user",
        where: [{ field: "id", value: payload.sub }],
      });

      if (!user) {
        tokenError({
          error: "invalid_request",
          description: "subject_token user no longer exists",
        });
      }

      const subjectScopes = (readString(payload.scope) ?? "")
        .split(/\s+/)
        .filter((scope) => scope !== "" && !(scope in droppedScopes));
      const requestedScope = readString(body.scope);
      let scopes = subjectScopes;

      if (requestedScope !== undefined) {
        scopes = requestedScope.split(/\s+/).filter((scope) => scope !== "");
      }

      if (scopes.some((scope) => !subjectScopes.includes(scope))) {
        tokenError({
          error: "invalid_scope",
          description: "scope exceeds the subject_token's scope",
        });
      }

      // No `confirmation`: a DPoP binding on the subject token must not carry over.
      return provider.issueTokens({
        client,
        scopes,
        user,
        resources: [args.targetAudience],
        tokenResponse: { issued_token_type: accessTokenType },
      });
    },
  },
});
