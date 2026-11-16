# Server list API (v1)

The server browser, server owner dashboard and staff review queue for SpoutCraft Redux. The website and the in-game client both use it.

- Production: `https://api.spoutcraftredux.org/v1`
- Staging: `https://staging-api.spoutcraftredux.org/v1`

All bodies are JSON unless noted. Times are ISO 8601 strings in UTC.

### Requests that change data

- Every request other than `GET`, `HEAD` and `OPTIONS` must come from an allowed website origin. The API checks `Origin`, or `Referer` when there is no `Origin`, and answers `403` when neither names an allowed origin.
- A request with a body must send `Content-Type: application/json`, except the multipart image uploads. Anything else gets `415`, so plain HTML form posts are refused.

## Conventions

### Errors

```json
{ "statusCode": 400, "statusMessage": "Bad Request", "message": "Address is not a valid hostname", "data": { "field": "address" } }
```

`data.field` is set when one input field is at fault. Common codes: 400 invalid input, 401 not signed in, 403 not allowed (including a write from a foreign origin), 404 not found, 409 conflict (such as a username already taken, or editing a listing that is in review), 411 upload without `Content-Length`, 413 upload too large, 415 wrong content type, 429 rate limited (with a `Retry-After` header).

### Auth

The website signs in with a username and password. The API answers with a session cookie:

- `scr_session`, which is `HttpOnly`, `Secure`, `SameSite=Lax` and valid for 30 days. It is host-only: it has no `Domain`, so only the API host receives it and other subdomains (such as staging) never do. The website and API share a site, so `SameSite=Lax` still sends it on the website's requests.
- requests from the website must send `credentials: 'include'`
- in production, CORS allows credentials only from `https://spoutcraftredux.org` and `https://www.spoutcraftredux.org`. Staging and local origins are set per deployment (`NITRO_CORS_ORIGINS`).
- the `staff` role is given by another staff member, or for the first staff account with `scripts/make-staff.mjs`

The in-game client only uses the public endpoints and sends no cookie.

### Paging

List endpoints take `page` (from 1) and `perPage` (1 to 100, default 24) and return `page`, `perPage` and `total`.

### Rate limits

Limits are per IP address, or per account where noted. The IP is Cloudflare's `CF-Connecting-IP` only when the request reached the API through Cloudflare (the peer, or the last `X-Forwarded-For` hop added by the trusted proxy, is in Cloudflare's published ranges). Otherwise it is that peer's address.

| Endpoint | Limit |
|---|---|
| `POST /auth/register` | 5 per hour |
| `POST /auth/login` | 10 per minute |
| `POST /me/servers` | 10 per hour per account |
| `POST /me/servers/{id}/verify` | 6 per minute per account |
| `PUT /me/servers/{id}/icon` and `/banner` | 20 per 10 minutes per account, combined |
| `POST /servers/{slug}/report` | 10 per hour per account |
| Public `GET` endpoints | 120 per minute |

## Accounts

### User

```json
{ "id": "usr_8f2k1x", "username": "Hexeption", "role": "user", "email": "owner@example.com", "createdAt": "2026-11-16T03:00:00Z" }
```

- `role` is `user` or `staff`.
- `email` is optional. It and `banned` are only returned to the account's owner and to staff.

### Endpoints

| Method and path | Body | Returns |
|---|---|---|
| `POST /auth/register` | `{ username, password, email? }` | `201 { user }` and the session cookie |
| `POST /auth/login` | `{ username, password }` | `{ user }` and the session cookie |
| `POST /auth/logout` | | `204`, and the cookie is cleared |
| `GET /auth/me` | | `{ user }`, or `401` |
| `PATCH /auth/me` | `{ email?, currentPassword?, newPassword? }` | `{ user }` |

Input rules:

- `username`: 3 to 24 characters from `A-Z a-z 0-9 _`. It is unique without regard to case.
- `password`: 10 to 200 characters, stored with argon2id.
- Changing the password needs `currentPassword` and signs out every other session.

## Servers

### Listing lifecycle

A listing has a `state`:

