import { getUncachableRevenueCatClient } from "./revenueCatClient.js";
import { listProjects, listApps, listProducts, deleteProduct } from "@replit/revenuecat-sdk";

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

  const { data: existingProducts } = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });
  const oldIdentifiers = ["club_monthly", "club_annual", "player_monthly", "player_annual"];

  for (const oldId of oldIdentifiers) {
    const oldProduct = existingProducts?.items?.find((p) => p.store_identifier === oldId && p.app_id === testApp.id);
    if (!oldProduct) {
      console.log(`Old product ${oldId} not found in test store`);
      continue;
    }
    console.log(`Deleting old product ${oldId} (${oldProduct.id})`);
    const { error: delError } = await deleteProduct({
      client, path: { project_id: project.id, product_id: oldProduct.id },
    });
    if (delError) {
      console.warn(`Could not delete old product ${oldId}:`, JSON.stringify(delError));
    } else {
      console.log(`Deleted old product ${oldId}`);
    }
  }
}

main().catch(console.error);
