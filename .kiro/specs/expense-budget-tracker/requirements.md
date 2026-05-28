# Requirements Document

## Introduction

Financely is a personal expense and budget tracker web application that runs entirely in the browser. It allows users to record, categorize, and visualize their spending without any server-side infrastructure. The application is built with HTML, CSS, and Vanilla JavaScript, persists all data in the browser's LocalStorage, and is designed to be fast, minimal, and visually clear.

The existing skeleton provides a dark-themed dashboard with a transaction form (name, amount, category), a doughnut chart for spending by category, and a transaction list with delete functionality. This requirements document defines the full feature set to be implemented, including three selected optional challenges: **custom categories**, **sort transactions**, and **highlight spending over a set limit**.

---

## Glossary

- **App**: The Financely web application running in the browser.
- **Transaction**: A single spending record consisting of a name, amount, and category.
- **Category**: A label assigned to a Transaction to group spending (e.g., Food, Transport, Fun, or a user-defined custom category).
- **Custom_Category**: A user-defined Category created at runtime, stored alongside built-in categories.
- **Transaction_List**: The rendered list of all Transactions displayed in the dashboard.
- **Balance_Display**: The UI element showing the total sum of all Transaction amounts.
- **Spending_Summary**: The aggregated total spending grouped by Category.
- **Chart**: The Chart.js doughnut chart visualizing the Spending_Summary.
- **LocalStorage**: The browser's Web Storage API used as the sole persistence layer.
- **Spend_Limit**: A user-defined numeric threshold for total spending, above which a visual warning is shown.
- **Sort_Control**: The UI control that allows the user to reorder the Transaction_List.
- **Form**: The HTML form used to submit a new Transaction.
- **Validator**: The client-side logic that checks Form inputs before a Transaction is created.

---

## Requirements

---

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to add a new spending transaction with a name, amount, and category, so that I can keep an accurate record of my expenses.

#### Acceptance Criteria

1. THE Form SHALL include input fields for transaction name (text, max 100 characters), amount (number, greater than 0 and at most 999,999.99), and category (select).
2. WHEN the user submits the Form, THE Validator SHALL verify that the name is non-empty (1–100 characters), the amount is a positive number greater than zero and at most 999,999.99, and a category is selected.
3. IF the Validator detects an invalid or missing field, THEN THE App SHALL display an inline error message directly below the offending field without clearing other valid inputs.
4. WHEN the Form passes validation, THE App SHALL create a new Transaction object with a unique ID, the provided name, amount, and category, and prepend it to the Transaction_List.
5. WHEN a Transaction is successfully added, THE App SHALL reset the Form to its default empty state (name and amount fields cleared to empty, category selector returned to the first option).
6. WHEN a Transaction is successfully added, THE App SHALL update the Balance_Display, the Chart, and the Transaction_List before the next user interaction is possible.

---

### Requirement 2: Delete a Transaction

**User Story:** As a user, I want to delete a transaction from my history, so that I can correct mistakes or remove irrelevant entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL render a delete button for each Transaction item.
2. WHEN the user activates the delete button for a Transaction, THE App SHALL remove that Transaction from the in-memory transaction array using the Transaction's unique ID.
3. WHEN a Transaction is deleted, THE App SHALL update the Balance_Display, the Chart (with recalculated category totals), and the Transaction_List within the same render cycle.
4. WHEN a Transaction is deleted, THE App SHALL write the updated transaction array to LocalStorage.
5. WHEN the last Transaction is deleted, THE App SHALL display the empty-state placeholder in the Transaction_List.

---

### Requirement 3: View Total Balance and Spending Summary

**User Story:** As a user, I want to see my total spending and a per-category breakdown at a glance, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all Transaction amounts (where each amount is greater than 0 and at most 999,999.99) formatted as USD currency (e.g., `$1,234.56`).
2. THE Spending_Summary SHALL calculate the total amount spent per Category across all Transactions; categories with no Transactions SHALL show $0.00.
3. WHEN the transaction data changes (add or delete), THE Balance_Display SHALL update without requiring a page reload.
4. WHEN no Transactions exist, THE Balance_Display SHALL display `$0.00` and the Spending_Summary SHALL show $0.00 for all categories.
5. WHEN the transaction data changes (add or delete), THE Spending_Summary SHALL update to reflect the new per-category totals without requiring a page reload.

---

### Requirement 4: Spending Breakdown Chart

**User Story:** As a user, I want to see a visual chart of my spending by category, so that I can quickly identify which categories consume the most of my budget.

#### Acceptance Criteria