| State | Meaning |
|---|---|
| `draft` | Created, not yet sent for review |
| `pending` | Waiting in the review queue |
| `approved` | Public |
| `changes_requested` | Staff asked for changes (see `reviewNote`) |
| `rejected` | Staff rejected it (see `reviewNote`) |

- **Verification.** Only verified listings can be submitted. To prove ownership, the owner puts the listing's `verifyCode` (for example `scr-7Q4M2K`) anywhere in the server's MOTD and calls `/verify`. The API pings the server and checks the MOTD. Afterwards the code can come out of the MOTD.
- **Re-verification.** Verification belongs to the address and port that answered. Changing `address` or `port` clears it, including a change made while `/verify` is running. Submit and approve check it against the current address.
- **In review.** A `pending` listing can't be edited: `PATCH` and the icon and banner routes answer `409` with "Withdraw the listing from review before editing". `POST /me/servers/{id}/withdraw` takes it out of the queue and back to `draft`. Staff can only approve it while it is verified for its current address.
- **Edits to an approved listing.** These go into a pending revision. The public listing keeps showing the approved version until staff approve the revision.
- **Edits that skip review.** `tags`, `website` and `discord` apply straight away.
- **Unlisting.** `listed: false` hides an approved listing without losing it.

### Status

The API pings every approved, listed server every 2 minutes with the standard server list ping. It times out after 5 seconds, DNS lookups included.

- On port 25565 the `_minecraft._tcp` SRV record is followed. Its target must be a hostname; an IP address there is refused.
- A hostname is resolved once (A and AAAA). If any address is private, loopback, link-local, CGNAT, multicast, unspecified, IPv4-mapped, unique-local or a documentation range, the ping is refused. Otherwise the API connects to the exact address it checked.

```json
{
  "online": true,
  "players": { "online": 12, "max": 100 },
  "version": "SpoutCraft Redux 26.3",
  "protocol": 775,
  "motd": "A plain-text MOTD\nsecond line",
  "pingMs": 38,
  "checkedAt": "2026-11-16T03:02:00Z",
  "uptime24h": 0.998
}
```

- `motd` is plain text with formatting codes removed.
- `uptime24h` is the share of successful pings over the last 24 hours, from 0 to 1.
- A server that has never answered has `online: false` and `null` for the other fields.

### SpoutCraft Redux only

Only servers running SpoutCraft Redux can be listed. A SpoutCraft Redux server reports a version name that starts with `SpoutCraft Redux` (for example `SpoutCraft Redux 26.3`).

- `/verify` succeeds only when the MOTD has the code and the version name starts with `SpoutCraft Redux`.
- The public endpoints only return servers whose last known version starts with `SpoutCraft Redux`.
  - When a server goes offline it keeps its last known version, so it stays listed.
  - When it comes back running something else, it drops out of the list until it runs SpoutCraft Redux again.
- `spoutcraftredux` on `ServerSummary` is therefore always `true` in public responses. It stays for clients that read it.

### ServerSummary

```json
{
  "slug": "example-network",
  "name": "Example Network",
  "address": "play.example.com",
  "port": 25565,
  "shortDescription": "Survival with custom GUIs",
  "tags": ["survival", "economy"],
  "iconUrl": "https://api.spoutcraftredux.org/media/3b9f...c1.png",
  "bannerUrl": "https://api.spoutcraftredux.org/media/a41e...09.webp",
  "featured": false,
  "promoted": false,
  "spoutcraftredux": true,
  "status": { "...": "see Status" }
}
```

- `iconUrl` and `bannerUrl` can be `null`.
- `featured` is set by staff.
- `promoted` is `true` while a paid or granted promotion is running (see Promotions).

### Server

A `ServerSummary` plus:

```json
{
  "description": "Markdown, up to 5000 characters",
  "website": "https://example.com",
  "discord": "https://discord.gg/example",
  "owner": { "username": "Hexeption" },
  "createdAt": "2026-11-16T03:00:00Z",
  "approvedAt": "2026-11-16T04:00:00Z"
}
```

### OwnedServer

What owners see in their dashboard: a `Server` plus:

