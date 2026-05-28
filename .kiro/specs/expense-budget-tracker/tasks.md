# Implementation Plan: Financely — Expense & Budget Tracker

## Overview

Refactor and extend the existing Financely skeleton into a fully-featured, well-structured single-page app. The implementation follows the **Event → State → Render** loop defined in the design: all mutable state lives in a central `AppState` object, pure functions handle sorting/color/formatting, and every user action flows through validation → mutation → persist → renderAll. Tasks are ordered foundation-first so each step compiles and runs before the next begins.

The existing `index.html` already has Chart.js CDN, toast container, sort select, limit input, and the custom-category input row. The existing `js/app.js` has a working but unstructured skeleton. The existing `css/style.css` has glassmorphism card styles and scrollbar utilities. Tasks focus on the missing pieces and the full structural rewrite.

## Tasks

- [ ] 1. Audit and update `index.html` structure
  - [ ] 1.1 Add `id="balance-card"` to the Total Balance card `<div>` and insert a `<div id="spend-limit-banner" hidden>` warning element inside it, below the balance heading
    - The banner should contain an icon and text like "⚠ Spending limit exceeded!"
    - Add `hidden` attribute so it starts invisible
    - _Requirements: 9.4_
  - [ ] 1.2 Add `<span class="field-error text-xs text-rose-500 mt-1 hidden">` siblings for each form field (`#item-name`, `#amount`, `#category`) and for the custom-category input (`#custom-cat-input`) and the spend-limit input (`#limit-input`)
    - Each span should be placed immediately after its input element
    - _Requirements: 1.3, 7.3, 9.3_
  - [ ] 1.3 Add a `<div id="category-list">` container below the custom-category "Add" row where existing custom categories are listed with per-item delete buttons
    - _Requirements: 7.7_
  - [ ] 1.4 Verify Chart.js CDN tag is present in `<head>` before `js/app.js` — confirm load order is correct and no duplicate tags are present
    - _Requirements: 4.1_

- [ ] 2. Add CSS rules to `css/style.css`
  - [ ] 2.1 Add `.field-error` utility styles — `display: block`, `font-size: 0.75rem`, `color: #f43f5e`, `margin-top: 0.25rem` — and a `.field-error.hidden { display: none }` override
    - _Requirements: 1.3, NFR-3_
  - [ ] 2.2 Add `.over-limit` modifier class for `#balance-card` — applies a `box-shadow: 0 0 0 2px #f43f5e` ring and a subtle `background: rgba(244,63,94,0.06)` tint
    - _Requirements: 9.4, NFR-3_
  - [ ] 2.3 Add `.category-badge` base style (small pill, `border-radius: 9999px`, `padding: 2px 8px`, `font-size: 0.625rem`, `font-weight: 600`) and a CSS custom-property pattern `--badge-color` so JS can set `style="--badge-color: <hex>"` and the badge uses `background-color: color-mix(in srgb, var(--badge-color) 15%, transparent); color: var(--badge-color)`
    - _Requirements: 7.5, NFR-3_
  - [ ] 2.4 Add toast animation keyframes `@keyframes toast-in` (slide up + fade in) and `@keyframes toast-out` (fade out + scale down), and `.toast-enter` / `.toast-leave` classes that apply them
    - _Requirements: NFR-3_

- [ ] 3. Rewrite `js/app.js` — Constants & Config section
  - [ ] 3.1 Replace scattered `const premiumColors` and magic strings with a single `CATEGORY_COLORS` map, named `LS_KEYS` constants object, and `DEFAULT_CATEGORIES` array
    - `CATEGORY_COLORS`: `{ Food: '#ec4899', Transport: '#3b82f6', Fun: '#10b981', Holiday: '#d97706', Other: '#06b6d4' }`
    - `LS_KEYS`: `{ TRANSACTIONS: 'financely_transactions', CATEGORIES: 'financely_categories', SPEND_LIMIT: 'financely_spend_limit' }`
    - `DEFAULT_CATEGORIES`: `['Food', 'Transport', 'Fun']`
    - Note: the existing skeleton uses different LS keys (`transactions`, `custom_categories`, `spending_limit`) — the new keys are the canonical ones per the design
    - _Requirements: 6.1, 6.4, 6.5, NFR-5_

