# Parker & Bennett Schedule

A lightweight, mobile-first schedule app for sharing kids' itineraries with family. Built during a Copilot CLI session.

**Live URL:** https://kidsschedvxtpds.z20.web.core.windows.net/

---

## What It Does

A self-contained single-page web app for managing a 4-day kids schedule (March 3–6, 2026) while parents are out of town. Grandparents can open the URL and see the live schedule; parents can edit from any device and changes sync instantly via Azure Blob Storage.

---

## Features

| Feature | Details |
|---|---|
| **Day view** | Single-day view with `‹ Date ›` nav, swipe left/right between days, animated slide transitions with rubber-band at boundaries |
| **4-Day view** | Outlook-style grid showing all 4 days with time slots, starting at 5 AM |
| **Agenda view** | Clean per-day list, easy to read on mobile or print |
| **Smart default view** | Mobile devices (phone/tablet) open in Day view; desktop/laptop opens in 4-Day view automatically |
| **Add / Edit / Delete events** | Modal form with title, child selector, date, start/end time, notes, location |
| **Repeating events** | Checkbox any combination of the 4 days when adding; edit/delete "this day only" or "all days" |
| **Location autocomplete** | Types-ahead using Nominatim (OpenStreetMap) — no API key required; taps open Google Maps |
| **Child color coding** | Parker = blue, Bennett = green, Both = purple |
| **Azure Blob sync** | Events stored in Azure Blob Storage; all devices see the same live data; auto-refreshes every 30s |
| **Offline fallback** | Falls back to `localStorage` cache if Azure is unreachable; shows sync status pill |
| **Export iCal** | Downloads `.ics` file importable into Google Calendar, Apple Calendar, Outlook |
| **Import JSON** | Restore events from a JSON backup file |
| **Print / PDF** | Print-optimized CSS; prints agenda view cleanly |

---

## Architecture

```
Browser (any device)
  └─ index.html  (hosted on Azure Blob Storage static website)
       ├─ GET events.json  (read-only SAS → Azure Blob Storage `data` container)
       └─ POST saveEvents  (Azure Function → writes events.json server-side)
```

- **Hosting:** Azure Blob Storage static website (`$web` container)
- **Event reads:** Azure Blob Storage `data/events.json` via read-only SAS token (no write permission in browser)
- **Event writes:** Azure Function `kids-schedule-fn/saveEvents` — holds the storage write key server-side
- **No frontend framework** — pure vanilla HTML + CSS + JS, single file
- **CI/CD:** GitHub Actions deploys `index.html`, `robots.txt`, and the Azure Function on every push to `master`

### Azure Resources

| Resource | Name |
|---|---|
| Resource Group | `kids-schedule-rg` |
| Storage Account | `kidsschedvxtpds` |
| Region | `eastus2` |
| Static site container | `$web` |
| Events container | `data` (private — no public access) |
| Function App | `kids-schedule-fn` (Node 20, Consumption plan) |
| Function | `saveEvents` (HTTP POST, function-key auth) |

---

## Security

| Control | Implementation |
|---|---|
| **No write credentials in browser** | Writes go through Azure Function proxy; only a read-only SAS is embedded in HTML |
| **Short-lived SAS** | Read SAS expires 2026-03-31; renew via `az storage blob generate-sas` |
| **Private blob container** | `data` container has public access disabled; requires SAS for all reads |
| **Content Security Policy** | CSP meta tag blocks external scripts, frames, objects; restricts `connect-src` to known endpoints |
| **No indexing** | `robots.txt` + `<meta name="robots">` block all crawlers and AI bots (GPTBot, Claude-Web, CCBot, etc.) |
| **Safe external links** | All `target="_blank"` links include `rel="noopener noreferrer"` |

---

## Local Development

No build step — just open `index.html` in a browser. Events will load from Azure (requires internet) and fall back to `localStorage` if offline.

To redeploy `index.html` manually:
```powershell
$key = (az storage account keys list --account-name kidsschedvxtpds --resource-group kids-schedule-rg --query "[0].value" -o tsv)
az storage blob upload --account-name kidsschedvxtpds --account-key $key --container-name '$web' --file index.html --name index.html --content-type "text/html" --overwrite
```

