/**
 * OAuth Providers Index
 * Factory para crear proveedores OAuth
 */

import { GoogleOAuthProvider } from "./google";
import type { OAuthProvider, OAuthConfig, OAuthProviderName } from "../types";

/**
 * Factory para crear un proveedor OAuth
 */
export function createOAuthProvider(
  provider: OAuthProviderName,
  config: OAuthConfig
): OAuthProvider {
  switch (provider) {
    case "google":
      return new GoogleOAuthProvider(config);
    case "microsoft":
      // TODO: Implementar Microsoft OAuth Provider
      throw new Error("Microsoft OAuth provider not yet implemented");
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}

export { GoogleOAuthProvider };
export type { OAuthProvider, OAuthConfig, OAuthProviderName };
