// Smart Expense Tracker - Vanilla JavaScript + localStorage
// This file handles everything related to expenses on the page.
// It is written in a step‑by‑step, beginner‑friendly style with small functions.

// -----------------------------
// 1. BASIC SETUP / DOM ELEMENTS
// -----------------------------

// We grab all the elements we will interact with in JavaScript.
const expenseForm = document.getElementById("expenseForm");
const amountInput = document.getElementById("amount");
const descriptionInput = document.getElementById("description");
const categorySelect = document.getElementById("category");
const expenseAccountSelect = document.getElementById("expenseAccount");
const expenseTableBody = document.getElementById("expenseTableBody");
const totalAmountEl = document.getElementById("totalAmount");
const balanceAmountEl = document.getElementById("balanceAmount");
const clearAllBtn = document.getElementById("clearAllBtn");
const emptyStateEl = document.getElementById("emptyState");

// Elements for bank accounts section
const bankAccountForm = document.getElementById("bankAccountForm");
const accountNameInput = document.getElementById("accountName");
const accountBalanceInput = document.getElementById("accountBalance");
const bankAccountsBody = document.getElementById("bankAccountsBody");
const bankTotalEl = document.getElementById("bankTotal");
const bankEmptyStateEl = document.getElementById("bankEmptyState");

// Keys under which we store data in the browser's localStorage.
const STORAGE_KEY = "smart_expense_tracker_expenses";
const BANK_STORAGE_KEY = "smart_expense_tracker_bank_accounts";

// This array will always contain the current list of expenses in memory.
// We keep this in sync with localStorage.
let expenses = [];

// This array will contain the list of bank accounts in memory.
let accounts = [];

// -----------------------------
// 2. SMALL HELPER FUNCTIONS
// -----------------------------

// formatCurrency(number) -> string
// Takes a number and returns a string formatted as Indian Rupees.
function formatCurrency(value) {
    return "₹" + value.toFixed(2);
}

// generateId() -> string
// Creates a simple unique id by combining the current time and a random number.
// This is good enough for a small project like this.
function generateId() {
    const timePart = Date.now().toString();
    const randomPart = Math.random().toString(16).slice(2);
    return timePart + randomPart;
}

// -----------------------------
// 3. LOCALSTORAGE FUNCTIONS
// -----------------------------

// loadExpensesFromStorage() -> array
// Reads the JSON string from localStorage, converts it back to an array,
// and returns an empty array if nothing is saved or if parsing fails.
function loadExpensesFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        return [];
    } catch (error) {
        // If something goes wrong while reading JSON, we just start fresh.
        return [];
    }
}

// saveExpensesToStorage(expenseList)
// Converts the array of expenses to JSON and stores it in localStorage.
function saveExpensesToStorage(expenseList) {
    const json = JSON.stringify(expenseList);
    localStorage.setItem(STORAGE_KEY, json);
}

// sendExpensesToServer()
// Sends the current "expenses" array to the Python backend so it can be
// written into Expense.txt on the server side.
function sendExpensesToServer() {
    fetch("http://127.0.0.1:5000/save-expenses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(expenses),
    }).catch(function (error) {
        // For a college project, logging to the console is enough.
        console.error("Failed to save expenses to server:", error);
    });
}

// loadAccountsFromStorage() -> array
// Reads the list of bank accounts from localStorage.
function loadAccountsFromStorage() {
    const raw = localStorage.getItem(BANK_STORAGE_KEY);
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        return [];
    } catch (error) {
        return [];
    }
}

// saveAccountsToStorage(accountList)
// Saves the list of bank accounts into localStorage.
function saveAccountsToStorage(accountList) {
    const json = JSON.stringify(accountList);
    localStorage.setItem(BANK_STORAGE_KEY, json);
}

// -----------------------------
// 4. RENDERING EXPENSES IN THE TABLE
// -----------------------------

// createExpenseRow(expense) -> <tr>
// Creates a single table row (<tr>) element for the given expense object.
function createExpenseRow(expense) {
    const tr = document.createElement("tr");
    tr.dataset.id = expense.id; // keep the id on the row so we can delete it later

    tr.innerHTML = `
        <td>${formatCurrency(expense.amount)}</td>
        <td>${expense.description}</td>
        <td>${expense.category}</td>
        <td>${expense.accountName || "-"}</td>
        <td class="text-end">
            <button class="btn btn-sm btn-outline-danger btn-delete-expense">
                <i class="bi bi-trash"></i>
                Delete
            </button>
        </td>
    `;

    return tr;
}

