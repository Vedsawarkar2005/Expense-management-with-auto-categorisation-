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
const transactionDateInput = document.getElementById("transactionDate");
const expenseAccountSelect = document.getElementById("expenseAccount");
const editExpenseIdInput = document.getElementById("editExpenseId");
const modalTitleText = document.getElementById("modalTitleText");
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
const defaultAccountSelect = document.getElementById("defaultAccountSelect");
const editOriginalAccountNameInput = document.getElementById("editOriginalAccountName");

// Dashboard Elements
const summaryIncomeEl = document.getElementById("summaryIncome");
const summaryExpenseEl = document.getElementById("summaryExpense");
const summaryBalanceEl = document.getElementById("summaryBalance");
const expenseChartCanvas = document.getElementById("expenseChart");
const chartEmptyState = document.getElementById("chartEmptyState");
let expenseChartInstance = null;
const bankFormBtnText = document.getElementById("bankFormBtnText");
const bankFormBtnIcon = document.getElementById("bankFormBtnIcon");

// Theme Toggle
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");

function applyTheme(theme) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    if (theme === "dark") {
        if (themeIcon) {
            themeIcon.classList.remove("bi-moon-stars-fill");
            themeIcon.classList.add("bi-sun-fill");
        }
        if (typeof Chart !== 'undefined') Chart.defaults.color = "#cbd5e1";
    } else {
        if (themeIcon) {
            themeIcon.classList.remove("bi-sun-fill");
            themeIcon.classList.add("bi-moon-stars-fill");
        }
        if (typeof Chart !== 'undefined') Chart.defaults.color = "#18230F";
    }

    if (expenseChartInstance) {
        expenseChartInstance.update();
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-bs-theme") || "light";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    localStorage.setItem("expense_tracker_theme", newTheme);
    applyTheme(newTheme);
}

// Keys under which we store data in the browser's localStorage.
const STORAGE_KEY = "smart_expense_tracker_expenses";
const BANK_STORAGE_KEY = "smart_expense_tracker_bank_accounts";
const DEFAULT_ACCOUNT_KEY = "smart_expense_tracker_default_account";

// This array will always contain the current list of expenses in memory.
// We keep this in sync with localStorage.
let expenses = [];

// This array will contain the list of bank accounts in memory.
let accounts = [];

let defaultAccountName = localStorage.getItem(DEFAULT_ACCOUNT_KEY) || "";

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
    tr.dataset.id = expense.id;

    const dateObj = new Date(expense.createdAt);
    const dateStr = !isNaN(dateObj) ? dateObj.toLocaleString([], {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }) : expense.createdAt;

    const isIncome = expense.type === "Income";
    const amountColor = isIncome ? "text-success" : "text-danger";
    const sign = isIncome ? "+" : "-";

    tr.innerHTML = `
        <td><small class="text-muted">${dateStr}</small></td>
        <td><span class="badge ${isIncome ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} rounded-pill">${expense.type || "Expense"}</span></td>
        <td class="${amountColor} fw-semibold">${sign}${formatCurrency(expense.amount)}</td>
        <td>${expense.description}</td>
        <td><span class="category-pill bg-light border">${expense.category}</span></td>
        <td>${expense.accountName || "-"}</td>
        <td class="text-end">
            <button class="btn btn-sm btn-outline-primary btn-edit-expense me-2" title="Edit">
                <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger btn-delete-expense" title="Delete">
                <i class="bi bi-trash"></i>
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
    let earned = 0;
    for (let i = 0; i < expenses.length; i++) {
        if (expenses[i].accountName === account.name) {
            if (expenses[i].type === "Income") {
                earned += expenses[i].amount;
            } else {
                spent += expenses[i].amount;
            }
        }
    }
    const remaining = account.balance + earned - spent;
    const tr = document.createElement("tr");
    tr.dataset.name = account.name;
    tr.innerHTML = `
        <td>${account.name}</td>
        <td class="text-end">${formatCurrency(remaining)}</td>
        <td class="text-end">
            <button class="btn btn-sm btn-outline-primary btn-edit-account me-2" title="Edit">
                <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger btn-delete-account" title="Delete">
                <i class="bi bi-trash"></i>
            </button>
        </td>
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
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    for (let i = 0; i < expenses.length; i++) {
        if (expenses[i].type === "Income") {
            totalIncome += expenses[i].amount;
        } else {
            totalExpense += expenses[i].amount;

            const cat = expenses[i].category || "Other";
            if (!categoryTotals[cat]) {
                categoryTotals[cat] = 0;
            }
            categoryTotals[cat] += expenses[i].amount;
        }
    }

    if (totalAmountEl) totalAmountEl.textContent = formatCurrency(totalExpense);

    let bankTotal = 0;
    for (let i = 0; i < accounts.length; i++) {
        bankTotal += accounts[i].balance;
    }
    const available = bankTotal + totalIncome - totalExpense;

    if (balanceAmountEl) balanceAmountEl.textContent = formatCurrency(available);

    if (summaryIncomeEl) summaryIncomeEl.textContent = formatCurrency(totalIncome);
    if (summaryExpenseEl) summaryExpenseEl.textContent = formatCurrency(totalExpense);
    if (summaryBalanceEl) summaryBalanceEl.textContent = formatCurrency(available);

    updateChart(categoryTotals, totalExpense);
}