1. THE Chart SHALL render as a doughnut chart using Chart.js, displaying one segment per Category that has at least one Transaction; categories with zero total SHALL NOT appear as segments.
2. WHEN a Transaction is added or deleted, THE Chart SHALL re-render to reflect the updated category totals.
3. WHEN no Transactions exist, THE Chart SHALL display a neutral placeholder state (single grey segment, no tooltip, label "No Data Available").
4. THE Chart SHALL display a legend below the chart area listing each active Category and its associated color.
5. WHEN the user hovers over a Chart segment, THE Chart SHALL display a tooltip showing the Category name and the total for that Category formatted in the application's standard USD currency format.
6. WHEN a Custom_Category is added and has associated Transactions, THE Chart SHALL include a segment for that Custom_Category with a color that is visually differentiable from all existing segment colors.
7. WHEN all Transactions belonging to a Custom_Category are deleted, THE Chart SHALL remove that Custom_Category's segment from the chart.

---

### Requirement 5: Transaction History List

**User Story:** As a user, I want to browse all my past transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all Transactions in reverse-chronological order by default (most recently added first).
2. THE Transaction_List SHALL render each Transaction item showing the transaction name, category badge, and amount formatted with a currency symbol and two decimal places.
3. THE Transaction_List SHALL be vertically scrollable when the number of items exceeds the visible area.
4. WHEN the Transaction_List is sorted via the Sort_Control, THE App SHALL re-render the list in the selected order without modifying the underlying stored data.
5. WHEN the Transaction_List is empty, THE App SHALL display an empty-state message with the text "No transactions yet. Start adding above!" (or equivalent).
6. WHEN the App initializes on page load, THE Transaction_List SHALL render all Transactions restored from LocalStorage before the first user interaction is possible.

---

### Requirement 6: LocalStorage Persistence

**User Story:** As a user, I want my transactions and settings to be saved automatically, so that my data is still available when I reopen the browser tab.

#### Acceptance Criteria

1. WHEN a Transaction is added or deleted, THE App SHALL write the updated transaction array to LocalStorage under a defined key (e.g., `financely_transactions`).
2. WHEN the App initializes on page load, THE App SHALL read the transaction array, custom categories list, and Spend_Limit from LocalStorage and restore the full application state including the Balance_Display, Chart, Transaction_List, category selector, and spend-limit input.
3. WHEN the App initializes and LocalStorage contains no transaction data, THE App SHALL initialize with an empty transaction array, display the empty-state placeholder, and show `$0.00` in the Balance_Display.
4. WHEN a Custom_Category is created or deleted, THE App SHALL persist the custom categories list to LocalStorage under a separate defined key (e.g., `financely_categories`).
5. WHEN the Spend_Limit is set or updated, THE App SHALL persist the Spend_Limit value to LocalStorage under a separate defined key (e.g., `financely_spend_limit`).
6. WHEN the App initializes and LocalStorage contains data that cannot be parsed (e.g., corrupted JSON), THE App SHALL fall back to default empty state for the affected data key and SHALL NOT throw an unhandled error.

---

### Requirement 7: Custom Categories _(Selected — In Scope)_

**User Story:** As a user, I want to create my own spending categories, so that I can organize my transactions in a way that reflects my personal lifestyle.

#### Acceptance Criteria

1. THE App SHALL provide a UI control that allows the user to enter and submit a new Custom_Category name (1–50 characters).
2. WHEN the user submits a new Custom_Category name, THE Validator SHALL verify that the name is non-empty, does not exceed 50 characters, and does not duplicate an existing Category name (case-insensitive comparison against all built-in and custom categories).
3. IF the Custom_Category name is empty, exceeds 50 characters, or duplicates an existing category, THEN THE App SHALL display a specific error message identifying the rejection reason and SHALL NOT create the category.
4. WHEN a valid Custom_Category is created, THE App SHALL add it to the category list and make it available in the Form's category selector without requiring a page reload.
5. WHEN a Custom_Category is created, THE App SHALL assign it a color that is visually distinct from all existing built-in and custom category colors, for use in the Chart and category badge.
6. WHEN a Custom_Category is created, THE App SHALL persist it to LocalStorage so it is available after a page reload.
7. WHEN the user initiates deletion of a Custom_Category that has no associated Transactions, THE App SHALL remove it from the category list, the Form's category selector, and LocalStorage.
8. IF the user attempts to delete a Custom_Category that has one or more associated Transactions, THEN THE App SHALL display a warning message indicating that the category cannot be deleted while transactions are assigned to it, and SHALL NOT delete the category.

---

### Requirement 8: Sort Transactions _(Selected — In Scope)_

**User Story:** As a user, I want to sort my transaction list by amount or category, so that I can quickly find and analyze specific groups of spending.

#### Acceptance Criteria

