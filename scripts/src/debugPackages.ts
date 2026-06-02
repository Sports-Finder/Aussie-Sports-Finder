import { getUncachableRevenueCatClient } from "./revenueCatClient.js";
import {
  listProjects, listApps, listProducts, listOfferings, listPackages,
  getProductsFromPackage, type Package,
} from "@replit/revenuecat-sdk";

async function main() {
  const client = await getUncachableRevenueCatClient();

  const { data: projects } = await listProjects({ client, query: { limit: 20 } });
  const project = projects?.items?.find((p) => p.name === "Aussie Sports Club Finder");
  if (!project) { console.log("Project not found"); return; }

  const { data: apps } = await listApps({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const testApp = apps?.items?.find((a) => a.type === "test_store");
  if (!testApp) { console.log("Test store app not found"); return; }

  const { data: products } = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });
  const { data: offerings } = await listOfferings({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const offering = offerings?.items?.find((o) => o.is_current);
  if (!offering) { console.log("No current offering"); return; }

  const { data: packages } = await listPackages({ client, path: { project_id: project.id, offering_id: offering.id }, query: { limit: 20 } });

  for (const pkg of packages?.items ?? []) {
    const { data: pkgProducts } = await getProductsFromPackage({
      client, path: { project_id: project.id, offering_id: offering.id, package_id: pkg.id },
    });
    console.log(`\n${pkg.lookup_key} (${pkg.display_name}): ${pkgProducts?.items?.length ?? 0} products`);
    for (const p of pkgProducts?.items ?? []) {
      const product = products?.items?.find((pi) => pi.id === p.product_id);
      console.log(`  ${product?.store_identifier ?? p.product_id} (app: ${product?.app_id ?? "?"})`);
    }
  }
}

main().catch(console.error);
