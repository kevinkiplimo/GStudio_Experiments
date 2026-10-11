import "server-only";
import { all } from "./db";
import type { Booking } from "./studio";

export type OrderRow = {
  id: number;
  user_id: number;
  booking_id: number | null;
  status: string;
  notes: string;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  due_date: string | null;
  assignee_id: number | null;
  created_at: string;
  client_name: string;
  assignee_name: string | null;
  session_start: string | null;
};

export type OrderItem = { id: number; order_id: number; name: string; qty: number; unit_price_cents: number };
export type Deliverable = { id: number; order_id: number; title: string; url: string; kind: string; created_at: string };

const ORDER_SELECT = `
  SELECT o.*, u.name AS client_name, a.name AS assignee_name, b.starts_at AS session_start
  FROM orders o
  JOIN users u ON u.id = o.user_id
  LEFT JOIN users a ON a.id = o.assignee_id
  LEFT JOIN bookings b ON b.id = o.booking_id`;

export function ordersWhere(where: string, ...params: unknown[]): OrderRow[] {
  return all<OrderRow>(`${ORDER_SELECT} ${where}`, ...params);
}

export function itemsFor(orderIds: number[]): Map<number, OrderItem[]> {
  const map = new Map<number, OrderItem[]>();
  if (!orderIds.length) return map;
  const rows = all<OrderItem>(`SELECT * FROM order_items WHERE order_id IN (${orderIds.map(() => "?").join(",")}) ORDER BY id`, ...orderIds);
  for (const r of rows) map.set(r.order_id, [...(map.get(r.order_id) ?? []), r]);
  return map;
}

export function deliverablesFor(orderIds: number[]): Map<number, Deliverable[]> {
  const map = new Map<number, Deliverable[]>();
  if (!orderIds.length) return map;
  const rows = all<Deliverable>(`SELECT * FROM deliverables WHERE order_id IN (${orderIds.map(() => "?").join(",")}) ORDER BY id`, ...orderIds);
  for (const r of rows) map.set(r.order_id, [...(map.get(r.order_id) ?? []), r]);
  return map;
}

export function userBookings(userId: number, where: string, ...params: unknown[]): Booking[] {
  return all<Booking>(
    `SELECT b.*, r.name AS room_name FROM bookings b JOIN rooms r ON r.id = b.room_id WHERE b.user_id = ? ${where}`,
    userId,
    ...params,
  );
}
