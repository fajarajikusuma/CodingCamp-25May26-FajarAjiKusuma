// State Management
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let categories = JSON.parse(localStorage.getItem('custom_categories')) || ['Food', 'Transport', 'Fun'];
let currentSort = 'latest';
let spendingLimit = parseFloat(localStorage.getItem('spending_limit')) || 100;

// DOM Elements
const form = document.getElementById('transaction-form');
const itemNameInput = document.getElementById('item-name');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const customCatInput = document.getElementById('custom-cat-input');
const addCatBtn = document.getElementById('add-cat-btn');
const transactionList = document.getElementById('transaction-list');
const totalBalanceDisplay = document.getElementById('total-balance');
const emptyState = document.getElementById('empty-state');
const sortSelect = document.getElementById('sort-select');
const limitInput = document.getElementById('limit-input');
const currentMonthTotal = document.getElementById('current-month-total');
const activeMonthName = document.getElementById('active-month-name');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const toastContainer = document.getElementById('toast-container');

let currentChart = null;

// TOAST NOTIFICATION SYSTEM
function showToast(message, type = 'success') {
    const toast = document.createElement('div');

    // Perbaikan Layout: Menggunakan w-auto (lebar mengikuti teks) dan max-w-[calc(100vw-40px)] agar aman di HP
    toast.className = `pointer-events-auto flex items-center p-3.5 px-4 rounded-xl shadow-xl border transform translate-y-2 opacity-0 transition-all duration-300 ease-out text-xs font-semibold w-auto max-w-[calc(100vw-40px)] sm:max-w-xs ml-auto`;

    if (type === 'success') {
        // Mode Terang: Menggunakan bg-emerald-50 solid dengan teks hijau tua agar kontras tinggi
        // Mode Gelap: Tetap menggunakan bg-emerald-950/90 transparan mewah
        toast.className += ' bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400';
        toast.innerHTML = `<i class="fa-solid fa-circle-check text-sm mr-2.5 flex-shrink-0"></i> <span class="truncate">${message}</span>`;
    } else {
        // Mode Terang: Menggunakan bg-rose-50 solid dengan teks merah tua agar kontras tinggi
        // Mode Gelap: Tetap menggunakan bg-rose-950/90 transparan mewah
        toast.className += ' bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-400';
        toast.innerHTML = `<i class="fa-solid fa-circle-xmark text-sm mr-2.5 flex-shrink-0"></i> <span class="truncate">${message}</span>`;
    }

    toastContainer.appendChild(toast);

    // Animasi masuk
    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    // Animasi keluar dan hapus elemen setelah 3 detik
    setTimeout(() => {
        toast.classList.add('opacity-0', 'scale-95');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Dark / Light Theme Setup
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    themeIcon.className = 'fa-solid fa-moon';
} else {
    document.documentElement.classList.remove('dark');
    themeIcon.className = 'fa-solid fa-sun';
}

themeToggle.addEventListener('click', () => {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        themeIcon.className = 'fa-solid fa-sun';
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        themeIcon.className = 'fa-solid fa-moon';
        localStorage.setItem('theme', 'dark');
    }
    renderChart();
});

// Dynamic Categories Custom Colors Mapping
// 1. Kunci Palet Warna Premium yang Jelas Berbeda untuk Kategori Bawaan & Kustom
const premiumColors = {
    'Food': '#ec4899',       // Pink / Magenta khas (Sesuai gambar Anda)
    'Transport': '#3b82f6',  // Blue / Biru Cerah yang Kontras
    'Fun': '#10b981',        // Emerald / Hijau Segar
    'Holiday': '#d97706',    // Orange / Cokelat Hangat (Sesuai gambar Anda)
    'Other': '#06b6d4'       // Cyan / Biru Toska (Sesuai gambar Anda)
};

// 2. Fungsi Ambil Warna Kategori yang Sudah Dipastikan Berbeda
function generateCategoryColor(name) {
    // Jika kategori ada di palet premium, langsung pakai agar warna tidak tabrakan
    if (premiumColors[name]) {
        return premiumColors[name];
    }

    // Jika pengguna menambah kategori kustom baru diluar kategori di atas, 
    // buat warna HSL yang dikunci berdasarkan string nama agar tetap konsisten
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Batasi pengacakan kategori kustom baru di rentang warna ungu/violet agar tidak menabrak warna bawaan
    const hue = Math.abs(hash % 60) + 260;
    return `hsl(${hue}, 70%, 55%)`;
}

function updateCategoryDropdown() {
    categorySelect.innerHTML = '';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categorySelect.appendChild(opt);
    });
}

function updateDashboard() {
    // Calculate Total Balance
    const total = transactions.reduce((acc, item) => acc + item.amount, 0);
    totalBalanceDisplay.textContent = formatCurrency(total);

    // Calculate Monthly Summary
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    activeMonthName.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const monthlyFiltered = transactions.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getFullYear() === currentYear && itemDate.getMonth() === currentMonth;
    });

    const monthlyTotalSum = monthlyFiltered.reduce((acc, item) => acc + item.amount, 0);
    currentMonthTotal.textContent = formatCurrency(monthlyTotalSum);

    renderList();
    renderChart();

    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('custom_categories', JSON.stringify(categories));
    localStorage.setItem('spending_limit', spendingLimit.toString());
}