- [ ] 4. Rewrite `js/app.js` — AppState object
  - [ ] 4.1 Replace the four scattered module-level `let` variables with a single `AppState` object
    - Shape: `{ transactions: [], categories: [], spendLimit: 0, currentSort: 'latest', chartInstance: null }`
    - All subsequent code reads and writes only through `AppState`
    - _Requirements: NFR-5_

- [ ] 5. Rewrite `js/app.js` — Persistence section
  - [ ] 5.1 Implement `safeParseJSON(key, fallback)` — wraps `localStorage.getItem` + `JSON.parse` in a try/catch; returns `fallback` on any error or when the key is absent
    - _Requirements: 6.6_
  - [ ] 5.2 Implement `loadState()` — reads all three LS keys via `safeParseJSON`, populates `AppState.transactions`, `AppState.categories` (merging with `DEFAULT_CATEGORIES` so built-ins are always present), and `AppState.spendLimit`
    - _Requirements: 6.2, 6.3_
  - [ ] 5.3 Implement `saveState()` — serializes `AppState.transactions`, `AppState.categories`, and `AppState.spendLimit` to their respective LS keys via `JSON.stringify`
    - _Requirements: 6.1, 6.4, 6.5_
  - [ ]\* 5.4 Write property test for localStorage round-trip (Property 12)
    - **Property 12: LocalStorage round-trip preserves full application state**
    - **Validates: Requirements 6.1, 6.2, 6.4, 6.5, 7.6, 9.7**
    - Use `fc.array(transactionArb)`, `fc.array(fc.string())`, and `fc.float` arbitraries; call `saveState` then `loadState` and assert deep equality
  - [ ]\* 5.5 Write property test for corrupted localStorage fallback (Property 14)
    - **Property 14: Corrupted localStorage data falls back to defaults without throwing**
    - **Validates: Requirements 6.6**
    - For any non-JSON string, assert `safeParseJSON` returns the fallback and does not throw

- [ ] 6. Rewrite `js/app.js` — Validation section
  - [ ] 6.1 Implement `validateTransaction(name, amount, category)` — returns `{ valid, error, field }`
    - `name`: non-empty after trim, 1–100 chars → field `'item-name'`
    - `amount`: numeric, > 0, ≤ 999,999.99 → field `'amount'`
    - `category`: non-empty string present in `AppState.categories` → field `'category'`
    - _Requirements: 1.2, 1.3_
  - [ ] 6.2 Implement `validateCategory(name, existingCategories)` — returns `{ valid, error }`
    - Non-empty after trim, 1–50 chars; case-insensitive uniqueness check against all existing categories
    - _Requirements: 7.2_
  - [ ] 6.3 Implement `validateSpendLimit(value)` — returns `{ valid, error }`
    - Numeric, 0.01 ≤ value ≤ 999,999,999.99
    - _Requirements: 9.2_
  - [ ]\* 6.4 Write property test for invalid transaction inputs (Property 2)
    - **Property 2: Invalid transaction inputs are rejected by the validator**
    - **Validates: Requirements 1.2, 1.3**
    - Generate empty/whitespace/over-100-char names, amounts ≤ 0 or > 999,999.99 or NaN, missing category; assert `valid === false` for all
  - [ ]\* 6.5 Write property test for invalid custom category names (Property 11)
    - **Property 11: Invalid custom category names are rejected and the list is unchanged**
    - **Validates: Requirements 7.2, 7.3**
    - Generate empty strings, strings > 50 chars, and case-insensitive duplicates; assert `valid === false`
  - [ ]\* 6.6 Write unit tests for all three validators
    - Cover boundary values: name = 1 char (valid), 100 chars (valid), 101 chars (invalid); amount = 0.01 (valid), 999,999.99 (valid), 0 (invalid), 1,000,000 (invalid); limit = 0.01 (valid), 999,999,999.99 (valid), 0 (invalid)
    - _Requirements: 1.2, 7.2, 9.2_

