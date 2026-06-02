import { getUncachableRevenueCatClient } from "./revenueCatClient.js";
import { listProjects, listApps, listProducts, listEntitlements, listOfferings, listPackages } from "@replit/revenuecat-sdk";

async function main() {
  const client = await getUncachableRevenueCatClient();

  const { data: projects } = await listProjects({ client, query: { limit: 20 } });
  const project = projects?.items?.find((p) => p.name === "Aussie Sports Club Finder");
  if (!project) { console.log("Project not found"); return; }
  console.log("Project:", project.id);

  const { data: apps } = await listApps({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const testApp = apps?.items?.find((a) => a.type === "test_store");
  console.log("Test Store App:", testApp?.id);

  const { data: products } = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });
  console.log("\nProducts:");
  for (const p of products?.items ?? []) {
    const { data: prices } = await client.get<{ object: string; prices: { amount_micros: number; currency: string }[] }>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: p.id },
    });
    console.log(`  ${p.display_name} (${p.store_identifier}) - app: ${p.app_id} - prices: ${JSON.stringify(prices?.prices ?? [])}`);
  }

  const { data: entitlements } = await listEntitlements({ client, path: { project_id: project.id }, query: { limit: 20 } });
  console.log("\nEntitlements:", entitlements?.items?.map((e) => e.lookup_key).join(", "));

  const { data: offerings } = await listOfferings({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const offering = offerings?.items?.find((o) => o.is_current);
  console.log("Current Offering:", offering?.lookup_key, "id:", offering?.id);

  if (offering) {
    const { data: packages } = await listPackages({ client, path: { project_id: project.id, offering_id: offering.id }, query: { limit: 20 } });
    console.log("\nPackages:");
    for (const pkg of packages?.items ?? []) {
      const { data: pkgDetails } = await client.get<{ id: string; lookup_key: string; display_name: string; products: { product_id: string; app_id: string; store_identifier: string }[] }>({
        url: "/projects/{project_id}/packages/{package_id}",
        path: { project_id: project.id, package_id: pkg.id },
      });
      console.log(`  ${pkg.lookup_key} (${pkg.display_name}) - products: ${JSON.stringify(pkgDetails?.products?.map((p) => p.store_identifier) ?? [])}`);
    }
  }
}

main().catch(console.error);
