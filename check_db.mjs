import { drizzle } from "drizzle-orm/mysql2";

const db = drizzle(process.env.DATABASE_URL);

// Check hotels
const hotels = await db.execute("SELECT * FROM hotels LIMIT 5");
console.log("Hotels:", hotels);

// Check scan configs
const configs = await db.execute("SELECT * FROM scanConfigs LIMIT 5");
console.log("Scan Configs:", configs);

process.exit(0);
