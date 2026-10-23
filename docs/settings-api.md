# Access control API — the contract the Settings screen codes against

The Settings screen reads and writes the role matrix through the canteen
backend's **rbac** service. The types are in `data/Settings/type.ts`; the client
is `data/Settings/api.ts`; the screen itself is
`app/(app)/settings/page.tsx`.

Three routes, all relative to `NEXT_PUBLIC_API_BASE_URL`, which already ends in
`/api`:

```
GET  {API_BASE_URL}/rbac/permissions
PUT  {API_BASE_URL}/rbac/permissions
POST {API_BASE_URL}/rbac/permissions/reset
```

Requests carry `Authorization: Bearer <accessToken>`. The token is attached by
the global fetch interceptor (`utils/authFetchInterceptor.ts`), which also
refreshes it once on a 401 and replays the request.

## The envelope

```json
{
  "statusCode": 200,
  "message": "Permissions fetched.",
  "success": true,
  "data": {}
}
```

`data` holds the payload. On a failure `message` carries the reason and the
screen shows it verbatim, so a 400 should name the offending key.

## GET /rbac/permissions

The whole board in one call:

```json
{
  "statusCode": 200,
  "message": "Permissions fetched.",
  "success": true,
  "data": {
    "roles": ["Admin", "Kitchen Manager", "Supervisor", "Dietitian", "Nurse", "Store Keeper", "Cashier"],
    "actions": ["viewDashboard", "manageAssessments", "..."],
    "permissions": ["yes", "request", "may be", "no"],
    "defaults": { "adjustInventory": { "Kitchen Manager": "request", "Supervisor": "yes", "Store Keeper": "yes" } },
    "live":     { "adjustInventory": { "Kitchen Manager": "request", "Supervisor": "yes", "Store Keeper": "yes" } },
    "overrides": {},
    "claimDefaults":  { "admin": "Admin", "kitchenmanager": "Kitchen Manager" },
    "claimLive":      { "admin": "Admin", "kitchenmanager": "Kitchen Manager" },
    "claimOverrides": {},
    "routes": [
      { "method": "GET", "path": "/api/inventory", "actions": ["adjustInventory"] },
      { "method": "GET", "path": "/api/rbac/permissions", "roles": ["Admin"] }
    ]
  }
}
```

Matrices are `action → role → permission`. A missing cell means `"no"`.

- `defaults` — the coded baseline (`src/Roles.ts` on the backend).
- `overrides` — only the cells an admin changed.
- `live` — `defaults` merged with `overrides`, cell by cell: what the next
  request is enforced against.

The screen marks a cell **custom** when it appears in `overrides`, even if its
value happens to equal the default. That is the backend's own rule for "an
admin chose this", and the screen repeats it rather than second-guessing it.

