/**
 * BARVOX - Financeiro Module
 * Handles accounts payable, receivable, and payment management
 */

import { db, auth, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, query, where, orderBy } from './firebase-config.js';
import { getUserData } from './auth.js';
import { formatCurrency, formatDate, showToast, generateCode } from './utils.js';

// ============================================
// CONTAS A PAGAR - FINANCEIRO-PAGAR.HTML
// ============================================

async function loadAccountsPayable() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const userData = await getUserData();
        const snapshot = await getDocs(
            query(collection(db, 'users', user.uid, 'accounts_payable'), orderBy('due_date', 'desc'))
        );

        const tbody = document.getElementById('contasTable');
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-message">Nenhuma conta a pagar</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const conta = doc.data();
            const hoje = new Date();
            const vencimento = new Date(conta.due_date);
            const dias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

            const statusClass = conta.status === 'paid' ? 'status-completed' :
                dias < 0 ? 'status-overdue' : 'status-pending';
            const statusLabel = conta.status === 'paid' ? 'Paga' :
                dias < 0 ? 'Vencida' : 'Pendente';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${conta.codigo}</td>
                <td>${conta.supplier_name}</td>
                <td>${formatCurrency(conta.valor)}</td>
                <td>${formatDate(conta.due_date)}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>${dias > 0 ? dias + ' dias' : 'Vencida'}</td>
                <td>
                    <button class="action-btn edit" onclick="openPagamentoModal('${doc.id}', '${conta.supplier_name}', ${conta.valor})">✏️</button>
                    <button class="action-btn delete" onclick="deletarConta('${doc.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar contas a pagar:', error);
        showToast('Erro ao carregar contas a pagar', 'error');
    }
}

async function openPagamentoModal(contaId, fornecedor, valorTotal) {
    const modal = document.getElementById('recebimentoModal');
    if (!modal) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
        const contaDoc = await getDoc(doc(db, 'users', user.uid, 'accounts_payable', contaId));

        if (!contaDoc.exists()) return;

        const conta = contaDoc.data();

        document.getElementById('recCliente').textContent = fornecedor;
        document.getElementById('recValorTotal').textContent = formatCurrency(conta.valor);
        document.getElementById('recValorRecebido').textContent = formatCurrency(conta.paid_value || 0);
        document.getElementById('recValorRestante').textContent = formatCurrency(conta.valor - (conta.paid_value || 0));

        document.getElementById('recData').valueAsDate = new Date();
        document.getElementById('recValor').value = '';
        document.getElementById('recObservacoes').value = '';

        const form = document.getElementById('recebimentoForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await registrarPagamento(contaId, parseFloat(document.getElementById('recValor').value));
            modal.style.display = 'none';
            loadAccountsPayable();
        };

        modal.style.display = 'flex';
    } catch (error) {
        console.error('Erro ao abrir modal:', error);
        showToast('Erro ao abrir formulário', 'error');
    }
}

async function registrarPagamento(contaId, valor) {
    const user = auth.currentUser;
    if (!user) return;

    if (valor <= 0) {
        showToast('Valor deve ser maior que zero', 'warning');
        return;
    }

    try {
        const contaRef = doc(db, 'users', user.uid, 'accounts_payable', contaId);
        const contaDoc = await getDoc(contaRef);
        const conta = contaDoc.data();

        const novoPago = (conta.paid_value || 0) + valor;
        const status = novoPago >= conta.valor ? 'paid' : 'pending';

        await updateDoc(contaRef, {
            paid_value: novoPago,
            status: status,
            last_payment_date: new Date().toISOString().split('T')[0],
            payment_notes: document.getElementById('recObservacoes').value || conta.payment_notes
        });

        // Registrar no histórico de pagamentos
        await addDoc(collection(db, 'users', user.uid, 'payments_history'), {
            account_id: contaId,
            tipo: 'pagamento',
            valor: valor,
            data: new Date().toISOString().split('T')[0],
            observacoes: document.getElementById('recObservacoes').value,
            created_at: new Date().toISOString()
        });

        showToast('Pagamento registrado com sucesso', 'success');
    } catch (error) {
        console.error('Erro ao registrar pagamento:', error);
        showToast('Erro ao registrar pagamento', 'error');
    }
}

async function cancelarPagamento(contaId) {
    if (!confirm('Tem certeza que deseja cancelar esta conta?')) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
        await updateDoc(doc(db, 'users', user.uid, 'accounts_payable', contaId), { status: 'cancelled' });

        showToast('Conta cancelada com sucesso', 'success');
        loadAccountsPayable();
    } catch (error) {
        console.error('Erro ao cancelar conta:', error);
        showToast('Erro ao cancelar conta', 'error');
    }
}

// ============================================
// CONTAS PAGAS - FINANCEIRO-PAGAS.HTML
// ============================================

