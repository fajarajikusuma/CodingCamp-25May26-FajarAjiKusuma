// State Management
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let currentChart = null;

// DOM Elements
const form = document.getElementById('transaction-form');
const itemNameInput = document.getElementById('item-name');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const transactionList = document.getElementById('transaction-list');
const totalBalanceDisplay = document.getElementById('total-balance');
const emptyState = document.getElementById('empty-state');

// Category Visual Styling Map
const categoryStyles = {
    Food: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: 'fa-utensils', color: '#10b981' },
    Transport: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', icon: 'fa-car', color: '#0ea5e9' },
    Fun: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: 'fa-gamepad', color: '#f59e0b' }
};

// Format Number to Currency
function formatCurrency(num) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

// Calculate Dashboard Aggregates
function updateDashboard() {
    const total = transactions.reduce((acc, item) => acc + item.amount, 0);
    totalBalanceDisplay.textContent = formatCurrency(total);

    renderList();
    renderChart();

    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Render Transaction List to DOM
function renderList() {
    if (transactions.length === 0) {
        emptyState.style.display = 'block';
        const items = transactionList.querySelectorAll('.transaction-item');
        items.forEach(el => el.remove());
        return;
    }

    emptyState.style.display = 'none';

    const existingItems = transactionList.querySelectorAll('.transaction-item');
    existingItems.forEach(el => el.remove());

    transactions.forEach(item => {
        const style = categoryStyles[item.category] || categoryStyles['Food'];

        const itemRow = document.createElement('div');
        itemRow.className = `transaction-item flex items-center justify-between p-4 bg-slate-800/40 border ${style.border} rounded-xl transition-all hover:scale-[1.002] duration-200`;
        itemRow.innerHTML = `
            <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl ${style.bg} ${style.text} flex items-center justify-center text-sm">
                    <i class="fa-solid ${style.icon}"></i>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-white tracking-wide">${item.name}</h4>
                    <span class="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 ${style.bg} ${style.text}">
                        ${item.category}
                    </span>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <span class="text-sm font-bold text-slate-200">${formatCurrency(item.amount)}</span>
                <button onclick="deleteTransaction('${item.id}')" 
                    class="text-slate-500 hover:text-rose-400 p-2 rounded-lg hover:bg-rose-500/10 transition-colors duration-150"
                    title="Delete Item">
                    <i class="fa-regular fa-trash-can text-sm"></i>
                </button>
            </div>
        `;
        transactionList.appendChild(itemRow);
    });
}

// Render Chart Data dynamically via Chart.js
function renderChart() {
    const ctx = document.getElementById('spending-chart').getContext('2d');

    const categoryTotals = { Food: 0, Transport: 0, Fun: 0 };
    transactions.forEach(item => {
        if (categoryTotals[item.category] !== undefined) {
            categoryTotals[item.category] += item.amount;
        }
    });

    const dataValues = [categoryTotals.Food, categoryTotals.Transport, categoryTotals.Fun];
    const totalSpent = dataValues.reduce((a, b) => a + b, 0);

    if (currentChart) {
        currentChart.destroy();
    }

    // DIAGRAM KOSONG (Placeholder Chart)
    if (totalSpent === 0) {
        currentChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data Available'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['rgba(51, 65, 85, 0.4)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#64748b',
                            font: { family: 'Plus Jakarta Sans', size: 12 }
                        }
                    },
                    tooltip: { enabled: false }
                },
                cutout: '70%'
            }
        });
        return;
    }

    // DIAGRAM AKTIF (Saat Ada Data)
    currentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Food', 'Transport', 'Fun'],
            datasets: [{
                data: dataValues,
                backgroundColor: [categoryStyles.Food.color, categoryStyles.Transport.color, categoryStyles.Fun.color],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        padding: 20,
                        font: { family: 'Plus Jakarta Sans', size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return ` ${context.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// Action: Add Transaction handler
form.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = itemNameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const category = categoryInput.value;

    if (!name || isNaN(amount) || amount <= 0) {
        alert("Please enter a valid item name and valid numeric amount.");
        return;
    }

    const newTransaction = {
        id: 'tx-' + Date.now() + Math.random().toString(36).substr(2, 4),
        name: name,
        amount: amount,
        category: category
    };

    transactions.unshift(newTransaction);
    updateDashboard();
    form.reset();
});

// Action: Delete Transaction handler
window.deleteTransaction = function (id) {
    transactions = transactions.filter(item => item.id !== id);
    updateDashboard();
};

// Initial Execution on Window Load
document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();
});