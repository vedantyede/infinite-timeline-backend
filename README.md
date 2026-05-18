# Timeline Backend

Node.js + TypeScript + MongoDB REST API for the Event Timeline dashboard.

---

## Folder Structure

```
src/
├── config/
│   ├── index.ts         # Typed env config
│   ├── database.ts      # Mongoose connect / disconnect
│   └── logger.ts        # Winston logger
├── controllers/
│   ├── authController.ts
│   └── eventController.ts
├── middleware/
│   ├── auth.ts          # JWT authentication
│   ├── errorHandler.ts  # Global error + 404 handler
│   └── validate.ts      # Joi middleware factory
├── models/
│   ├── User.ts          # Mongoose User schema
│   └── Event.ts         # Mongoose Event schema + indexes
├── routes/
│   ├── auth.ts
│   └── events.ts
├── services/
│   ├── eventService.ts  # All DB / query logic
│   └── tokenService.ts  # JWT sign / verify
├── types/
│   └── index.ts         # Shared TypeScript interfaces
├── utils/
│   ├── errors.ts        # AppError hierarchy
│   ├── response.ts      # sendSuccess / sendError / pagination
│   └── validators.ts    # Joi schemas
├── app.ts               # Express app (middleware + routes)
└── server.ts            # Entry point + graceful shutdown
```

---

## Setup

```bash
cp .env.example .env          # fill in MONGODB_URI and secrets
npm install
npm run dev                   # ts-node-dev with hot reload
npm run build && npm start    # production
```

---

## API Reference

### Auth  `/api/auth`

| Method | Path        | Auth | Body                          | Description        |
|--------|-------------|------|-------------------------------|--------------------|
| POST   | /register   | ✗    | `{ name, email, password }`   | Register new user  |
| POST   | /login      | ✗    | `{ email, password }`         | Login              |
| POST   | /refresh    | ✗    | `{ refreshToken }`            | Rotate tokens      |
| POST   | /logout     | ✓    | —                             | Invalidate refresh |
| GET    | /me         | ✓    | —                             | Current user       |

### Events  `/api/events`  (all require `Authorization: Bearer <token>`)

| Method | Path              | Description                       |
|--------|-------------------|-----------------------------------|
| GET    | /                 | List events (paginated, filtered) |
| POST   | /                 | Create event                      |
| GET    | /:id              | Get single event                  |
| PATCH  | /:id              | Partial update                    |
| DELETE | /:id              | Delete event                      |
| DELETE | /bulk             | Bulk delete `{ ids: string[] }`   |
| GET    | /stats            | Timeline overview stats           |
| GET    | /stats/categories | Per-category counts               |

### Query params for `GET /api/events`

| Param        | Type    | Example              | Description                        |
|--------------|---------|----------------------|------------------------------------|
| `page`       | number  | `1`                  | Page number (default 1)            |
| `limit`      | number  | `20`                 | Page size (max 100, default 20)    |
| `sortBy`     | string  | `sortDate`           | `sortDate`, `title`, `createdAt`   |
| `order`      | string  | `asc`                | `asc` or `desc`                    |
| `categories` | string  | `polity,history`     | Comma-separated category filter    |
| `isExact`    | boolean | `true`               | Filter by isExact flag             |
| `rangeMode`  | string  | `range`              | `year` or `range`                  |
| `search`     | string  | `independence`       | Full-text search (title + desc)    |
| `fromYear`   | string  | `1900`               | Events from this year onwards      |
| `toYear`     | string  | `2000`               | Events up to and including year    |

---

## Event Payloads

### Exact event

```json
{
  "title": "Independence Day",
  "description": "...",
  "categories": ["polity", "history"],
  "isExact": true,
  "date": "1947-08-15"
}
```

### Year event

```json
{
  "title": "Cold War Era",
  "categories": ["history"],
  "isExact": false,
  "rangeMode": "year",
  "year": "1947"
}
```

### Range event

```json
{
  "title": "Sam Life",
  "categories": ["other"],
  "isExact": false,
  "rangeMode": "range",
  "startDate": "2010-01-01",
  "endDate": "2025-12-03"
}
```

---

## Performance Notes

- **`sortDate` / `endSortDate`** are denormalized on write so chronological
  ordering never requires computed fields at query time.
- **Compound indexes** lead with `userId` — every query is scoped to one user.
- **`.lean()`** is used on all list queries to skip Mongoose hydration.
- **`Promise.all([count, find])`** runs `countDocuments` and `find` in parallel.
- **Connection pool** is set to `maxPoolSize: 20` — tune per your workload.
- **Text index** on `title` + `description` for full-text search (compatible with
  MongoDB Atlas Search or local `$text`).