```json
{
  "id": "srv_k2p9q1",
  "state": "approved",
  "listed": true,
  "verified": true,
  "verifyCode": "scr-7Q4M2K",
  "reviewNote": null,
  "sortWeight": 0,
  "submittedAt": "2026-11-16T03:30:00Z",
  "pendingRevision": { "name": "New name", "shortDescription": "...", "submittedAt": "2026-11-17T10:00:00Z" }
}
```

`pendingRevision` is `null` when there is none. It only holds the fields that changed, using the listing's names (`name`, `address`, `port`, `shortDescription`, `description`), plus `iconUrl` and `bannerUrl` for image changes (`null` when the image is being removed).

A revision joins the review queue as soon as it exists; it needs no `/submit`. When staff reject a revision, it is dropped, the listing stays `approved`, and `reviewNote` holds the reason. When staff ask for changes on a revision, the revision stays, the listing stays `approved`, and `reviewNote` holds the note. A new edit to the revision clears nothing; the owner reads the note and edits again.

### Field rules

| Field | Rule |
|---|---|
| `name` | 3 to 48 characters |
| `address` | Hostname or IPv4 address. Not a private, loopback or link-local address. |
| `port` | 1 to 65535, default 25565 |
| `shortDescription` | 10 to 120 characters |
| `description` | Up to 5000 characters of Markdown. Rendered without raw HTML or images (an image shows as its alt text). |
| `tags` | 1 to 5 slugs from `GET /tags` |
| `website`, `discord` | `https://` URLs, optional. `discord` must be on `discord.gg` or `discord.com`. |
| icon | PNG, JPEG or WebP, up to 512 KB. Stored as a 64×64 PNG. |
| banner | PNG, JPEG, WebP or GIF, up to 2 MB. Stored as a 468×60 WebP. Animation is kept, up to 200 frames. |

Uploads must send `Content-Length`. A request declaring more than the limit plus a small multipart allowance is refused with `413` before its body is read, and chunked uploads get `411`.

### Public endpoints

| Method and path | Returns |
|---|---|
| `GET /servers` | `{ servers: ServerSummary[], page, perPage, total }` |
| `GET /servers/{slug}` | `Server` |
| `GET /tags` | `{ tags: [{ slug, name, count }] }` |
| `POST /servers/{slug}/report` (signed in) | `{ reason, details? }` → `201` |

`GET /servers` takes these query parameters:

- `q` searches the name, short description and address.
- `tag` filters by tag and can repeat.
- `version` matches against the status version name, such as `26.3`.
- `online=true` keeps only servers that are online.
- `sort` is `featured` (the default), `players`, `newest` or `name`. `featured` lists promoted servers first, then those staff featured, then by `sortWeight` and players.

A report's `reason` is one of `offline`, `wrong_info`, `inappropriate`, `scam`, `other`. `details` is up to 1000 characters.

### Owner endpoints (signed in)

| Method and path | Body | Returns |
|---|---|---|
| `GET /me/servers` | | `{ servers: OwnedServer[] }` |
| `POST /me/servers` | `{ name, address, port?, shortDescription, description?, tags, website?, discord? }` | `201 OwnedServer`, as a `draft` |
| `GET /me/servers/{id}` | | `OwnedServer` |
| `PATCH /me/servers/{id}` | Any of the create fields, plus `listed` | `OwnedServer` |
| `PUT /me/servers/{id}/icon` | `multipart/form-data` with `file` | `OwnedServer` |
| `PUT /me/servers/{id}/banner` | `multipart/form-data` with `file` | `OwnedServer` |
| `DELETE /me/servers/{id}/icon` | | `OwnedServer` |
| `DELETE /me/servers/{id}/banner` | | `OwnedServer` |
| `POST /me/servers/{id}/verify` | | `{ verified, motd, version, error? }` |
| `POST /me/servers/{id}/submit` | | `OwnedServer`, now `pending` |
| `POST /me/servers/{id}/withdraw` | | `OwnedServer`, back to `draft`; `400` if it isn't `pending` |
| `DELETE /me/servers/{id}` | | `204` |

