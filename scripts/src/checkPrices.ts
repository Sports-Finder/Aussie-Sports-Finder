import { getUncachableRevenueCatClient } from "./revenueCatClient.js";
import { listProjects, listApps, listProducts } from "@replit/revenuecat-sdk";

async function main() {
  const client = await getUncachableRevenueCatClient();

  const { data: projects } = await listProjects({ client, query: { limit: 20 } });
  const project = projects?.items?.find((p) => p.name === "Aussie Sports Club Finder");
  if (!project) { console.log("Project not found"); return; }

  const { data: apps } = await listApps({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const testApp = apps?.items?.find((a) => a.type === "test_store");
  if (!testApp) { console.log("Test store app not found"); return; }

  const { data: products } = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });

  for (const p of products?.items ?? []) {
    if (p.app_id !== testApp.id) continue;
    const { data: prices } = await client.get<{ object: string; prices: { amount_micros: number; currency: string }[] }>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: p.id },
    });
    console.log(`${p.store_identifier} - ${p.display_name}:`);
    console.log(`  prices: ${JSON.stringify(prices?.prices ?? [])}`);
  }
}

main().catch(console.error);