function updateChart(categoryTotals, totalExpense) {
    if (!expenseChartCanvas) return;

    if (totalExpense === 0) {
        if (chartEmptyState) chartEmptyState.classList.remove("d-none");
        if (expenseChartInstance) {
            expenseChartInstance.destroy();
            expenseChartInstance = null;
        }
        return;
    }

    if (chartEmptyState) chartEmptyState.classList.add("d-none");

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED'
    ];

    if (expenseChartInstance) {
        expenseChartInstance.data.labels = labels;
        expenseChartInstance.data.datasets[0].data = data;
        expenseChartInstance.update();
    } else {
        const ctx = expenseChartCanvas.getContext('2d');
        expenseChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: { family: 'system-ui', size: 12 },
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                cutout: '75%'
            }
        });
    }
}

// updateBankTotal()
// Calculates and displays the remaining balance (bank total - expenses).
function updateBankTotal() {
    if (!bankTotalEl) {
        return;
    }

    let initialBankTotal = 0;
    for (let i = 0; i < accounts.length; i++) {
        initialBankTotal += accounts[i].balance;
    }

    let netChange = 0;
    for (let i = 0; i < expenses.length; i++) {
        if (expenses[i].type === "Income") {
            netChange += expenses[i].amount;
        } else {
            netChange -= expenses[i].amount;
        }
    }

    const remaining = initialBankTotal + netChange;
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
function addExpense(amount, description, category, accountName, type, transDate) {
    const newExpense = {
        id: generateId(),
        type: type || "Expense",
        amount: amount,
        description: description,
        category: category,
        accountName: accountName || "",
        createdAt: transDate || new Date().toISOString(),
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

    // Update the dropdowns to include the new account
    updateAccountSelects();
}

// getDefaultAccount() -> string
// Returns the explicit default account, or primary, or creates "Default Account" if none exist.
function getDefaultAccount() {
    if (defaultAccountName && accounts.find(a => a.name === defaultAccountName)) {
        return defaultAccountName;
    }
    if (accounts.length > 0) {
        return accounts[0].name;
    }
    const defaultName = "Default Account";
    addAccount(defaultName, 0);
    return defaultName;
}

// updateAccountSelects()
// Populates both the expense account select and default account select dropdowns.
function updateAccountSelects() {
    if (expenseAccountSelect) {
        // Clear current options except the first placeholder
        expenseAccountSelect.innerHTML = `<option value="" disabled selected>Select account</option>`;
        for (let i = 0; i < accounts.length; i++) {
            const option = document.createElement("option");
            option.value = accounts[i].name;
            option.textContent = accounts[i].name;
            expenseAccountSelect.appendChild(option);
        }
    }

    if (defaultAccountSelect) {
        defaultAccountSelect.innerHTML = "";
        if (accounts.length === 0) {
            defaultAccountSelect.innerHTML = `<option value="" disabled selected>No accounts available</option>`;
        } else {
            for (let i = 0; i < accounts.length; i++) {
                const option = document.createElement("option");
                option.value = accounts[i].name;
                option.textContent = accounts[i].name;
                if (accounts[i].name === defaultAccountName) {
                    option.selected = true;
                }
                defaultAccountSelect.appendChild(option);
            }

            // Auto-select the first one if default is invalid or empty
            if (!defaultAccountName || !accounts.find(a => a.name === defaultAccountName)) {
                defaultAccountName = accounts[0].name;
                localStorage.setItem(DEFAULT_ACCOUNT_KEY, defaultAccountName);
                defaultAccountSelect.value = defaultAccountName;
            }
        }
    }
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

    const currTypeInput = document.querySelector('input[name="transactionType"]:checked');
    const type = currTypeInput ? currTypeInput.value : "Expense";

    const transDateInput = document.getElementById("transactionDate");
    const transDate = transDateInput && transDateInput.value ? new Date(transDateInput.value).toISOString() : new Date().toISOString();

    if (!description || isNaN(amount)) return;

    if (!accountName) {
        accountName = getDefaultAccount();
    }

    if (!category || category === "") {
        try {
            const response = await fetch("http://127.0.0.1:5000/predict-category", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: description })
            });

            const result = await response.json();
            category = result.category;

        } catch (error) {
            console.log("ML error:", error);
            category = "Other";
        }
    }

    if (editExpenseIdInput && editExpenseIdInput.value) {
        for (let i = 0; i < expenses.length; i++) {
            if (expenses[i].id === editExpenseIdInput.value) {
                expenses[i].amount = amount;
                expenses[i].description = description;
                expenses[i].category = category;
                expenses[i].accountName = accountName;
                expenses[i].type = type;
                expenses[i].createdAt = transDate;
                break;
            }
        }
        saveExpensesToStorage(expenses);
        sendExpensesToServer();
        renderExpenses();
        updateTotal();
        renderAccounts();
        updateBankTotal();
    } else {
        addExpense(amount, description, category, accountName, type, transDate);
    }

    expenseForm.reset();
    if (editExpenseIdInput) editExpenseIdInput.value = "";
    if (modalTitleText) modalTitleText.textContent = "Add Transaction";

    const modalEl = document.getElementById('transactionModal');
    if (modalEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        if (modalInstance) modalInstance.hide();
    }
}