`routes` is the endpoint registry the matrix is applied to — code, not
configuration. The Settings screen does not draw from it (its rows are the
app's screens), but it is part of the contract.

`claimDefaults` / `claimLive` / `claimOverrides` map HMS claim strings to
canteen roles. The provider carries them; no screen edits them yet.

The screen renders its headers from `roles`, `actions` and `permissions`, so a
role or action added in `Roles.ts` is editable without a frontend change. Ids
this build does not know are filtered out — and because a save is a merge, a
filtered cell is never erased.

## PUT /rbac/permissions

A partial merge. Both keys are optional; omitted cells keep their current value.

```json
{
  "roleActions": { "manageSettings": { "Supervisor": "yes" } },
  "roleFromClaims": { "dietitian": "Dietitian" }
}
```

Answers with:

```json
{ "updatedBy": "hms_admin_1", "live": { "manageSettings": { "Supervisor": "yes" } } }
```

- The body is validated key by key against `roles`, `actions` and
  `permissions`; an unknown key is a **400 naming that key**.
- `updatedBy` is the HMS `_id` of the caller, for the audit trail.
- The response echoes `live` only — not `overrides` — so the screen merges the
  cells it just sent into its own copy instead of refetching.

**The client sends only the cells it changed.** A save of three toggles is a
three-cell body; it never rewrites the matrix, so two admins editing different
cells cannot overwrite each other.

## POST /rbac/permissions/reset

No body. Drops every override; enforcement falls back to `defaults`. Answers
`{ "live": { … } }`.

The screen asks for confirmation before calling it, then treats the answer as
"nothing is custom any more".

## Screens are derived from actions

The backend stores an **action** matrix. The app's screens are not in it, and
they do not need to be: `Roles.ts` declares which action(s) live on each screen
(`SCREEN_ACTIONS`), and a role may open a screen when the matrix answers `"yes"`
or `"may be"` for at least one of them.

```
/inventory       → adjustInventory
/cafeteria       → registerTable, settleCafeteriaBill
/tables          → placeTableOrder, registerTable
/settings        → manageSettings
```

That rule reproduces every role's previous screen list exactly — including the
Kitchen Manager being shut out of `/inventory` (their `adjustInventory` is
`"request"`, which grants nothing) and `/settings` opening automatically once
`manageSettings` is granted.

In the matrix:

- switching a screen **on** grants the screen's **primary** action — the first
  one listed — not all of them: letting someone into the cafeteria is not the
  same as letting them settle a bill;
- switching a screen **off** sets **every** action on it to `"no"`, because any
  surviving action would re-open the route.

## Open issues for the backend team

1. **`GET` is Admin-only, so a role cannot read the matrix its own
   navigation is built from.** All three routes are guarded by a
   `roles: ["Admin"]` registry entry. An admin can grant a role
   `manageAssessments`, and the matrix stores it correctly — `live` includes it
   — but the role cannot *read* the matrix, so the app falls back to the
   built-in one, its sidebar omits the screen, and `RoleGuard` blocks the URL.
   The grant is saved; it is simply unreadable to the role it was granted to.

   Guarding the GET by `manageSettings` is **not enough**: that only helps a
   delegated admin. A Kitchen Manager granted `manageAssessments` still has no
   `manageSettings`, so it still gets a 403 — and that is the case that matters,
   because every role needs its own permissions to draw its own sidebar.

   Two ways to close it:

   **a. Let any signed-in caller read the board (one line, no app work).**
   Drop the role guard from the GET:

   ```ts
   // before
   { method: "GET", path: "/api/rbac/permissions", roles: ["Admin"] },
   // after — any authenticated caller, no role or action requirement
   { method: "GET", path: "/api/rbac/permissions" },
   ```

   The app then works unchanged for every role: `prove.mjs` confirms that with
   that one read answered, the granted screen appears in the sidebar and opens.
   The cost is that every role can see the whole board, including other roles'
   cells and the claim mappings. The `defaults` already ship in the JS bundle;
   `overrides` do not.

   **b. Add `GET /api/rbac/permissions/me` (tighter, small app change).**
   Return only the caller's own row, which is all the sidebar and the guard
   need:

   ```json
   { "statusCode": 200, "success": true,
     "data": { "role": "Kitchen Manager",
               "live": { "manageAssessments": "yes", "manageInventory": "no" } } }
   ```

   Keep the board Admin-only (or `actions: ["manageSettings"]` for delegated
   admins, which then also reads the full board). The app would call `/me`
   whenever the board is refused and use it for `canAccessPath`, `can` and the
   sidebar. Say the word and I will wire it; until the route exists I am not
   going to code against a path the backend does not serve.

   `PUT` and `POST /reset` should stay `roles: ["Admin"]` either way.

2. **There is no per-cell delete.** Returning a changed cell to its default
   value stores an override equal to the default, which the screen then marks
   custom forever. A `DELETE`-style "drop this cell" (or accepting `null` as
   "unset") would let an admin undo a single change without resetting the whole
   matrix.

3. **There is no per-user role assignment.** The screen previously had a
   *Users & roles* tab backed by `GET /settings/users` and
   `PATCH /settings/users/:user_id`. Those routes do not exist, so the tab is
   gone. If per-user roles are wanted, they need an endpoint; `roleFromClaims`
   is a different thing — it maps an HMS claim string to a canteen role, and the
   provider already carries it for the tab that will edit it.

4. **A 404 is an error, not "nothing stored".** The screen now says the API is
   missing rather than silently running on the built-in matrix and calling it
   live. That is deliberate; if the route is ever rolled out gradually, say so
   and the two cases can be told apart.

## Vocabulary

Roles are the exact JWT `userType` values:

```
Admin, Kitchen Manager, Supervisor, Dietitian, Nurse, Store Keeper, Cashier
```

Permissions: `"yes"` and `"may be"` grant; `"request"` grants nothing (there is
no approval flow yet); `"no"` — and any missing cell — denies.

Actions are the ids in `ACTIONS` in `Roles.ts`. `Admin` is exempt from the
matrix and always answers `"yes"`; it is never written to `overrides`.
