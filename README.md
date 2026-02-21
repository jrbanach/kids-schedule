# Parker & Bennett Schedule

A lightweight, mobile-first schedule app for sharing kids' itineraries with family. Built during a single Copilot CLI session.

**Live URL:** https://kidsschedvxtpds.z20.web.core.windows.net/

---

## What It Does

A self-contained single-page web app for managing a 4-day kids schedule (March 3–6, 2026) while parents are out of town. Grandparents can open the URL and see the live schedule; parents can edit from any device and changes sync instantly via Azure Blob Storage.

---

## Features

| Feature | Details |
|---|---|
| **Day view** | Single-day view with `‹ Date ›` nav, swipe left/right between days, animated slide transitions with rubber-band at boundaries |
| **4-Day view** | Outlook-style grid showing all 4 days with time slots |
| **Agenda view** | Clean per-day list, easy to read on mobile or print |
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
       └─ events.json  (read/written via SAS token to Azure Blob Storage `data` container)
```

- **Hosting:** Azure Blob Storage static website (`$web` container)  
- **Event storage:** Azure Blob Storage `data/events.json` (read/write via SAS token embedded in HTML)  
- **No backend / no framework** — pure vanilla HTML + CSS + JS, single file  
- **CI/CD:** GitHub Actions deploys `index.html` to Azure on every push to `main`

### Azure Resources

| Resource | Name |
|---|---|
| Resource Group | `kids-schedule-rg` |
| Storage Account | `kidsschedvxtpds` |
| Region | `eastus2` |
| Static site container | `$web` |
| Events container | `data` |

---

## Local Development

No build step — just open `index.html` in a browser. Events will load from Azure (requires internet) and fall back to `localStorage` if offline.

To redeploy manually:
```powershell
$key = (az storage account keys list --account-name kidsschedvxtpds --resource-group kids-schedule-rg --query "[0].value" -o tsv)
az storage blob upload --account-name kidsschedvxtpds --account-key $key --container-name '$web' --file index.html --name index.html --content-type "text/html" --overwrite
```

---

## CI/CD (GitHub Actions)

On every push to `main`, the workflow in `.github/workflows/deploy.yml` uploads `index.html` to Azure Blob Storage.

**Required GitHub Secret:**

| Secret | Value |
|---|---|
| `AZURE_STORAGE_KEY` | Primary key for storage account `kidsschedvxtpds` |

To rotate: generate a new key in Azure Portal → Storage Account → Access Keys, then update the GitHub secret.

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

This project was built entirely in a single Copilot CLI session. Here's the progression of what was built and why:

1. **Initial app** — Single HTML file with calendar + agenda views, add/edit/delete modal, localStorage persistence, child color coding, print CSS
2. **Location field** — Added location input to event modal, displayed on events with Google Maps link
3. **Location autocomplete** — Nominatim (OpenStreetMap) debounced autocomplete dropdown; keyboard navigable; fixed modal-close bug when picking suggestions outside modal bounds
4. **Repeating events** — "Repeat on" day checkboxes when adding; edit/delete scope (this day / all days); 🔁 indicator on repeated events
5. **iCal export** — Downloads RFC 5545-compliant `.ics` file for importing into any calendar app
6. **Azure hosting** — Azure Blob Storage static website hosting; removed JSON export in favor of iCal
7. **Azure event storage** — Events stored in Azure Blob `data/events.json` via SAS token; sync status pill; 30s auto-refresh; offline localStorage fallback; Import JSON button for backup restore
8. **Day view** — Single-day calendar with `‹ Date ›` navigation arrows and position dots; 3-view toggle (Day / 4-Day / Agenda); Day is default for mobile
9. **Swipe animation** — Full drag-follow swipe with 3-panel track (prev/current/next pre-rendered); animated slide on release; rubber-band resistance at boundaries; arrow buttons also animate

---

## Deployment

Deployed and managed via GitHub Actions. See `.github/workflows/deploy.yml`.