- [ ] 7. Checkpoint — Core foundation complete
  - Ensure `safeParseJSON`, `loadState`, `saveState`, and all three validators are implemented and unit tests pass. Ask the user if questions arise before continuing.

- [ ] 8. Rewrite `js/app.js` — Mutations section
  - [ ] 8.1 Implement `addTransaction(name, amount, category)` — runs `validateTransaction`; on failure calls `showFieldError`; on success creates `{ id: 'tx-' + Date.now(), name, amount, category, date: new Date().toISOString() }`, unshifts into `AppState.transactions`, calls `saveState()` then `renderAll()`
    - _Requirements: 1.4, 1.5, 1.6_
  - [ ] 8.2 Implement `deleteTransaction(id)` — filters `AppState.transactions` by id, calls `saveState()` then `renderAll()`
    - _Requirements: 2.2, 2.3, 2.4_
  - [ ] 8.3 Implement `addCategory(name)` — runs `validateCategory`; on failure shows toast error; on success pushes to `AppState.categories`, calls `saveState()` then `renderAll()`
    - _Requirements: 7.4, 7.6_
  - [ ] 8.4 Implement `deleteCategory(name)` — checks `AppState.transactions.some(t => t.category === name)`; if in use shows toast error and returns; otherwise removes from `AppState.categories`, calls `saveState()` then `renderAll()`
    - _Requirements: 7.7, 7.8_
  - [ ] 8.5 Implement `setSpendLimit(value)` — runs `validateSpendLimit`; on failure calls `showFieldError` on `#limit-input`; on success sets `AppState.spendLimit`, calls `saveState()` then `renderAll()`
    - _Requirements: 9.2, 9.3_
  - [ ]\* 8.6 Write property test for addTransaction growing the list (Property 1)
    - **Property 1: Adding a valid transaction grows the list by exactly one**
    - **Validates: Requirements 1.4**
    - Generate arbitrary valid transaction inputs; assert `length === original + 1` and new item is first element
  - [ ]\* 8.7 Write property test for deleteTransaction removing exactly one item (Property 3)
    - **Property 3: Delete removes exactly the targeted transaction**
    - **Validates: Requirements 2.2, 2.4**
    - Generate non-empty transaction arrays; pick a random id; assert length decreases by 1 and id is absent; all others preserved
  - [ ]\* 8.8 Write property test for deleteCategory with associated transactions (Property 15)
    - **Property 15: Custom categories with associated transactions cannot be deleted**
    - **Validates: Requirements 7.8**
    - Generate a category name that appears in at least one transaction; call `deleteCategory`; assert category list unchanged

- [ ] 9. Rewrite `js/app.js` — Sorting section
  - [ ] 9.1 Implement `getSortedTransactions(transactions, sortKey)` as a **pure function** — shallow-copies the input array, applies the correct comparator, returns the sorted copy without mutating the original
    - `'latest'`: sort by `date` ISO string descending
    - `'amount-desc'`: amount desc, tie-break by date desc
    - `'amount-asc'`: amount asc, tie-break by date desc
    - `'category'`: `localeCompare` asc, tie-break by date desc
    - _Requirements: 8.1, 8.3, 8.4, 8.5_
  - [ ]\* 9.2 Write property test for sort set-identity (Property 6)
    - **Property 6: Sorting never loses or duplicates transactions**
    - **Validates: Requirements 5.4, 8.2**
    - For all four sort keys and any input array, assert output IDs match input IDs (same count, same elements, no duplicates) and input array is unmodified
  - [ ]\* 9.3 Write property test for amount-descending order (Property 7)
    - **Property 7: Amount-descending sort produces a non-increasing sequence**
    - **Validates: Requirements 8.3**
    - Assert every adjacent pair satisfies `a.amount >= b.amount`
  - [ ]\* 9.4 Write property test for amount-ascending order (Property 8)
    - **Property 8: Amount-ascending sort produces a non-decreasing sequence**
    - **Validates: Requirements 8.4**
    - Assert every adjacent pair satisfies `a.amount <= b.amount`
  - [ ]\* 9.5 Write property test for category alphabetical order (Property 9)
    - **Property 9: Category sort produces alphabetically non-decreasing order**
    - **Validates: Requirements 8.5**
    - Assert every adjacent pair satisfies `a.category.localeCompare(b.category) <= 0`

