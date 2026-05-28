# Design Document — Financely: Expense & Budget Tracker

## Overview

Financely is a zero-dependency, browser-only personal finance tracker. The entire application lives in three files: `index.html`, `css/style.css`, and `js/app.js`. There is no build step, no server, and no framework. All state is held in memory during a session and persisted to `localStorage` between sessions.

The design goal is a **single-file JavaScript module** organized into clearly separated concerns via named function groups. Because the app is small and runs in a single global scope, the architecture uses a centralized `AppState` object as the single source of truth, with pure transformation functions and side-effectful render functions kept clearly distinct.

### Key Design Decisions

- **Single source of truth**: All mutable state lives in one `AppState` object. No scattered module-level variables.
- **Unidirectional data flow**: User action → mutate `AppState` → persist to `localStorage` → re-render UI. Nothing renders from stale local copies.
- **Pure sort/filter functions**: Sorting and filtering are pure functions that receive the transaction array and return a new sorted array, making them trivially testable.
- **Deterministic color assignment**: Category colors are derived from a fixed palette map plus a hash-based HSL fallback, so the same category name always produces the same color across sessions.
- **Chart.js as a rendering target**: The chart is treated as a pure output — it is always destroyed and recreated from the current `AppState` on every render cycle.

---

## Architecture

The application follows a simple **Event → State → Render** loop:

```
User Interaction
      │
      ▼
Event Handler (form submit, button click, select change)
      │
      ▼
Mutation Function (addTransaction, deleteTransaction, addCategory, etc.)
      │
      ▼
AppState (in-memory single source of truth)
      │
      ├──► persistState()  ──► localStorage
      │
      └──► renderAll()
              ├── renderBalanceDisplay()
              ├── renderMonthlySummary()
              ├── renderTransactionList()
              ├── renderChart()
              └── renderSpendLimitWarning()
```

### Module Breakdown (within `js/app.js`)

The single JS file is divided into clearly commented sections:

| Section                | Responsibility                                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Constants & Config** | Default categories, localStorage keys, color palette                                                                                                                   |
| **State**              | `AppState` object definition and initialization                                                                                                                        |
| **Persistence**        | `loadState()`, `saveState()`, safe JSON parse helpers                                                                                                                  |
| **Validation**         | `validateTransaction()`, `validateCategory()`, `validateSpendLimit()`                                                                                                  |
| **Mutations**          | `addTransaction()`, `deleteTransaction()`, `addCategory()`, `deleteCategory()`, `setSpendLimit()`                                                                      |
| **Sorting**            | `getSortedTransactions()` — pure function                                                                                                                              |
| **Color**              | `getCategoryColor()` — deterministic, pure function                                                                                                                    |
| **Formatting**         | `formatCurrency()` — pure function                                                                                                                                     |
| **Rendering**          | `renderAll()`, `renderTransactionList()`, `renderChart()`, `renderBalanceDisplay()`, `renderMonthlySummary()`, `renderSpendLimitWarning()`, `renderCategoryDropdown()` |
| **Toast**              | `showToast()`                                                                                                                                                          |
| **Event Listeners**    | All DOM event bindings, wired at `DOMContentLoaded`                                                                                                                    |

---

## Components and Interfaces

### Validation Layer

All validation functions return a result object `{ valid: boolean, error: string | null }` so callers can display inline errors without throwing exceptions.

```js
// validateTransaction(name, amount, category) → { valid, error, field }
// validateCategory(name, existingCategories) → { valid, error }
// validateSpendLimit(value) → { valid, error }
```

**Transaction validation rules:**

- `name`: non-empty string, 1–100 characters after trimming
- `amount`: numeric, > 0, ≤ 999,999.99
- `category`: must be a non-empty string present in the current category list

**Category validation rules:**

- `name`: non-empty, 1–50 characters after trimming
- Case-insensitive uniqueness check against all existing categories

**Spend Limit validation rules:**

