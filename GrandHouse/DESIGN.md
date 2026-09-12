---
version: alpha
name: "Grand House Warehouse Workflow"
description: "A calm, berry-pink operations workspace for branch teams moving food and supplies without losing the hand-off status."
colors:
  primary: "#BF2B54"
  primaryDark: "#731630"
  accent: "#2F8F5B"
  action: "#BF2B54"
  warning: "#EACC83"
  progress: "#C28E1B"
  info: "#3E83C4"
  page: "#FFF3F7"
  productionPage: "#FFF8E7"
  panel: "#FFFFFF"
  line: "#E7C4D1"
  muted: "#627083"
typography:
  sans:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
rounded:
  DEFAULT: "8px"
  sm: "6px"
  md: "8px"
  lg: "10px"
spacing:
  section-gap: "16px"
  page-max: "1120px"
components:
  button: { backgroundColor: "#BF2B54", textColor: "#FFFFFF", rounded: "8px", height: "38px" }
  card: { backgroundColor: "#FFFFFF", textColor: "#101820", rounded: "8px", padding: "14px" }
  statusFeed: { backgroundColor: "#FBFDFF", textColor: "#16365F", rounded: "10px" }
---

# Grand House Design System

## Overview

### Creative North Star

The interface should feel like a well-labelled dispatch board in a busy food operation: berry-pink cards, clear hand-off marks, and quiet green confirmation. The four-card branch landing is the memorable signature because branch teams need to choose their next task in one glance without dashboard noise. The production role now starts with a minimal berry-pink room picker and a realistic food photograph: five room cards keep the same scan-first discipline while making each team’s workspace explicit.

The login surface uses one seamless responsive card across desktop, tablet, and phone: a calm berry/cream workspace opens with a wide, softly illustrated strawberry-garden landscape where the rows and ripe fruit are immediately legible, then uses a short, soft fade into a complete sign-in card. The story layer carries the editorial mark “THE GRAND'S”, “SINCE 2019”, and the supportive line “you are doing better than you think”; the room selector and an optional masked password field are present while the prototype is in development, but only the selected room is submitted.

### Product context and register

- **Audience and primary job:** Branch staff on a shared phone, plus office, kitchen, and owner roles on larger screens. The branch home screen answers “what is happening with my requests?” first.
- **Workspace boundary:** Office users authenticate once, then choose either `The Grands` or `Grand House`; The Grands requires a second brand code while Grand House opens directly. Each workspace is isolated; existing records live in Grand House and The Grands starts empty.
- **Parent workspace:** `The Grands` is presented as an executive control-room hub with six central modules (overview, HR, central stock, procurement, finance, and assets/documents). These modules are intentionally separated from Grand House's branch, kitchen, and warehouse operations.
- **Target market(s) and evidence:** Internal Thai-language Grand House operations; the repository brief defines five branches and Thai role labels.
- **Locale(s) and language policy:** Thai UI and Thai number/date formatting using the browser locale helpers already in `public/app.js`.
- **Usage scene:** Frequent, short checks on a phone at the branch; occasional desktop review. The page must remain readable at narrow widths and 200% zoom with document scrolling.
- **Register:** Product / operations tool. Familiarity and status clarity outrank decorative expression.
- **Memorable signature:** A four-card branch landing that pairs a clear emoji action with the next task; detailed hand-off status lives on its dedicated screen.
- **Restraint:** Keep forms and dense data white, bordered, and calm; reserve red for the submit/destructive action and green for confirmed receipt.
- **Anti-references:** Do not resemble a retail storefront, a dark analytics dashboard, or a phone mockup trapped at a fixed desktop width.
- **Token ownership/runtime mapping:** This file mirrors the canonical tokens in `public/styles.css` (`:root`). CSS variables remain the runtime source; changes to durable palette or radius rules update both files.

## Colors

The branch mode uses `--page` / `#FFF3F7` as a soft berry working surface, while the production room uses `#FFF8E7` as a warm cream working surface. Both keep white panels for task boundaries and use `--primary` / `#BF2B54` with `--primaryDark` / `#731630` for navigation and high-contrast headings. Grand House office, branch, and production workspaces share the same berry-pink navigation, panel borders, and section accents. The `The Grands` parent-company hub follows that same berry-pink family across its module cards, icons, and metric accents so it reads as one product alongside the other roles. `--accent` / `#2F8F5B` means confirmed or healthy. `--action` / `#BF2B54` is reserved for the primary branch action. Waiting/attention states use the warm secondary `#EACC83` with dark text, while the three progress circles use the darker shared gold `#C28E1B` so the stepper does not imply three different status meanings. In-progress delivery and confirmed receipt keep their semantic colors in status badges only: `#3E83C4` and the existing green accent. Status labels pair these colors with text so meaning is not carried by color alone. Other roles keep the existing blue tokens outside branch mode.

