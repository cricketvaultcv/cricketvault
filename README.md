---
noteId: "0dc05a40deb611f1b882cfa2058a6fdb"
tags: []

---

# CricketVault

CricketVault is a cricket-coaching platform built with React, Vite, and TypeScript on the client and Express, Mongoose, and TypeScript on the API. Players choose paid coaching plans, get matched with a coach, submit video links, receive reviews and action plans, and track their subscription. Administrators manage users, coaches, assignments, plans, coupons, resources, and video moderation.

## Application workflow

### Player

1. **Create an account.** Player email/password signup uses an optional referral code. If `MSG91_TEMPLATE_ID` is configured, signup also requires an Indian mobile number and activates the account with an SMS OTP. If it is not configured, signup activates through an email OTP instead; a mobile number is optional. User/profile/OTP records are committed together only after code delivery succeeds, so signup errors roll back those writes. Google signup is disabled; Google sign-in is available only for existing accounts.
2. **Verify email before buying.** At checkout, the player requests and enters an email OTP. OTPs expire after 10 minutes and have limited attempts. Password reset is also available by email OTP.
3. **Choose a plan.** Published plans and prices are managed by administrators. Players may enter a coupon at checkout; the API validates the coupon and calculates the final amount. Coupon details and the discounted price are recorded with the subscription.
4. **Pay.** Razorpay handles production and test payments. The API verifies payment details and signatures before enabling coach selection. An unsuccessful payment cancels the pending subscription. A player may cancel an unpaid subscription and choose a different plan; cancellation is blocked when payment is captured or still processing.
5. **Choose a coach.** The player requests an available, approved coach. Acceptance starts the subscription period. If a coach declines, the paid subscription remains available for another coach selection without another payment. Admins can directly assign a coach to an eligible paid subscription; that assignment starts the subscription immediately.
6. **Share videos and use feedback.** Players submit supported YouTube or Google Drive links from their dashboard. Drive links must allow access to anyone with the link. Coaches review submissions and provide feedback and action-plan tasks; players can view their progress and coach feedback while their subscription is active.
7. **Request a refund when eligible.** A player can request a refund for a verified, captured Razorpay transaction. The current policy deducts ₹80 for each submitted video, with the refund floored at zero. The server verifies the transaction with Razorpay before creating the refund. Admin account deletion does not issue a refund; an already-requested player refund continues to be reconciled.
8. **Use referral rewards.** A player can share their referral code from Player Settings. A new player enters the code only during signup. After the referred player completes their first successful subscription payment, the referrer earns five review credits. Credits are applied to the review allowance on the referrer's next successfully paid plan; they are not cash or a price discount.

### Coach

1. An administrator creates the coach account and shares its initial password securely. The coach signs in and can update their profile and availability.
2. The coach reviews incoming player requests and accepts or declines them. Acceptance activates the paid coaching period; a declined player can select another coach.
3. The coach reviews player video links, adds feedback, and creates or updates action-plan tasks. Coaches can monitor requests and assigned players from the dashboard.

### Administrator

1. Administrators sign in directly to the admin dashboard and are restricted to admin routes.
2. **Coach management** creates coach accounts, controls coach approval/availability and capacity, and provides direct assignment for paid subscriptions awaiting a coach. Coach account deletion is blocked while active assignments or unresolved requests remain.
3. **Plans and coupons** manages published plans and percentage or fixed-amount coupons, including optional expiry. Plans with subscription history should be unpublished rather than deleted.
4. **Users and subscriptions** provides account and subscription oversight. Deleting a player does not create a refund; financial and subscription history is retained. The deletion flow shows blockers and consequences before confirmation.
5. **Resources and videos** manages published resources and supports video moderation. Players can browse resources and submit video links for coaching review.

### Notifications and account preferences

Email OTPs are used for signup when SMS verification is not configured, subscription checkout, and password reset. Player email notifications can include signup welcome, payment, coach decision, video-review, action-plan, and account-deletion messages. Players can manage optional email notifications in Settings; verification emails remain mandatory. Signup SMS uses MSG91 only when `MSG91_TEMPLATE_ID` is set. WhatsApp notifications are not implemented.

## Local development

### Requirements

- Node.js and npm
- MongoDB configured as a replica set. Transactions are used by coach assignment and referral/payment workflows.
- Provider accounts/credentials for features you want to exercise: MSG91 for SMS OTP, Brevo for email, and Razorpay for checkout and refunds.

