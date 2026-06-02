import { setBaseUrl } from "@workspace/api-client-react";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) setBaseUrl(`https://${domain}`);
// Auth token getter is wired up in app/(tabs)/_layout.tsx via Clerk's useAuth
