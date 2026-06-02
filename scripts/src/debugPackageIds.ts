import { getUncachableRevenueCatClient } from "./revenueCatClient.js";
import { listProjects, listApps, listProducts, listOfferings, listPackages, getProductsFromPackage } from "@replit/revenuecat-sdk";

async function main() {
  const client = await getUncachableRevenueCatClient();

  const { data: projects } = await listProjects({ client, query: { limit: 20 } });
  const project = projects?.items?.find((p) => p.name === "Aussie Sports Club Finder");
  if (!project) { console.log("Project not found"); return; }

  const { data: apps } = await listApps({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const testApp = apps?.items?.find((a) => a.type === "test_store");
  const appStore = apps?.items?.find((a) => a.type === "app_store");
  const playStore = apps?.items?.find((a) => a.type === "play_store");

  const { data: products } = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });
  const productById = new Map(products?.items?.map((p) => [p.id, p]) ?? []);

  const { data: offerings } = await listOfferings({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const offering = offerings?.items?.find((o) => o.is_current);
  if (!offering) { console.log("No current offering"); return; }

  const { data: packages } = await listPackages({ client, path: { project_id: project.id, offering_id: offering.id }, query: { limit: 20 } });

  for (const pkg of packages?.items ?? []) {
    const { data: pp } = await getProductsFromPackage({
      client, path: { project_id: project.id, offering_id: offering.id, package_id: pkg.id },
    });
    console.log(`\n${pkg.lookup_key} (${pkg.display_name}):`);
    for (const item of pp?.items ?? []) {
      const p = productById.get(item.product_id);
      const appName = p?.app_id === testApp?.id ? "test" : p?.app_id === appStore?.id ? "ios" : p?.app_id === playStore?.id ? "android" : "unknown";
      console.log(`  ${item.product_id} -> ${p?.store_identifier ?? "NOT FOUND"} (app: ${appName})`);
    }
  }

  console.log("\n--- Test store product IDs ---");
  for (const p of products?.items ?? []) {
    if (p.app_id === testApp?.id) {
      console.log(`  ${p.store_identifier}: ${p.id}`);
    }
  }
}

main().catch(console.error);
