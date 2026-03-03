import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  TableOfContents, PageBreak, TabStopPosition, TabStopType,
  Header, Footer, PageNumber, NumberFormat,
} from "docx";
import { writeFileSync } from "fs";

// ─── Helpers ────────────────────────────────────────────────────────────────

const FONT = "Calibri";
const FONT_SIZE = 22;          // half-points → 11pt
const HEADING_COLOR = "1B3A5C"; // dark navy
const ACCENT_COLOR = "2E74B5";  // blue accent
const TABLE_HEADER_BG = "2E74B5";
const TABLE_HEADER_FG = "FFFFFF";
const TABLE_ALT_BG = "F2F7FC";

const p = (text, opts = {}) => new Paragraph({
  spacing: { after: 120, line: 276 },
  ...opts,
  children: [new TextRun({ font: FONT, size: FONT_SIZE, ...opts.run, text })],
});

const bold = (text, extra = {}) => new TextRun({ font: FONT, size: FONT_SIZE, bold: true, ...extra, text });
const normal = (text, extra = {}) => new TextRun({ font: FONT, size: FONT_SIZE, ...extra, text });
const italic = (text, extra = {}) => new TextRun({ font: FONT, size: FONT_SIZE, italics: true, ...extra, text });

const heading = (text, level = HeadingLevel.HEADING_1) => new Paragraph({
  heading: level,
  spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 240, after: 120 },
  children: [new TextRun({ font: FONT, bold: true, color: HEADING_COLOR, text,
    size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 26 : 22 })],
});

const bullet = (children, level = 0) => new Paragraph({
  bullet: { level },
  spacing: { after: 60, line: 276 },
  children: Array.isArray(children) ? children : [normal(children)],
});

const multiRun = (runs, opts = {}) => new Paragraph({
  spacing: { after: 120, line: 276 },
  ...opts,
  children: runs,
});

// ─── Table builder ──────────────────────────────────────────────────────────