// handleTableClick(event)
// Called when the user clicks anywhere in the expense table.
// We use "event delegation" to check if they clicked a "Delete" button.
function handleTableClick(event) {
    const target = event.target;

    const deleteBtn = target.closest('.btn-delete-expense');
    if (deleteBtn) {
        const tr = deleteBtn.closest('tr');
        if (tr && tr.dataset.id) {
            deleteExpense(tr.dataset.id);
        }
        return;
    }

    const editBtn = target.closest('.btn-edit-expense');
    if (editBtn) {
        const tr = editBtn.closest('tr');
        if (tr && tr.dataset.id) {
            editExpense(tr.dataset.id);
        }
    }
}

// editExpense(id)
// Loads an existing expense into the modal for editing
function editExpense(id) {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;

    if (editExpenseIdInput) editExpenseIdInput.value = expense.id;
    amountInput.value = expense.amount;
    descriptionInput.value = expense.description;

    let optionFound = false;
    for (let i = 0; i < categorySelect.options.length; i++) {
        if (categorySelect.options[i].value === expense.category) {
            categorySelect.selectedIndex = i;
            optionFound = true;
            break;
        }
    }
    if (!optionFound) {
        const newOption = document.createElement("option");
        newOption.value = expense.category;
        newOption.textContent = expense.category;
        categorySelect.appendChild(newOption);
        categorySelect.value = expense.category;
    }

    if (expenseAccountSelect) {
        expenseAccountSelect.value = expense.accountName;
    }

    const typeExpRadio = document.getElementById("typeExpense");
    const typeIncRadio = document.getElementById("typeIncome");
    if (expense.type === "Income" && typeIncRadio) {
        typeIncRadio.checked = true;
    } else if (typeExpRadio) {
        typeExpRadio.checked = true;
    }

    if (transactionDateInput) {
        const d = new Date(expense.createdAt);
        if (!isNaN(d)) {
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            transactionDateInput.value = d.toISOString().slice(0, 16);
        }
    }

    if (modalTitleText) {
        modalTitleText.textContent = "Edit Transaction";
    }

    const modalEl = document.getElementById('transactionModal');
    if (modalEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modalInstance.show();
    }
}

