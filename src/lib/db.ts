import { createClient, type Client } from "@libsql/client";

let client: Client;

export function getDb(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:bookings.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function initDb() {
  const db = getDb();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#3b82f6'
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      booked_by TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );
  `);

  // Create indexes separately (executeMultiple can be finicky with these)
  await db.execute("CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_bookings_room_date ON bookings(room_id, date)");

  // Seed rooms if empty
  const result = await db.execute("SELECT COUNT(*) as cnt FROM rooms");
  const count = result.rows[0].cnt as number;

  if (count === 0) {
    await db.execute({ sql: "INSERT INTO rooms (name, color) VALUES (?, ?)", args: ["Tokyo", "#3b82f6"] });
    await db.execute({ sql: "INSERT INTO rooms (name, color) VALUES (?, ?)", args: ["Oslo", "#10b981"] });
    await db.execute({ sql: "INSERT INTO rooms (name, color) VALUES (?, ?)", args: ["Recreation Zone", "#f59e0b"] });
  }
}

let initialized = false;

export async function ensureDb(): Promise<Client> {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
  return getDb();
}