function makeTable(headers, rows) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      shading: { type: ShadingType.SOLID, color: TABLE_HEADER_BG },
      children: [new Paragraph({ spacing: { after: 40 }, children: [bold(h, { color: TABLE_HEADER_FG, size: 20 })] })],
      width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
    })),
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map(cell => new TableCell({
      shading: ri % 2 === 1 ? { type: ShadingType.SOLID, color: TABLE_ALT_BG } : undefined,
      children: [new Paragraph({ spacing: { after: 40 }, children: [normal(cell, { size: 20 })] })],
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

// ─── Decision block helper ──────────────────────────────────────────────────

function decisionBlock(title, problem, options, recommendation, impact) {
  return [
    heading(title, HeadingLevel.HEADING_3),
    multiRun([bold("Problem: "), normal(problem)]),
    p("Opcje:", { run: { bold: true } }),
    ...options.map(o => bullet(o)),
    multiRun([bold("Rekomendacja: "), normal(recommendation)]),
    multiRun([bold("Wpływ na przyszłość: "), italic(impact)]),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
//  DOCUMENT CONTENT
// ═══════════════════════════════════════════════════════════════════════════

const sections = [];

// ─── TITLE PAGE ─────────────────────────────────────────────────────────────

sections.push({
  properties: {},
  children: [
    new Paragraph({ spacing: { before: 4000 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ font: FONT, size: 56, bold: true, color: HEADING_COLOR,
        text: "Budowa interfejsu Airtable" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ font: FONT, size: 56, bold: true, color: HEADING_COLOR,
        text: "jako plugin Directus" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [new TextRun({ font: FONT, size: 28, color: ACCENT_COLOR,
        text: "Opracowanie strategiczno-techniczne" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [normal("Marzec 2026")],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [normal("Wersja 1.0")],
    }),
  ],
});

// ─── MAIN CONTENT ───────────────────────────────────────────────────────────

const mainChildren = [];

// ┌─ 1. EXECUTIVE SUMMARY ────────────────────────────────────────────────────

mainChildren.push(
  heading("1. Streszczenie (Executive Summary)"),

  p("Niniejszy dokument analizuje strategię rozbudowy istniejącego pluginu directus-viewport do pełnowartościowego interfejsu typu Airtable, działającego jako rozszerzenie Directus. Plugin w obecnej formie oferuje tabelaryczny widok z inline edycją komórek, auto-save i paginacją. Aby osiągnąć poziom UX zbliżony do Airtable, konieczne jest podjęcie kluczowych decyzji architektonicznych, które zdeterminują kierunek rozwoju na lata."),

  p("Dokument prezentuje trzy warianty architektoniczne (Layout extension, Module extension, Bundle extension), analizuje dziewięć kluczowych decyzji technicznych oraz proponuje czterofazowy roadmap implementacji. Rekomendowane podejście to ewolucyjny start od obecnego Layout extension (Faza 1-2), z przejściem na Bundle extension przy wdrażaniu multi-view (Faza 3+)."),
);

// ┌─ 2. STAN OBECNY ─────────────────────────────────────────────────────────

mainChildren.push(
  heading("2. Stan obecny — plugin directus-viewport"),

  heading("2.1. Zaimplementowane funkcjonalności", HeadingLevel.HEADING_2),

  bullet("Inline editing — podwójne kliknięcie komórki otwiera tryb edycji. Obsługiwane typy: string, integer, float, decimal, boolean, date, text, uuid, bigInteger."),
  bullet("Auto-save — konfigurowalny timer (200-10000 ms). Edycje trafiają do Map<pk, edits>, a po upływie czasu automatycznie wysyłany jest PATCH request."),
  bullet("Manual save — przycisk \"Save Changes\" w pasku akcji (gdy auto-save wyłączony)."),
  bullet("Detail drawer — wysuwany panel boczny (teleport do <body>) z edycją pełnego rekordu przez API."),
  bullet("Paginacja — konfigurowalne limity (10/25/50/100), nawigacja prev/next + bezpośredni input numeru strony."),
  bullet("Sortowanie — kliknięcie nagłówka kolumny przełącza: brak → ascending → descending → brak. Wskaźniki wizualne (strzałki)."),
  bullet("Selekcja — checkboxy na wierszach + select-all w nagłówku z trójstanowym stanem (none/some/all)."),
  bullet("Gęstość wierszy — trzy warianty: compact (36px), cozy (48px), comfortable (60px)."),
  bullet("Dirty state — zmodyfikowane komórki mają żółte tło (--theme--warning). Pulsująca kropka podczas zapisu."),
  bullet("Integracja z motywem Directus — CSS variables (--theme--*), BEM naming, sticky headers."),

  heading("2.2. Architektura techniczna", HeadingLevel.HEADING_2),

  makeTable(
    ["Komponent", "Plik", "Odpowiedzialność"],
    [
      ["Entry point", "index.ts", "defineLayout() — rejestracja, setup, stan globalny, composables"],
      ["Tabela", "layout.vue", "Renderowanie tabeli, paginacja, sortowanie, edycja, selekcja (~560 linii)"],
      ["Komórka", "editable-cell.vue", "Tryb display/edit, koercja typów, stany dirty/saving (~175 linii)"],
      ["Drawer", "detail-drawer.vue", "Panel boczny, niezależna edycja przez API, teleport (~330 linii)"],
      ["Opcje", "options.vue", "Sidebar: spacing, auto-save toggle, delay slider (~206 linii)"],
      ["Akcje", "actions.vue", "Pasek górny: licznik rekordów, przycisk Save (~72 linii)"],
      ["Typy", "types.ts", "LayoutOptions, LayoutQuery — interfejsy TS"],
    ],
  ),

  p(""),

  multiRun([bold("Composables Directus: "), normal("useItems() (pobieranie danych z paginacją), useCollection() (metadane kolekcji i pól), useApi() (Axios instance → PATCH requests), useSync() (two-way binding z rodzicem).")]),

  heading("2.3. Znane ograniczenia", HeadingLevel.HEADING_2),

  bullet("Brak virtual scrolling — renderuje wszystkie wiersze na stronie, wolne przy >500 rekordach na stronę."),
  bullet("Pola relacyjne (o2m, m2m, m2a) i JSON są readonly — brak inline edycji."),
  bullet("Detail drawer używa prostych <input> — brak komponentów Directus (v-interface)."),
  bullet("Brak nawigacji klawiaturowej między komórkami (strzałki, Tab)."),
  bullet("Brak column resize/reorder — kolejność kolumn z metadanych kolekcji."),
  bullet("Brak undo/redo — edycje commited natychmiast."),
  bullet("Brak filtrowania/grupowania w UI — poleganie na filtrach z kontekstu rodzica."),
  bullet("Brak bulk edit — selekcja istnieje, ale bez akcji zbiorczych."),
);

// ┌─ 3. ANALIZA LUK ─────────────────────────────────────────────────────────

mainChildren.push(
  heading("3. Analiza luk — Airtable vs stan obecny"),

  p("Poniższa tabela porównuje kluczowe funkcjonalności Airtable z obecnym stanem pluginu directus-viewport."),

  makeTable(
    ["Funkcjonalność", "Airtable", "directus-viewport", "Status"],
    [
      // Widoki
      ["Grid view (tabela)", "Tak — domyślny widok", "Tak — jedyny widok", "Zaimplementowane"],
      ["Kanban view", "Tak — drag & drop, grupowanie po polu", "Brak", "Brak"],
      ["Calendar view", "Tak — zdarzenia na osi czasu", "Brak", "Brak"],
      ["Gallery view", "Tak — karty z obrazkami", "Brak", "Brak"],
      ["Form view", "Tak — formularz do zbierania danych", "Brak", "Brak"],
      // Edycja
      ["Inline cell editing", "Tak — kliknięcie aktywuje edycję", "Tak — double-click", "Zaimplementowane"],
      ["Rich field editors (date picker, select, color)", "Tak — natywne edytory per typ", "Brak — plain <input>", "Brak"],
      ["Relational field editing (linked records)", "Tak — modal z wyszukiwaniem", "Brak — readonly", "Brak"],
      ["File/attachment fields", "Tak — upload, preview, gallery", "Brak", "Brak"],
      ["Long text / rich text", "Tak — expand + markdown/WYSIWYG", "Brak — obcięcie 240px", "Brak"],
      // Nawigacja
      ["Keyboard navigation (arrows, Tab)", "Tak — pełna nawigacja", "Brak", "Brak"],
      ["Column resize", "Tak — drag na granicy kolumny", "Brak", "Brak"],
      ["Column reorder", "Tak — drag & drop nagłówka", "Brak", "Brak"],
      ["Column hide/show", "Tak — menu z checkboxami", "Częściowo — meta.hidden", "Częściowe"],
      ["Row expand (detail view)", "Tak — modal z pełnym rekordem", "Tak — side drawer", "Zaimplementowane"],
      // Dane
      ["Filtering UI", "Tak — zaawansowany builder filtrów", "Brak — programatyczny filter", "Brak"],
      ["Grouping", "Tak — grupowanie po dowolnym polu", "Brak", "Brak"],
      ["Multi-column sort", "Tak — wiele kryteriów sortowania", "Nie — single-column sort", "Częściowe"],
      ["Search", "Tak — globalne wyszukiwanie", "Tak — z kontekstu Directus", "Zaimplementowane"],
      ["Aggregations (sum, count, avg)", "Tak — stopka z agregacjami", "Brak", "Brak"],
      // UX
      ["Auto-save", "Tak — natychmiastowy zapis", "Tak — konfigurowalny delay", "Zaimplementowane"],
      ["Undo/redo", "Tak — Ctrl+Z/Y", "Brak", "Brak"],
      ["Conditional formatting", "Tak — reguły kolorowania", "Brak", "Brak"],
      ["Row coloring", "Tak — kolory wierszy", "Brak", "Brak"],
      ["Virtual scrolling", "Tak — płynne przewijanie tysięcy wierszy", "Brak — paginacja HTML", "Brak"],
      // Kolaboracja
      ["Real-time collaboration", "Tak — widoczne kursory innych użytkowników", "Brak", "Brak"],
      ["Comments on records", "Tak — wątek dyskusji per rekord", "Brak", "Brak"],
      ["Activity log", "Tak — historia zmian", "Częściowo — Directus revisions", "Częściowe"],
    ],
  ),

  p(""),
  multiRun([
    bold("Podsumowanie: "),
    normal("Z ~27 kluczowych funkcjonalności Airtable, plugin directus-viewport realizuje w pełni 5, częściowo 3, a 19 wymaga implementacji od zera."),
  ]),
);

// ┌─ 4. OPCJE ARCHITEKTONICZNE ───────────────────────────────────────────────

mainChildren.push(
  heading("4. Opcje architektoniczne"),

  p("Directus oferuje kilka typów rozszerzeń, z których trzy mają sens jako baza dla interfejsu Airtable. Poniżej analiza każdego wariantu."),

  // ── Wariant A ──
  heading("4.1. Wariant A — Rozbudowa istniejącego Layout Extension", HeadingLevel.HEADING_2),

  multiRun([bold("Opis: "), normal("Ewolucyjne podejście polegające na systematycznym dodawaniu funkcjonalności do obecnego kodu directus-viewport. Layout extension działa w kontekście kolekcji Directus (panel Collection Browser) i korzysta z trzech slotów: component (tabela), options (sidebar), actions (pasek górny).")]),

  p("Zalety:", { run: { bold: true } }),
  bullet("Najniższy koszt startowy — istniejący kod (1300+ linii) stanowi solidną bazę."),
  bullet("Pełna integracja z Directus — filtrowanie, wyszukiwanie, paginacja z kontekstu rodzica."),
  bullet("Łatwy deployment — jeden plik dist/index.js, znany pipeline."),
  bullet("Natywne composables (useItems, useCollection) dają reaktywny dostęp do danych."),

  p("Wady:", { run: { bold: true } }),
  bullet("Ograniczone do kontekstu jednej kolekcji — brak cross-collection views."),
  bullet("Trzy sloty (component, options, actions) limitują UI — brak własnego routingu, sidebaru, modali."),
  bullet("Trudno zaimplementować multi-view (przełączanie grid/kanban/calendar) w ramach jednego slotu component."),
  bullet("Brak dostępu do komponentów Directus UI (v-interface, v-input) — trzeba budować od zera."),

  multiRun([bold("Rekomendowany zakres: "), normal("Faza 1-2 roadmapu (virtual scrolling, keyboard nav, rich field editors, filtry, grupowanie). Wystarczający dopóki potrzebny jest tylko widok tabelaryczny.")]),

  // ── Wariant B ──
  heading("4.2. Wariant B — Module Extension (pełnostronicowa aplikacja)", HeadingLevel.HEADING_2),

  multiRun([bold("Opis: "), normal("Nowa sekcja w sidebarze Directus (jak \"Content\", \"Users\", \"Settings\") z własnym Vue Router. Pełna strona do dyspozycji — brak ograniczeń slotów. Pozwala budować dowolny UI, w tym multi-view z tabami, własne panele filtrów, dashboard kolekcji.")]),

  p("Zalety:", { run: { bold: true } }),
  bullet("Pełna kontrola nad layoutem strony — żadnych ograniczeń slotów."),
  bullet("Własny Vue Router — pod-strony, deep-linking, breadcrumbs."),
  bullet("Możliwość cross-collection dashboardów (widok wielu tabel jednocześnie)."),
  bullet("Idealne dla multi-view UI (taby: Grid | Kanban | Calendar | Gallery)."),

  p("Wady:", { run: { bold: true } }),
  bullet("Trzeba reimplementować nawigację kolekcji, breadcrumbs, searchbar — nie dziedziczy z Content."),
  bullet("useItems() i inne composables nadal działają, ale integracja z filtrami Directus wymaga ręcznej pracy."),
  bullet("Użytkownik musi przejść do osobnej sekcji w sidebar — nie zastępuje domyślnego widoku Content."),
  bullet("Znacznie większy nakład kodu startowego vs rozbudowa Layout."),

  multiRun([bold("Rekomendowany zakres: "), normal("Faza 3-4 (multi-view, zaawansowane features). Sensowny gdy Layout staje się ograniczeniem lub potrzebny jest cross-collection dashboard.")]),

  // ── Wariant C ──
  heading("4.3. Wariant C — Bundle Extension (zestaw współpracujących rozszerzeń)", HeadingLevel.HEADING_2),

  multiRun([bold("Opis: "), normal("Pakiet wielu rozszerzeń w jednym repozytorium: Layout (tabela) + Interfaces (edytory pól: date picker, relation selector, file uploader) + Hook (walidacja server-side, audit log) + opcjonalnie Module (dashboard). Bundle kompiluje się do jednego dist/ i instaluje jako jednostka.")]),

  p("Zalety:", { run: { bold: true } }),
  bullet("Najlepsza architektura long-term — separacja odpowiedzialności, reużywalne Interface components."),
  bullet("Custom Interfaces (np. relation-picker) mogą być używane również poza pluginem, w standardowym Directus."),
  bullet("Hook extension zapewnia server-side walidację i audit trail niezależnie od klienta."),
  bullet("Module extension dodaje cross-collection views bez konfliktu z Layout."),
  bullet("Łatwiejsze testowanie — każde rozszerzenie to izolowana jednostka."),

  p("Wady:", { run: { bold: true } }),
  bullet("Największa złożoność setup — konfiguracja Bundle w package.json, zarządzanie wieloma entry points."),
  bullet("Dłuższy czas buildu — Vite musi kompilować wiele rozszerzeń."),
  bullet("Wymaga głębszej znajomości Directus Extension SDK (Interface API, Hook API)."),
  bullet("Większy overhead przy małych zmianach — trzeba wiedzieć, który sub-extension modyfikować."),

  multiRun([bold("Rekomendowany zakres: "), normal("Architektura docelowa. Migracja z Wariantu A gdy pojawia się potrzeba custom Interfaces lub Hook logic.")]),

  // ── Tabela porównawcza ──
  heading("4.4. Porównanie wariantów", HeadingLevel.HEADING_2),

  makeTable(
    ["Kryterium", "A) Layout", "B) Module", "C) Bundle"],
    [
      ["Nakład startowy", "Niski — ewolucja kodu", "Średni — nowy moduł", "Wysoki — setup Bundle"],
      ["Elastyczność UI", "Ograniczona (3 sloty)", "Pełna (cała strona)", "Pełna (layout + module)"],
      ["Multi-view", "Trudne", "Natywne (router)", "Natywne (layout per view)"],
      ["Reużywalność", "Niska (monolityczny)", "Średnia", "Wysoka (osobne interfaces)"],
      ["Integracja z Content", "Natywna", "Oddzielna sekcja", "Natywna (layout) + oddzielna (module)"],
      ["Utrzymanie long-term", "Rosnąca złożoność", "Średnie", "Najlepsze (separacja)"],
      ["Deployment", "1 plik JS", "1 plik JS", "1 Bundle (wiele sub-extensions)"],
      ["Cross-collection views", "Brak", "Tak", "Tak (via Module sub-ext)"],
      ["Server-side logic", "Brak", "Brak", "Tak (Hook sub-ext)"],
    ],
  ),
);

// ┌─ 5. KLUCZOWE DECYZJE TECHNICZNE ─────────────────────────────────────────

mainChildren.push(
  heading("5. Kluczowe decyzje techniczne"),

  p("Każda decyzja wpływa na architekturę, performance i przyszły rozwój. Poniżej analiza w formacie: problem, opcje, rekomendacja, wpływ na przyszłość."),

  // 5.1 Virtual scrolling
  ...decisionBlock(
    "5.1. Virtual Scrolling",
    "Obecna paginacja HTML renderuje wszystkie wiersze na stronie. Przy 100+ wierszach z wieloma kolumnami DOM staje się ciężki. Airtable wyświetla tysiące wierszy bez paginacji dzięki virtual scrolling.",
    [
      "@tanstack/vue-virtual — lekka (5kB gzip), framework-agnostic, aktywnie utrzymywana, doskonała dokumentacja. Wymaga ręcznego setup renderowania wierszy.",
      "vue-virtual-scroller — dedykowana Vue 3 (RecycleScroller, DynamicScroller). Prosta integracja, ale rzadziej aktualizowana.",
      "Custom implementation — własny IntersectionObserver + computed visible range. Pełna kontrola, ale duży nakład i ryzyko bugów.",
    ],
    "@tanstack/vue-virtual — najlepsza równowaga między rozmiarem, dokumentacją i elastycznością. Aktywny ekosystem (TanStack Table, TanStack Query) ułatwia przyszłą integrację.",
    "Wybór biblioteki virtual scrolling determinuje jak renderowane są wiersze. TanStack pozwala na łatwe przejście do TanStack Table w przyszłości, co dałoby gotowy system column resize/reorder/pinning."
  ),

  // 5.2 Edycja pól relacyjnych
  ...decisionBlock(
    "5.2. Edycja pól relacyjnych (M2O, O2M, M2M)",
    "Pola relacyjne (o2m, m2m, m2a) są obecnie readonly. To jeden z największych braków vs Airtable, gdzie linked records to fundamentalny feature.",
    [
      "M2O inline dropdown — komórka pokazuje wartość display template, kliknięcie otwiera dropdown z wyszukiwaniem (autocomplete). Dane z GET /items/{related_collection}?search=...",
      "O2M/M2M modal z tabelą — kliknięcie komórki otwiera modal z tabelą powiązanych rekordów. Możliwość dodawania/usuwania linków. Wymaga osobnego komponentu.",
      "Inline expand — rozwinięcie wiersza (accordion) z zagnieżdżoną tabelą powiązanych rekordów. Najbliższe Airtable, ale najtrudniejsze do zaimplementowania.",
      "Hybrid — M2O jako inline dropdown, O2M/M2M jako modal. Pragmatyczny kompromis.",
    ],
    "Podejście hybrydowe (M2O inline + O2M/M2M modal). M2O dropdown jest standardem UX i relatywnie prosty. Modal dla relacji wiele-do-wielu jest bardziej czytelny niż inline expand.",
    "Wybór determinuje architekturę komponentów edycji. Jeśli w przyszłości przejdziesz na Bundle, każdy typ edytora stanie się osobnym Interface extension — warto od razu projektować je jako izolowane komponenty."
  ),

  // 5.3 Multi-view
  ...decisionBlock(
    "5.3. Multi-view (Grid, Kanban, Calendar, Gallery)",
    "Airtable pozwala na wiele widoków tej samej kolekcji. Obecny plugin ma tylko grid view.",
    [
      "Taby w ramach Layout component — przełączanie widoku wewnątrz jednego layout extension. Najprostsze, ale ograniczone rozmiarem slotu component.",
      "Osobne Layout extensions per view — grid-layout, kanban-layout, calendar-layout. Directus pozwala użytkownikowi wybrać layout w UI. Niezależne, ale bez współdzielenia stanu.",
      "Module z sub-views — pełnostronicowy module z tabami/routerem. Wymaga Wariantu B.",
      "Bundle z wieloma Layouts — Bundle extension zawierający osobne layout extensions + współdzielone composables. Wymaga Wariantu C.",
    ],
    "Start z tabami w Layout (Faza 1-2), migracja do Bundle z wieloma Layouts (Faza 3). Taby dają szybki MVP, a Bundle zapewnia czystą architekturę long-term.",
    "Każdy nowy view type to znaczny nakład kodu. Kanban wymaga drag & drop (vuedraggable/dnd-kit), Calendar wymaga biblioteki kalendarza (FullCalendar/vue-cal), Gallery wymaga lazy loading obrazów. Warto priorytetyzować: Grid >> Kanban > Calendar > Gallery."
  ),

  // 5.4 System filtrów
  ...decisionBlock(
    "5.4. System filtrów i grupowania",
    "Brak UI do budowania filtrów. Directus ma potężne filter API (_eq, _contains, _in, _between, itd.), ale plugin nie eksponuje go użytkownikowi.",
    [
      "Custom filter builder — budowa własnego komponentu z dropdownami: pole → operator → wartość. Pełna kontrola, ale duży nakład.",
      "Użycie wewnętrznego filter builder Directus — Directus ma komponent filtrów w Content module, ale nie jest eksportowany dla extensions. Próba importu z @directus/app jest ryzykowna i może się zepsuć przy update.",
      "Uproszczony quick-filter — pole tekstowe + dropdown kolumny. Generuje filter _contains. Prosty, ale ograniczony.",
    ],
    "Custom filter builder z inspiracją UX z Airtable. Budowa od zera daje pełną kontrolę i nie uzależnia od wewnętrznych komponentów Directus.",
    "Filter builder to jeden z najbardziej złożonych komponentów UI. Warto zaplanować go jako reużywalny composable (useFilterBuilder), który w Bundle może stać się osobnym shared module."
  ),

  // 5.5 Renderery pól
  ...decisionBlock(
    "5.5. Renderery pól (Field Renderers)",
    "Wszystkie wartości renderowane są jako plain text. Brak date pickerów, color pickerów, select dropdownów, file preview, status badges.",
    [
      "Natywne HTML5 inputs — <input type='date'>, <input type='color'>, <select>. Zero zależności, ale ograniczona funkcjonalność i niejednolity wygląd cross-browser.",
      "Biblioteka komponentów — Vuetify, PrimeVue, Radix Vue. Bogaty zestaw gotowych komponentów, ale duży bundle size i potencjalne konflikty z CSS Directus.",
      "Custom components z headless UI — Budowa własnych komponentów z użyciem headless libraries (VueUse, Floating UI do popoverów). Lekkość + pełna kontrola nad stylem.",
      "Directus v-interface (nieoficjalne) — Próba użycia wewnętrznych komponentów Directus. Ryzyko zepsucia przy update, brak oficjalnego API.",
    ],
    "Custom components z headless UI (VueUse + Floating UI). Zachowuje spójność z motywem Directus (--theme--* CSS vars), minimalizuje bundle size, daje pełną kontrolę.",
    "Każdy renderer to potencjalny Interface extension w Bundle. Architektura powinna zakładać plugin system: registerFieldRenderer('date', DatePickerComponent). To pozwoli w przyszłości dodawać nowe renderery bez modyfikacji core."
  ),

  // 5.6 Keyboard nav
  ...decisionBlock(
    "5.6. Keyboard Navigation",
    "Brak nawigacji klawiaturowej. W Airtable strzałki, Tab, Enter pozwalają na szybką nawigację i edycję bez myszy.",
    [
      "Grid focus manager — system zarządzający fokusem na poziomie [row, col]. Strzałki przesuwają fokus, Enter wchodzi w edycję, Escape wychodzi. Wymaga ref na aktywną komórkę.",
      "Prosty tabindex — nadanie tabindex na komórki i poleganie na natywnej nawigacji Tab. Ograniczone (Tab idzie w jednym kierunku), ale zero dodatkowego kodu.",
      "Kombinacja z virtual scroll — fokus musi współpracować z virtual scrolling (auto-scroll do komórki poza viewport). Wymaga integracji z TanStack Virtual.",
    ],
    "Grid focus manager z integracją virtual scroll. useGridNavigation(rows, cols) composable zarządzający stanem fokusa [row, col] z obsługą Arrow keys, Tab, Enter, Escape.",
    "Keyboard navigation jest fundamentalna dla power users. Dobrze zaprojektowany system pozwoli w przyszłości dodać shortcuts (Ctrl+C/V do copy-paste komórek, Ctrl+Z do undo) i accessibility (ARIA grid role)."
  ),

  // 5.7 Undo/redo
  ...decisionBlock(
    "5.7. Undo/Redo",
    "Brak możliwości cofnięcia zmian. Edycje są commited natychmiast (lub po auto-save delay).",
    [
      "Command pattern — stos operacji (EditCommand, DeleteCommand) z execute/undo. Klasyczny wzorzec, pełna kontrola.",
      "Snapshot-based — zapisywanie pełnego stanu pendingEdits przed każdą zmianą. Prostsze, ale pamięciożerne przy dużych datasetach.",
      "Hybrid — command pattern dla edycji komórek + Directus Revisions API dla cofania zapisanych zmian (server-side undo).",
    ],
    "Hybrid approach. Command pattern lokalnie (przed zapisem) + Directus Revisions API dla cofania zapisanych zmian. useUndoRedo() composable z limitem stosu (np. 50 operacji).",
    "Undo/redo to feature, który dramatycznie poprawia zaufanie użytkownika do interfejsu. Warto zaimplementować go wcześnie (Faza 2), bo jest trudniejszy do dodania retroaktywnie."
  ),

  // 5.8 Real-time
  ...decisionBlock(
    "5.8. Real-time / Kolaboracja",
    "Brak real-time aktualizacji. Gdy dwóch użytkowników edytuje tę samą tabelę, nie widzą nawzajem swoich zmian.",
    [
      "Directus WebSocket — Directus 10.4+ oferuje WebSocket subscription na zmiany kolekcji. Real-time notyfikacje o nowych/zmienionych rekordach.",
      "Polling — periodyczny GET co N sekund. Prosty, ale nieefektywny i z opóźnieniem.",
      "Custom WebSocket server — własny WS endpoint (Hook extension) z granularnym broadcastem zmian per komórka. Najbardziej zaawansowane, ale duży nakład.",
    ],
    "Directus WebSocket jako pierwszy krok (Faza 4). Daje real-time refresh danych bez konieczności budowania własnego serwera. Kolaboracja wizualna (kursory innych użytkowników) to osobny, znacznie bardziej złożony feature — odłożyć na przyszłość.",
    "Real-time to feature, który zmienia architekturę danych z pull (useItems) na push (subscription). Warto od początku projektować reaktywny data layer, nawet jeśli real-time będzie dodany później."
  ),

  // 5.9 Responsywność
  ...decisionBlock(
    "5.9. Responsywność i Mobile",
    "Obecny plugin jest desktop-only. Tabele nie działają dobrze na małych ekranach.",
    [
      "Desktop-only — świadoma decyzja, że plugin jest narzędziem desktopowym. Brak kodu responsive.",
      "Responsive breakpoints — alternatywny layout (karty zamiast tabeli) na mobile. Znaczny nakład kodu.",
      "Progressive enhancement — desktop-first z minimalnymi usprawnieniami mobile (horizontal scroll, touch events na komórkach).",
    ],
    "Desktop-only z progressive enhancement. Airtable na mobile jest oddzielną aplikacją — nie warto inwestować w responsive tabeli. Horizontal scroll + touch-friendly tap-to-edit wystarczą.",
    "Decyzja \"desktop-only\" upraszcza development i pozwala skupić się na power-user features (keyboard nav, shortcuts). Jeśli w przyszłości pojawi się potrzeba mobile — lepiej zbudować osobny Module z card-based UI."
  ),
);

// ┌─ 6. ROADMAP ──────────────────────────────────────────────────────────────

mainChildren.push(
  heading("6. Mapa drogowa (Roadmap)"),

  p("Poniższy roadmap zakłada ewolucyjne podejście: start od rozbudowy Layout extension (Wariant A), z migracją do Bundle (Wariant C) gdy pojawią się ograniczenia."),

  heading("Faza 1 — Fundament", HeadingLevel.HEADING_2),
  multiRun([bold("Architektura: "), normal("Wariant A (Layout extension)")]),
  multiRun([bold("Cel: "), normal("Profesjonalny grid view na poziomie Airtable Grid")]),
  bullet("Virtual scrolling (@tanstack/vue-virtual) — zamiana paginacji na ciągły scroll"),
  bullet("Keyboard navigation — strzałki, Tab, Enter, Escape z composable useGridNavigation()"),
  bullet("Column resize — drag na granicy kolumny, persystencja szerokości w layoutOptions"),
  bullet("Column reorder — drag & drop nagłówków, persystencja kolejności"),
  bullet("Column hide/show — dropdown menu w nagłówku z checkboxami"),
  bullet("Rich field renderers — date picker, select/enum dropdown, boolean toggle, number formatter"),
  bullet("Sticky first column — opcjonalne \"zamrożenie\" kolumny PK"),

  heading("Faza 2 — Rich Editing", HeadingLevel.HEADING_2),
  multiRun([bold("Architektura: "), normal("Wariant A → początek migracji do C")]),
  multiRun([bold("Cel: "), normal("Pełna edycja wszystkich typów pól + filtrowanie")]),
  bullet("M2O inline dropdown — autocomplete z wyszukiwaniem"),
  bullet("O2M/M2M modal editor — tabela powiązanych rekordów z add/remove"),
  bullet("File field — upload, preview (obraz/PDF), download"),
  bullet("Custom filter builder — pole → operator → wartość, wiele warunków"),
  bullet("Grupowanie — grupowanie wierszy po wartości pola z collapsible sections"),
  bullet("Multi-column sort — konfiguracja wielu kryteriów sortowania"),
  bullet("Undo/redo — command pattern + Directus Revisions API"),
  bullet("Aggregations — sum, count, avg, min, max w stopce kolumn"),

  heading("Faza 3 — Multi-View", HeadingLevel.HEADING_2),
  multiRun([bold("Architektura: "), normal("Wariant C (Bundle extension)")]),
  multiRun([bold("Cel: "), normal("Alternatywne widoki danych poza grid")]),
  bullet("Migracja do Bundle — refactor na layout + interfaces + hooks"),
  bullet("Kanban view — drag & drop cards, grupowanie po polu status/select"),
  bullet("Calendar view — renderowanie dat na kalendarzu miesięcznym/tygodniowym"),
  bullet("Gallery view — karty z miniaturami pól obrazkowych"),
  bullet("View switcher — taby lub dropdown do przełączania widoków"),

  heading("Faza 4 — Kolaboracja i Zaawansowane", HeadingLevel.HEADING_2),
  multiRun([bold("Architektura: "), normal("Wariant C (Bundle) + ewentualnie Module")]),
  multiRun([bold("Cel: "), normal("Enterprise-grade features")]),
  bullet("Real-time updates — Directus WebSocket subscription na zmiany"),
  bullet("Presence awareness — wskaźniki, kto aktualnie edytuje który rekord"),
  bullet("Comments on records — wątek dyskusji per rekord (Directus Activity)"),
  bullet("Conditional formatting — reguły kolorowania wierszy/komórek"),
  bullet("Formulas/computed fields — prosty expression engine na poziomie UI"),
  bullet("Import/Export — CSV, Excel z mapowaniem kolumn"),
  bullet("Row-level permissions — wizualna informacja o uprawnieniach"),
);

// ┌─ 7. RYZYKA ───────────────────────────────────────────────────────────────

mainChildren.push(
  heading("7. Ryzyka i ograniczenia"),

  makeTable(
    ["Ryzyko", "Prawdopodobieństwo", "Wpływ", "Mitygacja"],
    [
      [
        "Breaking changes w Directus SDK",
        "Średnie",
        "Wysoki — wymaga refactoru",
        "Pinning wersji SDK, monitoring changeloga Directus, warstwa abstrakcji nad composables"
      ],
      [
        "Performance przy >10k rekordów",
        "Wysokie",
        "Średni — degradacja UX",
        "Virtual scrolling (Faza 1), server-side pagination fallback, lazy loading relacji"
      ],
      [
        "Brak dostępu do v-interface",
        "Pewne",
        "Średni — duplikacja kodu",
        "Custom renderers w Bundle (Wariant C) stają się reużywalne; community może dostarczyć gotowe"
      ],
      [
        "Złożoność utrzymania Bundle",
        "Średnie",
        "Średni — wolniejszy development",
        "Monorepo z shared composables, automatyczne testy, CI/CD per sub-extension"
      ],
      [
        "Konflikty CSS z Directus",
        "Niskie",
        "Niski — drobne poprawki",
        "Scoped styles, BEM naming, unikanie globalnych selektorów, CSS variables Directus"
      ],
      [
        "Directus zmieni architekturę extensions",
        "Niskie (stabilne API od v10)",
        "Bardzo wysoki — rewrite",
        "Śledzenie roadmapy Directus, udział w community, abstracting SDK calls"
      ],
      [
        "Scope creep — rozrastanie się wymagań",
        "Wysokie",
        "Wysoki — opóźnienia",
        "Ścisłe trzymanie się roadmapu, priorytetyzacja MoSCoW, review co fazę"
      ],
    ],
  ),
);

// ┌─ 8. REKOMENDACJA ─────────────────────────────────────────────────────────

mainChildren.push(
  heading("8. Rekomendacja"),

  p("Na podstawie analizy obecnego stanu, architektury Directus i wymagań Airtable-like interfejsu, rekomendowane jest podejście ewolucyjne:"),

  heading("Strategia: Ewolucja z zaplanowaną migracją", HeadingLevel.HEADING_2),

  multiRun([
    bold("Faza 1-2 (Grid view): "),
    normal("Kontynuacja rozwoju jako Layout extension (Wariant A). Obecny kod directus-viewport stanowi solidny fundament. Dodanie virtual scrolling, keyboard navigation, rich field renderers i systemu filtrów przekształci go w profesjonalny grid view."),
  ]),

  multiRun([
    bold("Faza 3 (Multi-view): "),
    normal("Migracja do Bundle extension (Wariant C). Gdy pojawi się potrzeba Kanban/Calendar/Gallery, refactor istniejącego kodu do struktury Bundle. Layout staje się jednym z sub-extensions, a shared composables (useGridNavigation, useFilterBuilder, useFieldRenderers) są współdzielone."),
  ]),

  multiRun([
    bold("Faza 4 (Enterprise): "),
    normal("Rozszerzenie Bundle o Module (dla cross-collection dashboardów) i Hook (dla server-side walidacji). Opcjonalne — zależy od wymagań biznesowych."),
  ]),

  p(""),
  p("Kluczowe zasady architektoniczne:", { run: { bold: true } }),
  bullet("Każdy feature implementuj jako izolowany composable (useXxx) — ułatwi migrację do Bundle."),
  bullet("Renderery pól projektuj jako pluggable system (registerRenderer) — gotowe do wyodrębnienia jako Interface extensions."),
  bullet("Unikaj importów z @directus/app (wewnętrzne, niestabilne) — korzystaj tylko z @directus/extensions-sdk."),
  bullet("Testuj z różnymi typami kolekcji (proste tabele, junction tables, tabele z relacjami) — edge cases ujawniają się dopiero w produkcji."),
  bullet("Utrzymuj kompatybilność z Directus theme system (--theme--* CSS variables) — zapewnia spójność wizualną."),

  p(""),
  multiRun([
    bold("Podsumowanie: "),
    normal("Budowa interfejsu Airtable w Directus jest ambitnym, ale wykonalnym projektem. Istniejący plugin directus-viewport daje przewagę startową. Ewolucyjne podejście minimalizuje ryzyko i pozwala dostarczać wartość przyrostowo. Kluczowe jest zachowanie dyscypliny architektonicznej — izolowane composables, pluggable renderery, abstrakcja nad SDK — aby migracja do Bundle (gdy nadejdzie czas) była refactorem, nie rewrite'em."),
  ]),
);

// ═══════════════════════════════════════════════════════════════════════════
//  BUILD DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════

const doc = new Document({
  creator: "directus-viewport / Claude",
  title: "Budowa interfejsu Airtable jako plugin Directus — Opracowanie strategiczno-techniczne",
  description: "Analiza opcji architektonicznych, decyzji technicznych i roadmapu dla rozbudowy directus-viewport do pełnego interfejsu Airtable.",
  styles: {
    default: {
      document: {
        run: { font: FONT, size: FONT_SIZE },
        paragraph: { spacing: { line: 276 } },
      },
      heading1: {
        run: { font: FONT, size: 32, bold: true, color: HEADING_COLOR },
        paragraph: { spacing: { before: 360, after: 120 } },
      },
      heading2: {
        run: { font: FONT, size: 26, bold: true, color: HEADING_COLOR },
        paragraph: { spacing: { before: 240, after: 120 } },
      },
      heading3: {
        run: { font: FONT, size: 22, bold: true, color: ACCENT_COLOR },
        paragraph: { spacing: { before: 200, after: 100 } },
      },
    },
  },
  sections: [
    sections[0],
    { children: mainChildren },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync("opracowanie-airtable-directus.docx", buffer);
console.log("Wygenerowano: opracowanie-airtable-directus.docx (" + (buffer.length / 1024).toFixed(1) + " KB)");
