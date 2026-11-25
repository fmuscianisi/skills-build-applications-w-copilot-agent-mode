# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team, and the user must belong to that team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Creating a team moves supplied members from their previous teams. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep route components focused on rendering and use `src/api/client.ts` for typed API requests, with visible loading, empty, and error states.
- Logic tier decision: Keep HTTP handling in Express routes and request validation and business behavior in `octofitService.ts`; return deliberate 4xx responses for invalid or unknown input.
- Data tier decision: Enforce required fields and relationships in Mongoose schemas, and keep demo fixtures stable and idempotent through keyed upserts without deleting unrelated records.
- Activity tracking approach: Validate activity input and existing user/team ObjectIds and membership, then store the referenced records, submitted activity details, computed points, and occurrence time.
- Team management approach: Validate team names and member IDs, remove members from previous teams, update their team references, and return teams with their member IDs. These sequential writes support standalone MongoDB but are not atomic; a failure or concurrent update can leave membership inconsistent.
- Leaderboard approach: Aggregate activity points by team, sort totals descending, and assign 1-based ranks.
- Workout suggestions approach: Match a user by email, prefer workouts matching their goal or recent activity, and explain the recommendation; return a 4xx for an unknown email.

## Test plan

- Baseline: `npm test --prefix octofit-tracker/backend` — 8 failed, 1 passed; `npm test --prefix octofit-tracker/frontend` — 15 failed. The failures reproduce the intentionally incomplete model, API, and presentation behavior.
- Data tier: `npm run test:data --prefix octofit-tracker/backend` — schema invariants, safe/idempotent seeding, and demo relationships.
- Logic tier: `npm run test:api --prefix octofit-tracker/backend` — HTTP status codes, input/reference validation, persisted activity/team behavior, leaderboard ordering, and workout recommendations.
- Presentation tier: `npm test --prefix octofit-tracker/frontend` — API-driven route content and accessible loading, empty, and error states.
- Backend build: `npm run build --prefix octofit-tracker/backend` — TypeScript errors indicate invalid or inconsistent backend types.
- Frontend build: `npm run build --prefix octofit-tracker/frontend` — TypeScript or Vite errors indicate invalid or inconsistent frontend code.
