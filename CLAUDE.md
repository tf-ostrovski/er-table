# CLAUDE.md — er-table

Bundle rozszerzeń Directus. Zawiera dwa rozszerzenia:

1. **Viewport** (layout) — tabela z edycją komórek inline (dblclick), auto-zapisem i szufladą szczegółów
2. **PWA** (hook) — Progressive Web App: manifest, service worker, offline support

## Repo

```
git@github.com:tf-ostrovski/er-table.git
```

## Technologie

- **Directus Extensions SDK** (`@directus/extensions-sdk`)
- **Vue 3** (Composition API, `<script setup>`) — w layout viewport
- **TypeScript**
- **Build:** `directus-extension build` (oparty na Vite)

## Struktura

```
src/
├── viewport/             ← LAYOUT: tabela z inline edycją
│   ├── index.ts          ← entry point: defineLayout(), setup(), stan globalny
│   ├── layout.vue        ← główny komponent: tabela, paginacja, zarządzanie edycją
│   ├── editable-cell.vue ← pojedyncza komórka tabeli z trybem edycji (dblclick)
│   ├── detail-drawer.vue ← szuflada szczegółów (teleport do body, edycja przez API)
│   ├── options.vue       ← panel opcji layoutu (spacing, auto-save, delay)
│   ├── actions.vue       ← pasek akcji (licznik rekordów, przycisk "Save Changes")
│   ├── types.ts          ← LayoutOptions, LayoutQuery
│   └── use-subscription.ts ← composable: Directus real-time subscription
└── pwa/                  ← HOOK: PWA support
    ├── index.ts          ← defineHook(): embed manifest link + rejestracja SW routes
    ├── manifest.ts       ← generowanie Web App Manifest z ustawień Directus
    └── service-worker.ts ← skrypt service worker (cache strategies)

dist/
├── app.js                ← frontend bundle (layout viewport)
└── api.js                ← backend bundle (hook PWA)
```

## Komendy

```bash
npm run build   # jednorazowy build
npm run dev     # watch mode — przebudowuje dist/ przy każdej zmianie src/
```

## Jak działa edycja (viewport)

1. Użytkownik dwukrotnie klika komórkę → `editable-cell.vue` wchodzi w tryb edycji
2. Po `blur` / `Enter` → wartość trafia do `pendingEdits` (Map: `pk → {field: value}`)
3. Jeśli `autoSave=true` → timer (`autoSaveDelay` ms) → `flushEdits()` → `PATCH /items/{collection}/{pk}`
4. Jeśli `autoSave=false` → przycisk "Save Changes" w `actions.vue` → `flushEdits()`
5. Komórki z `isDirty=true` mają żółte tło (`color-mix` z `--theme--warning`)

## Jak działa PWA

1. Hook rejestruje 3 endpointy Express: `/manifest.json`, `/sw.js`, `/pwa/register-sw.js`
2. Embed `<link rel="manifest">` i `<script>` w `<head>` Directus
3. Service worker: cache-first dla statycznych assetów, network-first dla nawigacji, network-only dla API
4. Manifest pobiera ustawienia projektu (nazwa, logo, kolor) z `directus_settings`

## Deployment

Push do `main` → GitHub Actions → SSH na VPS → `deploy.sh` klonuje ten repo, buduje, montuje jako bind mount do kontenera Directus. Szczegóły w `../sys/scripts/deploy.sh`.

## Lokalne środowisko dev

Stack Docker żyje w `../sys/` (multi-root workspace `appka.code-workspace`).

```bash
# Start stacka (z katalogu sys)
cd ../sys && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Watch mode (z tego katalogu)
npm run dev

# Directus panel
http://localhost:8055
```

Rozszerzenie jest montowane jako bind mount w `docker-compose.dev.yml`:
```yaml
../er-table:/directus/extensions/er-table
```
`EXTENSIONS_AUTO_RELOAD=true` — Directus wykrywa zmiany w `dist/` automatycznie (kilka sekund).

## VPS — produkcja

| | |
|---|---|
| **URL** | https://directus.ostrowski.group |
| **Kontener** | `supabase-directus` |
| **SSH** | `ssh root@147.93.59.125` (klucz SSH) |
| **Extensions na VPS** | `/opt/sys/extensions/er-table/` (bind mount) |

```bash
# Sprawdź logi Directus na VPS
ssh root@147.93.59.125 "docker logs supabase-directus --tail 50"
```

## Znane ograniczenia / TODO

- Typy pól `alias`, `json`, `o2m`, `m2m`, `m2a` są readonly (brak inline edycji)
- `detail-drawer.vue` używa prostych `<input>` — brak komponentów Directus UI (v-interface)
- Wiele kolekcji nie ma primary key (`junction` tabele) — Directus je ignoruje (WARN w logach)
- Brak wirtualnego scrollowania — przy dużych kolekcjach może być wolno

## Baza danych

Directus używa schematu `directus` (nie `public`) — `DB_SEARCH_PATH=directus,ertable,extensions`.
Wszystkie tabele `directus_*` są w schemacie `directus`, dane biznesowe w schemacie `ertable`.