On a draft, rejected or changes-requested listing, `PATCH` edits it in place. On an approved listing, it edits the pending revision. On a pending listing it answers `409` until the listing is withdrawn.

### Staff endpoints

| Method and path | Body | Returns |
|---|---|---|
| `GET /admin/queue` | | `{ items: [{ server: OwnedServer, kind: "new" \| "revision", submittedAt }] }`, oldest first |
| `POST /admin/servers/{id}/approve` | | `OwnedServer` |
| `POST /admin/servers/{id}/reject` | `{ reason }` | `OwnedServer` |
| `POST /admin/servers/{id}/request-changes` | `{ note }` | `OwnedServer` |
| `GET /admin/servers` | `?q&state&page&perPage` | `{ servers: OwnedServer[], page, perPage, total }` |
| `PATCH /admin/servers/{id}` | `{ featured?, sortWeight?, listed? }` | `OwnedServer` |
| `DELETE /admin/servers/{id}` | | `204` |
| `GET /admin/reports` | `?status=open\|resolved` | `{ reports: [{ id, server: { id, slug, name }, reason, details, reporter: { username }, status, resolution, createdAt, resolvedAt }] }` |
| `POST /admin/reports/{id}/resolve` | `{ resolution }` | the report |
| `GET /admin/users` | `?q&page` | `{ users: User[], page, perPage, total }` |
| `PATCH /admin/users/{id}` | `{ role?, banned? }` | `User` |
| `POST /admin/tags` | `{ slug, name }` (slug: 2 to 24 of `a-z 0-9 -`, name: 2 to 32 characters) | the tag; an existing slug is renamed |
| `DELETE /admin/tags/{slug}` | | `204` |

- Approving a revision copies its fields onto the listing.
- Rejecting a revision drops it and leaves the live listing as it was.
- A banned user can't sign in, and their listings are hidden.

## Promotions

Staff can promote an approved listing. Promoted servers sort first and carry a "Promoted" label.

- **Slots:** only `promoSlots` servers (default 6) can be promoted at the same time.
  - A grant without a start date begins at the earliest time a slot is free for its whole duration.
  - A server's next promotion starts after its current one ends.
- **Requirements:** only approved, listed SpoutCraft Redux servers show as promoted.

Paid promotions are planned and not part of this version.

### Promotion

```json
{
  "id": "pro_k2p9q1",
  "days": 7,
  "status": "active",
  "source": "staff",
  "startsAt": "2026-11-16T05:00:00Z",
  "endsAt": "2026-11-23T05:00:00Z",
  "note": "Launch partner",
  "createdAt": "2026-11-16T04:58:00Z",
  "paidAt": "2026-11-16T05:00:00Z"
}
```

`status` is one of:

| Status | Meaning |
|---|---|
| `scheduled` | Waiting for its slot |
| `active` | Running now |
| `ended` | Finished |
| `cancelled` | Ended early by staff |

### Endpoints

| Method and path | Body | Returns |
|---|---|---|
| `GET /me/servers/{id}/promotions` | | `{ promotions: Promotion[] }` |
| `GET /admin/promotions` | | `{ slots, promotions: [Promotion + server: { id, slug, name }] }` |
| `POST /admin/promotions` | `{ server, days, startsAt?, note? }` (`server` is a slug or id; `days` 1 to 365; `note` up to 500 characters) | `201 Promotion` |
| `POST /admin/promotions/{id}/cancel` | `{ note? }` | `Promotion` |
| `GET /admin/settings` | | `{ promoSlots }` |
| `PATCH /admin/settings` | `{ promoSlots }` (0 to 50) | `{ promoSlots }` |

## Images

Uploads are re-encoded with sharp, which also strips metadata, and stored under their SHA-256. They are served from `https://api.spoutcraftredux.org/media/<sha256>.<ext>` with a one-year immutable cache. Staff review the images as part of the listing, and an image change on an approved listing goes through the revision.

Images that no listing or pending revision uses any more are deleted by the hourly maintenance task once they are a day old.

## Email

Optional. When SMTP is configured, owners with an email address get mail when their listing is approved, rejected or needs changes. Password reset by email comes later.