- Numeric, 0.01 ≤ value ≤ 999,999,999.99

### Inline Error Display

Each form field has a sibling `<span class="field-error">` element. The validation layer returns a `field` key identifying which element to target. On successful submission the error spans are cleared.

### Toast Notification System

`showToast(message, type)` creates a temporary DOM element appended to `#toast-container`. It auto-removes after 3 seconds. `type` is `'success'` or `'error'`.

### Sort Control

`getSortedTransactions(transactions, sortKey)` is a **pure function** — it takes the array and a sort key string and returns a new sorted array without mutating the input.

| Sort Key        | Behavior                                                              |
| --------------- | --------------------------------------------------------------------- |
| `'latest'`      | Insertion order descending (sort by `date` ISO string descending)     |
| `'amount-desc'` | Amount descending; ties broken by `date` descending                   |
| `'amount-asc'`  | Amount ascending; ties broken by `date` descending                    |
| `'category'`    | Category name A–Z (`localeCompare`); ties broken by `date` descending |

### Spend Limit Warning

`renderSpendLimitWarning(totalBalance, spendLimit)` is called as part of `renderAll()`. It toggles a CSS class on the Balance Display card (`#balance-card`) and shows/hides a `#spend-limit-banner` element.

- Warning is shown when `totalBalance > spendLimit` AND `spendLimit > 0`
- Warning is hidden when `totalBalance ≤ spendLimit` OR `spendLimit` is `0` / not set

### Category Management

- Built-in categories (`Food`, `Transport`, `Fun`) are defined as a constant array and are always present.
- Custom categories are stored in `AppState.categories` (which starts as a copy of built-ins and grows with user additions).
- Deletion is only permitted when no transaction references the category. The check is: `transactions.some(t => t.category === name)`.

### Chart.js Integration

- Chart instance is stored in `AppState.chartInstance`.
- On every render, `AppState.chartInstance.destroy()` is called before creating a new `Chart` instance. This avoids Chart.js memory leaks and stale canvas state.
- Data fed to the chart is derived from `AppState.transactions` grouped by category — only categories with `total > 0` appear as segments.
- Empty state: a single grey segment with label `'No Data Available'` and tooltips disabled.

---

## Data Models

### Transaction

```js
{
  id: string,          // 'tx-' + Date.now() — unique per session
  name: string,        // 1–100 chars, trimmed
  amount: number,      // > 0, ≤ 999,999.99, stored as float
  category: string,    // must match a name in AppState.categories
  date: string         // ISO 8601 timestamp (new Date().toISOString())
}
```

### Category

Categories are stored as plain strings in an array. Color is derived on-the-fly from `getCategoryColor(name)` — it is never stored.

```js
// AppState.categories: string[]
// Example: ['Food', 'Transport', 'Fun', 'Gym', 'Travel']
```

### AppState

```js
const AppState = {
  transactions: [], // Transaction[]
  categories: [], // string[] — built-ins + custom
  spendLimit: 0, // number — 0 means "not set"
  currentSort: "latest", // 'latest' | 'amount-desc' | 'amount-asc' | 'category'
  chartInstance: null, // Chart.js instance | null
};
```

### LocalStorage Schema

| Key                      | Type        | Shape           |
| ------------------------ | ----------- | --------------- |
| `financely_transactions` | JSON string | `Transaction[]` |
| `financely_categories`   | JSON string | `string[]`      |
| `financely_spend_limit`  | JSON string | `number`        |

All reads are wrapped in a safe parser:

```js
function safeParseJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback; // handles corrupted JSON (Requirement 6.6)
  }
}
```

---

## Chart.js Integration Approach

Chart.js is loaded via CDN (`https://cdn.jsdelivr.net/npm/chart.js`). No plugins are required.

### Render Flow