## Typography

Use the existing Inter/system sans stack. Thai copy stays sentence-case and uses strong weight for labels, with muted helper copy below. Numeric totals use the same family and Thai locale format so branch staff can scan quantities without a separate visual language.

## Layout

The global workspace is fluid. Branch content is capped at `1120px` and centered on desktop, while the phone layout uses the full viewport with safe-area padding. The four-card branch action grid uses two columns and collapses to one below `360px`; request category controls become a vertical, keyboard-friendly list below `680px`. Cards preserve natural document height so zoom and long forms remain scrollable.

## Elevation & Depth

Hierarchy comes primarily from tonal layers and 1px borders. Static cards use a restrained shadow; the branch mode removes the outer phone-frame illusion and lets the browser page scroll naturally. Sidebar overlays use a soft backdrop and remain dismissible by button.

## Shapes

Most controls and panels use the 8px default radius, with 10px for the live status feed and 999px only for status pills/live markers. Borders stay cool blue-gray and dividers are 1px.

## Components

### Foundational visual states

Buttons provide hover, pressed, disabled, and visible focus states. Status badges pair text with color. Every request route uses the same three-step progress shape: the first circle is the branch request, the second is the dispatch action (จัดของเสร็จ for Office or ส่งออกแล้ว for a production room), and the third is สาขารับแล้ว. Office keeps its internal legacy receive state hidden inside the first visual step so the branch and Office tracking views never disagree. Empty states use dashed borders and a short next-step message. Reduced-motion users keep the same state changes without decorative movement.

### Buttons and actions

Solid green is the safe commit action, red is the branch request action, and white outlined buttons are navigation or secondary actions. Grand House buttons use a restrained liquid-glass surface (soft translucent gradient, blur, inset highlight, and a small hover/press lift) while preserving these semantic tones. Primary buttons keep their footprint while busy. All actions are native buttons with localized labels.

### Navigation and data display

Branch navigation keeps the sidebar focused on the user panel and user switching; task navigation belongs to the four landing cards. The landing owns only four large action cards: ติดตามสถานะ, เบิกของ, ปิดวัน, and ประวัติ. The request screen owns the three category tabs and sends everyวัตถุดิบ/บรรจุภัณฑ์ request to the central warehouse. Tracking uses a compact top tab bar for ห้องผลิต, ออฟฟิศ, and ทั้งหมด; it opens on ห้องผลิต to keep the phone view short. History and closing details live on their own screens and remain readable without horizontal scrolling. Office navigation is available only after the brand gate and always reflects the selected isolated workspace. In the Grand House office workspace, contextual navigation is grouped into three collapsible main headings—รายการเบิก, คลังสินค้า, and สรุปภาพรวม—so request operations, warehouse management, and financial review are easy to scan; each heading reveals only its child links, while the รายการเบิก child opens one shared request hub whose tabs are ต้องดำเนินการ, ติดตามห้องผลิต, and ประวัติ in one page-level bar. The request and history filter rail contains only branch/date controls; it does not repeat the view tabs or add another route selector. The office action queue keeps the shared three-step progress visible so branches can see whether the Office has received, packed, or handed off a request, while the kitchen tracking view excludes completed handoffs by default. The office history view uses destination tabs for ห้องผลิต and ออฟฟิศ; production history is a five-room ledger with all room columns visible together, while both views share a branch selector and a day/range date window. Office history is a plain vertical record list with date, branch, reference, items, quantities, and cost only—no progress stepper or receipt-status badges—because it is an archive rather than a work queue. Branch and date filters remain available for finding a specific slice; destination tabs own the source context, so a separate route dropdown is unnecessary. The selected tab owns the list context, so the list below does not repeat a second navigation heading. Warehouse shortcuts open the existing warehouse workspace on the matching tab. The `The Grands` workspace opens on a concise company overview with module cards that lead to scoped planning states; Grand House keeps its existing operational navigation and records.

The production landing owns five touch-friendly room cards: ห้องอาหาร, ครัวกลาง, ห้องสลัด, ห้องผลไม้, and ห้องของหวาน. A realistic food photograph anchors the hero without adding text into the image. A second app-owned code gate appears before a room queue. Once a room is selected, its two operational modes—ส่งตามคำขอ and ส่งเพิ่ม—live in one topbar; the sidebar keeps only room history so the same workflow is not duplicated.