// renderExpenses()
// Clears the table body and re-adds a row for each expense in the "expenses" array.
function renderExpenses() {
    expenseTableBody.innerHTML = "";

    for (let i = 0; i < expenses.length; i++) {
        const expense = expenses[i];
        const row = createExpenseRow(expense);
        expenseTableBody.appendChild(row);
    }

    updateEmptyState();
}

// createAccountRow(account) -> <tr>
// Creates a table row element for a given bank account.
function createAccountRow(account) {
    let spent = 0;
    for (let i = 0; i < expenses.length; i++) {
        if (expenses[i].accountName === account.name) {
            spent += expenses[i].amount;
        }
    }
    const remaining = account.balance - spent;
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${account.name}</td>
        <td class="text-end">${formatCurrency(remaining)}</td>
    `;
    return tr;
}

// renderAccounts()
// Clears the bank accounts table and re-adds rows for each account.
function renderAccounts() {
    if (!bankAccountsBody) {
        return;
    }

    bankAccountsBody.innerHTML = "";

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const row = createAccountRow(account);
        bankAccountsBody.appendChild(row);
    }

    updateBankEmptyState();
}

// updateTotal()
// Calculates the total amount of all expenses, displays it under the table,
// and also updates the "Available Balance" as:
//   total across all bank accounts - total expenses.
function updateTotal() {
    let total = 0;

    for (let i = 0; i < expenses.length; i++) {
        total += expenses[i].amount;
    }

    totalAmountEl.textContent = formatCurrency(total);

    // Available balance is driven by the total across all bank accounts minus expenses.
    if (balanceAmountEl) {
        let bankTotal = 0;
        for (let i = 0; i < accounts.length; i++) {
            bankTotal += accounts[i].balance;
        }
        const available = bankTotal - total;
        balanceAmountEl.textContent = formatCurrency(available);
    }
}

// updateBankTotal()
// Calculates and displays the remaining balance (bank total - expenses).
function updateBankTotal() {
    if (!bankTotalEl) {
        return;
    }

    let total = 0;
    for (let i = 0; i < accounts.length; i++) {
        total += accounts[i].balance;
    }

    let expenseTotal = 0;
    for (let i = 0; i < expenses.length; i++) {
        expenseTotal += expenses[i].amount;
    }

    const remaining = total - expenseTotal;
    bankTotalEl.textContent = formatCurrency(remaining);

}

// updateEmptyState()
// Shows or hides the "no expenses yet" message depending on whether
// the "expenses" array is empty.
function updateEmptyState() {
    if (!emptyStateEl) {
        return;
    }

    if (expenses.length === 0) {
        emptyStateEl.classList.remove("d-none");
    } else {
        emptyStateEl.classList.add("d-none");
    }
}

// updateBankEmptyState()
// Shows or hides the "no bank accounts" message.
function updateBankEmptyState() {
    if (!bankEmptyStateEl) {
        return;
    }

    if (accounts.length === 0) {
        bankEmptyStateEl.classList.remove("d-none");
    } else {
        bankEmptyStateEl.classList.add("d-none");
    }
}

// -----------------------------
// 5. CORE OPERATIONS (ADD / DELETE / CLEAR)
// -----------------------------

// addExpense(amount, description, category)
// Creates a new expense object and updates memory, localStorage, and the UI.
function addExpense(amount, description, category, accountName) {
    const newExpense = {
        id: generateId(),
        amount: amount,
        description: description,
        category: category,
        accountName: accountName || "",
        createdAt: new Date().toISOString(),
    };

    // Add the new expense at the beginning so we see it at the top of the table.
    expenses.unshift(newExpense);

    // Keep localStorage in sync.
    saveExpensesToStorage(expenses);
    // Also send the updated list to the Python server (writes to Expense.txt).
    sendExpensesToServer();

    // Re-render the table and update the total.
    renderExpenses();
    updateTotal();

    // Refresh bank balances to reflect the new expense
    renderAccounts();
    updateBankTotal();

    // Add a fade-in animation to the newest row (which is the first row).
    const firstRow = expenseTableBody.querySelector("tr");
    if (firstRow) {
        firstRow.classList.add("fade-in-row");

        // Remove the class after the animation so we can reuse it next time.
        firstRow.addEventListener(
            "animationend",
            function () {
                firstRow.classList.remove("fade-in-row");
            },
            { once: true }
        );
    }
}

// deleteExpense(id)
// Removes a single expense (by id) from the array, then updates storage and UI.
function deleteExpense(id) {
    const filtered = [];

    for (let i = 0; i < expenses.length; i++) {
        const expense = expenses[i];
        if (expense.id !== id) {
            filtered.push(expense);
        }
    }

    expenses = filtered;
    saveExpensesToStorage(expenses);
    renderExpenses();
    updateTotal();
    renderAccounts();
    updateBankTotal();
    // Also update the text file on the server.
    sendExpensesToServer();
}

// clearAllExpenses()
// Removes all expenses at once from memory, localStorage, and the UI.
function clearAllExpenses() {
    if (expenses.length === 0) {
        return;
    }

    expenses = [];
    saveExpensesToStorage(expenses);
    renderExpenses();
    updateTotal();
    renderAccounts();
    updateBankTotal();
    // Also clear the data stored in Expense.txt.
    sendExpensesToServer();
}

// addAccount(name, balance)
// Adds a new bank account to the list and refreshes the UI.
function addAccount(name, balance) {
    const account = {
        name: name,
        balance: balance,
        createdAt: new Date().toISOString(),
    };

    accounts.push(account);
    saveAccountsToStorage(accounts);
    renderAccounts();
    updateBankTotal();

    // Also refresh available balance, which is based on total bank accounts.
    updateTotal();

    // Add this account as an option in the "Account" select used when adding expenses.
    if (expenseAccountSelect) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        expenseAccountSelect.appendChild(option);
    }
}

// getDefaultAccount() -> string
// Returns the primary account name, or creates a "Default Account" if none exist.
function getDefaultAccount() {
    if (accounts.length > 0) {
        return accounts[0].name;
    }
    const defaultName = "Default Account";
    addAccount(defaultName, 0);
    return defaultName;
}

// -----------------------------
// 6. EVENT HANDLERS
// -----------------------------

// handleFormSubmit(event)
// Called when the user clicks "Add Expense".
// Validates input values and adds a new expense if everything is correct.
async function handleFormSubmit(event) {
    event.preventDefault();

    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();
    let category = categorySelect.value;
    let accountName = expenseAccountSelect ? expenseAccountSelect.value : "";

    if (!description || isNaN(amount)) return;

    // Automatically set default account if user didn't pick one
    if (!accountName) {
        accountName = getDefaultAccount();
    }

    // 🔥 CALL BACKEND ML API
    try {
        const response = await fetch("http://127.0.0.1:5000/predict-category", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ description: description })
        });

        const result = await response.json();
        category = result.category;

    } catch (error) {
        console.log("ML error:", error);
    }

    addExpense(amount, description, category, accountName);
    expenseForm.reset();
}

// handleTableClick(event)
// Called when the user clicks anywhere in the expense table.
// We use "event delegation" to check if they clicked a "Delete" button.
function handleTableClick(event) {
    const target = event.target;
    // target.closest() finds the element itself or the nearest ancestor matching the selector
    const deleteBtn = target.closest('.btn-delete-expense');

    if (deleteBtn) {
        const tr = deleteBtn.closest('tr');
        if (tr && tr.dataset.id) {
            deleteExpense(tr.dataset.id);
        }
    }
}

// handleBankFormSubmit(event)
// Called when the user clicks "Add Account" in the bank accounts form.
function handleBankFormSubmit(event) {
    event.preventDefault();

    const name = accountNameInput.value.trim();
    const balance = parseFloat(accountBalanceInput.value);

    if (!name || isNaN(balance)) return;

    addAccount(name, balance);
    if (bankAccountForm) {
        bankAccountForm.reset();
    }
}

// -----------------------------
// 7. INITIALISATION
// -----------------------------

// init()
// This function is called once when the script loads.
// It sets up the initial state and all event listeners.
function init() {
    // Load existing expenses from localStorage into memory.
    expenses = loadExpensesFromStorage();

    // Load existing bank accounts from localStorage.
    accounts = loadAccountsFromStorage();

    // Draw them in the table and show the current totals.
    renderExpenses();
    updateTotal();

    renderAccounts();
    updateBankTotal();

    // Fill the "Account" select in the Add Expense form using existing accounts.
    if (expenseAccountSelect) {
        // Clear current options except the first placeholder
        expenseAccountSelect.innerHTML = `
            <option value="" disabled selected>Select account</option>
        `;
        for (let i = 0; i < accounts.length; i++) {
            const option = document.createElement("option");
            option.value = accounts[i].name;
            option.textContent = accounts[i].name;
            expenseAccountSelect.appendChild(option);
        }
    }

    // Connect event handlers.
    expenseForm.addEventListener("submit", handleFormSubmit);
    expenseTableBody.addEventListener("click", handleTableClick);

    if (clearAllBtn) {
        clearAllBtn.addEventListener("click", clearAllExpenses);
    }

    if (bankAccountForm) {
        bankAccountForm.addEventListener("submit", handleBankFormSubmit);
    }
}

// Call init() right away.
// Because the script tag is at the bottom of index.html,
// the DOM elements we query above are already available.
init();