```js
function renderChart() {
  if (AppState.chartInstance) AppState.chartInstance.destroy();

  const ctx = document.getElementById("spending-chart").getContext("2d");
  const grouped = groupByCategory(AppState.transactions); // { [category]: total }
  const active = Object.entries(grouped).filter(([, v]) => v > 0);

  if (active.length === 0) {
    // render placeholder
    AppState.chartInstance = new Chart(ctx, emptyChartConfig(isDark()));
    return;
  }

  const labels = active.map(([k]) => k);
  const data = active.map(([, v]) => v);
  const colors = labels.map(getCategoryColor);

  AppState.chartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        { data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: labelColor(),
            font: { family: "Plus Jakarta Sans", size: 11 },
            padding: 15,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`,
          },
        },
      },
    },
  });
}
```

### Theme Awareness

`isDark()` checks `document.documentElement.classList.contains('dark')`. Legend label color and placeholder segment color are derived from this at render time.

---

## Color Assignment Strategy

### Built-in Palette

A fixed map covers the default categories and ensures brand-consistent colors:

```js
const CATEGORY_COLORS = {
  Food: "#ec4899", // pink
  Transport: "#3b82f6", // blue
  Fun: "#10b981", // emerald
  Holiday: "#d97706", // amber
  Other: "#06b6d4", // cyan
};
```

### Custom Category Color Generation

For any category name not in `CATEGORY_COLORS`, a deterministic HSL color is derived from the name string:

```js
function getCategoryColor(name) {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];

  // Hash the name to a consistent integer
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Constrain hue to 260–320 (violet/purple range) to avoid clashing with built-ins
  const hue = Math.abs(hash % 60) + 260;
  return `hsl(${hue}, 70%, 55%)`;
}
```

**Rationale**: Built-in colors occupy pink, blue, emerald, amber, and cyan. Custom colors are locked to the violet/purple hue band (260–320°), which is visually distinct from all built-in hues. The hash is deterministic — the same name always produces the same color across page reloads.

---

## Sort Algorithm Design

`getSortedTransactions` is a **pure function** with no side effects:

```js
function getSortedTransactions(transactions, sortKey) {
  const copy = [...transactions]; // never mutate the source array

  const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date);

  switch (sortKey) {
    case "amount-desc":
      return copy.sort((a, b) => b.amount - a.amount || byDateDesc(a, b));
    case "amount-asc":
      return copy.sort((a, b) => a.amount - b.amount || byDateDesc(a, b));
    case "category":
      return copy.sort(
        (a, b) => a.category.localeCompare(b.category) || byDateDesc(a, b),
      );
    case "latest":
    default:
      return copy.sort(byDateDesc);
  }
}
```

Key properties:

- The original `AppState.transactions` array is **never mutated** — a shallow copy is sorted.
- Tie-breaking always falls back to `date` descending so the output is fully deterministic.
- `localeCompare` is used for category sort to handle non-ASCII characters correctly.

---

## Spend Limit Warning Logic

```js
function renderSpendLimitWarning(totalBalance, spendLimit) {
  const banner = document.getElementById("spend-limit-banner");
  const card = document.getElementById("balance-card");
  const isOver = spendLimit > 0 && totalBalance > spendLimit;

  banner.hidden = !isOver;
  card.classList.toggle("over-limit", isOver);
}
```

- `spendLimit === 0` is treated as "not set" — no warning is ever shown.
- The warning is re-evaluated on every `renderAll()` call, so it responds immediately to both transaction changes and limit input changes.
- The `over-limit` CSS class adds a `border-rose-500` ring to the balance card.

---

## Error Handling

### Validation Strategy

All user inputs are validated before any state mutation occurs. Validation functions are pure and return structured result objects rather than throwing exceptions.

```js
// Example return shape
{ valid: false, error: 'Amount must be greater than 0', field: 'amount' }
```

### Inline Field Errors

Each form field has a dedicated `<span class="field-error text-xs text-rose-500 mt-1 hidden">` sibling. On validation failure, the relevant span's text is set and its `hidden` attribute removed. On successful submission, all error spans are cleared.

### LocalStorage Corruption

`safeParseJSON(key, fallback)` wraps every `localStorage.getItem` + `JSON.parse` call. If parsing fails, the fallback value is used and no error is thrown (Requirement 6.6).

### Category Deletion Guard

Before deleting a custom category, the app checks whether any transaction references it:

```js
const inUse = AppState.transactions.some((t) => t.category === name);
if (inUse) {
  showToast("Cannot delete: category has transactions.", "error");
  return;
}
```

### Chart Lifecycle

`AppState.chartInstance.destroy()` is always called before creating a new chart instance to prevent Chart.js canvas reuse errors.

---

## Testing Strategy

### Dual Testing Approach

The testing strategy combines **unit/example-based tests** for specific behaviors and **property-based tests** for universal correctness guarantees.

- **Unit tests** cover specific examples, edge cases, and error conditions (e.g., "submitting an empty name shows an error").
- **Property-based tests** verify universal properties across many generated inputs (e.g., "for any valid transaction, sorting never loses items").

### Property-Based Testing Library

**[fast-check](https://github.com/dubzzz/fast-check)** is the chosen PBT library for JavaScript. It integrates with any test runner (Jest, Vitest) and provides rich arbitraries for generating strings, numbers, arrays, and objects.

Each property test runs a **minimum of 100 iterations**.

### Unit Test Focus Areas

- Validation functions: specific valid and invalid inputs
- `formatCurrency`: known inputs and expected outputs
- `getCategoryColor`: built-in names return exact hex values
- `safeParseJSON`: corrupted JSON returns fallback
- Category deletion guard: category with/without transactions
- Spend limit warning: boundary conditions (exactly at limit, one cent over)

### Property Test Focus Areas

Each property test is tagged with a comment referencing the design property it validates:
`// Feature: expense-budget-tracker, Property N: <property text>`