- [ ] 10. Rewrite `js/app.js` — Color and Formatting sections
  - [ ] 10.1 Implement `getCategoryColor(name)` as a **pure, deterministic function** — returns the exact hex from `CATEGORY_COLORS` if the name is a built-in; otherwise hashes the name string to a hue in the 260–320° violet/purple band and returns `hsl(${hue}, 70%, 55%)`
    - _Requirements: 7.5_
  - [ ] 10.2 Implement `formatCurrency(num)` — uses `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` to format any number as USD with two decimal places
    - _Requirements: 3.1, 5.2_
  - [ ]\* 10.3 Write property test for color determinism (Property 10)
    - **Property 10: Category color assignment is deterministic**
    - **Validates: Requirements 7.5**
    - For any string, call `getCategoryColor` twice and assert both calls return identical strings; assert built-in names return their exact hex values
  - [ ]\* 10.4 Write unit tests for `getCategoryColor` and `formatCurrency`
    - `getCategoryColor`: Food → `#ec4899`, Transport → `#3b82f6`, Fun → `#10b981`; same custom name called twice returns same value
    - `formatCurrency`: `0` → `$0.00`; `1234.5` → `$1,234.50`; `999999.99` → `$999,999.99`
    - _Requirements: 3.1, 7.5_

- [ ] 11. Checkpoint — Pure functions complete
  - Ensure `getSortedTransactions`, `getCategoryColor`, `formatCurrency`, and all mutation functions are implemented and their tests pass. Ask the user if questions arise before continuing.

- [ ] 12. Rewrite `js/app.js` — Rendering section
  - [ ] 12.1 Implement `renderBalanceDisplay()` — computes `total = AppState.transactions.reduce((s, t) => s + t.amount, 0)`, sets `#total-balance` text to `formatCurrency(total)`, then calls `renderSpendLimitWarning(total, AppState.spendLimit)`
    - _Requirements: 3.1, 3.3, 3.4_
  - [ ] 12.2 Implement `renderSpendLimitWarning(totalBalance, spendLimit)` — sets `#spend-limit-banner` `hidden` attribute and toggles `.over-limit` class on `#balance-card` based on `spendLimit > 0 && totalBalance > spendLimit`
    - _Requirements: 9.4, 9.5, 9.6_
  - [ ] 12.3 Implement `renderMonthlySummary()` — computes the current month/year label and the sum of transactions whose `date` falls within the current calendar month; sets `#active-month-name` and `#current-month-total` text content
    - _Requirements: 3.2, 3.5_
  - [ ] 12.4 Implement `renderCategoryDropdown()` — clears and repopulates `#category` `<select>` from `AppState.categories`; also renders the `#category-list` delete-button list for custom categories (categories not in `DEFAULT_CATEGORIES`)
    - _Requirements: 7.4, 7.7_
  - [ ] 12.5 Implement `renderTransactionList()` — if empty shows `#empty-state`; otherwise hides it, calls `getSortedTransactions(AppState.transactions, AppState.currentSort)`, and renders each item with name, category badge (using `getCategoryColor` via `--badge-color` CSS custom property), formatted amount, and delete button; items exceeding `AppState.spendLimit` (when limit > 0) get the `.over-limit` card style and an "Over Limit" badge
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 8.2, 9.4_
  - [ ] 12.6 Implement `renderChart()` — destroys `AppState.chartInstance` if it exists; groups transactions by category (only categories with total > 0 become segments); renders placeholder doughnut when no data; stores new instance in `AppState.chartInstance`; tooltip callback uses `formatCurrency`; legend label color is derived from `isDark()` check
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  - [ ] 12.7 Implement `renderAll()` — calls `renderBalanceDisplay()`, `renderMonthlySummary()`, `renderTransactionList()`, `renderChart()`, `renderCategoryDropdown()` in sequence
    - _Requirements: 1.6, 2.3, 3.3, 3.5_
  - [ ]\* 12.8 Write property test for balance computation (Property 4)
    - **Property 4: Balance equals the arithmetic sum of all transaction amounts**
    - **Validates: Requirements 3.1, 3.4**
    - Extract the balance computation logic into a testable `computeBalance(transactions)` helper; generate arbitrary arrays and assert sum equality; empty array → 0
  - [ ]\* 12.9 Write property test for category totals (Property 5)
    - **Property 5: Category totals are correct for any transaction array**
    - **Validates: Requirements 3.2, 4.1, 4.7**
    - Extract `groupByCategory(transactions)` as a testable helper; generate arbitrary arrays; assert each category value equals the sum of its transactions' amounts
  - [ ]\* 12.10 Write property test for spend limit warning visibility (Property 13)
    - **Property 13: Spend limit warning visibility matches the over-limit condition**
    - **Validates: Requirements 9.4, 9.5, 9.6**
    - Generate arbitrary `totalBalance` and `spendLimit` pairs; assert banner hidden iff `spendLimit === 0 || totalBalance <= spendLimit`