### Setup

1. From the repository root, install dependencies:

   ```sh
   npm install
   ```

2. Start a local single-node MongoDB replica set if needed. For example, start `mongod` with `--replSet rs0` and initialize it once:

   ```sh
   mongosh --eval "rs.initiate()"
   ```

3. Copy the server environment template and edit it:

   ```sh
   # macOS/Linux
   cp server/.env.example server/.env

   # Windows PowerShell
   Copy-Item server\.env.example server\.env
   ```

   Set at least `MONGODB_URI` and a long random `JWT_SECRET`. Configure MSG91, Brevo, and Razorpay credentials to use those integrations. Never commit `server/.env` or put private keys in client-side environment variables.

4. For local demo accounts and sample plans only, set `DEMO_ADMIN_PASSWORD`, `DEMO_COACH_PASSWORD`, and `DEMO_PLAYER_PASSWORD` in `server/.env`, then run:

   ```sh
   npm run seed
   ```

   The seed script is for development only and refuses to run when `NODE_ENV=production`. It creates demo accounts and sample plans. It does not provide hard-coded passwords.

5. Start the API and client:

   ```sh
   npm run dev
   ```

   Open `http://localhost:5173`. Vite proxies `/api` requests to the local API at `http://localhost:4000`; no client `.env` file is needed for local development.

### Environment variables

The complete placeholder template is [server/.env.example](./server/.env.example). Replace placeholders before using an integration.

| Variable | Required for | Notes |
| --- | --- | --- |
| `MONGODB_URI` | API and scripts | Use a replica-set/Atlas URI for transactions. |
| `JWT_SECRET` | API authentication and OTP hashing fallback | Use a long, unique random value. |
| `CLIENT_URL` | Browser/API CORS | Comma-separated allowed client origins; local default is `http://localhost:5173`. |
| `API_PORT` | Local API port | Defaults to `4000`; hosted services generally supply `PORT`. |
| `OTP_HASH_SECRET` | Optional OTP hashing key | If omitted, `JWT_SECRET` is used. |
| `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | Optional signup SMS verification | If `MSG91_TEMPLATE_ID` is set, both values must be valid and signup uses SMS. If the template ID is empty, signup uses email OTP instead. Configure the Flow template with the OTP mapped to `var1`. |
| `BREVO_API_KEY`, `EMAIL_FROM` | Email OTPs and notifications | Uses Brevo's HTTPS transactional email API. Verify the sender address/domain in Brevo; `EMAIL_FROM` accepts `Name <email@domain>` or a bare email address. |
| `RAZORPAY_MODE`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Online payments/refunds | Use matching Test Mode (`rzp_test_...`) or Live Mode (`rzp_live_...`) credentials. |
| `RAZORPAY_ALLOW_TEST_MODE_IN_PRODUCTION` | Testing payments on a deployed test service | Set to `true` only for an isolated test deployment that uses Razorpay Test Mode credentials. Keep `false` for live production. |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook validation | Configure the same secret in the Razorpay webhook settings. |
| `GOOGLE_CLIENT_ID` | Optional Google sign-in | Configure an OAuth Web client and authorized browser origins. Existing accounts only. |
| `DEMO_*_PASSWORD` | Local demo seed | Required by `npm run seed`; never use for production. |
| `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | One-time admin creation | Used by `npm run create-admin -w server`; password must be 12–128 characters. |

`PORT` is provided by some hosting platforms and takes precedence over `API_PORT`. `VITE_API_URL` is a client build-time setting used for deployment; set it to `https://<api-host>/api/v1` when the client and API are hosted on different origins.

## Production setup

This project uses Vercel for the static frontend and Render for the Express API. Vercel Pro and Render Starter provide paid hosting, but neither replaces production database backups, monitoring, security configuration, and real provider credentials. Keep a separate staging environment for test payments and pre-release checks.

