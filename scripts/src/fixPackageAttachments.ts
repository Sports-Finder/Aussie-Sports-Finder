import { getUncachableRevenueCatClient } from "./revenueCatClient.js";
import {
  listProjects, listApps, listProducts, listEntitlements, listOfferings, listPackages,
  attachProductsToPackage, type Package,
} from "@replit/revenuecat-sdk";

const AUD_MAP = {
  "$rc_monthly_club": "club_monthly_aud",
  "$rc_annual_club": "club_annual_aud",
  "$rc_monthly": "player_monthly_aud",
  "$rc_annual": "player_annual_aud",
};

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

  for (const [pkgKey, prodId] of Object.entries(AUD_MAP)) {
    const pkg = packages?.items?.find((p) => p.lookup_key === pkgKey) as Package | undefined;
    if (!pkg) { console.warn(`Package ${pkgKey} not found`); continue; }

    const product = products?.items?.find((p) => p.store_identifier === prodId && p.app_id === testApp.id);
    if (!product) { console.warn(`Product ${prodId} not found`); continue; }

    const { error: attachError } = await attachProductsToPackage({
      client, path: { project_id: project.id, package_id: pkg.id },
      body: { products: [{ product_id: product.id, eligibility_criteria: "all" }] },
    });
    if (attachError) {
      const errObj = attachError as unknown as Record<string, unknown>;
      if (errObj["type"] === "unprocessable_entity_error") {
        console.log(`Already attached ${prodId} to ${pkgKey}`);
      } else {
        console.warn(`Error attaching ${prodId} to ${pkgKey}:`, JSON.stringify(attachError));
      }
    } else {
      console.log(`Attached ${prodId} to ${pkgKey}`);
    }
  }

  // Verify
  console.log("\n--- Verification ---");
  const { data: finalPackages } = await listPackages({ client, path: { project_id: project.id, offering_id: offering.id }, query: { limit: 20 } });
  for (const pkg of finalPackages?.items ?? []) {
    const { data: pkgDetails } = await client.get<{
      products: { product_id: string; store_identifier: string; display_name: string }[];
    }>({
      url: "/projects/{project_id}/packages/{package_id}",
      path: { project_id: project.id, package_id: pkg.id },
    });
    console.log(`\n${pkg.lookup_key}: ${pkgDetails?.products?.length ?? 0} products`);
    for (const p of pkgDetails?.products ?? []) {
      console.log(`  ${p.store_identifier} - ${p.display_name}`);
    }
  }
}

main().catch(console.error);