// handleBankFormSubmit(event)
// Called when the user clicks "Add Account" in the bank accounts form.
function handleBankFormSubmit(event) {
    event.preventDefault();

    const name = accountNameInput.value.trim();
    const balance = parseFloat(accountBalanceInput.value);

    if (!name || isNaN(balance)) return;

    if (editOriginalAccountNameInput && editOriginalAccountNameInput.value) {
        const oldName = editOriginalAccountNameInput.value;
        const account = accounts.find(a => a.name === oldName);
        if (account) {
            if (oldName !== name && accounts.some(a => a.name === name)) {
                alert("An account with this name already exists!");
                return;
            }

            account.name = name;
            account.balance = balance;

            if (oldName !== name) {
                let expensesUpdated = false;
                for (let i = 0; i < expenses.length; i++) {
                    if (expenses[i].accountName === oldName) {
                        expenses[i].accountName = name;
                        expensesUpdated = true;
                    }
                }
                if (expensesUpdated) {
                    saveExpensesToStorage(expenses);
                    sendExpensesToServer();
                    renderExpenses();
                }

                if (defaultAccountName === oldName) {
                    defaultAccountName = name;
                    localStorage.setItem(DEFAULT_ACCOUNT_KEY, name);
                }
            }
        }

        saveAccountsToStorage(accounts);
        renderAccounts();
        updateTotal();
        updateBankTotal();
        updateAccountSelects();

        editOriginalAccountNameInput.value = "";
        if (bankFormBtnText) bankFormBtnText.textContent = "Add";
        if (bankFormBtnIcon) bankFormBtnIcon.className = "bi bi-plus-lg";

        if (bankAccountForm) bankAccountForm.reset();
    } else {
        if (accounts.some(a => a.name === name)) {
            alert("An account with this name already exists!");
            return;
        }
        addAccount(name, balance);
        if (bankAccountForm) {
            bankAccountForm.reset();
        }
    }
}

function deleteAccount(name) {
    accounts = accounts.filter(a => a.name !== name);
    saveAccountsToStorage(accounts);

    if (defaultAccountName === name) {
        if (accounts.length > 0) {
            defaultAccountName = accounts[0].name;
            localStorage.setItem(DEFAULT_ACCOUNT_KEY, defaultAccountName);
        } else {
            defaultAccountName = "";
            localStorage.removeItem(DEFAULT_ACCOUNT_KEY);
        }
    }

    renderAccounts();
    updateTotal();
    updateBankTotal();
    updateAccountSelects();
}

function editBankAccount(name) {
    const account = accounts.find(a => a.name === name);
    if (!account) return;

    accountNameInput.value = account.name;
    accountBalanceInput.value = account.balance;

    if (editOriginalAccountNameInput) editOriginalAccountNameInput.value = account.name;
    if (bankFormBtnText) bankFormBtnText.textContent = "Update";
    if (bankFormBtnIcon) bankFormBtnIcon.className = "bi bi-check2";

    accountNameInput.focus();
}