### Test File Structure

```
tests/
  unit/
    validation.test.js
    formatting.test.js
    storage.test.js
  property/
    transactions.property.test.js
    sorting.property.test.js
    categories.property.test.js
    spendlimit.property.test.js
```

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

> **Property Reflection — Redundancy Check (completed before writing):**
>
> - Prework items for whitespace names and out-of-range amounts are distinct rejection conditions → combined into one comprehensive Property 2.
> - Prework items for amount-ordering (8.3, 8.4) are not redundant with set-identity (Property 6) → kept separately as Properties 7 and 8.
> - Prework items 9.4, 9.5, and 9.6 (warning shown/hidden/zero-limit) are three facets of the same boolean condition → combined into one comprehensive Property 13.
> - Prework items 6.1, 6.2, 6.4, 6.5, 7.6, 9.7 all describe persistence round-trips → consolidated into Property 12.
> - Prework items 7.3 and 7.8 (category list unchanged after invalid add vs. blocked delete) are distinct guards → kept as Properties 11 and 15.

### Property 1: Adding a valid transaction grows the list by exactly one

_For any_ transaction list and any valid transaction input (non-empty name of 1–100 characters, positive amount ≤ 999,999.99, category present in the category list), calling `addTransaction` SHALL produce a transaction array whose length is exactly one greater than the original, and the new transaction SHALL be the first element.

**Validates: Requirements 1.4**

### Property 2: Invalid transaction inputs are rejected by the validator

_For any_ combination of invalid inputs — a name that is empty, whitespace-only, or exceeds 100 characters; an amount that is ≤ 0, > 999,999.99, or NaN; or a missing category — `validateTransaction` SHALL return `{ valid: false }` and the transaction array SHALL remain unchanged.

**Validates: Requirements 1.2, 1.3**

### Property 3: Delete removes exactly the targeted transaction

_For any_ transaction array containing at least one transaction, deleting a transaction by its unique ID SHALL produce an array that does not contain that ID and whose length is exactly one less than the original. All other transactions SHALL be preserved unchanged.

