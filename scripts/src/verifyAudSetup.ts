import { getUncachableRevenueCatClient } from "./revenueCatClient.js";
import { listProjects, listApps, listProducts, listOfferings, listPackages, getProductsFromPackage } from "@replit/revenuecat-sdk";

async function main() {
  const client = await getUncachableRevenueCatClient();

  const { data: projects } = await listProjects({ client, query: { limit: 20 } });
  const project = projects?.items?.find((p) => p.name === "Aussie Sports Club Finder");
  if (!project) { console.log("Project not found"); return; }
  console.log("Project:", project.id);

  const { data: apps } = await listApps({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const testApp = apps?.items?.find((a) => a.type === "test_store");
  if (!testApp) { console.log("Test store app not found"); return; }
  console.log("Test store app:", testApp.id);

  const { data: products } = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });
  const productById = new Map(products?.items?.map((p) => [p.id, p]) ?? []);
  const productByStoreId = new Map(products?.items?.map((p) => [p.store_identifier, p]) ?? []);

  console.log("\nTest store products with prices:");
  for (const p of products?.items ?? []) {
    if (p.app_id !== testApp.id) continue;
    const { data: prices } = await client.get<{ amount: number; amount_micros: number; currency: string }[]>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: p.id },
    });
    const price = prices?.[0];
    console.log(`  ${p.store_identifier}: ${price ? `$${price.amount} ${price.currency}` : "no price"}`);
  }

  const { data: offerings } = await listOfferings({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const offering = offerings?.items?.find((o) => o.is_current);
  if (!offering) { console.log("No current offering"); return; }
  console.log("\nOffering:", offering.lookup_key, "id:", offering.id);

  const { data: packages } = await listPackages({ client, path: { project_id: project.id, offering_id: offering.id }, query: { limit: 20 } });
  console.log("\nPackages:");
  for (const pkg of packages?.items ?? []) {
    const { data: pkgProducts } = await getProductsFromPackage({
      client, path: { project_id: project.id, offering_id: offering.id, package_id: pkg.id },
    });
    console.log(`\n${pkg.lookup_key} (${pkg.display_name}): ${pkgProducts?.items?.length ?? 0} products`);
    for (const pp of pkgProducts?.items ?? []) {
      const prod = productById.get(pp.product_id);
      console.log(`  ${prod?.store_identifier ?? pp.product_id} (app: ${prod?.app_id ?? "?"})`);
    }
  }

  // Verify test store products are in each package
  const expected = {
    "$rc_monthly_club": "club_monthly_aud",
    "$rc_annual_club": "club_annual_aud",
    "$rc_monthly": "player_monthly_aud",
    "$rc_annual": "player_annual_aud",
  };
  console.log("\n--- Verification ---");
  for (const [pkgKey, storeId] of Object.entries(expected)) {
    const pkg = packages?.items?.find((p) => p.lookup_key === pkgKey);
    if (!pkg) { console.log(`MISSING: ${pkgKey} not found`); continue; }
    const { data: pp } = await getProductsFromPackage({
      client, path: { project_id: project.id, offering_id: offering.id, package_id: pkg.id },
    });
    const hasTest = pp?.items?.some((item) => productById.get(item.product_id)?.app_id === testApp.id);
    const hasProd = pp?.items?.some((item) => productById.get(item.product_id)?.store_identifier === storeId);
    console.log(`${pkgKey}: test store product ${hasTest ? "PRESENT" : "MISSING"}, store id ${hasProd ? "PRESENT" : "MISSING"}`);
  }
}

main().catch(console.error);
