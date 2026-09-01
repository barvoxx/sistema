/**
 * BARVOX - Relatórios Module
 * Handles report generation and export
 */

import { db, auth } from './firebase-config.js';
import { formatCurrency, formatDate, exportToCSV } from './utils.js';

let currentReportType = '';
let currentReportFormat = '';

// ============================================
// REPORT GENERATION
// ============================================

async function generateReport(reportType, format) {
    currentReportType = reportType;
    currentReportFormat = format;

    // Show filter modal based on report type
    showReportFilters(reportType);
}

function showReportFilters(reportType) {
    const modal = document.getElementById('filtroModal');
    if (!modal) return;

    const title = document.getElementById('filtroTitle');
    const adicional = document.getElementById('filtroAdicional');

    // Set date fields to current month
    const hoje = new Date();
    const primeirodDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    document.getElementById('filtroDataInicio').valueAsDate = primeirodDia;
    document.getElementById('filtroDataFim').valueAsDate = hoje;

    title.textContent = `Filtros - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`;

    // Add additional filters based on report type
    adicional.innerHTML = '';

    if (reportType === 'sales' || reportType === 'purchases') {
        adicional.innerHTML = `
            <div class="form-group">
                <label for="filtroCliente">Cliente/Fornecedor (Opcional)</label>
                <input type="text" id="filtroCliente" placeholder="Deixe em branco para todos">
            </div>
        `;
    } else if (reportType === 'financial') {
        adicional.innerHTML = `
            <div class="form-group">
                <label for="filtroTipoFinanceiro">Tipo</label>
                <select id="filtroTipoFinanceiro">
                    <option value="">Todos</option>
                    <option value="payable">Contas a Pagar</option>
                    <option value="receivable">Contas a Receber</option>
                </select>
            </div>
        `;
    }

    modal.style.display = 'flex';
}

// ============================================
// SALES REPORT
// ============================================

async function generateSalesReport(startDate, endDate, filters = {}) {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const snapshot = await db.collection('users')
            .doc(user.uid)
            .collection('sales')
            .where('data', '>=', startDate)
            .where('data', '<=', endDate)
            .get();

        let vendas = [];
        snapshot.forEach(doc => {
            const venda = doc.data();
            if (!filters.client || venda.client_name.toLowerCase().includes(filters.client.toLowerCase())) {
                vendas.push(venda);
            }
        });

        return {
            title: 'Relatório de Vendas',
            period: `${formatDate(startDate)} a ${formatDate(endDate)}`,
            data: vendas,
            columns: ['Código', 'Cliente', 'Total', 'Data', 'Forma Pagamento', 'Status'],
            totals: {
                total_vendas: vendas.length,
                valor_total: vendas.reduce((sum, v) => sum + v.total, 0),
                valor_medio: vendas.length > 0 ? vendas.reduce((sum, v) => sum + v.total, 0) / vendas.length : 0
            }
        };
    } catch (error) {
        console.error('Erro ao gerar relatório de vendas:', error);
        return null;
    }
}

// ============================================
// PURCHASES REPORT
// ============================================

async function generatePurchasesReport(startDate, endDate, filters = {}) {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const snapshot = await db.collection('users')
            .doc(user.uid)
            .collection('purchase_orders')
            .where('data_compra', '>=', startDate)
            .where('data_compra', '<=', endDate)
            .get();

        let compras = [];
        snapshot.forEach(doc => {
            const compra = doc.data();
            if (!filters.supplier || compra.supplier_name.toLowerCase().includes(filters.supplier.toLowerCase())) {
                compras.push(compra);
            }
        });

        return {
            title: 'Relatório de Compras',
            period: `${formatDate(startDate)} a ${formatDate(endDate)}`,
            data: compras,
            columns: ['Código', 'Fornecedor', 'Total', 'Data', 'Status'],
            totals: {
                total_compras: compras.length,
                valor_total: compras.reduce((sum, c) => sum + c.total, 0),
                valor_medio: compras.length > 0 ? compras.reduce((sum, c) => sum + c.total, 0) / compras.length : 0
            }
        };
    } catch (error) {
        console.error('Erro ao gerar relatório de compras:', error);
        return null;
    }
}

// ============================================
// STOCK REPORT
// ============================================