function handleBankAccountClick(event) {
    const target = event.target;

    const deleteBtn = target.closest('.btn-delete-account');
    if (deleteBtn) {
        const tr = deleteBtn.closest('tr');
        if (tr && tr.dataset.name) {
            if (confirm("Are you sure you want to delete this account? Any expenses linked to it will remain but won't be tied to an active balance.")) {
                deleteAccount(tr.dataset.name);
            }
        }
        return;
    }

    const editBtn = target.closest('.btn-edit-account');
    if (editBtn) {
        const tr = editBtn.closest('tr');
        if (tr && tr.dataset.name) {
            editBankAccount(tr.dataset.name);
        }
    }
}

// -----------------------------
// 7. INITIALISATION
// -----------------------------

// init()
// This function is called once when the script loads.
// It sets up the initial state and all event listeners.
function init() {
    // Theme setup
    const savedTheme = localStorage.getItem("expense_tracker_theme") || "light";
    applyTheme(savedTheme);
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", toggleTheme);
    }

    if (descriptionInput) {
        descriptionInput.addEventListener("blur", async function () {
            const desc = descriptionInput.value.trim();
            if (desc) {
                try {
                    const response = await fetch("http://127.0.0.1:5000/predict-category", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ description: desc })
                    });
                    const result = await response.json();
                    if (result.category) {
                        let optionFound = false;
                        for (let i = 0; i < categorySelect.options.length; i++) {
                            if (categorySelect.options[i].value === result.category) {
                                categorySelect.selectedIndex = i;
                                optionFound = true;
                                break;
                            }
                        }
                        if (!optionFound) {
                            const newOption = document.createElement("option");
                            newOption.value = result.category;
                            newOption.textContent = result.category;
                            categorySelect.appendChild(newOption);
                            categorySelect.value = result.category;
                        }
                    }
                } catch (error) {
                    console.log("ML background fetch error:", error);
                }
            }
        });
    }

    const tDateInput = document.getElementById("transactionDate");
    if (tDateInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        tDateInput.value = now.toISOString().slice(0, 16);

        const modalEl = document.getElementById('transactionModal');
        if (modalEl) {
            modalEl.addEventListener('show.bs.modal', event => {
                // Determine if this was opened by the 'Add Transaction' button
                if (event.relatedTarget && event.relatedTarget.getAttribute('data-bs-target') === '#transactionModal') {
                    expenseForm.reset();
                    if (editExpenseIdInput) editExpenseIdInput.value = "";
                    if (modalTitleText) modalTitleText.textContent = "Add Transaction";

                    const now = new Date();
                    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                    tDateInput.value = now.toISOString().slice(0, 16);
                }
            });
        }
    }

    // Load existing expenses from localStorage into memory.
    expenses = loadExpensesFromStorage();

    // Load existing bank accounts from localStorage.
    accounts = loadAccountsFromStorage();

    // Draw them in the table and show the current totals.
    renderExpenses();
    updateTotal();

    renderAccounts();
    updateBankTotal();

    // Update both account-related dropdowns
    updateAccountSelects();

    // Connect event handlers.
    if (defaultAccountSelect) {
        defaultAccountSelect.addEventListener("change", function (e) {
            defaultAccountName = e.target.value;
            localStorage.setItem(DEFAULT_ACCOUNT_KEY, defaultAccountName);
        });
    }

    expenseForm.addEventListener("submit", handleFormSubmit);
    expenseTableBody.addEventListener("click", handleTableClick);

    if (clearAllBtn) {
        clearAllBtn.addEventListener("click", clearAllExpenses);
    }

    if (bankAccountForm) {
        bankAccountForm.addEventListener("submit", handleBankFormSubmit);
    }
    if (bankAccountsBody) {
        bankAccountsBody.addEventListener("click", handleBankAccountClick);
    }
}

// Call init() right away.
// Because the script tag is at the bottom of index.html,
// the DOM elements we query above are already available.
init();

