import { apiBaseUrl, cleanEnvValue } from "../config/env.ts";
import type { Provider, ProviderCredentials, ProviderDefinition } from "../types/oauth.ts";
import { facebook } from "./facebook.ts";
import { github } from "./github.ts";
import { linkedin } from "./linkedin.ts";
import { x } from "./x.ts";
import { youtube } from "./youtube.ts";

export const PROVIDERS = { youtube, github, facebook, x, linkedin } satisfies Record<string, ProviderDefinition>;

export const CONNECT_PROVIDERS = Object.keys(PROVIDERS) as Provider[];

const PROVIDER_BY_ALIAS = new Map<string, Provider>(
  CONNECT_PROVIDERS.flatMap((provider) => PROVIDERS[provider].aliases.map((alias) => [alias, provider] as const)),
);

export function resolveProvider(alias: string): Provider | undefined {
  return PROVIDER_BY_ALIAS.get(alias.toLowerCase());
}

export function providerCredentials(provider: Provider): ProviderCredentials {
  const prefix = PROVIDERS[provider].credentialEnvPrefix;
  return {
    clientId: cleanEnvValue(process.env[`${prefix}_CLIENT_ID`]),
    clientSecret: cleanEnvValue(process.env[`${prefix}_CLIENT_SECRET`]),
  };
}

export function isConfigured(provider: Provider): boolean {
  const { clientId, clientSecret } = providerCredentials(provider);
  return Boolean(clientId && clientSecret);
}

export function callbackUri(provider: Provider): string {
  const prefix = provider.toUpperCase();
  return (
    process.env[`CHATAPP_${prefix}_REDIRECT_URI`] ||
    process.env[`PUBLIC_${prefix}_REDIRECT_URI`] ||
    `${apiBaseUrl()}/chatapp/connect/${provider}/callback`
  );
}

export function providerScope(provider: Provider): string {
  const definition = PROVIDERS[provider];
  return process.env[`${definition.credentialEnvPrefix}_SCOPES`] || definition.defaultScope;
}