To redeploy the Azure Function manually:
```powershell
cd function && npm install --omit=dev && cd ..
Compress-Archive -Path function\* -DestinationPath fn.zip -Force
az functionapp deployment source config-zip --name kids-schedule-fn --resource-group kids-schedule-rg --src fn.zip
```

---

## CI/CD (GitHub Actions)

On every push to `master`, the workflow in `.github/workflows/deploy.yml`:
1. Uploads `index.html` and `robots.txt` to Azure Blob Storage `$web`
2. Zips and deploys the `function/` folder to `kids-schedule-fn`

**Required GitHub Secrets:**

| Secret | Purpose |
|---|---|
| `AZURE_STORAGE_KEY` | Primary key for storage account `kidsschedvxtpds` (used to upload static files) |
| `AZURE_STORAGE_CONNECTION_STRING` | Full connection string for `kidsschedvxtpds` (used by Function App) |

---

## Migrating Local Events to Azure

If you created events in the app before it was published to Azure, those events live in your browser's `localStorage` under the `file://` origin. Use the migration helper:

1. Open `migrate-events.html` locally in the same browser you used to build the schedule
2. Click **Download events-backup.json**
3. Open the Azure-hosted URL
4. Click **⬆ Import** → select the downloaded file

---

## Event Data Format

Events are stored as a JSON array in `data/events.json`:

```json
[
  {
    "id": "abc123",
    "title": "Soccer Practice",
    "child": "Parker",
    "date": "2026-03-03",
    "start": "14:00",
    "end": "15:30",
    "notes": "Bring cleats",
    "location": "Riverside Soccer Complex, Austin TX",
    "repeatId": "xyz789"
  }
]
```

`repeatId` links events in the same repeating series. Omitted for single events.

---

## Session Notes

This project was built entirely in Copilot CLI sessions. Here's the progression:

1. **Initial app** — Single HTML file with calendar + agenda views, add/edit/delete modal, localStorage persistence, child color coding, print CSS
2. **Location field** — Added location input to event modal, displayed on events with Google Maps link
3. **Location autocomplete** — Nominatim (OpenStreetMap) debounced autocomplete dropdown; keyboard navigable; fixed modal-close bug when picking suggestions outside modal bounds
4. **Repeating events** — "Repeat on" day checkboxes when adding; edit/delete scope (this day / all days); 🔁 indicator on repeated events
5. **iCal export** — Downloads RFC 5545-compliant `.ics` file for importing into any calendar app
6. **Azure hosting** — Azure Blob Storage static website hosting; removed JSON export in favor of iCal
7. **Azure event storage** — Events stored in Azure Blob `data/events.json` via SAS token; sync status pill; 30s auto-refresh; offline localStorage fallback; Import JSON button for backup restore
8. **Day view + swipe** — Single-day calendar with `‹ Date ›` nav and position dots; 3-view toggle (Day / 4-Day / Agenda); full drag-follow swipe with animated slide and rubber-band resistance at boundaries
9. **GitHub + CI/CD** — Repo created at `jrbanach/kids-schedule`; GitHub Actions auto-deploys on push to `master`
10. **Security hardening** — Azure Function write proxy (no write SAS in browser); CSP meta tag; robots.txt + noindex meta; `rel="noopener noreferrer"` on external links; private blob container; read-only short-lived SAS
11. **Smart default view** — Mobile devices open in Day view; desktop/laptop opens in 4-Day view (detected via `window.innerWidth`)
12. **Bug fix: event revert** — Azure Blob had no `Cache-Control` header; browsers were heuristically caching the response for hours, so the 30s auto-refresh kept returning stale data and overwriting local changes. Fixed by adding `{ cache: 'no-store' }` to all blob `fetch()` calls. Also added a `persistInFlight` guard so the auto-refresh is skipped while a save POST is still in-flight.
13. **Calendar start time** — Changed day/4-day grid start from 6 AM to 5 AM (`CAL_START = 5`)

---

## Deployment

Deployed and managed via GitHub Actions. See `.github/workflows/deploy.yml`.