async function generateStockReport(startDate, endDate) {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const snapshot = await db.collection('users')
            .doc(user.uid)
            .collection('products')
            .get();

        let produtos = [];
        snapshot.forEach(doc => {
            const produto = doc.data();
            produtos.push({
                codigo: produto.codigo,
                nome: produto.name,
                estoque: produto.estoque_atual || 0,
                valor_unitario: produto.cost_price || 0,
                valor_total: (produto.estoque_atual || 0) * (produto.cost_price || 0)
            });
        });

        return {
            title: 'Relatório de Estoque',
            data: produtos,
            columns: ['Código', 'Produto', 'Estoque', 'Valor Unitário', 'Valor Total'],
            totals: {
                total_produtos: produtos.length,
                valor_estoque_total: produtos.reduce((sum, p) => sum + p.valor_total, 0)
            }
        };
    } catch (error) {
        console.error('Erro ao gerar relatório de estoque:', error);
        return null;
    }
}

// ============================================
// FINANCIAL REPORT
// ============================================

async function generateFinancialReport(startDate, endDate, type = '') {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        let contas = [];

        if (type !== 'receivable') {
            const payableSnapshot = await db.collection('users')
                .doc(user.uid)
                .collection('accounts_payable')
                .get();

            payableSnapshot.forEach(doc => {
                const conta = doc.data();
                contas.push({
                    codigo: conta.codigo,
                    descricao: `${conta.supplier_name} (Pagar)`,
                    valor: conta.valor,
                    data_vencimento: conta.due_date,
                    status: conta.status,
                    tipo: 'payable'
                });
            });
        }

        if (type !== 'payable') {
            const receivableSnapshot = await db.collection('users')
                .doc(user.uid)
                .collection('accounts_receivable')
                .get();

            receivableSnapshot.forEach(doc => {
                const conta = doc.data();
                contas.push({
                    codigo: conta.codigo,
                    descricao: `${conta.client_name} (Receber)`,
                    valor: conta.valor,
                    data_vencimento: conta.due_date,
                    status: conta.status,
                    tipo: 'receivable'
                });
            });
        }

        const totalPagar = contas
            .filter(c => c.tipo === 'payable')
            .reduce((sum, c) => sum + c.valor, 0);

        const totalReceber = contas
            .filter(c => c.tipo === 'receivable')
            .reduce((sum, c) => sum + c.valor, 0);

        return {
            title: 'Relatório Financeiro',
            data: contas,
            columns: ['Código', 'Descrição', 'Valor', 'Vencimento', 'Status'],
            totals: {
                total_pagar: totalPagar,
                total_receber: totalReceber,
                saldo: totalReceber - totalPagar
            }
        };
    } catch (error) {
        console.error('Erro ao gerar relatório financeiro:', error);
        return null;
    }
}

// ============================================
// BILLING REPORT
// ============================================

async function generateBillingReport(startDate, endDate) {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const vendas = await db.collection('users')
            .doc(user.uid)
            .collection('sales')
            .where('data', '>=', startDate)
            .where('data', '<=', endDate)
            .get();

        const compras = await db.collection('users')
            .doc(user.uid)
            .collection('purchase_orders')
            .where('data_compra', '>=', startDate)
            .where('data_compra', '<=', endDate)
            .get();

        let totalRecebido = 0;
        let totalCustos = 0;

        vendas.forEach(doc => {
            totalRecebido += doc.data().total || 0;
        });

        compras.forEach(doc => {
            totalCustos += doc.data().total || 0;
        });

        const lucro = totalRecebido - totalCustos;
        const margem = totalRecebido > 0 ? (lucro / totalRecebido) * 100 : 0;

        return {
            title: 'Relatório de Faturamento',
            period: `${formatDate(startDate)} a ${formatDate(endDate)}`,
            data: [
                { descricao: 'Receitas de Vendas', valor: totalRecebido },
                { descricao: 'Custos de Compras', valor: totalCustos },
                { descricao: 'Lucro Bruto', valor: lucro }
            ],
            totals: {
                receitas: totalRecebido,
                custos: totalCustos,
                lucro: lucro,
                margem_lucro: margem.toFixed(2) + '%'
            }
        };
    } catch (error) {
        console.error('Erro ao gerar relatório de faturamento:', error);
        return null;
    }
}

// ============================================
// CLIENTS REPORT
// ============================================

