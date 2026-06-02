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

  const p = products?.items?.find((pi) => pi.store_identifier === "club_monthly_aud" && pi.app_id === testApp.id);
  if (!p) { console.log("Product not found"); return; }

  console.log("Product:", JSON.stringify(p, null, 2));

  // Try to fetch test store prices using raw client
  const { data: prices, error: priceError } = await client.get<any>({
    url: "/projects/{project_id}/products/{product_id}/test_store_prices",
    path: { project_id: project.id, product_id: p.id },
  });
  console.log("\nPrice response:", JSON.stringify(prices, null, 2));
  if (priceError) console.log("Price error:", JSON.stringify(priceError, null, 2));
}

main().catch(console.error);