- [ ] 13. Rewrite `js/app.js` — Toast and inline error helpers
  - [ ] 13.1 Implement `showToast(message, type)` — creates a temporary `<div>` appended to `#toast-container`, applies success/error Tailwind classes, animates in using `.toast-enter`, auto-removes after 3 seconds with `.toast-leave` animation
    - _Requirements: NFR-3_
  - [ ] 13.2 Implement `showFieldError(fieldId, message)` — finds the `.field-error` span sibling of the element with `id=fieldId`, sets its text, removes `hidden`; implement `clearFieldErrors()` to hide all `.field-error` spans
    - _Requirements: 1.3, 7.3, 9.3_

- [ ] 14. Rewrite `js/app.js` — Event Listeners section
  - [ ] 14.1 Wire `DOMContentLoaded` handler — calls `loadState()`, sets `#limit-input` value from `AppState.spendLimit`, calls `renderAll()`
    - _Requirements: 6.2, 5.6_
  - [ ] 14.2 Wire `#transaction-form` `submit` handler — calls `clearFieldErrors()`, then `addTransaction(name, amount, category)`; on success resets the form
    - _Requirements: 1.4, 1.5_
  - [ ] 14.3 Wire `#add-cat-btn` `click` handler — calls `addCategory(customCatInput.value.trim())`; clears the input on success
    - _Requirements: 7.1, 7.4_
  - [ ] 14.4 Wire `#sort-select` `change` handler — sets `AppState.currentSort = e.target.value`, calls `renderTransactionList()`
    - _Requirements: 8.2_
  - [ ] 14.5 Wire `#limit-input` `change` (or `input`) handler — calls `setSpendLimit(parseFloat(e.target.value))`
    - _Requirements: 9.1, 9.2_
  - [ ] 14.6 Wire `#theme-toggle` `click` handler — toggles `dark` class on `<html>`, updates icon, persists to `localStorage`, calls `renderChart()` to re-render with correct label colors
    - _Requirements: NFR-3_
  - [ ] 14.7 Expose `deleteTransaction` and `deleteCategory` on `window` so inline `onclick` attributes in rendered HTML can call them
    - _Requirements: 2.2, 7.7_

- [ ] 15. Set up test infrastructure
  - [ ] 15.1 Create `tests/` directory structure with `unit/` and `property/` subdirectories; add a `package.json` at the project root with `vitest` and `fast-check` as dev dependencies and a `"test"` script running `vitest --run`
    - Install: `npm install --save-dev vitest fast-check`
    - _Requirements: NFR-5_
  - [ ] 15.2 Create `tests/unit/validation.test.js` — unit tests for `validateTransaction`, `validateCategory`, `validateSpendLimit` covering boundary values and specific error messages
    - _Requirements: 1.2, 7.2, 9.2_
  - [ ] 15.3 Create `tests/unit/formatting.test.js` — unit tests for `formatCurrency` and `getCategoryColor`
    - _Requirements: 3.1, 7.5_
  - [ ] 15.4 Create `tests/unit/storage.test.js` — unit tests for `safeParseJSON` with valid JSON, corrupted JSON, missing key, and null value
    - _Requirements: 6.6_

