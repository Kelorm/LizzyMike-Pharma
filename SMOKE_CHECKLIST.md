# Remediation smoke checklist (LAN)

1. Set `POSTGRES_PASSWORD` and start stack / backend with `DJANGO_ENV=lan` or `development`.
2. Open SPA, confirm `/api/v1/auth/csrf/` sets `csrftoken`.
3. Login via `/login` — DevTools Application: `access_token` / `refresh_token` httpOnly cookies present; **no** tokens in localStorage.
4. Create a sale — totals match server math; stock decreases; Stock Movements page shows negative sale qty.
5. Apply a discount via `discount_ids` — `discount_total` and `current_usage` update.
6. Restock — stock increases; movement type `restock` appears.
7. Admin: `/audit` and `/stock-movements` load; staff cannot open `/audit`.
8. Logout — cookies cleared; protected routes redirect to `/login`.
9. Docker healthcheck hits `/api/v1/health/live/` (unauthenticated 200).