async function generateClientsReport() {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const clientesSnapshot = await db.collection('users')
            .doc(user.uid)
            .collection('clients')
            .get();

        let clientes = [];

        for (const doc of clientesSnapshot.docs) {
            const cliente = doc.data();
            
            // Contar vendas e somar valores
            const vendas = await db.collection('users')
                .doc(user.uid)
                .collection('sales')
                .where('client_id', '==', doc.id)
                .get();

            let totalVendas = 0;
            vendas.forEach(v => {
                totalVendas += v.data().total || 0;
            });

            clientes.push({
                codigo: cliente.codigo,
                nome: cliente.name,
                email: cliente.email || '-',
                telefone: cliente.phone || '-',
                total_vendas: vendas.size,
                valor_vendido: totalVendas
            });
        }

        return {
            title: 'Relatório de Clientes',
            data: clientes,
            columns: ['Código', 'Nome', 'Email', 'Telefone', 'Total de Vendas', 'Valor Vendido'],
            totals: {
                total_clientes: clientes.length,
                valor_total_vendido: clientes.reduce((sum, c) => sum + c.valor_vendido, 0)
            }
        };
    } catch (error) {
        console.error('Erro ao gerar relatório de clientes:', error);
        return null;
    }
}

// ============================================
// SUPPLIERS REPORT
// ============================================

async function generateSuppliersReport() {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const fornecedoresSnapshot = await db.collection('users')
            .doc(user.uid)
            .collection('suppliers')
            .get();

        let fornecedores = [];

        for (const doc of fornecedoresSnapshot.docs) {
            const fornecedor = doc.data();
            
            // Contar compras e somar valores
            const compras = await db.collection('users')
                .doc(user.uid)
                .collection('purchase_orders')
                .where('supplier_id', '==', doc.id)
                .get();

            let totalCompras = 0;
            compras.forEach(c => {
                totalCompras += c.data().total || 0;
            });

            fornecedores.push({
                codigo: fornecedor.codigo,
                nome: fornecedor.name,
                email: fornecedor.email || '-',
                telefone: fornecedor.phone || '-',
                total_compras: compras.size,
                valor_comprado: totalCompras
            });
        }

        return {
            title: 'Relatório de Fornecedores',
            data: fornecedores,
            columns: ['Código', 'Nome', 'Email', 'Telefone', 'Total de Compras', 'Valor Comprado'],
            totals: {
                total_fornecedores: fornecedores.length,
                valor_total_comprado: fornecedores.reduce((sum, f) => sum + f.valor_comprado, 0)
            }
        };
    } catch (error) {
        console.error('Erro ao gerar relatório de fornecedores:', error);
        return null;
    }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

async function exportReport(reportData, format) {
    if (!reportData) return;

    if (format === 'excel') {
        exportToExcel(reportData);
    } else if (format === 'pdf') {
        exportToPDF(reportData);
    }
}

