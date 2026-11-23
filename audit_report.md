# CricketVault — Integration Audit Report

## Architecture Summary

### Backend (`d:\freelance\server`)
| Component | Detail |
|---|---|
| Framework | Express 4 + TypeScript (ESM) |
| Database | MongoDB via Mongoose 8 |
| Auth | JWT (bcryptjs + jsonwebtoken) |
| Validation | Zod |
| Payments | Razorpay (test mode) with webhook + manual verify |
| Storage | Local dev (signed URLs) or S3 |
| Tests | Vitest |
| Entry | `src/index.ts` → `src/app.ts` |

### Frontend (`d:\freelance\client`)
| Component | Detail |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Routing | react-router-dom v7 |
| State | React Context (`AppContext`) — **100% mock/localStorage** |
| API Client | axios (installed, **unused**) |
| Forms | react-hook-form + zod (installed, **unused**) |

---

## Critical Finding: NO API INTEGRATION

The frontend is **entirely offline**. It uses hardcoded mock data in `services/mockData.ts` and manages all state in `AppContext` via `useState` + `localStorage`. There are **zero HTTP calls** to the backend.

The login page uses string matching (`emailOrPhone.includes('coach')`) to switch between mock users rather than actual JWT authentication.

---

## API Contract Audit Matrix

| Feature | Backend API | Frontend Status | Gap |
|---|---|---|---|
| **Auth: Register** | `POST /api/v1/auth/register` | Mock (switchUser) | Missing: Real registration form → API call |
| **Auth: Login** | `POST /api/v1/auth/login` | Mock (string matching) | Missing: Real login → JWT → storage |
| **Auth: Me** | `GET /api/v1/auth/me` | None | Missing: Token validation on page load |
| **Player Profile: Get** | `GET /api/v1/players/me` | Mock (localStorage) | Missing: API fetch |
| **Player Profile: Update** | `PUT /api/v1/players/me` | Mock (setState) | Missing: API call |
| **Coach Profile: Get** | `GET /api/v1/coaches/me` | Mock | Missing: API fetch |
| **Coach Profile: Update** | `PUT /api/v1/coaches/me` | Mock | Missing: API call |
| **Coach Directory** | `GET /api/v1/coaches` | Mock | Missing: API fetch |
| **Plans** | `GET /api/v1/plans` | Mock (SUBSCRIPTION_PLANS) | Missing: API fetch |
| **Subscriptions: Create** | `POST /api/v1/subscriptions` | Mock (purchaseSubscription) | Missing: Real order + Razorpay |
| **Subscriptions: My** | `GET /api/v1/subscriptions/me` | Mock | Missing: API fetch |
| **Payment: Verify** | `POST /api/v1/payments/:id/verify` | None | Missing: Razorpay callback flow |
| **Payment: Dev Confirm** | `POST /api/v1/subscriptions/:id/dev-confirm-payment` | None | Missing: Dev-mode shortcut |
| **Coach Request** | `POST /api/v1/subscriptions/:id/coach-requests` | Mock (requestCoach) | Missing: API call |
| **Coach: Incoming Requests** | `GET /api/v1/coach-requests/incoming` | Mock | Missing: API fetch |
| **Coach: Respond** | `POST /api/v1/coach-requests/:id/respond` | Mock (respondToCoachRequest) | Missing: API call |
| **Coach: My Players** | `GET /api/v1/coach/players` | Mock | Missing: API fetch |
| **Video: Upload** | `POST /api/v1/videos` (multipart) | Mock (URL.createObjectURL) | Missing: Real upload |
| **Video: List** | `GET /api/v1/videos` | Mock | Missing: API fetch |
| **Video: Access URL** | `GET /api/v1/videos/:id/access` | None | Missing: Signed URL fetch |
| **Review: Create** | `POST /api/v1/videos/:id/reviews` | Mock (submitCoachReview) | Missing: API call |
| **Review: Get** | `GET /api/v1/videos/:id/reviews` | Mock | Missing: API fetch |
| **Action Plan: Get** | `GET /api/v1/action-plans/:subId` | Mock | Missing: API fetch |
| **Action Plan: Update** | `PUT /api/v1/action-plans/:subId` | Mock | Missing: API call |
| **Action Plan: Task Toggle** | `PATCH /api/v1/action-plans/:subId/tasks/:taskId` | Mock (toggleActionPlanTask) | Missing: API call |
| **Notifications: List** | `GET /api/v1/notifications` | Mock | Missing: API fetch |
| **Notifications: Read** | `PATCH /api/v1/notifications/:id/read` | Mock (markNotificationAsRead) | Missing: API call |
| **Admin: Overview** | `GET /api/v1/admin/overview` | Mock | Missing: API fetch |
| **Admin: Subscriptions** | `GET /api/v1/admin/subscriptions` | Mock | Missing: API fetch |
| **Admin: Coaches** | `GET/PATCH /api/v1/admin/coaches` | Mock | Missing: API fetch/update |
| **Admin: Plans** | `GET/POST/PATCH /api/v1/admin/plans` | Mock | Missing: API calls |
| **Admin: Audit** | `GET /api/v1/admin/audit` | Mock | Missing: API fetch |

