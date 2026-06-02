import { getUncachableRevenueCatClient } from "./revenueCatClient.js";
import {
  listProjects,
  listApps,
  listProducts,
  listEntitlements,
  listOfferings,
  listPackages,
  createProduct,
  deleteProduct,
  attachProductsToEntitlement,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "Aussie Sports Club Finder";
const ENTITLEMENT_ID = "premium";
const OFFERING_KEY = "default";

const V2_PRODUCTS = [
  {
    displayName: "Club Monthly AUD v2",
    storeIdentifier: "club_monthly_aud_v2",
    packageId: "$rc_monthly_club",
    duration: "P1M" as const,
    priceMicros: 3990000,
    title: "Club Monthly",
  },
  {
    displayName: "Club Annual AUD v2",
    storeIdentifier: "club_annual_aud_v2",
    packageId: "$rc_annual_club",
    duration: "P1Y" as const,
    priceMicros: 39990000,
    title: "Club Annual",
  },
  {
    displayName: "Player Monthly AUD v2",
    storeIdentifier: "player_monthly_aud_v2",
    packageId: "$rc_monthly",
    duration: "P1M" as const,
    priceMicros: 1990000,
    title: "Player Monthly",
  },
  {
    displayName: "Player Annual AUD v2",
    storeIdentifier: "player_annual_aud_v2",
    packageId: "$rc_annual",
    duration: "P1Y" as const,
    priceMicros: 19990000,
    title: "Player Annual",
  },
];

const OLD_IDENTIFIERS = [
  "club_monthly_aud",
  "club_annual_aud",
  "player_monthly_aud",
  "player_annual_aud",
];

async function main() {
  const client = await getUncachableRevenueCatClient();

  const { data: projects } = await listProjects({ client, query: { limit: 20 } });
  const project = projects?.items?.find((p) => p.name === PROJECT_NAME) as Project | undefined;
  if (!project) throw new Error("Project not found");
  console.log("Project:", project.id);

  const { data: apps } = await listApps({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const testApp = apps?.items?.find((a) => a.type === "test_store") as App | undefined;
  if (!testApp) throw new Error("Test store app not found");
  console.log("Test store app:", testApp.id);

  const { data: existingProducts } = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });
  const { data: existingEntitlements } = await listEntitlements({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const { data: existingOfferings } = await listOfferings({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const offeringId = existingOfferings?.items?.find((o) => o.lookup_key === OFFERING_KEY)?.id ?? "";
  const { data: existingPackages } = await listPackages({ client, path: { project_id: project.id, offering_id: offeringId }, query: { limit: 20 } });

  const entitlement = existingEntitlements?.items?.find((e) => e.lookup_key === ENTITLEMENT_ID) as Entitlement | undefined;
  const offering = existingOfferings?.items?.find((o) => o.lookup_key === OFFERING_KEY) as Offering | undefined;
  if (!entitlement) throw new Error("Entitlement not found");
  if (!offering) throw new Error("Offering not found");

  console.log("Entitlement:", entitlement.id);
  console.log("Offering:", offering.id);

  // Step 1: Create new v2 products in test store
  const createdProducts: Product[] = [];
  for (const def of V2_PRODUCTS) {
    const existing = existingProducts?.items?.find((p) => p.store_identifier === def.storeIdentifier && p.app_id === testApp.id);
    if (existing) {
      console.log(`Product ${def.storeIdentifier} already exists:`, existing.id);
      createdProducts.push(existing);
      continue;
    }
    const body: CreateProductData["body"] = {
      store_identifier: def.storeIdentifier,
      app_id: testApp.id,
      type: "subscription",
      display_name: def.displayName,
      subscription: { duration: def.duration },
      title: def.title,
    };
    const { data: created, error } = await createProduct({ client, path: { project_id: project.id }, body });
    if (error) throw new Error(`Failed to create ${def.storeIdentifier}: ${JSON.stringify(error)}`);
    console.log(`Created ${def.storeIdentifier}:`, created.id);
    createdProducts.push(created);

    const { error: priceError } = await client.post({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: created.id },
      body: { prices: [{ amount_micros: def.priceMicros, currency: "AUD" }] },
    });
    if (priceError) {
      const errObj = priceError as Record<string, unknown>;
      if (errObj["type"] === "resource_already_exists") {
        console.log(`Prices already exist for ${def.storeIdentifier}`);
      } else {
        console.warn(`Warning: could not set price for ${def.storeIdentifier}:`, JSON.stringify(priceError));
      }
    } else {
      console.log(`Set AUD price for ${def.storeIdentifier}`);
    }
  }

  // Step 2: Attach new products to entitlement
  const newProductIds = createdProducts.map((p) => p.id);
  const { error: attachError } = await attachProductsToEntitlement({
    client, path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: newProductIds },
  });
  if (attachError) {
    const errObj = attachError as unknown as Record<string, unknown>;
    if (errObj["type"] === "unprocessable_entity_error") {
      console.log("Products already attached to entitlement");
    } else {
      console.warn("Could not attach to entitlement:", JSON.stringify(attachError));
    }
  } else {
    console.log("Attached new products to entitlement");
  }

  // Step 3: Attach new products to packages
  for (const def of V2_PRODUCTS) {
    const pkg = existingPackages?.items?.find((p) => p.lookup_key === def.packageId) as Package | undefined;
    if (!pkg) { console.warn(`Package ${def.packageId} not found`); continue; }

    const product = createdProducts.find((p) => p.store_identifier === def.storeIdentifier);
    if (!product) { console.warn(`Product ${def.storeIdentifier} not found`); continue; }

    const { error: attachPkgError } = await attachProductsToPackage({
      client, path: { project_id: project.id, package_id: pkg.id },
      body: { products: [{ product_id: product.id, eligibility_criteria: "all" }] },
    });
    if (attachPkgError) {
      const errObj = attachPkgError as unknown as Record<string, unknown>;
      if (errObj["type"] === "unprocessable_entity_error") {
        console.log(`Products already attached to package ${def.packageId}`);
      } else {
        console.warn(`Could not attach to package ${def.packageId}:`, JSON.stringify(attachPkgError));
      }
    } else {
      console.log(`Attached ${def.storeIdentifier} to package ${def.packageId}`);
    }
  }

  // Step 4: Delete old _aud products
  for (const oldId of OLD_IDENTIFIERS) {
    const oldProduct = existingProducts?.items?.find((p) => p.store_identifier === oldId && p.app_id === testApp.id);
    if (!oldProduct) { console.log(`Old product ${oldId} not found (already deleted?)`); continue; }
    const { error: delError } = await deleteProduct({
      client, path: { project_id: project.id, product_id: oldProduct.id },
    });
    if (delError) {
      console.warn(`Could not delete old product ${oldId}:`, JSON.stringify(delError));
    } else {
      console.log(`Deleted old product ${oldId}`);
    }
  }

  console.log("\n=== V2 Price Migration Complete ===");
  console.log("New prices:");
  console.log("  Club:   $3.99/month  |  $39.99/year");
  console.log("  Player: $1.99/month  |  $19.99/year");
}

main().catch(console.error);