async function loadPaidAccounts() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await getDocs(
            query(
                collection(db, 'users', user.uid, 'accounts_payable'),
                where('status', '==', 'paid'),
                orderBy('last_payment_date', 'desc')
            )
        );

        const tbody = document.getElementById('contasTable');
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-message">Nenhuma conta paga</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const conta = doc.data();
            const vencimento = new Date(conta.due_date);
            const pagamento = new Date(conta.last_payment_date);
            const dias = Math.ceil((pagamento - vencimento) / (1000 * 60 * 60 * 24));

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${conta.codigo}</td>
                <td>${conta.supplier_name}</td>
                <td>${formatCurrency(conta.valor)}</td>
                <td>${formatDate(conta.last_payment_date)}</td>
                <td>${dias} dias</td>
                <td>
                    <button class="action-btn edit" onclick="openDetalhesPagas('${doc.id}')">👁️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar contas pagas:', error);
        showToast('Erro ao carregar contas pagas', 'error');
    }
}

async function openDetalhesPagas(contaId) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const contaDoc = await getDoc(doc(db, 'users', user.uid, 'accounts_payable', contaId));

        if (!contaDoc.exists()) return;

        const conta = contaDoc.data();
        const modal = document.getElementById('detalhesModal');

        document.getElementById('detCliente').textContent = conta.supplier_name;
        document.getElementById('detValor').textContent = formatCurrency(conta.valor);
        document.getElementById('detVencimento').textContent = formatDate(conta.due_date);
        document.getElementById('detRecebimento').textContent = formatDate(conta.last_payment_date);
        document.getElementById('detObservacoes').textContent = conta.payment_notes || '-';

        if (modal) modal.style.display = 'flex';
    } catch (error) {
        console.error('Erro ao abrir detalhes:', error);
        showToast('Erro ao abrir detalhes', 'error');
    }
}

// ============================================
// CONTAS A RECEBER - FINANCEIRO-RECEBER.HTML
// ============================================

async function loadAccountsReceivable() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await getDocs(
            query(collection(db, 'users', user.uid, 'accounts_receivable'), orderBy('due_date', 'desc'))
        );

        const tbody = document.getElementById('contasTable');
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-message">Nenhuma conta a receber</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const conta = doc.data();
            const hoje = new Date();
            const vencimento = new Date(conta.due_date);
            const dias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

            const statusClass = conta.status === 'received' ? 'status-completed' :
                dias < 0 ? 'status-overdue' : 'status-pending';
            const statusLabel = conta.status === 'received' ? 'Recebida' :
                dias < 0 ? 'Vencida' : 'Pendente';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${conta.codigo}</td>
                <td>${conta.client_name}</td>
                <td>${formatCurrency(conta.valor)}</td>
                <td>${formatDate(conta.due_date)}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>${dias > 0 ? dias + ' dias' : 'Vencida'}</td>
                <td>
                    <button class="action-btn edit" onclick="openRecebimentoModal('${doc.id}', '${conta.client_name}', ${conta.valor})">✏️</button>
                    <button class="action-btn delete" onclick="cancelarRecebimento('${doc.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar contas a receber:', error);
        showToast('Erro ao carregar contas a receber', 'error');
    }
}

async function openRecebimentoModal(contaId, cliente, valorTotal) {
    const modal = document.getElementById('recebimentoModal');
    if (!modal) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
        const contaDoc = await getDoc(doc(db, 'users', user.uid, 'accounts_receivable', contaId));

        if (!contaDoc.exists()) return;

        const conta = contaDoc.data();

        document.getElementById('recCliente').textContent = cliente;
        document.getElementById('recValorTotal').textContent = formatCurrency(conta.valor);
        document.getElementById('recValorRecebido').textContent = formatCurrency(conta.received_value || 0);
        document.getElementById('recValorRestante').textContent = formatCurrency(conta.valor - (conta.received_value || 0));

        document.getElementById('recData').valueAsDate = new Date();
        document.getElementById('recValor').value = '';
        document.getElementById('recObservacoes').value = '';

        const form = document.getElementById('recebimentoForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await registrarRecebimento(contaId, parseFloat(document.getElementById('recValor').value));
            modal.style.display = 'none';
            loadAccountsReceivable();
        };

        modal.style.display = 'flex';
    } catch (error) {
        console.error('Erro ao abrir modal:', error);
        showToast('Erro ao abrir formulário', 'error');
    }
}

