import { NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";

export async function GET() {
  const db = await ensureDb();
  const result = await db.execute("SELECT * FROM rooms ORDER BY id");
  return NextResponse.json(result.rows);
}