1. Create a dedicated MongoDB Atlas production database on a replica-set-capable cluster. Use a unique database user with only the required database permissions, restrict network access according to Render's outbound IP configuration, enable automated backups, and test a restore. Do not share production data with staging.
2. Deploy the API to Render from [render.yaml](./render.yaml) using the Starter plan in the same region as the database when practical. The service must use `NODE_ENV=production`; Render supplies `PORT`, and the health endpoint is `/api/v1/health`.
3. Configure the Render API environment: `MONGODB_URI`, a strong unique `JWT_SECRET`, `CLIENT_URL` with the exact production frontend origins (comma-separated if needed), `BREVO_API_KEY`, `EMAIL_FROM`, `RAZORPAY_MODE=live`, matching live `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`. Add `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID` only if signup SMS verification is enabled. Keep `RAZORPAY_ALLOW_TEST_MODE_IN_PRODUCTION=false`. Never add server secrets to Vercel.
4. Deploy the client to Vercel Pro from the repository. `vercel.json` builds the client workspace and publishes `client/dist`. Set the Vercel **Production** environment variable `VITE_API_URL` to `https://<render-service>.onrender.com/api/v1` (or your API custom domain), then redeploy. Because the frontend uses a separate API origin, do not rely on the `/api/v1` local-development default.
5. Add the production frontend domain to Render's `CLIENT_URL` and configure the same domain in Vercel. If using a custom API domain, add it to Render, configure DNS/TLS, and use that HTTPS URL in `VITE_API_URL`.
6. Create the first production administrator without demo seeding. In a trusted environment with production `MONGODB_URI`, set `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and a unique `BOOTSTRAP_ADMIN_PASSWORD`, then run:

   ```sh
   npm run build -w server
   npm run create-admin -w server
   ```

   The command refuses to overwrite an existing account. Do not run `npm run seed` against production.
7. Configure the Razorpay live webhook at `https://<api-host>/api/v1/payments/webhook`. Subscribe to `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, and `refund.failed`. Keep the API key secret and webhook secret server-side.
8. Verify `https://<api-host>/api/v1/health`, then run end-to-end acceptance checks for signup, OTP delivery, checkout, coach assignment, video review, refunds, and webhook reconciliation. Use Razorpay Test Mode on a separate staging API/database with `RAZORPAY_ALLOW_TEST_MODE_IN_PRODUCTION=true`; never enable this override on the production API.

Monitor Vercel and Render usage, application errors, email delivery, database health, and payment/refund webhooks. Configure alerts and verify that backups can be restored; paid hosting does not replace operational monitoring.

## Security and operational notes

- Public registration is for players. Coaches are provisioned by administrators. Google signup is intentionally disabled so new players cannot bypass the configured signup verification flow.
- When `MSG91_TEMPLATE_ID` is configured, signup mobile OTP supports Indian `+91` numbers and requires valid MSG91 credentials. Without the template ID, signup does not require a mobile number and verifies the account by email OTP. Test the chosen delivery path before release.
- Email verification is required before subscription purchase even for existing players. Email is sent with Brevo's HTTPS API, so no SMTP host or SMTP port is required. Create a Brevo API key and verify the sender address/domain before testing delivery. Email and SMS provider delivery must be tested separately from unit tests.
- Subscription prices and coupon discounts are calculated and enforced by the API. Never trust a client-provided price or treat a browser payment callback alone as proof of payment.
- Production deployments reject Razorpay Test Mode by default. For an isolated Render staging API, use a separate database, set `RAZORPAY_ALLOW_TEST_MODE_IN_PRODUCTION=true`, `RAZORPAY_MODE=test`, and matching `rzp_test_...` credentials. Never enable this override on the live production API.
- Refunds require a verified Razorpay payment. Refund status is reconciled asynchronously through webhooks.
- MongoDB transaction support is required for transactional workflows. Confirm replica-set configuration, backups, and transaction behavior in the target environment.
- Video uploads are not stored by CricketVault; players share YouTube or Google Drive links. Existing legacy upload records may remain, but the platform no longer serves old uploaded file content.
- Configure HTTPS, least-privilege provider credentials, logging/monitoring, privacy and refund policies, data retention, and backups before production launch.
- The production API trusts one reverse-proxy hop for client IP detection and rate limiting. If you move to a hosting provider with a different proxy chain, adjust this trust setting for that provider.

## Tests and builds

Run from the repository root:

```sh
npm test
npm run build
```

`npm test` runs the server Vitest suite. `npm run build` type-checks and builds both the API and client. Automated tests cover selected payment, refund-policy, OTP, video-link, and coach-capacity logic; they do not replace acceptance tests against live Razorpay, MSG91, Brevo, or a MongoDB replica set.
