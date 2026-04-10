document.addEventListener('alpine:init', () => {
    Alpine.data('dashboard', () => ({
        isDark: localStorage.getItem('theme') === 'dark',
        init() {
            if (this.isDark) document.documentElement.classList.add('dark');
            this.loadAccounts();
            this.loadAllExpenses();
        },
        allTransactions: [],
        allMappedTransactions: [],
        searchQuery: '',
        sortField: 'date',
        sortAsc: false,
        async loadAllExpenses() {
            try {
                const res = await fetch('/load-expenses');
                const data = await res.json();
                this.allTransactions = data;

                // Sync mapped transactions
                const sorted = [...data].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
                this.allMappedTransactions = sorted.map(tx => ({
                    id: tx.id,
                    merchant: tx.description,
                    category: tx.category,
                    date: tx.date || tx.createdAt,
                    amount: tx.type === 'expense' ? -Math.abs(tx.amount) : Math.abs(tx.amount),
                    method: tx.account || 'Unknown',
                    methodIcon: (this.myAccounts.find(a => a.name === tx.account)?.type === 'Credit Card') ? 'ph-credit-card' : (this.myAccounts.find(a => a.name === tx.account)?.type === 'Cash' ? 'ph-wallet' : 'ph-bank'),
                    tags: [],
                    icon: tx.type === 'expense' ? 'ph-storefront' : 'ph-briefcase',
                    iconBg: tx.type === 'expense' ? 'bg-slate-100' : 'bg-emerald-50',
                    iconBorder: tx.type === 'expense' ? 'border-slate-200' : 'border-emerald-100',
                    iconColor: tx.type === 'expense' ? 'text-slate-600' : 'text-emerald-600'
                }));
                this.recentTransactions = this.allMappedTransactions.slice(0, 5);

                if (window.renderCharts) window.renderCharts(this.allTransactions);
            } catch (e) {
                console.error('Failed to load expenses', e);
            }
        },
        async clearAllTransactions() {
            if (!confirm("Are you sure you want to clear all transactions? Account balances will be reset to 0.")) return;
            try {
                const res = await fetch('/clear-transactions', { method: 'DELETE' });
                if (res.ok) {
                    await this.loadAllExpenses();
                    await this.loadAccounts();
                }
            } catch (e) { console.error('Failed to clear', e); }
        },
        filteredTransactions() {
            let results = this.allMappedTransactions;
            if (this.searchQuery) {
                const sq = this.searchQuery.toLowerCase();
                results = results.filter(tx =>
                    tx.merchant.toLowerCase().includes(sq) ||
                    tx.category.toLowerCase().includes(sq)
                );
            }

            results = [...results].sort((a, b) => {
                let va = a[this.sortField];
                let vb = b[this.sortField];
                if (this.sortField === 'date') {
                    va = new Date(va).getTime();
                    vb = new Date(vb).getTime();
                }
                if (va < vb) return this.sortAsc ? -1 : 1;
                if (va > vb) return this.sortAsc ? 1 : -1;
                return 0;
            });

            return results;
        },
        getCategorySpend(category) {
            const expenses = this.allTransactions.filter(t => t.type === 'expense' && t.category === category);
            return expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        },
        highestExpenseCategory() {
            const expenses = this.allTransactions.filter(t => t.type === 'expense');
            if (expenses.length === 0) return 'None';
            const categoryTotals = {};
            expenses.forEach(t => {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
            });
            let maxCat = 'None';
            let maxAmt = 0;
            for (const [cat, amt] of Object.entries(categoryTotals)) {
                if (amt > maxAmt) { maxAmt = amt; maxCat = cat; }
            }
            return maxCat;
        },
        highestExpenseAmount() {
            const expenses = this.allTransactions.filter(t => t.type === 'expense');
            if (expenses.length === 0) return 0;
            const categoryTotals = {};
            expenses.forEach(t => {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
            });
            return Math.max(...Object.values(categoryTotals)) || 0;
        },
        averageDailySpend() {
            const expenses = this.allTransactions.filter(t => t.type === 'expense');
            if (expenses.length === 0) return 0;
            const dates = expenses.map(t => new Date(t.date || t.createdAt).getTime()).filter(x => !isNaN(x));
            if (dates.length === 0) return this.totalExpenses;
            const maxDate = Math.max(...dates);
            const minDate = Math.min(...dates);
            const days = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));
            return this.totalExpenses / days;
        },
        get totalBalance() {
            return this.myAccounts.reduce((sum, acc) => sum + acc.balance, 0);
        },
        get totalIncome() {
            return this.allTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        },
        get totalExpenses() {
            return this.allTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        },
        async loadAccounts() {
            try {
                const res = await fetch('/load-accounts');
                const data = await res.json();
                this.myAccounts = data;
                if (this.myAccounts.length > 0 && !this.txForm.method) {
                    this.txForm.method = this.myAccounts[0].name;
                }
            } catch (e) {
                console.error('Failed to load accounts:', e);
            }
        },
        toggleTheme() {
            this.isDark = !this.isDark;
            localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
            if (this.isDark) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        },
        autoCategorize() {
            const text = this.txForm.description.trim();
            if (!text) return;

            fetch('/predict-category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: text })
            })
                .then(res => res.json())
                .then(data => {
                    const categoryStr = data.category ? data.category.toLowerCase() : '';
                    const mapping = {
                        'food': 'Food & Dining',
                        'groceries': 'Food & Dining',
                        'transport': 'Transportation',
                        'transportation': 'Transportation',
                        'entertainment': 'Entertainment',
                        'income': 'Income',
                        'salary': 'Salary',
                        'housing': 'Housing',
                        'healthcare': 'Healthcare'
                    };

                    // Assign mapped value, or intelligently capitalize fallback
                    if (mapping[categoryStr]) {
                        this.txForm.category = mapping[categoryStr];
                    } else if (data.category) {
                        // Capitalize string if it is an unknown ML category (e.g., 'utilities' -> 'Utilities')
                        this.txForm.category = data.category.charAt(0).toUpperCase() + data.category.slice(1);
                    }

                    // Dynamic Type Sync
                    if (categoryStr === 'income' || categoryStr === 'salary') {
                        this.txForm.type = 'income';
                    } else if (data.category && data.category !== '') {
                        this.txForm.type = 'expense';
                    }
                })
                .catch(err => console.error('Auto category failed:', err));
        },
        isModalOpen: false,
        isSubmitting: false,
        activeTab: 'Home',
        isAccountModalOpen: false,
        accForm: {
            index: -1,
            name: '',
            type: 'Checking',
            balance: '',
            mask: ''
        },
        openAccountModal(index = -1) {
            if (index >= 0) {
                const acc = this.myAccounts[index];
                this.accForm = { index, name: acc.name, type: acc.type, balance: acc.balance, mask: acc.mask };
            } else {
                this.accForm = { index: -1, name: '', type: 'Checking', balance: '', mask: '' };
            }
            this.isAccountModalOpen = true;
        },
        async saveAccount() {
            const idx = this.accForm.index;
            const accountObj = {
                name: this.accForm.name,
                type: this.accForm.type,
                balance: parseFloat(this.accForm.balance) || 0,
                mask: this.accForm.mask || ''
            };
            try {
                if (idx >= 0) {
                    const dbId = this.myAccounts[idx].id;
                    await fetch(`/update-account/${dbId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(accountObj)
                    });
                } else {
                    await fetch('/save-account', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(accountObj)
                    });
                }
                await this.loadAccounts();
                this.isAccountModalOpen = false;
            } catch (e) {
                console.error("Save account failed", e);
                alert("Error saving account.");
            }
        },
        async deleteAccount(index) {
            if (confirm('Are you sure you want to delete this account?')) {
                try {
                    const dbId = this.myAccounts[index].id;
                    await fetch(`/delete-account/${dbId}`, { method: 'DELETE' });
                    await this.loadAccounts();
                } catch (e) {
                    console.error("Delete account failed", e);
                    alert("Error deleting account.");
                }
            }
        },
        myAccounts: [],
        menuItems: [
            { name: 'Home', icon: 'ph-house' },
            { name: 'Analytics', icon: 'ph-chart-pie-slice' },
            { name: 'Transactions', icon: 'ph-receipt' },
            { name: 'Account', icon: 'ph-user' },
        ],
        txForm: {
            id: null,
            type: 'expense',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            category: '',
            description: '',
            method: '',
            tags: ''
        },
        openTransactionModal(tx = null) {
            if (tx) {
                this.txForm = {
                    id: tx.id,
                    type: tx.amount < 0 ? 'expense' : 'income',
                    amount: Math.abs(tx.amount),
                    date: tx.date || new Date().toISOString().split('T')[0],
                    category: tx.category || '',
                    description: tx.merchant || '',
                    method: tx.method || '',
                    tags: ''
                };
            } else {
                this.txForm = {
                    id: null,
                    type: 'expense',
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    category: '',
                    description: '',
                    method: this.myAccounts.length ? this.myAccounts[0].name : '',
                    tags: ''
                };
            }
            this.isModalOpen = true;
        },
        async deleteTransaction(txId) {
            if (confirm('Are you sure you want to delete this transaction?')) {
                try {
                    const response = await fetch(`/delete-expense/${txId}`, { method: 'DELETE' });
                    if (response.ok) {
                        await this.loadAccounts();
                        await this.loadAllExpenses();
                    }
                } catch (e) {
                    console.error('Delete error', e);
                    alert("Failed to delete transaction.");
                }
            }
        },
        recentTransactions: [
            { id: 1, merchant: 'Netflix Subscription', category: 'Entertainment', date: '2026-09-10', amount: -15.99, method: 'Credit Card', methodIcon: 'ph-credit-card', tags: ['subscription', 'home'], icon: 'ph-monitor-play', iconBg: 'bg-rose-50', iconBorder: 'border-rose-100', iconColor: 'text-rose-600' },
            { id: 2, merchant: 'Upwork Payout', category: 'Salary', date: '2026-09-08', amount: 3250.00, method: 'Bank Transfer', methodIcon: 'ph-bank', tags: ['freelance', 'business'], icon: 'ph-briefcase', iconBg: 'bg-emerald-50', iconBorder: 'border-emerald-100', iconColor: 'text-emerald-600' },
            { id: 3, merchant: 'Whole Foods Market', category: 'Food & Dining', date: '2026-09-07', amount: -84.20, method: 'Debit Card', methodIcon: 'ph-credit-card', tags: ['groceries'], icon: 'ph-shopping-cart-simple', iconBg: 'bg-amber-50', iconBorder: 'border-amber-100', iconColor: 'text-amber-600' },
            { id: 4, merchant: 'Uber Ride', category: 'Transportation', date: '2026-09-06', amount: -24.50, method: 'Credit Card', methodIcon: 'ph-credit-card', tags: ['business', 'travel'], icon: 'ph-car', iconBg: 'bg-blue-50', iconBorder: 'border-blue-100', iconColor: 'text-blue-600' },
            { id: 5, merchant: 'Starbucks Coffee', category: 'Food & Dining', date: '2026-09-05', amount: -6.40, method: 'Cash', methodIcon: 'ph-money', tags: ['coffee'], icon: 'ph-coffee', iconBg: 'bg-amber-50', iconBorder: 'border-amber-100', iconColor: 'text-amber-600' },
        ],

        formatCurrency(val) {
            return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
        },

        formatDate(dateStr) {
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            return new Date(dateStr).toLocaleDateString('en-US', options);
        },

        getTagColor(tag) {
            const tagMap = {
                'business': 'bg-blue-100 text-blue-700',
                'home': 'bg-purple-100 text-purple-700',
                'subscription': 'bg-rose-100 text-rose-700',
                'travel': 'bg-sky-100 text-sky-700',
                'groceries': 'bg-emerald-100 text-emerald-700',
                'coffee': 'bg-amber-100 text-amber-700',
                'freelance': 'bg-teal-100 text-teal-700'
            };
            return tagMap[tag.toLowerCase()] || 'bg-slate-100 text-slate-700';
        },

        async submitForm(e) {
            this.isSubmitting = true;

            try {
                const isExpense = this.txForm.type === 'expense';
                const amountVal = parseFloat(this.txForm.amount);

                // Backend Integration: Persist to SQLite
                const payload = {
                    amount: isExpense ? -amountVal : amountVal,
                    description: this.txForm.description,
                    category: this.txForm.category,
                    type: this.txForm.type,
                    createdAt: this.txForm.date,
                    accountName: this.txForm.method
                };

                let requestUrl = '/save-expenses';
                let requestMethod = 'POST';
                let requestBody = [payload];

                if (this.txForm.id) {
                    requestUrl = `/update-expense/${this.txForm.id}`;
                    requestMethod = 'PUT';
                    requestBody = payload;
                }

                const response = await fetch(requestUrl, {
                    method: requestMethod,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
                if (!response.ok) throw new Error("Database serialization error on network hop.");

                // Refresh account balance and total expenses
                await this.loadAccounts();
                await this.loadAllExpenses();

                // Reset Form
                this.txForm.id = null;
                this.txForm.amount = '';
                this.txForm.description = '';
                this.txForm.tags = '';
                this.isModalOpen = false;

            } catch (error) {
                console.error('Submission error:', error);
                alert("Error saving transaction.");
            } finally {
                this.isSubmitting = false;
            }
        }
    }));
});

let chartsInstance = {};
window.renderCharts = function (transactions) {
    Chart.defaults.font.family = "'Inter', 'system-ui', 'sans-serif'";
    Chart.defaults.color = '#64748b';
    Chart.defaults.scale.grid.color = 'rgba(226, 232, 240, 0.6)';

    const initChart = (id, config) => {
        if (chartsInstance[id]) chartsInstance[id].destroy();
        const canvas = document.getElementById(id);
        if (!canvas) return;
        chartsInstance[id] = new Chart(canvas.getContext('2d'), config);
    };

    const expenses = transactions.filter(t => t.type === 'expense');
    const incomes = transactions.filter(t => t.type === 'income');

    // 1. Categories Aggregation
    const categorySums = {};
    expenses.forEach(t => categorySums[t.category] = (categorySums[t.category] || 0) + Math.abs(t.amount));
    const catLabels = Object.keys(categorySums).length ? Object.keys(categorySums) : ['No Data'];
    const catData = Object.values(categorySums).length ? Object.values(categorySums) : [1];

    const doughnutConfig = {
        type: 'doughnut',
        data: {
            labels: catLabels,
            datasets: [{
                data: catData,
                backgroundColor: ['#6366f1', '#38bdf8', '#a855f7', '#f43f5e', '#cbd5e1', '#fbbf24', '#10b981'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '80%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', titleColor: '#0f172a', bodyColor: '#334155',
                    borderColor: '#e2e8f0', borderWidth: 1, padding: 12, boxPadding: 6, usePointStyle: true,
                    callbacks: { label: (c) => ` ${c.label}: ₹${c.raw}` }
                }
            }
        }
    };

    // Render both sidebar and large analytics category charts
    initChart('categoryChart', doughnutConfig);

    const largeDoughnutConfig = JSON.parse(JSON.stringify(doughnutConfig));
    largeDoughnutConfig.options.plugins.legend.display = true;
    largeDoughnutConfig.options.plugins.legend.position = 'right';
    initChart('largeCategoryChart', largeDoughnutConfig);

    // 2. Monthly Analytics Aggregation
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = {};
    const last6Months = [];

    const d = new Date();
    for (let i = 5; i >= 0; i--) {
        let m = new Date(d.getFullYear(), d.getMonth() - i, 1);
        let key = `${m.getFullYear()}-${m.getMonth()}`;
        last6Months.push({ key, label: monthNames[m.getMonth()] });
        monthlyData[key] = { inc: 0, exp: 0 };
    }

    transactions.forEach(t => {
        let d2 = new Date(t.date || t.createdAt);
        let key = `${d2.getFullYear()}-${d2.getMonth()}`;
        if (monthlyData[key]) {
            if (t.type === 'income') monthlyData[key].inc += Math.abs(t.amount);
            else monthlyData[key].exp += Math.abs(t.amount);
        }
    });

    const barConfig = {
        type: 'bar',
        data: {
            labels: last6Months.map(m => m.label),
            datasets: [
                { label: 'Income', data: last6Months.map(m => monthlyData[m.key].inc), backgroundColor: '#10b981', borderRadius: 6, barPercentage: 0.5, categoryPercentage: 0.8 },
                { label: 'Expenses', data: last6Months.map(m => monthlyData[m.key].exp), backgroundColor: '#6366f1', borderRadius: 6, barPercentage: 0.5, categoryPercentage: 0.8 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, boxWidth: 6, padding: 20 } } },
            scales: {
                y: { beginAtZero: true, border: { display: false }, ticks: { maxTicksLimit: 5, callback: (v) => '₹' + v } },
                x: { grid: { display: false }, border: { display: false } }
            }
        }
    };

    initChart('monthlyChart', barConfig);
    initChart('largeCashFlowChart', barConfig);

    // 3. Mini Trend Lines for Summary Cards
    const commonSparklineOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false, beginAtZero: false } },
        elements: { point: { radius: 0, hitRadius: 10, hoverRadius: 4 } },
        interaction: { mode: 'nearest', intersect: false }
    };

    const generateGradient = (ctx, colorStart, colorEnd) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 60);
        gradient.addColorStop(0, colorStart);
        gradient.addColorStop(1, colorEnd);
        return gradient;
    };

    const incData = last6Months.map(m => monthlyData[m.key].inc);
    const ctxInc = document.getElementById('incomeTrendChart');
    if (ctxInc) {
        initChart('incomeTrendChart', {
            type: 'line',
            data: { labels: ['1', '2', '3', '4', '5', '6'], datasets: [{ data: incData, borderColor: '#059669', borderWidth: 2, tension: 0.4, fill: true, backgroundColor: generateGradient(ctxInc.getContext('2d'), 'rgba(16, 185, 129, 0.25)', 'rgba(16, 185, 129, 0)') }] },
            options: commonSparklineOptions
        });
    }

    const expData = last6Months.map(m => monthlyData[m.key].exp);
    const ctxExp = document.getElementById('expenseTrendChart');
    if (ctxExp) {
        initChart('expenseTrendChart', {
            type: 'line',
            data: { labels: ['1', '2', '3', '4', '5', '6'], datasets: [{ data: expData, borderColor: '#e11d48', borderWidth: 2, tension: 0.4, fill: true, backgroundColor: generateGradient(ctxExp.getContext('2d'), 'rgba(244, 63, 94, 0.25)', 'rgba(244, 63, 94, 0)') }] },
            options: commonSparklineOptions
        });
    }
};