// ============================================
// DASHBOARD - BARVOX
// ============================================

import { db, isUserAuthenticated, getUserUID, collection, doc, getDoc, getDocs, query, where, orderBy, limit } from './firebase-config.js';
import { getUserData } from './auth.js';

let currentUserData = null;
let chartsInstance = {};

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação
    if (!isUserAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    // Carregar dados do usuário
    await loadUserData();

    // Inicializar página
    initializeDashboard();
});

// ============================================
// CARREGAR DADOS DO USUÁRIO
// ============================================

async function loadUserData() {
    const result = await getUserData();
    if (result.success) {
        currentUserData = result.data;
        
        // Atualizar informações na topbar
        document.getElementById('userName').textContent = currentUserData.username || 'Usuário';
        document.getElementById('userEmail').textContent = currentUserData.email;
    }
}

// ============================================
// INICIALIZAR DASHBOARD
// ============================================

async function initializeDashboard() {
    try {
        // Carregar KPIs
        await loadKPIs();

        // Carregar gráficos
        loadCharts();

        // Carregar tabelas
        await loadRecentSales();
        await loadAccountsReceivable();
        await loadAccountsPayable();
        await loadLowStock();

    } catch (error) {
        console.error('Erro ao inicializar dashboard:', error);
    }
}

// ============================================
// CARREGAR KPIs
// ============================================

async function loadKPIs() {
    try {
        const uid = getUserUID();
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Calcular receitas (vendas)
        const salesSnapshot = await getDocs(
            query(
                collection(db, 'sales', uid, 'sales'),
                where('createdAt', '>=', monthStart),
                where('createdAt', '<=', monthEnd),
                where('status', '==', 'paid')
            )
        );

        let totalRevenue = 0;
        salesSnapshot.forEach(doc => {
            totalRevenue += doc.data().total_value || 0;
        });

        // Calcular custos (compras)
        const purchasesSnapshot = await getDocs(
            query(
                collection(db, 'purchases', uid, 'purchases'),
                where('createdAt', '>=', monthStart),
                where('createdAt', '<=', monthEnd),
                where('status', '==', 'paid')
            )
        );

        let totalCosts = 0;
        purchasesSnapshot.forEach(doc => {
            totalCosts += doc.data().total_value || 0;
        });

        // Calcular margem
        const margin = totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue * 100).toFixed(1) : 0;

        // Calcular fluxo de caixa (saldo)
        const balance = totalRevenue - totalCosts;

        // Atualizar KPIs
        const kpiCards = document.querySelectorAll('.kpi-card');
        kpiCards[0].querySelector('.kpi-value').textContent = formatCurrency(totalRevenue);
        kpiCards[1].querySelector('.kpi-value').textContent = formatCurrency(totalCosts);
        kpiCards[2].querySelector('.kpi-value').textContent = margin + '%';
        kpiCards[3].querySelector('.kpi-value').textContent = formatCurrency(balance);

    } catch (error) {
        console.error('Erro ao carregar KPIs:', error);
    }
}

// ============================================
// CARREGAR GRÁFICOS
// ============================================

function loadCharts() {
    // Gráfico de Vendas por Mês
    loadSalesChart();

    // Gráfico de Custos vs Receitas
    loadCostRevenueChart();

    // Gráfico de Produtos Mais Vendidos
    loadTopProductsChart();

    // Gráfico de Status de Vendas
    loadSalesStatusChart();
}

function loadSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    const labels = getLast6Months();
    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Vendas',
                data: [1200, 1900, 3000, 2500, 2200, 3200],
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                tension: 0.4,
                fill: true
            }
        ]
    };

    if (chartsInstance.salesChart) {
        chartsInstance.salesChart.destroy();
    }

    chartsInstance.salesChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function loadCostRevenueChart() {
    const ctx = document.getElementById('costRevenueChart');
    if (!ctx) return;

    const labels = getLast6Months();
    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Receitas',
                data: [3000, 4500, 5200, 4800, 5100, 6000],
                backgroundColor: 'rgba(6, 214, 160, 0.6)',
                borderColor: '#06d6a0',
                borderWidth: 2
            },
            {
                label: 'Custos',
                data: [1500, 2300, 2800, 2600, 2700, 3200],
                backgroundColor: 'rgba(239, 71, 111, 0.6)',
                borderColor: '#ef476f',
                borderWidth: 2
            }
        ]
    };

    if (chartsInstance.costRevenueChart) {
        chartsInstance.costRevenueChart.destroy();
    }

    chartsInstance.costRevenueChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function loadTopProductsChart() {
    const ctx = document.getElementById('topProductsChart');
    if (!ctx) return;

    const data = {
        labels: ['Produto A', 'Produto B', 'Produto C', 'Produto D', 'Produto E'],
        datasets: [
            {
                label: 'Unidades Vendidas',
                data: [120, 95, 87, 76, 65],
                backgroundColor: [
                    '#4361ee',
                    '#3f37c9',
                    '#06d6a0',
                    '#ffd166',
                    '#118ab2'
                ],
                borderWidth: 2,
                borderColor: 'white'
            }
        ]
    };

    if (chartsInstance.topProductsChart) {
        chartsInstance.topProductsChart.destroy();
    }

    chartsInstance.topProductsChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        }
    });
}