1. THE App SHALL provide a Sort_Control with the following sort options: Default (insertion order descending, most recently added first), Amount Descending, Amount Ascending, and Category (alphabetical ascending); each Transaction SHALL carry a recorded insertion timestamp to support date-based ordering.
2. WHEN the user selects a sort option from the Sort_Control, THE App SHALL re-render the Transaction_List in the selected order.
3. WHEN the Transaction_List is sorted by Amount Descending, THE App SHALL display the highest-amount Transaction first; ties SHALL be broken by insertion timestamp descending (most recent first).
4. WHEN the Transaction_List is sorted by Amount Ascending, THE App SHALL display the lowest-amount Transaction first; ties SHALL be broken by insertion timestamp descending (most recent first).
5. WHEN the Transaction_List is sorted by Category, THE App SHALL order Transactions alphabetically by Category name (A–Z); Transactions within the same Category SHALL be ordered by insertion timestamp descending.
6. WHEN a new Transaction is added while a non-default sort is active, THE App SHALL re-render the Transaction_List applying the currently active sort order.
7. THE Sort_Control SHALL visually distinguish the currently active sort option from inactive options (e.g., via a highlighted or selected state).
8. WHEN the App initializes on page load, THE Sort_Control SHALL default to the Default sort option and the Transaction_List SHALL render in insertion order descending.

---

### Requirement 9: Highlight Spending Over a Set Limit _(Selected — In Scope)_

**User Story:** As a user, I want to set a spending limit and receive a visual warning when I exceed it, so that I can stay within my budget.

#### Acceptance Criteria

1. THE App SHALL provide a UI input that allows the user to set a numeric Spend_Limit in USD (minimum 0.01, maximum 999,999,999.99, up to 2 decimal places).
2. WHEN the user sets a Spend_Limit, THE Validator SHALL verify that the value is a positive number within the range 0.01–999,999,999.99.
3. IF the Spend_Limit input is invalid, THEN THE App SHALL display an error message, retain the invalid input value in the field, and SHALL NOT update the stored Spend_Limit.
4. WHILE the total spending (Balance_Display value) exceeds the Spend_Limit, THE App SHALL make a dedicated warning element visible on the dashboard (e.g., a highlighted banner or colored border on the Balance_Display card).
5. WHEN the total spending drops to or below the Spend_Limit (e.g., after a deletion), THE App SHALL hide the warning element.
6. WHEN no Spend_Limit has been set, THE App SHALL NOT display the warning element.
7. THE App SHALL persist the Spend_Limit to LocalStorage and restore it on page load (covered by Requirement 6.5 and 6.2).

---

### Requirement 10: Monthly Summary View _(Out of Scope — Not Selected)_

**User Story:** As a user, I want to view a summary of my spending filtered to a specific month, so that I can track my budget on a monthly basis.

> **Status:** Out of scope for this release. This requirement is documented for future consideration.

#### Acceptance Criteria

1. THE App SHALL provide a month/year selector that filters the Transaction_List and Spending_Summary to the selected calendar month.
2. WHEN a month filter is active, THE Balance_Display SHALL reflect only the total spending for the selected month.
3. WHEN a month filter is active, THE Chart SHALL reflect only the category totals for the selected month.
4. WHEN the user clears the month filter, THE App SHALL restore the unfiltered view of all Transactions.

---

### Requirement 11: Dark/Light Mode Toggle _(Out of Scope — Not Selected)_

**User Story:** As a user, I want to switch between dark and light color themes, so that I can use the app comfortably in different lighting conditions.

> **Status:** Out of scope for this release. This requirement is documented for future consideration.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control in the header to switch between Dark_Mode and Light_Mode.
2. WHEN the user activates the toggle, THE App SHALL apply the selected color scheme to all UI elements.
3. THE App SHALL persist the selected theme preference to LocalStorage and restore it on page load.
4. WHILE Light_Mode is active, THE App SHALL maintain readable contrast ratios meeting WCAG AA standards for all text and interactive elements.

---

## Non-Functional Requirements

### NFR-1: Usability

THE App SHALL present a clean, minimal interface requiring no setup or onboarding, with all primary actions accessible from the main dashboard view.

### NFR-2: Performance

WHEN any user action triggers a UI update (add, delete, sort, set limit), THE App SHALL complete the re-render within 100ms on a modern browser running on a mid-range device.

### NFR-3: Visual Design

THE App SHALL maintain a consistent visual hierarchy using the Plus Jakarta Sans typeface, glassmorphism card styles, and the existing indigo/purple/pink gradient palette defined in `css/style.css`.

### NFR-4: Browser Compatibility

THE App SHALL function correctly in the latest stable releases of Chrome, Firefox, Edge, and Safari without requiring any build step, server, or external runtime.

### NFR-5: Code Quality

THE App SHALL be implemented in a single JS file (`js/app.js`) and a single CSS file (`css/style.css`), with code organized into clearly named functions and commented sections for maintainability.
