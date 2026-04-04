"use client";

import { useState, useEffect, useCallback } from "react";

interface Room {
  id: number;
  name: string;
  color: string;
}

interface Booking {
  id: number;
  room_id: number;
  title: string;
  booked_by: string;
  date: string;
  start_time: string;
  end_time: string;
  room_name: string;
  room_color: string;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM
const START_HOUR = 7;
const END_HOUR = 20;

function formatTime(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour} ${ampm}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showBookingDetail, setShowBookingDetail] = useState<Booking | null>(null);
  const [formData, setFormData] = useState({
    room_id: 0,
    title: "",
    booked_by: "",
    start_time: "09:00",
    end_time: "10:00",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setSelectedDate(new Date());
    setCurrentTime(new Date());
  }, []);

  const dateStr = selectedDate ? formatDate(selectedDate) : null;

  const fetchData = useCallback(async () => {
    if (!dateStr) return;
    const [roomsRes, bookingsRes] = await Promise.all([
      fetch("/api/rooms"),
      fetch(`/api/bookings?date=${dateStr}`),
    ]);
    const roomsData = await roomsRes.json();
    const bookingsData = await bookingsRes.json();
    setRooms(roomsData);
    setBookings(bookingsData);
    if (roomsData.length > 0 && formData.room_id === 0) {
      setFormData((f) => ({ ...f, room_id: roomsData[0].id }));
    }
  }, [dateStr, formData.room_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const navigateDate = (days: number) => {
    const d = new Date(selectedDate!);
    d.setDate(d.getDate() + days);
    setSelectedDate(d);
  };

  const goToToday = () => setSelectedDate(new Date());

  const openBookingModal = (roomId: number, hour: number) => {
    const startH = hour.toString().padStart(2, "0");
    const endH = (hour + 1).toString().padStart(2, "0");
    setFormData({
      room_id: roomId,
      title: "",
      booked_by: "",
      start_time: `${startH}:00`,
      end_time: `${endH}:00`,
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, date: dateStr }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/bookings?id=${id}`, { method: "DELETE" });
    setShowBookingDetail(null);
    fetchData();
  };

  const isToday = selectedDate ? formatDate(selectedDate) === formatDate(new Date()) : false;
  const now = currentTime ?? new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const timelineStart = START_HOUR * 60;
  const timelineEnd = END_HOUR * 60;
  const showTimeLine =
    isToday && currentMinutes >= timelineStart && currentMinutes <= timelineEnd;
  const timeLineTop =
    ((currentMinutes - timelineStart) / (timelineEnd - timelineStart)) * (HOURS.length * 60);

  const getRoomBookings = (roomId: number) =>
    bookings.filter((b) => b.room_id === roomId);

  const getBookingStyle = (booking: Booking) => {
    const startMin = timeToMinutes(booking.start_time);
    const endMin = timeToMinutes(booking.end_time);
    const top =
      ((startMin - timelineStart) / (timelineEnd - timelineStart)) * (HOURS.length * 60);
    const height =
      ((endMin - startMin) / (timelineEnd - timelineStart)) * (HOURS.length * 60);
    return { top: `${top}px`, height: `${Math.max(height, 20)}px` };
  };

  const totalSlots = rooms.length * HOURS.length;
  const bookedSlots = bookings.length;
  const occupancy = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Meeting Rooms
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Book a room in seconds</p>
          </div>
          <button
            onClick={() => {
              setFormData({
                room_id: rooms[0]?.id || 1,
                title: "",
                booked_by: "",
                start_time: "09:00",
                end_time: "10:00",
              });
              setError("");
              setShowModal(true);
            }}
            className="bg-slate-900 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer"
          >
            + New Booking
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Date Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
            <button
              onClick={() => navigateDate(-1)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-600 cursor-pointer"
            >
              &#8249;
            </button>
            <div className="text-center">
              <h2 className="text-sm sm:text-lg font-semibold text-slate-900">
                {selectedDate ? formatDisplayDate(selectedDate) : ""}
              </h2>
            </div>
            <button
              onClick={() => navigateDate(1)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-600 cursor-pointer"
            >
              &#8250;
            </button>
            {!isToday && (
              <button
                onClick={goToToday}
                className="ml-1 sm:ml-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                Today
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="flex justify-center sm:justify-end gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="bg-white rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 border border-slate-200">
              <span className="text-slate-500">Bookings:</span>{" "}
              <span className="font-semibold text-slate-900">{bookings.length}</span>
            </div>
            <div className="bg-white rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 border border-slate-200">
              <span className="text-slate-500">Occupancy:</span>{" "}
              <span className="font-semibold text-slate-900">{occupancy}%</span>
            </div>
          </div>
        </div>

        {/* Room headers */}
        <div className="timeline-grid mb-0">
          <div className="h-10 sm:h-12" />
          {rooms.map((room) => (
            <div
              key={room.id}
              className="h-10 sm:h-12 flex items-center px-1.5 sm:px-3 border-l border-slate-200"
            >
              <div
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full mr-1 sm:mr-2 flex-shrink-0"
                style={{ backgroundColor: room.color }}
              />
              <span className="font-semibold text-[11px] sm:text-sm text-slate-800 truncate">
                {room.name}
              </span>
              <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs text-slate-400 hidden sm:inline">
                {getRoomBookings(room.id).length} bookings
              </span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="timeline-grid">
            {/* Time labels */}
            <div>
              {HOURS.map((h) => (
                <div key={h} className="time-slot">
                  {formatTime(h)}
                </div>
              ))}
            </div>

            {/* Room columns */}
            {rooms.map((room) => (
              <div key={room.id} className="room-column">
                {/* Hour cells */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="hour-cell"
                    onClick={() => openBookingModal(room.id, h)}
                  />
                ))}

                {/* Booking blocks */}
                {getRoomBookings(room.id).map((booking) => (
                  <div
                    key={booking.id}
                    className="booking-block text-white"
                    style={{
                      ...getBookingStyle(booking),
                      backgroundColor: booking.room_color,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBookingDetail(booking);
                    }}
                  >
                    <div className="font-semibold truncate">{booking.title}</div>
                    <div className="opacity-80 text-[11px]">
                      {booking.start_time} - {booking.end_time}
                    </div>
                    <div className="opacity-70 text-[11px] truncate">
                      {booking.booked_by}
                    </div>
                  </div>
                ))}

                {/* Current time line */}
                {showTimeLine && (
                  <div className="current-time-line" style={{ top: `${timeLineTop}px` }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Room Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
          {rooms.map((room) => {
            const rb = getRoomBookings(room.id);
            const nextBooking = rb.find((b) => {
              const bookingStart = timeToMinutes(b.start_time);
              return bookingStart > currentMinutes;
            });
            return (
              <div
                key={room.id}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: room.color }}
                  />
                  <h3 className="font-semibold text-sm text-slate-800">
                    {room.name}
                  </h3>
                </div>
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {rb.length}
                  <span className="text-sm font-normal text-slate-400 ml-1">
                    bookings today
                  </span>
                </div>
                {isToday && nextBooking ? (
                  <p className="text-xs text-slate-500">
                    Next: {nextBooking.title} at {nextBooking.start_time}
                  </p>
                ) : isToday ? (
                  <p className="text-xs text-green-600 font-medium">
                    Available rest of day
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 sm:py-4 mt-6 sm:mt-8">
        <p className="text-center text-xs sm:text-sm text-slate-500 px-4">
          Powered by <span className="font-semibold text-slate-700">6amTech</span>, Developed by <span className="font-semibold text-slate-700">Sunny</span> within 10 minutes. Happy vibe coding!!
        </p>
      </footer>

      {/* Booking Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">New Booking</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Room
                </label>
                <select
                  value={formData.room_id}
                  onChange={(e) =>
                    setFormData({ ...formData, room_id: Number(e.target.value) })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Meeting Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g. Sprint Planning"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Booked By
                </label>
                <input
                  type="text"
                  required
                  value={formData.booked_by}
                  onChange={(e) =>
                    setFormData({ ...formData, booked_by: e.target.value })
                  }
                  placeholder="Your name"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    min="07:00"
                    max="19:00"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    min="07:00"
                    max="20:00"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Booking..." : "Book Room"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {showBookingDetail && (
        <div
          className="modal-overlay"
          onClick={() => setShowBookingDetail(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Booking Details
              </h2>
              <button
                onClick={() => setShowBookingDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              <div
                className="w-full h-2 rounded-full"
                style={{ backgroundColor: showBookingDetail.room_color }}
              />
              <div>
                <div className="text-sm text-slate-500">Title</div>
                <div className="font-semibold text-slate-900">
                  {showBookingDetail.title}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Room</div>
                <div className="font-medium text-slate-800">
                  {showBookingDetail.room_name}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Booked By</div>
                <div className="font-medium text-slate-800">
                  {showBookingDetail.booked_by}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Time</div>
                <div className="font-medium text-slate-800">
                  {showBookingDetail.start_time} - {showBookingDetail.end_time}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDelete(showBookingDetail.id)}
              className="w-full mt-5 bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors border border-red-200 cursor-pointer"
            >
              Cancel Booking
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