---

## Type Mismatches: Frontend vs Backend

| Field | Frontend Type | Backend Schema | Resolution |
|---|---|---|---|
| User ID | `string` ('user-rahul') | MongoDB `ObjectId` | Frontend must use real IDs from API |
| User role | `'player' \| 'coach' \| 'admin'` | `'PLAYER' \| 'COACH' \| 'ADMIN'` | Normalize in API service |
| Subscription status | `'active' \| 'pending_coach' \| 'expired'` | `'PENDING_PAYMENT' \| 'AWAITING_COACH' \| 'ACTIVE' \| 'EXPIRED' \| 'CANCELLED' ...` | Map in API service |
| Plan price | `number` (INR rupees) | `number` (paise) | Divide by 100 in API service |
| Player profile | Nested in `User.cricketProfile` | Separate `PlayerProfile` collection | Compose in API service |
| Coach profile | Nested in `User.coachProfile` | Separate `CoachProfile` collection | Compose in API service |
| Dates | ISO strings | Mongoose Date objects (ISO in JSON) | Compatible |

---

## Integration Strategy

### Approach: API Service Layer + Dual-Mode Context

Rather than rewriting all 30+ page components, I will:

1. **Create `src/services/api.ts`** — axios-based API client with JWT interceptors
2. **Create `src/context/AuthContext.tsx`** — real auth state (token, user, login/register/logout)
3. **Refactor `AppContext.tsx`** to call real APIs when a backend connection is available, falling back to mock data for demo mode
4. **Restore the Vite proxy** to forward `/api` to `localhost:4000`
5. **Add `STORAGE_SIGNING_SECRET`** to the server `.env`
6. **Add missing backend endpoints**: admin users list
7. **Fix the seed** to include a demo player for quick login

This preserves the existing UI completely while enabling real backend integration.

---

## Backend Issues to Fix

1. **Missing `STORAGE_SIGNING_SECRET`** in `.env` — local video storage will crash without it
2. **Missing admin users endpoint** — frontend's AdminUsersPage needs `GET /api/v1/admin/users`
3. **Seed script** only creates admin + 1 coach + 2 plans — need a demo player for quick login flow
4. **Coach directory** uses `_id` (CoachProfile ID) but frontend sends coach user ID — need to verify coach-request endpoint accepts user ID
5. **CORS** hardcoded to `CLIENT_URL` — fine for dev

## Security Notes (Already Good)

- ✅ JWT auth with role-based middleware
- ✅ Razorpay signature verification (HMAC-SHA256)
- ✅ Webhook idempotency (WebhookEvent model)
- ✅ Signed video URLs with HMAC
- ✅ Rate limiting on auth routes
- ✅ Helmet headers
- ✅ File type/size validation
- ✅ Zod validation on all inputs
- ✅ Ownership checks on all resource access
- ✅ Subscription state machine with transactions