function exportToExcel(reportData) {
    const csv = convertReportToCSV(reportData);
    const filename = `${reportData.title.replace(/\s+/g, '_')}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

function convertReportToCSV(reportData) {
    let csv = reportData.title + '\n';
    if (reportData.period) csv += `Período: ${reportData.period}\n\n`;

    csv += reportData.columns.join(',') + '\n';

    if (Array.isArray(reportData.data)) {
        reportData.data.forEach(row => {
            if (typeof row === 'object') {
                const values = Object.values(row).map(v => {
                    if (typeof v === 'string' && v.includes(',')) {
                        return `"${v}"`;
                    }
                    return v;
                });
                csv += values.join(',') + '\n';
            }
        });
    }

    csv += '\n\nRESUMO:\n';
    Object.entries(reportData.totals).forEach(([key, value]) => {
        if (typeof value === 'number') {
            csv += `${key}: ${formatCurrency(value)}\n`;
        } else {
            csv += `${key}: ${value}\n`;
        }
    });

    return csv;
}

function exportToPDF(reportData) {
    // Implementação básica usando a impressão do navegador
    let html = `
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { margin-top: 30px; page-break-inside: avoid; }
        </style>
        <h1>${reportData.title}</h1>
    `;

    if (reportData.period) {
        html += `<p><strong>Período:</strong> ${reportData.period}</p>`;
    }

    html += '<table><thead><tr>';
    reportData.columns.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '</tr></thead><tbody>';

    if (Array.isArray(reportData.data)) {
        reportData.data.forEach(row => {
            if (typeof row === 'object') {
                html += '<tr>';
                Object.values(row).forEach(value => {
                    html += `<td>${value}</td>`;
                });
                html += '</tr>';
            }
        });
    }

    html += '</tbody></table>';

    html += '<div class="summary"><h2>Resumo</h2>';
    Object.entries(reportData.totals).forEach(([key, value]) => {
        if (typeof value === 'number') {
            html += `<p><strong>${key}:</strong> ${formatCurrency(value)}</p>`;
        } else {
            html += `<p><strong>${key}:</strong> ${value}</p>`;
        }
    });
    html += '</div>';

    const win = window.open('', '', 'height=700,width=900');
    win.document.write(html);
    win.document.close();
    win.print();
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const filtroForm = document.getElementById('filtroForm');
    if (filtroForm) {
        filtroForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const startDate = document.getElementById('filtroDataInicio').value;
            const endDate = document.getElementById('filtroDataFim').value;
            const filters = {};

            if (currentReportType === 'sales' || currentReportType === 'purchases') {
                const cliente = document.getElementById('filtroCliente')?.value;
                if (cliente) {
                    filters.client = cliente;
                    filters.supplier = cliente;
                }
            } else if (currentReportType === 'financial') {
                filters.type = document.getElementById('filtroTipoFinanceiro')?.value || '';
            }

            let reportData;

            switch (currentReportType) {
                case 'sales':
                    reportData = await generateSalesReport(startDate, endDate, filters);
                    break;
                case 'purchases':
                    reportData = await generatePurchasesReport(startDate, endDate, filters);
                    break;
                case 'stock':
                    reportData = await generateStockReport(startDate, endDate);
                    break;
                case 'financial':
                    reportData = await generateFinancialReport(startDate, endDate, filters.type);
                    break;
                case 'billing':
                    reportData = await generateBillingReport(startDate, endDate);
                    break;
                case 'clients':
                    reportData = await generateClientsReport();
                    break;
                case 'suppliers':
                    reportData = await generateSuppliersReport();
                    break;
                case 'bestsellers':
                    reportData = await generateBestsellersReport(startDate, endDate);
                    break;
            }

            if (reportData) {
                await exportReport(reportData, currentReportFormat);
                document.getElementById('filtroModal').style.display = 'none';
                showToast(`Relatório de ${currentReportType} gerado com sucesso!`, 'success');
            }
        });
    }

    // Modal close handlers
    document.getElementById('closeFiltroModal')?.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) modal.style.display = 'none';
    });

    document.getElementById('cancelFiltroBtn')?.addEventListener('click', () => {
        document.getElementById('filtroModal').style.display = 'none';
    });
});

// Placeholder for bestsellers report
async function generateBestsellersReport(startDate, endDate) {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const vendas = await db.collection('users')
            .doc(user.uid)
            .collection('sales')
            .where('data', '>=', startDate)
            .where('data', '<=', endDate)
            .get();

        let produtosVendidos = {};

        vendas.forEach(doc => {
            const venda = doc.data();
            if (venda.items) {
                venda.items.forEach(item => {
                    if (!produtosVendidos[item.codigo]) {
                        produtosVendidos[item.codigo] = {
                            codigo: item.codigo,
                            nome: item.nome,
                            quantidade: 0,
                            valor_total: 0
                        };
                    }
                    produtosVendidos[item.codigo].quantidade += item.quantidade;
                    produtosVendidos[item.codigo].valor_total += (item.preco * item.quantidade);
                });
            }
        });

        const produtos = Object.values(produtosVendidos)
            .sort((a, b) => b.quantidade - a.quantidade)
            .slice(0, 10);

        return {
            title: 'Relatório de Produtos Best Sellers',
            period: `${formatDate(startDate)} a ${formatDate(endDate)}`,
            data: produtos,
            columns: ['Código', 'Produto', 'Quantidade Vendida', 'Valor Total'],
            totals: {
                total_produtos: produtos.length,
                quantidade_total: produtos.reduce((sum, p) => sum + p.quantidade, 0),
                valor_total: produtos.reduce((sum, p) => sum + p.valor_total, 0)
            }
        };
    } catch (error) {
        console.error('Erro ao gerar relatório bestsellers:', error);
        return null;
    }
}
