import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";

async function wipe() {
  console.log("Wiping database...");
  await db.execute(sql`DELETE FROM messages;`);
  await db.execute(sql`DELETE FROM conversations;`);
  await db.execute(sql`DELETE FROM profile_images;`);
  await db.execute(sql`DELETE FROM sport_requests;`);
  await db.execute(sql`DELETE FROM banned_emails;`);
  await db.execute(sql`DELETE FROM adverts;`);
  await db.execute(sql`DELETE FROM accounts;`);
  console.log("Database wiped clean.");
  await pool.end();
}

wipe().catch((e) => {
  console.error(e);
  process.exit(1);
});
