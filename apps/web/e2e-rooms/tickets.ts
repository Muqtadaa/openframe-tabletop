import { encodeHello, type RoomSocket } from '@openframe/collab'
import { mintTicket, type MintCrypto } from '@openframe/collab/tickets-mint'
import type { TicketKey } from '@openframe/collab/tickets'

/**
 * Tickets and sockets for the specs that talk to the ticket-mode room server
 * (`playwright.rooms.config.ts` starts it on 8789 with only the public key).
 */
export const TICKET_ROOMS = 'ws://127.0.0.1:8789'
export const TICKET_HTTP = 'http://127.0.0.1:8789'

const subtle = crypto.subtle as unknown as MintCrypto & {
  importKey(
    format: 'pkcs8',
    key: Uint8Array,
    algorithm: 'Ed25519',
    extractable: boolean,
    usages: string[],
  ): Promise<TicketKey>
}

let signing: Promise<TicketKey> | null = null
function signingKey(): Promise<TicketKey> {
  const raw = process.env.OPENFRAME_TICKET_KEY
  if (raw === undefined) throw new Error('the config did not make a ticket key')
  signing ??= subtle.importKey(
    'pkcs8',
    Uint8Array.from(Buffer.from(raw, 'base64')),
    'Ed25519',
    false,
    ['sign'],
  )
  return signing
}

export interface TicketOptions {
  readonly role?: 'editor' | 'viewer'
  readonly sub?: string
  /** Seconds from now; negative is the past. */
  readonly expiresIn?: number
  /** Seconds from now that it was issued; negative is the past. */
  readonly issuedAt?: number
}

/** A genuine ticket for one room. */
export async function ticketFor(room: string, options: TicketOptions = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const iat = now + (options.issuedAt ?? 0)
  return mintTicket(
    {
      room,
      role: options.role ?? 'editor',
      sub: options.sub ?? 'user_test',
      iat,
      exp: now + (options.expiresIn ?? 600),
    },
    await signingKey(),
    subtle,
  )
}

export interface Knock {
  /** The role message arrived: the room let this socket in. */
  readonly admitted: boolean
  /** How the socket was closed, if it was. */
  readonly closed: { readonly code: number; readonly reason: string } | null
  readonly socket: WebSocket
}

/** Opens a socket to a room, says hello, and reports whether it was let in or put out. */
export function knock(room: string, hello: Parameters<typeof encodeHello>[0]): Promise<Knock> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${TICKET_ROOMS}/room/${room}`)
    socket.binaryType = 'arraybuffer'
    let settled = false
    const finish = (value: Knock): void => {
      if (settled) return
      settled = true
      resolve(value)
    }
    socket.addEventListener('open', () => {
      socket.send(new Uint8Array(encodeHello(hello)))
    })
    socket.addEventListener('message', () => finish({ admitted: true, closed: null, socket }), {
      once: true,
    })
    socket.addEventListener('close', (event) =>
      finish({ admitted: false, closed: { code: event.code, reason: event.reason }, socket }),
    )
    socket.addEventListener('error', () => {
      if (!settled) reject(new Error('the socket failed rather than closing with a code'))
    })
  })
}

/** A `RoomSocket` over a real WebSocket, recording every frame the room sends. */
export function realSocket(room: string, frames: Uint8Array[]): RoomSocket {
  const socket = new WebSocket(`${TICKET_ROOMS}/room/${room}`)
  socket.binaryType = 'arraybuffer'
  return {
    send: (data) => {
      socket.send(new Uint8Array(data))
    },
    close: () => {
      socket.close()
    },
    onOpen: (listener) => {
      socket.addEventListener('open', () => {
        listener()
      })
    },
    onMessage: (listener) => {
      socket.addEventListener('message', (event) => {
        const data = new Uint8Array(event.data as ArrayBuffer)
        frames.push(data)
        listener(data)
      })
    },
    onClose: (listener) => {
      socket.addEventListener('close', (event) => {
        listener(event.code)
      })
    },
    onError: (listener) => {
      socket.addEventListener('error', () => {
        listener()
      })
    },
  }
}

/** The same ticket with its signature changed by one character. */
export function tampered(ticket: string): string {
  const [version, payload, signature] = ticket.split('.') as [string, string, string]
  const last = signature.endsWith('A') ? 'B' : 'A'
  return `${version}.${payload}.${signature.slice(0, -1)}${last}`
}