function getSortedTransactions() {
    let sorted = [...transactions];
    if (currentSort === 'amount-desc') return sorted.sort((a, b) => b.amount - a.amount);
    if (currentSort === 'amount-asc') return sorted.sort((a, b) => a.amount - b.amount);
    if (currentSort === 'category') return sorted.sort((a, b) => a.category.localeCompare(b.category));
    return sorted;
}

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

    const displayItems = getSortedTransactions();

    displayItems.forEach(item => {
        const catColor = generateCategoryColor(item.category);

        // Mempertebal border menjadi 2px solid agar tetap terlihat tajam saat di-zoom
        let borderStyle = `border: 2px solid ${catColor};`;
        let shadowClass = 'shadow-md';
        let alertBadge = '';

        // Challenge 4: Jika melebihi batas pengeluaran (Over Limit), berikan border merah 2px solid yang tegas
        if (item.amount > spendingLimit) {
            borderStyle = 'border: 2px solid #f43f5e;';
            shadowClass = 'ring-2 ring-rose-500/20 shadow-lg';
            alertBadge = `<span class="text-[10px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full mt-1 animate-pulse"><i class="fa-solid fa-triangle-exclamation"></i> Over Limit</span>`;
        }

        const itemRow = document.createElement('div');

        /* 
          PERBAIKAN KONTRAS: 
          - Mode terang menggunakan 'bg-white' solid (tidak transparan lagi)
          - Mode malam menggunakan 'dark:bg-slate-900' pekat agar kontras terhadap kartu luar (slate-800)
        */
        itemRow.className = `transaction-item flex items-center justify-between p-4 bg-white dark:bg-slate-900 ${shadowClass} rounded-xl transition-all hover:scale-[1.002] duration-200`;
        itemRow.setAttribute('style', borderStyle);

        itemRow.innerHTML = `
            <div class="flex items-center gap-3.5">
                <!-- Titik indikator warna kategori -->
                <div class="w-3.5 h-3.5 rounded-full shadow-sm" style="background-color: ${catColor}"></div>
                <div>
                    <h4 class="text-sm font-semibold tracking-wide text-slate-800 dark:text-white">${item.name}</h4>
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full mt-1">${item.category}</span>
                        ${alertBadge}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <span class="text-sm font-bold text-slate-900 dark:text-white">${formatCurrency(item.amount)}</span>
                <button onclick="deleteTransaction('${item.id}')" class="text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 p-2 transition-colors duration-150" title="Delete record"><i class="fa-regular fa-trash-can text-sm"></i></button>
            </div>
        `;
        transactionList.appendChild(itemRow);
    });
}

function renderChart() {
    const ctx = document.getElementById('spending-chart').getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');
    const labelColor = isDark ? '#e2e8f0' : '#475569'; // Memperjelas warna teks legenda grafik di mode malam

    let categoryData = {};
    categories.forEach(cat => categoryData[cat] = 0);
    transactions.forEach(item => {
        if (categoryData[item.category] !== undefined) categoryData[item.category] += item.amount;
    });

    const labels = Object.keys(categoryData);
    const dataValues = Object.values(categoryData);
    const totalSpent = dataValues.reduce((a, b) => a + b, 0);

    if (currentChart) currentChart.destroy();

    if (totalSpent === 0) {
        currentChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data Available'],
                datasets: [{ data: [1], backgroundColor: [isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.6)'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: isDark ? '#94a3b8' : '#64748b' } }, tooltip: { enabled: false } }, cutout: '70%' }
        });
        return;
    }

    const colors = labels.map(name => generateCategoryColor(name));

    currentChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: dataValues, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: labelColor, padding: 15, font: { family: 'Plus Jakarta Sans', size: 11 } } } },
            cutout: '70%'
        }
    });
}

function formatCurrency(num) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

// Add Transaction Trigger
form.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = itemNameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;

    if (!name || isNaN(amount) || amount <= 0) {
        showToast("Transaction failed. Check input details!", "error");
        return;
    }

    transactions.unshift({ id: 'tx-' + Date.now(), name, amount, category, date: new Date().toISOString() });
    updateDashboard();
    form.reset();
    showToast("Transaction added successfully!");
});

// Custom Category Action with Toast
addCatBtn.addEventListener('click', () => {
    const newCat = customCatInput.value.trim();
    if (!newCat) {
        showToast("Category name cannot be empty!", "error");
        return;
    }

    if (categories.map(c => c.toLowerCase()).includes(newCat.toLowerCase())) {
        showToast("Category already exists!", "error");
        return;
    }

    categories.push(newCat);
    updateCategoryDropdown();
    customCatInput.value = '';
    updateDashboard();
    showToast(`Category "${newCat}" created!`, "success");
});

sortSelect.addEventListener('change', (e) => { currentSort = e.target.value; renderList(); });
limitInput.addEventListener('input', (e) => { spendingLimit = parseFloat(e.target.value) || 0; renderList(); });

window.deleteTransaction = function (id) {
    transactions = transactions.filter(item => item.id !== id);
    updateDashboard();
    showToast("Item deleted from records.", "success");
};

document.addEventListener('DOMContentLoaded', () => {
    limitInput.value = spendingLimit;
    updateCategoryDropdown();
    updateDashboard();
});