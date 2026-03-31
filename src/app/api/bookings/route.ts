import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const db = await ensureDb();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "date parameter required" }, { status: 400 });
  }

  const result = await db.execute({
    sql: `SELECT b.*, r.name as room_name, r.color as room_color
          FROM bookings b
          JOIN rooms r ON r.id = b.room_id
          WHERE b.date = ?
          ORDER BY b.start_time`,
    args: [date],
  });

  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
  const db = await ensureDb();
  const body = await request.json();
  const { room_id, title, booked_by, date, start_time, end_time } = body;

  if (!room_id || !title || !booked_by || !date || !start_time || !end_time) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (start_time >= end_time) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  // Check for overlapping bookings
  const conflict = await db.execute({
    sql: `SELECT id, title, start_time, end_time FROM bookings
          WHERE room_id = ? AND date = ?
          AND start_time < ? AND end_time > ?`,
    args: [room_id, date, end_time, start_time],
  });

  if (conflict.rows.length > 0) {
    const c = conflict.rows[0];
    return NextResponse.json(
      { error: `Time slot conflicts with "${c.title}" (${c.start_time} - ${c.end_time})` },
      { status: 409 }
    );
  }

  const result = await db.execute({
    sql: "INSERT INTO bookings (room_id, title, booked_by, date, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)",
    args: [room_id, title, booked_by, date, start_time, end_time],
  });

  return NextResponse.json({ id: Number(result.lastInsertRowid) }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const db = await ensureDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id parameter required" }, { status: 400 });
  }

  await db.execute({ sql: "DELETE FROM bookings WHERE id = ?", args: [id] });
  return NextResponse.json({ success: true });
}
