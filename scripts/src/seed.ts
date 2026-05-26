import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  accountsTable,
  advertsTable,
  conversationsTable,
  messagesTable,
  profileImagesTable,
  sportRequestsTable,
} from "@workspace/db";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const now = () => new Date().toISOString();
const makeId = () => Date.now().toString() + Math.random().toString(36).slice(2, 9);

async function seed() {
  console.log("Seeding database...");

  // Seed accounts
  const club1 = makeId();
  const club2 = makeId();
  const player1 = makeId();
  const player2 = makeId();

  await db.insert(accountsTable).values([
    {
      publicId: club1,
      role: "club",
      authMethod: "email",
      email: "yarraunited@example.com",
      passwordHash: null,
      clubName: "Yarra United SC",
      defaultSport: "Football (Soccer)",
      sports: ["Football (Soccer)"],
      location: "Melbourne VIC",
      clubAddress: "Yarra Park, Melbourne",
      clubContactEmail: "info@yarraunited.com",
      clubContactMobile: "0400 111 222",
      clubWebsite: "https://yarraunited.com",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      publicId: club2,
      role: "club",
      authMethod: "email",
      email: "bondinetball@example.com",
      passwordHash: null,
      clubName: "Bondi Harbour Netball Club",
      defaultSport: "Netball",
      sports: ["Netball"],
      location: "Sydney NSW",
      clubAddress: "Bondi Beach, Sydney",
      clubContactEmail: "info@bondinetball.com",
      clubContactMobile: "0400 333 444",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      publicId: player1,
      role: "player",
      authMethod: "email",
      email: "jordan@example.com",
      passwordHash: null,
      fullName: "Jordan Miles",
      defaultSport: "Football (Soccer)",
      sports: ["Football (Soccer)"],
      location: "Brisbane QLD",
      gender: "Male",
      dateOfBirth: "15-06-1998",
      mobile: "0400 555 666",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      publicId: player2,
      role: "player",
      authMethod: "email",
      email: "ava@example.com",
      passwordHash: null,
      fullName: "Ava Roberts",
      defaultSport: "Rugby League",
      sports: ["Rugby League"],
      location: "Gold Coast QLD",
      gender: "Female",
      dateOfBirth: "22-03-2001",
      mobile: "0400 777 888",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // Seed adverts
  const ad1 = makeId();
  const ad2 = makeId();
  const ad3 = makeId();
  const ad4 = makeId();
  const ad5 = makeId();
  const ad6 = makeId();

  await db.insert(advertsTable).values([
    {
      publicId: ad1,
      ownerAccountId: club1,
      type: "players-wanted",
      title: "Melbourne club needs a box-to-box midfielder",
      sport: "Football (Soccer)",
      location: "Melbourne VIC",
      distanceKm: 4,
      postedBy: "Yarra United SC",
      postedByType: "club",
      level: "State league reserves",
      availability: "Training Tuesday and Thursday, matches Saturday",
      needs: "Central midfielder, age 18+, reliable weekly availability",
      description: "A community club in Melbourne's inner north is looking for a committed midfielder who enjoys high-tempo football and a positive team culture.",
      status: "active",
      createdAt: new Date(),
    },
    {
      publicId: ad2,
      ownerAccountId: player1,
      type: "coach-looking",
      title: "Goalkeeper moving to Brisbane and looking for a club",
      sport: "Football (Soccer)",
      location: "Brisbane QLD",
      distanceKm: 18,
      postedBy: "Jordan Miles",
      postedByType: "player",
      level: "NPL youth / metro senior",
      availability: "Evenings and weekends",
      needs: "Senior team with regular training and match minutes",
      description: "Experienced goalkeeper, vocal organiser, strong distribution, available immediately after moving for work.",
      status: "active",
      createdAt: new Date(),
    },
    {
      publicId: ad3,
      ownerAccountId: club2,
      type: "players-wanted",
      title: "Netball squad trialling new defenders",
      sport: "Netball",
      location: "Sydney NSW",
      distanceKm: 31,
      postedBy: "Bondi Harbour Netball Club",
      postedByType: "club",
      level: "Intermediate",
      availability: "Monday training, Sunday fixtures",
      needs: "GD, GK, WD players welcome",
      description: "Friendly but ambitious squad with qualified coaches and a clear pathway into our first team.",
      status: "active",
      createdAt: new Date(),
    },
    {
      publicId: ad4,
      ownerAccountId: player2,
      type: "coach-looking",
      title: "Fast outside back seeking rugby league club",
      sport: "Rugby League",
      location: "Gold Coast QLD",
      distanceKm: 27,
      postedBy: "Ava Roberts",
      postedByType: "player",
      level: "A-grade local competition",
      availability: "Weeknight training and weekend fixtures",
      needs: "Women's club with performance pathway",
      description: "Wing/full-back with pace and kicking range, looking for coaching, structure and a welcoming Australian club culture.",
      status: "active",
      createdAt: new Date(),
    },
    {
      publicId: ad5,
      ownerAccountId: makeId(),
      type: "players-wanted",
      title: "Aussie Rules club searching for a ruck and half-forward",
      sport: "Aussie Rules Football",
      location: "Adelaide SA",
      distanceKm: 42,
      postedBy: "Parklands Footy Club",
      postedByType: "club",
      level: "Community league",
      availability: "Training Tuesday and Thursday, matches Saturday",
      needs: "Ruck, half-forward and utility players welcome",
      description: "A family-friendly community footy club with strong social culture and competitive senior teams.",
      status: "active",
      createdAt: new Date(),
    },
    {
      publicId: ad6,
      ownerAccountId: makeId(),
      type: "players-wanted",
      title: "Cricket club needs all-rounders for summer season",
      sport: "Cricket",
      location: "Perth WA",
      distanceKm: 48,
      postedBy: "Swan River Cricket Club",
      postedByType: "club",
      level: "Local senior grades",
      availability: "Training Wednesday, matches Saturday",
      needs: "Batting all-rounders and wicketkeeper considered",
      description: "Welcoming cricket club preparing squads for the summer season across multiple senior grades.",
      status: "active",
      createdAt: new Date(),
    },
  ]);

  // Seed conversations
  const conv1 = makeId();
  const conv2 = makeId();

  await db.insert(conversationsTable).values([
    {
      publicId: conv1,
      advertId: ad1,
      advertTitle: "Melbourne club needs a box-to-box midfielder",
      ownerAccountId: club1,
      initiatorAccountId: player1,
      clubName: "Yarra United SC",
      playerName: "Jordan Miles",
      status: "connected",
      sport: "Football (Soccer)",
      createdAt: new Date(),
    },
    {
      publicId: conv2,
      advertId: ad3,
      advertTitle: "Netball squad trialling new defenders",
      ownerAccountId: club2,
      initiatorAccountId: player2,
      clubName: "Bondi Harbour Netball Club",
      playerName: "Ava Roberts",
      status: "connected",
      sport: "Netball",
      hasUnread: true,
      createdAt: new Date(),
    },
  ]);

  // Seed messages
  await db.insert(messagesTable).values([
    {
      publicId: makeId(),
      conversationId: conv1,
      senderAccountId: club1,
      sender: "them",
      body: "Thanks for connecting. Are you free to come down to training this Thursday?",
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      publicId: makeId(),
      conversationId: conv1,
      senderAccountId: player1,
      sender: "me",
      body: "Yes, I can make Thursday. Please send the arrival time and kit colour.",
      createdAt: new Date(),
    },
    {
      publicId: makeId(),
      conversationId: conv2,
      senderAccountId: club2,
      sender: "them",
      body: "Hi Ava, great to connect. Our trial session is this Sunday at 9am at Bondi Park.",
      createdAt: new Date(Date.now() - 7200000),
    },
  ]);

  // Seed sport requests
  await db.insert(sportRequestsTable).values([
    { publicId: makeId(), name: "Basketball", status: "approved", requestedAt: new Date() },
    { publicId: makeId(), name: "Tennis", status: "approved", requestedAt: new Date() },
    { publicId: makeId(), name: "Hockey", status: "pending", requestedAt: new Date() },
  ]);

  console.log("Seed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
