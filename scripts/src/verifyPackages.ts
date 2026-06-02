import { getUncachableRevenueCatClient } from "./revenueCatClient.js";
import { listProjects, listApps, listProducts, listOfferings, listPackages } from "@replit/revenuecat-sdk";

async function main() {
  const client = await getUncachableRevenueCatClient();

  const { data: projects } = await listProjects({ client, query: { limit: 20 } });
  const project = projects?.items?.find((p) => p.name === "Aussie Sports Club Finder");
  if (!project) { console.log("Project not found"); return; }

  const { data: apps } = await listApps({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const testApp = apps?.items?.find((a) => a.type === "test_store");
  if (!testApp) { console.log("Test store app not found"); return; }

  const { data: products } = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });
  console.log("Test store products:");
  for (const p of products?.items ?? []) {
    if (p.app_id !== testApp.id) continue;
    console.log(`  ${p.store_identifier} (${p.display_name}) - id: ${p.id}`);
  }

  const { data: offerings } = await listOfferings({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const offering = offerings?.items?.find((o) => o.is_current);
  if (!offering) { console.log("No current offering"); return; }

  const { data: packages } = await listPackages({ client, path: { project_id: project.id, offering_id: offering.id }, query: { limit: 20 } });
  console.log("\nPackages in current offering:");
  for (const pkg of packages?.items ?? []) {
    const { data: pkgDetails } = await client.get<{
      id: string; lookup_key: string; display_name: string;
      products: { product_id: string; app_id: string; store_identifier: string; display_name: string }[];
    }>({
      url: "/projects/{project_id}/packages/{package_id}",
      path: { project_id: project.id, package_id: pkg.id },
    });
    console.log(`\n${pkg.lookup_key} (${pkg.display_name}):`);
    for (const prod of pkgDetails?.products ?? []) {
      console.log(`  ${prod.store_identifier} - ${prod.display_name} (app: ${prod.app_id})`);
    }
  }
}

main().catch(console.error);