async function registrarRecebimento(contaId, valor) {
    const user = auth.currentUser;
    if (!user) return;

    if (valor <= 0) {
        showToast('Valor deve ser maior que zero', 'warning');
        return;
    }

    try {
        const contaRef = doc(db, 'users', user.uid, 'accounts_receivable', contaId);
        const contaDoc = await getDoc(contaRef);
        const conta = contaDoc.data();

        const novoRecebido = (conta.received_value || 0) + valor;
        const status = novoRecebido >= conta.valor ? 'received' : 'pending';

        await updateDoc(contaRef, {
            received_value: novoRecebido,
            status: status,
            last_receipt_date: new Date().toISOString().split('T')[0],
            receipt_notes: document.getElementById('recObservacoes').value || conta.receipt_notes
        });

        // Registrar no histórico de recebimentos
        await addDoc(collection(db, 'users', user.uid, 'receipts_history'), {
            account_id: contaId,
            tipo: 'recebimento',
            valor: valor,
            data: new Date().toISOString().split('T')[0],
            observacoes: document.getElementById('recObservacoes').value,
            created_at: new Date().toISOString()
        });

        showToast('Recebimento registrado com sucesso', 'success');
    } catch (error) {
        console.error('Erro ao registrar recebimento:', error);
        showToast('Erro ao registrar recebimento', 'error');
    }
}

async function cancelarRecebimento(contaId) {
    if (!confirm('Tem certeza que deseja cancelar esta conta?')) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
        await updateDoc(doc(db, 'users', user.uid, 'accounts_receivable', contaId), { status: 'cancelled' });

        showToast('Conta cancelada com sucesso', 'success');
        loadAccountsReceivable();
    } catch (error) {
        console.error('Erro ao cancelar conta:', error);
        showToast('Erro ao cancelar conta', 'error');
    }
}

// ============================================
// CONTAS RECEBIDAS - FINANCEIRO-RECEBIDAS.HTML
// ============================================

async function loadReceivedAccounts() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await getDocs(
            query(
                collection(db, 'users', user.uid, 'accounts_receivable'),
                where('status', '==', 'received'),
                orderBy('last_receipt_date', 'desc')
            )
        );

        const tbody = document.getElementById('contasTable');
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-message">Nenhuma conta recebida</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const conta = doc.data();
            const vencimento = new Date(conta.due_date);
            const recebimento = new Date(conta.last_receipt_date);
            const dias = Math.ceil((recebimento - vencimento) / (1000 * 60 * 60 * 24));

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${conta.codigo}</td>
                <td>${conta.client_name}</td>
                <td>${formatCurrency(conta.valor)}</td>
                <td>${formatDate(conta.last_receipt_date)}</td>
                <td>${dias} dias</td>
                <td>
                    <button class="action-btn edit" onclick="openDetalhesRecebidas('${doc.id}')">👁️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar contas recebidas:', error);
        showToast('Erro ao carregar contas recebidas', 'error');
    }
}

async function openDetalhesRecebidas(contaId) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const contaDoc = await getDoc(doc(db, 'users', user.uid, 'accounts_receivable', contaId));

        if (!contaDoc.exists()) return;

        const conta = contaDoc.data();
        const modal = document.getElementById('detalhesModal');

        document.getElementById('detCliente').textContent = conta.client_name;
        document.getElementById('detValor').textContent = formatCurrency(conta.valor);
        document.getElementById('detVencimento').textContent = formatDate(conta.due_date);
        document.getElementById('detRecebimento').textContent = formatDate(conta.last_receipt_date);
        document.getElementById('detObservacoes').textContent = conta.receipt_notes || '-';

        if (modal) modal.style.display = 'flex';
    } catch (error) {
        console.error('Erro ao abrir detalhes:', error);
        showToast('Erro ao abrir detalhes', 'error');
    }
}

// ============================================
// MODAL CLOSE HANDLERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const closeBtns = document.querySelectorAll('[id*="close"]');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    const cancelBtns = document.querySelectorAll('[id*="cancel"]');
    cancelBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    // Load data on page load based on current page
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage.includes('financeiro-pagar')) {
        loadAccountsPayable();
    } else if (currentPage.includes('financeiro-pagas')) {
        loadPaidAccounts();
    } else if (currentPage.includes('financeiro-receber')) {
        loadAccountsReceivable();
    } else if (currentPage.includes('financeiro-recebidas')) {
        loadReceivedAccounts();
    }

    // Search and filter functionality
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');

    if (searchInput && filterStatus) {
        searchInput.addEventListener('input', filterData);
        filterStatus.addEventListener('change', filterData);
    }
});

// ============================================
// SEARCH AND FILTER FUNCTIONS
// ============================================

function filterData() {
    const searchInput = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filterStatus = document.getElementById('filterStatus')?.value || '';
    const rows = document.querySelectorAll('#contasTable tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const statusCell = row.querySelector('[class*="status-badge"]')?.textContent || '';

        const matchesSearch = searchInput === '' || text.includes(searchInput);
        const matchesStatus = filterStatus === '' || statusCell.toLowerCase().includes(filterStatus.toLowerCase());

        row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
    });
}