**Validates: Requirements 2.2, 2.4**

### Property 4: Balance equals the arithmetic sum of all transaction amounts

_For any_ array of transactions (including the empty array), `computeBalance(transactions)` SHALL return a value equal to the sum of all `amount` fields. For an empty array the result SHALL be `0`.

**Validates: Requirements 3.1, 3.4**

### Property 5: Category totals are correct for any transaction array

_For any_ array of transactions, `groupByCategory(transactions)` SHALL return an object where each key is a category name and each value equals the sum of amounts of all transactions in that category. Categories with no transactions SHALL have a total of `0` (or be absent from the result).

**Validates: Requirements 3.2, 4.1, 4.7**

### Property 6: Sorting never loses or duplicates transactions

_For any_ transaction array and any valid sort key (`'latest'`, `'amount-desc'`, `'amount-asc'`, `'category'`), `getSortedTransactions(transactions, sortKey)` SHALL return an array containing exactly the same set of transaction IDs as the input — same count, same elements, no duplicates — and the original input array SHALL be unmodified.

**Validates: Requirements 5.4, 8.2**

### Property 7: Amount-descending sort produces a non-increasing sequence

_For any_ transaction array sorted by `'amount-desc'`, every adjacent pair `(a, b)` in the result SHALL satisfy `a.amount >= b.amount`.

**Validates: Requirements 8.3**

### Property 8: Amount-ascending sort produces a non-decreasing sequence

_For any_ transaction array sorted by `'amount-asc'`, every adjacent pair `(a, b)` in the result SHALL satisfy `a.amount <= b.amount`.

**Validates: Requirements 8.4**

### Property 9: Category sort produces alphabetically non-decreasing order

_For any_ transaction array sorted by `'category'`, every adjacent pair `(a, b)` in the result SHALL satisfy `a.category.localeCompare(b.category) <= 0`.

**Validates: Requirements 8.5**

### Property 10: Category color assignment is deterministic

_For any_ category name string, calling `getCategoryColor(name)` any number of times SHALL always return the same color string. Built-in category names SHALL return their exact predefined hex values.

**Validates: Requirements 7.5**

### Property 11: Invalid custom category names are rejected and the list is unchanged

_For any_ existing category list and any proposed new category name that is empty, exceeds 50 characters, or is a case-insensitive duplicate of an existing category, `validateCategory` SHALL return `{ valid: false }` and the category list SHALL remain unchanged after the attempted addition.

**Validates: Requirements 7.2, 7.3**

### Property 12: LocalStorage round-trip preserves full application state

_For any_ valid application state (transactions array, categories array, spendLimit number), serializing each field to localStorage and then deserializing via `safeParseJSON` SHALL produce values that are deeply equal to the originals. This property holds for transactions, categories, and spendLimit independently.

**Validates: Requirements 6.1, 6.2, 6.4, 6.5, 7.6, 9.7**

### Property 13: Spend limit warning visibility matches the over-limit condition

_For any_ total balance value and any spend limit value, the warning element SHALL be visible if and only if `spendLimit > 0 AND totalBalance > spendLimit`. When `spendLimit === 0` the warning SHALL never be shown regardless of the total balance. When `totalBalance <= spendLimit` the warning SHALL be hidden.

**Validates: Requirements 9.4, 9.5, 9.6**

### Property 14: Corrupted localStorage data falls back to defaults without throwing

_For any_ string that is not valid JSON (random bytes, truncated JSON, empty string), calling `safeParseJSON(key, fallback)` SHALL return the fallback value and SHALL NOT throw any exception.

**Validates: Requirements 6.6**

### Property 15: Custom categories with associated transactions cannot be deleted

_For any_ category name that appears as the `category` field of at least one transaction in the current transaction array, calling `deleteCategory(name)` SHALL leave the category list unchanged and SHALL NOT remove the category.

**Validates: Requirements 7.8**