function loadSalesStatusChart() {
    const ctx = document.getElementById('salesStatusChart');
    if (!ctx) return;

    const data = {
        labels: ['Pendentes', 'Concluídas', 'Canceladas'],
        datasets: [
            {
                label: 'Status de Vendas',
                data: [12, 88, 5],
                backgroundColor: [
                    '#ffd166',
                    '#06d6a0',
                    '#ef476f'
                ],
                borderWidth: 2,
                borderColor: 'white'
            }
        ]
    };

    if (chartsInstance.salesStatusChart) {
        chartsInstance.salesStatusChart.destroy();
    }

    chartsInstance.salesStatusChart = new Chart(ctx, {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        }
    });
}

// ============================================
// CARREGAR TABELAS
// ============================================

async function loadRecentSales() {
    try {
        const uid = getUserUID();
        const tbody = document.getElementById('recentSalesTable');

        if (!tbody) return;

        const salesSnapshot = await getDocs(
            query(
                collection(db, 'sales', uid, 'sales'),
                orderBy('createdAt', 'desc'),
                limit(5)
            )
        );

        if (salesSnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-message">Nenhuma venda registrada</td></tr>';
            return;
        }

        let html = '';
        salesSnapshot.forEach(doc => {
            const sale = doc.data();
            const status = sale.status === 'paid' ? 'Pago' : 'Pendente';
            const statusClass = sale.status === 'paid' ? 'status-completed' : 'status-pending';

            html += `
                <tr>
                    <td>${sale.code || 'N/A'}</td>
                    <td>${sale.client_name || 'N/A'}</td>
                    <td>${formatCurrency(sale.total_value || 0)}</td>
                    <td>${formatDate(sale.createdAt)}</td>
                    <td><span class="${statusClass}">${status}</span></td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar vendas recentes:', error);
    }
}

async function loadAccountsReceivable() {
    try {
        const uid = getUserUID();
        const tbody = document.getElementById('accountsReceivableTable');

        if (!tbody) return;

        const accountsSnapshot = await getDocs(
            query(
                collection(db, 'accounts_receivable', uid, 'accounts'),
                where('status', '==', 'pending'),
                orderBy('due_date', 'asc'),
                limit(5)
            )
        );

        if (accountsSnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-message">Nenhuma conta a receber</td></tr>';
            return;
        }

        let html = '';
        accountsSnapshot.forEach(doc => {
            const account = doc.data();
            const isOverdue = new Date(account.due_date.toDate()) < new Date();
            const statusClass = isOverdue ? 'status-cancelled' : 'status-pending';
            const status = isOverdue ? 'Vencida' : 'Pendente';

            html += `
                <tr>
                    <td>${account.client_name || 'N/A'}</td>
                    <td>${formatCurrency(account.total_value || 0)}</td>
                    <td>${formatDate(account.due_date)}</td>
                    <td><span class="${statusClass}">${status}</span></td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar contas a receber:', error);
    }
}

async function loadAccountsPayable() {
    try {
        const uid = getUserUID();
        const tbody = document.getElementById('accountsPayableTable');

        if (!tbody) return;

        const accountsSnapshot = await getDocs(
            query(
                collection(db, 'accounts_payable', uid, 'accounts'),
                where('status', '==', 'pending'),
                orderBy('due_date', 'asc'),
                limit(5)
            )
        );

        if (accountsSnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-message">Nenhuma conta a pagar</td></tr>';
            return;
        }

        let html = '';
        accountsSnapshot.forEach(doc => {
            const account = doc.data();
            const isOverdue = new Date(account.due_date.toDate()) < new Date();
            const statusClass = isOverdue ? 'status-cancelled' : 'status-pending';
            const status = isOverdue ? 'Vencida' : 'Pendente';

            html += `
                <tr>
                    <td>${account.supplier_name || 'N/A'}</td>
                    <td>${formatCurrency(account.total_value || 0)}</td>
                    <td>${formatDate(account.due_date)}</td>
                    <td><span class="${statusClass}">${status}</span></td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar contas a pagar:', error);
    }
}

async function loadLowStock() {
    try {
        const uid = getUserUID();
        const tbody = document.getElementById('lowStockTable');

        if (!tbody) return;

        const productsSnapshot = await getDocs(
            query(
                collection(db, 'products', uid, 'products'),
                orderBy('stock', 'asc'),
                limit(5)
            )
        );

        if (productsSnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-message">Nenhum produto com estoque baixo</td></tr>';
            return;
        }

        let html = '';
        productsSnapshot.forEach(doc => {
            const product = doc.data();

            html += `
                <tr>
                    <td>${product.name || 'N/A'}</td>
                    <td>${product.stock || 0}</td>
                    <td>${product.min_stock || 10}</td>
                    <td><a href="compras-pedidos.html" class="btn btn-small btn-primary">Comprar</a></td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar estoque baixo:', error);
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function getLast6Months() {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }));
    }

    return months;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR');
}
