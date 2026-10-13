import type { RoomRole } from '@openframe/collab'
import {
  importPublicKeys,
  ticketExpired,
  verifyTicket,
  type TicketCrypto,
  type TicketKey,
} from '@openframe/collab/tickets'

/**
 * A room that admits by identity: values in, decision out, no runtime.
 *
 * Same split as `access.ts` and for the same reason: a Durable Object can only
 * be exercised by deploying it, and a guard that can only be run by deploying
 * is a guard nobody runs. This is the rule; `room-object.ts` is storage and
 * sockets around it.
 *
 * TICKET MODE is a property of the deployment, not of a room. When
 * `TICKET_PUBLIC_KEYS` is set, EVERY connection must present a ticket that
 * names the room it is knocking on, and the link-key path is not consulted at
 * all. That is deliberate and it closes a real hole: `roleForKey` answers
 * `editor` for a room that has no keys, which is how every board made before
 * links existed keeps opening, and a scene room nobody has set up yet is
 * exactly such a room. In ticket mode "no keys" means nothing.
 */

export type TicketAdmission =
  { readonly ok: true; readonly role: RoomRole; readonly exp: number } | { readonly ok: false }

export type TicketMode =
  { readonly on: false } | { readonly on: true; readonly keys: readonly TicketKey[] }

/** Reads the setting once. A setting that holds no usable key still turns the mode ON, and so admits nobody. */
export async function ticketMode(
  setting: string | undefined,
  subtle: TicketCrypto,
): Promise<TicketMode> {
  if (setting === undefined || setting.trim() === '') return { on: false }
  return { on: true, keys: await importPublicKeys(setting, subtle) }
}

/**
 * Whether this ticket admits to THIS room. `room` is the room's own id, read
 * from the address the socket was opened on, never from the ticket.
 */
export async function admitByTicket(
  mode: Extract<TicketMode, { on: true }>,
  ticket: string | null,
  room: string,
  nowMs: number,
  subtle: TicketCrypto,
): Promise<TicketAdmission> {
  const verdict = await verifyTicket(ticket, mode.keys, room, nowMs, subtle)
  if (!verdict.ok) return { ok: false }
  return { ok: true, role: verdict.claims.role, exp: verdict.claims.exp }
}

/**
 * Whether a socket admitted by ticket may still be heard.
 *
 * Revocation is expiry, and expiry is checked when the socket next speaks, not
 * by a timer (rule 29): a socket that has gone quiet costs nothing and says
 * nothing, and one that speaks after its ticket ran out is put out and
 * reconnects with a fresh one. Absent `exp` is a socket admitted some other
 * way, which this has no opinion on.
 */
export function ticketStillStands(exp: number | undefined, nowMs: number): boolean {
  return exp === undefined || !ticketExpired({ exp }, nowMs)
}
