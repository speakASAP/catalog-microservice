import type { Product } from "@/lib/api/products";
import type { User } from "@/lib/api/auth";

type AuthUserWithAliases = User & {
  sub?: string | null;
};

const adminRoles = new Set([
  "global:superadmin",
  "global:platform_admin",
  "app:catalog-microservice:admin",
  "internal:catalog-microservice:admin",
]);

export function isCatalogAdmin(user?: User | null) {
  return Boolean(
    user?.isAdmin ||
      user?.roles?.some((role) => adminRoles.has(role) || role.includes("catalog-microservice:admin")),
  );
}

export function getCatalogUserIdentifiers(user?: User | null) {
  if (!user) return new Set<string>();
  const userWithAliases = user as AuthUserWithAliases;
  return new Set(
    [userWithAliases.id, userWithAliases.sub, userWithAliases.email]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean),
  );
}

export function canMutateCatalogProduct(product: Product, user?: User | null) {
  if (isCatalogAdmin(user)) return true;
  if (!product.ownerUserId) return false;
  return getCatalogUserIdentifiers(user).has(product.ownerUserId);
}