- [ ] 16. Create property-based test files
  - [ ] 16.1 Create `tests/property/transactions.property.test.js` — Properties 1, 2, 3, 4, 5 using `fast-check`
    - Property 1: `addTransaction` grows list by 1 (Req 1.4)
    - Property 2: invalid inputs rejected by validator (Req 1.2, 1.3)
    - Property 3: `deleteTransaction` removes exactly the target (Req 2.2, 2.4)
    - Property 4: balance equals sum of amounts (Req 3.1, 3.4)
    - Property 5: category totals are correct (Req 3.2, 4.1, 4.7)
  - [ ] 16.2 Create `tests/property/sorting.property.test.js` — Properties 6, 7, 8, 9 using `fast-check`
    - Property 6: sort preserves set identity (Req 5.4, 8.2)
    - Property 7: amount-desc is non-increasing (Req 8.3)
    - Property 8: amount-asc is non-decreasing (Req 8.4)
    - Property 9: category sort is alphabetically non-decreasing (Req 8.5)
  - [ ] 16.3 Create `tests/property/categories.property.test.js` — Properties 10, 11, 15 using `fast-check`
    - Property 10: `getCategoryColor` is deterministic (Req 7.5)
    - Property 11: invalid category names rejected, list unchanged (Req 7.2, 7.3)
    - Property 15: categories with transactions cannot be deleted (Req 7.8)
  - [ ] 16.4 Create `tests/property/spendlimit.property.test.js` — Properties 12, 13, 14 using `fast-check`
    - Property 12: localStorage round-trip preserves state (Req 6.1, 6.2, 6.4, 6.5, 7.6, 9.7)
    - Property 13: warning visibility matches over-limit condition (Req 9.4, 9.5, 9.6)
    - Property 14: corrupted localStorage falls back to defaults without throwing (Req 6.6)

- [ ] 17. Final checkpoint — All tests pass
  - Run `npm test` (or `npx vitest --run`) and confirm all unit and property tests pass. Verify the app loads in a browser, persists data across reloads, and all UI interactions work correctly. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints (tasks 7, 11, 17) ensure incremental validation before moving to the next phase
- Property tests use `fast-check` with a minimum of 100 iterations per property
- Unit tests cover specific examples, boundary values, and error conditions
- The existing `index.html` already has Chart.js CDN, toast container, sort select, and limit input — tasks 1.x focus on the missing pieces (field-error spans, `id="balance-card"`, `#spend-limit-banner`, `#category-list`)
- The existing `js/app.js` uses different localStorage keys (`transactions`, `custom_categories`, `spending_limit`) than the design spec — task 3.1 migrates to the canonical keys (`financely_transactions`, `financely_categories`, `financely_spend_limit`)
- All JS changes are confined to `js/app.js`; all CSS changes are confined to `css/style.css`
- `AppState.chartInstance` must be destroyed before each re-render to prevent Chart.js canvas reuse errors
- `renderMonthlySummary()` is a new render function added in task 12.3 — it was present in the existing skeleton's `updateDashboard()` but needs to be extracted as a standalone function per the design's module breakdown

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "3.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "4.1"] },
    {
      "id": 2,
      "tasks": ["5.1", "5.2", "5.3", "6.1", "6.2", "6.3", "10.1", "10.2"]
    },
    {
      "id": 3,
      "tasks": ["5.4", "5.5", "6.4", "6.5", "6.6", "10.3", "10.4", "15.1"]
    },
    { "id": 4, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "9.1"] },
    { "id": 5, "tasks": ["8.6", "8.7", "8.8", "9.2", "9.3", "9.4", "9.5"] },
    {
      "id": 6,
      "tasks": ["12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "13.1", "13.2"]
    },
    { "id": 7, "tasks": ["12.7", "12.8", "12.9", "12.10"] },
    {
      "id": 8,
      "tasks": ["14.1", "14.2", "14.3", "14.4", "14.5", "14.6", "14.7"]
    },
    { "id": 9, "tasks": ["15.2", "15.3", "15.4"] },
    { "id": 10, "tasks": ["16.1", "16.2", "16.3", "16.4"] }
  ]
}
```
