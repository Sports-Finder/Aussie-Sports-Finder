import { getUncachableRevenueCatClient } from "./revenueCatClient.js";
import { listProjects, listOfferings, listPackages, getProductsFromPackage } from "@replit/revenuecat-sdk";

async function main() {
  const client = await getUncachableRevenueCatClient();

  const { data: projects } = await listProjects({ client, query: { limit: 20 } });
  const project = projects?.items?.find((p) => p.name === "Aussie Sports Club Finder");
  if (!project) { console.log("Project not found"); return; }

  const { data: offerings } = await listOfferings({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const offering = offerings?.items?.find((o) => o.is_current);
  if (!offering) { console.log("No current offering"); return; }

  const { data: packages } = await listPackages({ client, path: { project_id: project.id, offering_id: offering.id }, query: { limit: 20 } });

  for (const pkg of packages?.items ?? []) {
    const { data: pp, error } = await getProductsFromPackage({
      client, path: { project_id: project.id, offering_id: offering.id, package_id: pkg.id },
    });
    console.log(`\n${pkg.lookup_key} products:`);
    console.log("  raw:", JSON.stringify(pp, null, 2));
    if (error) console.log("  error:", JSON.stringify(error, null, 2));
  }
}

main().catch(console.error);
