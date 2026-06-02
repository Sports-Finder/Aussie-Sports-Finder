import { getUncachableRevenueCatClient } from "./revenueCatClient.js";

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
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

const APP_STORE_APP_NAME = "Aussie Sports Club Finder iOS";
const APP_STORE_BUNDLE_ID = "com.aussiesportsclubbfinder.ios";
const PLAY_STORE_APP_NAME = "Aussie Sports Club Finder Android";
const PLAY_STORE_PACKAGE_NAME = "com.aussiesportsclubbfinder.android";

const ENTITLEMENT_IDENTIFIER = "premium";
const ENTITLEMENT_DISPLAY_NAME = "Premium Access";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Default Offering";

type ProductDef = {
  testStoreId: string;
  playStoreId: string;
  displayName: string;
  userFacingTitle: string;
  duration: "P1M" | "P1Y";
  priceAmountMicros: number;
  packageId: string;
  packageDisplayName: string;
};

const PRODUCTS: ProductDef[] = [
  {
    testStoreId: "club_monthly",
    playStoreId: "club_monthly:monthly",
    displayName: "Club Monthly",
    userFacingTitle: "Club Monthly",
    duration: "P1M",
    priceAmountMicros: 3990000,
    packageId: "$rc_monthly_club",
    packageDisplayName: "Club Monthly Subscription",
  },
  {
    testStoreId: "club_annual",
    playStoreId: "club_annual:annual",
    displayName: "Club Annual",
    userFacingTitle: "Club Annual",
    duration: "P1Y",
    priceAmountMicros: 39990000,
    packageId: "$rc_annual_club",
    packageDisplayName: "Club Annual Subscription",
  },
  {
    testStoreId: "player_monthly",
    playStoreId: "player_monthly:monthly",
    displayName: "Player Monthly",
    userFacingTitle: "Player Monthly",
    duration: "P1M",
    priceAmountMicros: 1990000,
    packageId: "$rc_monthly",
    packageDisplayName: "Player Monthly Subscription",
  },
  {
    testStoreId: "player_annual",
    playStoreId: "player_annual:annual",
    displayName: "Player Annual",
    userFacingTitle: "Player Annual",
    duration: "P1Y",
    priceAmountMicros: 19990000,
    packageId: "$rc_annual",
    packageDisplayName: "Player Annual Subscription",
  },
];

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // ── Project ──────────────────────────────────────────────────────────────
  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error("Failed to list projects: " + JSON.stringify(listProjectsError));

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error("Failed to create project: " + JSON.stringify(error));
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  // ── Apps ─────────────────────────────────────────────────────────────────
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) throw new Error("No apps found");

  let testApp: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!testApp) throw new Error("No test store app found");
  console.log("Test store app:", testApp.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error("Failed to create App Store app: " + JSON.stringify(error));
    appStoreApp = newApp;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } },
    });
    if (error) throw new Error("Failed to create Play Store app: " + JSON.stringify(error));
    playStoreApp = newApp;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app:", playStoreApp.id);
  }

  // ── Products ─────────────────────────────────────────────────────────────
  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products: " + JSON.stringify(listProductsError));

  const ensureProduct = async (targetApp: App, label: string, identifier: string, def: ProductDef, isTestStore: boolean): Promise<Product> => {
    const existing = existingProducts.items?.find((p) => p.store_identifier === identifier && p.app_id === targetApp.id);
    if (existing) {
      console.log(`${label} product already exists:`, existing.id);
      return existing;
    }
    const body: CreateProductData["body"] = {
      store_identifier: identifier,
      app_id: targetApp.id,
      type: "subscription",
      display_name: def.displayName,
    };
    if (isTestStore) {
      body.subscription = { duration: def.duration };
      body.title = def.userFacingTitle;
    }
    const { data: created, error } = await createProduct({ client, path: { project_id: project.id }, body });
    if (error) throw new Error(`Failed to create ${label} product: ` + JSON.stringify(error));
    console.log(`Created ${label} product:`, created.id);
    return created;
  };

  // ── Entitlement ──────────────────────────────────────────────────────────
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client, path: { project_id: project.id }, query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  let entitlement: Entitlement;
  const existingEntitlement = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);
  if (existingEntitlement) {
    console.log("Entitlement already exists:", existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data: newEntitlement, error } = await createEntitlement({
      client, path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create entitlement: " + JSON.stringify(error));
    console.log("Created entitlement:", newEntitlement.id);
    entitlement = newEntitlement;
  }

  // ── Offering ─────────────────────────────────────────────────────────────
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client, path: { project_id: project.id }, query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  let offering: Offering;
  const existingOffering = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOffering) {
    console.log("Offering already exists:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data: newOffering, error } = await createOffering({
      client, path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create offering: " + JSON.stringify(error));
    console.log("Created offering:", newOffering.id);
    offering = newOffering;
  }
  if (!offering.is_current) {
    const { error } = await updateOffering({
      client, path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set offering as current");
  }

  // ── Per-product: create, price, entitle, package ─────────────────────────
  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client, path: { project_id: project.id, offering_id: offering.id }, query: { limit: 20 },
  });
  if (listPackagesError) throw new Error("Failed to list packages");

  for (const def of PRODUCTS) {
    const testProduct = await ensureProduct(testApp, `${def.displayName} [test]`, def.testStoreId, def, true);
    const appStoreProduct = await ensureProduct(appStoreApp, `${def.displayName} [ios]`, def.testStoreId, def, false);
    const playStoreProduct = await ensureProduct(playStoreApp, `${def.displayName} [android]`, def.playStoreId, def, false);

    // Test store prices
    const { error: priceError } = await client.post<TestStorePricesResponse>({
      url: `/projects/{project_id}/products/{product_id}/test_store_prices`,
      path: { project_id: project.id, product_id: testProduct.id },
      body: { prices: [{ amount_micros: def.priceAmountMicros, currency: "USD" }] },
    });
    if (priceError) {
      const errObj = priceError as Record<string, unknown>;
      if (errObj["type"] === "resource_already_exists") {
        console.log(`Prices already exist for ${def.displayName}`);
      } else {
        console.warn(`Warning: could not set price for ${def.displayName}:`, JSON.stringify(priceError));
      }
    } else {
      console.log(`Set test store price for ${def.displayName}`);
    }

    // Attach to entitlement
    const { error: attachEntError } = await attachProductsToEntitlement({
      client, path: { project_id: project.id, entitlement_id: entitlement.id },
      body: { product_ids: [testProduct.id, appStoreProduct.id, playStoreProduct.id] },
    });
    if (attachEntError) {
      const errObj = attachEntError as unknown as Record<string, unknown>;
      if (errObj["type"] === "unprocessable_entity_error") {
        console.log(`Products already attached to entitlement for ${def.displayName}`);
      } else {
        throw new Error(`Failed to attach ${def.displayName} to entitlement: ` + JSON.stringify(attachEntError));
      }
    } else {
      console.log(`Attached ${def.displayName} to entitlement`);
    }

    // Package
    let pkg: Package | undefined = existingPackages.items?.find((p) => p.lookup_key === def.packageId);
    if (!pkg) {
      const { data: newPackage, error } = await createPackages({
        client, path: { project_id: project.id, offering_id: offering.id },
        body: { lookup_key: def.packageId, display_name: def.packageDisplayName },
      });
      if (error) throw new Error(`Failed to create package ${def.packageId}: ` + JSON.stringify(error));
      console.log(`Created package ${def.packageId}:`, newPackage.id);
      pkg = newPackage;
    } else {
      console.log(`Package ${def.packageId} already exists:`, pkg.id);
    }

    const { error: attachPkgError } = await attachProductsToPackage({
      client, path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: [
          { product_id: testProduct.id, eligibility_criteria: "all" },
          { product_id: appStoreProduct.id, eligibility_criteria: "all" },
          { product_id: playStoreProduct.id, eligibility_criteria: "all" },
        ],
      },
    });
    if (attachPkgError) {
      const errObj = attachPkgError as unknown as Record<string, unknown>;
      if (errObj["type"] === "unprocessable_entity_error") {
        console.log(`Products already attached to package ${def.packageId}`);
      } else {
        throw new Error(`Failed to attach products to package ${def.packageId}: ` + JSON.stringify(attachPkgError));
      }
    } else {
      console.log(`Attached ${def.displayName} to package ${def.packageId}`);
    }
  }

  // ── API Keys ─────────────────────────────────────────────────────────────
  const { data: testKeys, error: testKeysError } = await listAppPublicApiKeys({
    client, path: { project_id: project.id, app_id: testApp.id },
  });
  if (testKeysError) throw new Error("Failed to get test store API keys");

  const { data: iosKeys, error: iosKeysError } = await listAppPublicApiKeys({
    client, path: { project_id: project.id, app_id: appStoreApp.id },
  });
  if (iosKeysError) throw new Error("Failed to get App Store API keys");

  const { data: androidKeys, error: androidKeysError } = await listAppPublicApiKeys({
    client, path: { project_id: project.id, app_id: playStoreApp.id },
  });
  if (androidKeysError) throw new Error("Failed to get Play Store API keys");

  console.log("\n====================");
  console.log("RevenueCat setup complete!");
  console.log("Project ID:", project.id);
  console.log("Test Store App ID:", testApp.id);
  console.log("App Store App ID:", appStoreApp.id);
  console.log("Play Store App ID:", playStoreApp.id);
  console.log("Entitlement Identifier:", ENTITLEMENT_IDENTIFIER);
  console.log("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY:", testKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY:", iosKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY:", androidKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("REVENUECAT_PROJECT_ID:", project.id);
  console.log("REVENUECAT_TEST_STORE_APP_ID:", testApp.id);
  console.log("REVENUECAT_APPLE_APP_STORE_APP_ID:", appStoreApp.id);
  console.log("REVENUECAT_GOOGLE_PLAY_STORE_APP_ID:", playStoreApp.id);
  console.log("====================\n");
}

seedRevenueCat().catch(console.error);