Warehouse forms keep movement entry focused: จุดสั่งซื้อ and สต็อกเป้าหมาย belong to one dedicated settings surface, not the receive form. จุดสั่งซื้อ is the trigger; สต็อกเป้าหมาย is the desired quantity after replenishment, and the list calculates the suggested fill quantity. The receive form records the movement itself; the settings surface owns thresholds and provides an explicit return action to the warehouse overview.

Reference values used by รับเข้า—แหล่งซื้อ, หมวดหมู่, and หน่วย—are maintained together on the dedicated ตั้งค่ารายการอ้างอิง surface. The receive form offers one compact shortcut to that manager, while edits keep the option list consistent across stock entry and product setup. สินค้าสำเร็จรูป remains focused on adding menus, editing food costs, and setting selling prices. สต็อกปัจจุบัน exposes a quiet pencil action for quick edits to material name, unit, and standard cost.

The office warehouse is one costed central warehouse named คลังกลาง Grand House. Every purchase receipt is recorded once with a unit cost, and every branch request is shipped from this pool with the weighted average cost applied to the actual quantity sent. Branches are destinations in the movement history, never separate stock-owner profiles; ภูดอย and เพลว use the same request flow as every other branch. The warehouse sidebar stays at six links: ภาพรวมคลัง, สต็อกปัจจุบัน, รับเข้า / ส่งออก, สินค้าสำเร็จรูป, ตั้งค่ารายการอ้างอิง, and ประวัติคลัง. Reorder alerts are not a sidebar destination or badge; the overview lists affected products and suggested fill quantities. ROP, Target Stock, and EOQ live together in the central policy table so replenishment decisions are visible beside current quantity and average cost. From สต็อกปัจจุบัน, the compact ตั้งค่า ROP / EOQ action opens a focused settings mode that hides the sidebar and places an arrow-only return control beside the summary.

### Forms and overlays

Product search uses a labelled field with an app-owned clear control. Product lists and closing forms preserve entered values on validation. Toasts are reserved for operation feedback; important status remains visible in the page.

### Iconography

The existing house/brand SVG is the only decorative mark. Status feed responsibility markers use text initials (ผ / อ) so the meaning remains available without an icon font.

### Motion

Existing short hover/press transitions are enough. Do not add auto-moving banners or continuous animation to the live board.

### Content and data visualization

Use direct Thai operational verbs: “ส่งคำขอ”, “ดูสถานะ”, “รับของแล้ว”. Dates and currency use the existing `dateTime`, `displayDate`, `money`, and `qty` helpers. Production and Office operational cards show quantities andต้นทุน only; selling price remains available in product pricing and financial reporting, not in dispatch work. Before dispatch, the quantity column is labelled `จัดเตรียมแล้ว`; after the send action it becomes `ส่งจริง`, so the number cannot be mistaken for a completed hand-off. A new food request starts with quantity zero, and its progress circle advances only when the kitchen records the corresponding send action. The branch home prioritizes counts and the latest eight updates over a chart.

## Do's and Don'ts

- **Do:** Show the latest hand-off source, status, and timestamp together.
- **Do:** Keep the same navigation labels and status vocabulary on phone and desktop.
- **Don't:** Re-introduce a fixed 430px phone frame on desktop; branch mode is a responsive web page.
- **Don't:** Treat “ซื้อเอง” as branch cost; that business rule belongs to the request source and cost calculation already implemented in the domain layer.

On phone widths, history controls collapse into compact segmented strips, with the date pair sharing one row to keep the filter surface short without hiding any filter.

Production history intentionally uses the same vertical archive-card pattern as Office history. Each card keeps its branch, reference, items, quantities, cost, and production-room label together; a wide five-room ledger is not used, so both destinations share one predictable reading pattern.

Request and history filters use the same compact three-view tab strip on the internal rail. When history is active, the destination filter for ห้องผลิต and ออฟฟิศ sits directly beneath that three-view strip as small right-aligned text-sized buttons, without a separate destination label or full-width navigation panel. History keeps only three fields (branch, start date, end date); the separate range-preset dropdown is intentionally removed to reduce control density, with equal start/end dates representing a single day and empty dates representing all exports. Date fields share a row when there is room and stack below the narrow-phone threshold. View headings keep only the title and count; explanatory subtitles are omitted so the list surface starts sooner.

Shipment summary: Office summary navigation has one shipment/cost report. Matrix rows are production rooms and columns are branches; drilldown uses the same shipped movements, including extras. Unsent quantities are not backlog or cost. Date and branch filters apply to the entire Excel-compatible XML workbook; selected matrix cells only narrow the on-screen detail. Historical costs reuse the existing movement ledger.
