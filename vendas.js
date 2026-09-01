/**
 * BARVOX - Vendas Module
 * Handles sales, sales history, and quotations
 */

import { db, auth, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, query, where, orderBy } from './firebase-config.js';
import { formatCurrency, formatDate, showToast, generateCode } from './utils.js';

let vendaItensTemp = [];

// ============================================
// NOVA VENDA - VENDAS-NOVA.HTML
// ============================================

async function loadVendaClientes() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await getDocs(
            query(collection(db, 'users', user.uid, 'clients'), orderBy('name'))
        );

        const select = document.getElementById('vendaCliente');
        if (!select) return;

        select.innerHTML = '<option value="">Selecionar cliente...</option>';

        snapshot.forEach(doc => {
            const cliente = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = cliente.name;
            option.dataset.clienteId = doc.id;
            option.dataset.clienteNome = cliente.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
    }
}

async function loadVendaProdutos() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await db.collection('users')
            .doc(user.uid)
            .collection('products')
            .orderBy('name')
            .get();

        const select = document.getElementById('vendaProduto');
        if (!select) return;

        select.innerHTML = '<option value="">Buscar produto...</option>';

        snapshot.forEach(doc => {
            const produto = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${produto.codigo} - ${produto.name}`;
            option.dataset.produtoId = doc.id;
            option.dataset.produtoCodigo = produto.codigo;
            option.dataset.produtoNome = produto.name;
            option.dataset.preco = produto.sale_price || 0;
            option.dataset.estoque = produto.estoque_atual || 0;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

function adicionarProdutoVenda() {
    const select = document.getElementById('vendaProduto');
    if (!select || select.value === '') {
        showToast('Selecione um produto', 'warning');
        return;
    }

    const option = select.options[select.selectedIndex];
    const produtoId = option.value;
    const codigo = option.dataset.produtoCodigo;
    const nome = option.dataset.produtoNome;
    const preco = parseFloat(option.dataset.preco) || 0;

    const itemExistente = vendaItensTemp.find(item => item.produtoId === produtoId);
    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        vendaItensTemp.push({
            produtoId,
            codigo,
            nome,
            preco,
            quantidade: 1,
            desconto: 0
        });
    }

    select.value = '';
    renderVendaItens();
    calcularTotalVenda();
}

function removerProdutoVenda(index) {
    vendaItensTemp.splice(index, 1);
    renderVendaItens();
    calcularTotalVenda();
}

function renderVendaItens() {
    const tbody = document.getElementById('vendaItens');
    if (!tbody) return;

    if (vendaItensTemp.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-message">Nenhum produto adicionado</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    vendaItensTemp.forEach((item, index) => {
        const embalagem = item.embalagem || 'UN';
        const subtotal = (item.preco * item.quantidade) - (item.desconto || 0);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.codigo}</td>
            <td>${item.nome}</td>
            <td>
                <select onchange="updateProdutoVenda(${index}, 'embalagem', this.value)">
                    <option value="UN" ${embalagem === 'UN' ? 'selected' : ''}>UN</option>
                    <option value="PC" ${embalagem === 'PC' ? 'selected' : ''}>PC</option>
                    <option value="CX" ${embalagem === 'CX' ? 'selected' : ''}>CX</option>
                </select>
            </td>
            <td>
                <input type="number" value="${item.quantidade}" min="1" 
                    onchange="updateProdutoVenda(${index}, 'quantidade', this.value)" style="width: 70px;">
            </td>
            <td>
                <input type="number" value="${item.preco}" min="0" step="0.01"
                    onchange="updateProdutoVenda(${index}, 'preco', this.value)" style="width: 100px;">
            </td>
            <td>
                <input type="number" value="${item.desconto || 0}" min="0" step="0.01"
                    onchange="updateProdutoVenda(${index}, 'desconto', this.value)" style="width: 80px;">
            </td>
            <td>${formatCurrency(subtotal)}</td>
            <td>
                <button type="button" class="action-btn delete" onclick="removerProdutoVenda(${index})">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateProdutoVenda(index, campo, valor) {
    if (campo === 'quantidade' || campo === 'preco' || campo === 'desconto') {
        vendaItensTemp[index][campo] = parseFloat(valor) || 0;
    } else {
        vendaItensTemp[index][campo] = valor;
    }
    renderVendaItens();
    calcularTotalVenda();
}

function calcularTotalVenda() {
    let subtotal = 0;
    vendaItensTemp.forEach(item => {
        subtotal += (item.preco * item.quantidade) - (item.desconto || 0);
    });

    const desconto = parseFloat(document.getElementById('vendaDesconto')?.value || 0);
    const frete = parseFloat(document.getElementById('vendaFrete')?.value || 0);
    const total = subtotal - desconto + frete;

    const subtotalEl = document.getElementById('vendaSubtotal');
    const totalEl = document.getElementById('vendaTotal');

    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (totalEl) totalEl.textContent = formatCurrency(total);
}

async function registrarVenda() {
    const user = auth.currentUser;
    if (!user) return;

    const clienteSelect = document.getElementById('vendaCliente');
    const dataEl = document.getElementById('vendaData');
    const pagamentoEl = document.getElementById('vendaPagamento');

    if (!clienteSelect.value || !dataEl.value || !pagamentoEl.value) {
        showToast('Preencha todos os campos obrigatórios', 'warning');
        return;
    }

    if (vendaItensTemp.length === 0) {
        showToast('Adicione pelo menos um produto', 'warning');
        return;
    }

    try {
        const option = clienteSelect.options[clienteSelect.selectedIndex];
        const clienteNome = option.textContent;
        const clienteId = clienteSelect.value;

        let subtotal = 0;
        vendaItensTemp.forEach(item => {
            subtotal += (item.preco * item.quantidade) - (item.desconto || 0);
        });

        const desconto = parseFloat(document.getElementById('vendaDesconto')?.value || 0);
        const frete = parseFloat(document.getElementById('vendaFrete')?.value || 0);
        const total = subtotal - desconto + frete;
        const codigo = generateCode('VEND');

        // Registrar venda
        const vendaDoc = await addDoc(collection(db, 'users', user.uid, 'sales'), {
            codigo,
            client_id: clienteId,
            client_name: clienteNome,
            items: vendaItensTemp,
            subtotal,
            desconto,
            frete,
            total,
            payment_method: pagamentoEl.value,
            status: 'pending',
            data: dataEl.value,
            created_at: new Date().toISOString()
        });

        // Criar conta a receber automaticamente
        await addDoc(collection(db, 'users', user.uid, 'accounts_receivable'), {
            codigo: 'AR-' + codigo,
            sale_id: vendaDoc.id,
            client_id: clienteId,
            client_name: clienteNome,
            valor: total,
            due_date: dataEl.value,
            status: 'pending',
            received_value: 0,
            payment_method: pagamentoEl.value,
            created_at: new Date().toISOString()
        });

        // Atualizar estoque dos produtos
        for (const item of vendaItensTemp) {
            const produtoRef = doc(db, 'users', user.uid, 'products', item.produtoId);
            const produtoDoc = await getDoc(produtoRef);
            if (produtoDoc.exists()) {
                const estoque = produtoDoc.data().estoque_atual || 0;
                await updateDoc(produtoRef, {
                    estoque_atual: Math.max(0, estoque - item.quantidade)
                });
            }
        }

        showToast('Venda registrada com sucesso!', 'success');
        
        // Limpar formulário
        document.getElementById('vendaForm')?.reset();
        vendaItensTemp = [];
        renderVendaItens();
        calcularTotalVenda();

    } catch (error) {
        console.error('Erro ao registrar venda:', error);
        showToast('Erro ao registrar venda', 'error');
    }
}

// ============================================
// HISTÓRICO DE VENDAS - VENDAS-HISTORICO.HTML
// ============================================

async function loadSalesHistory() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await getDocs(
            query(collection(db, 'users', user.uid, 'sales'), orderBy('data', 'desc'))
        );

        const tbody = document.getElementById('vendasTable');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-message">Nenhuma venda registrada</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const venda = doc.data();
            const statusClass = venda.status === 'paid' ? 'status-completed' :
                venda.status === 'cancelled' ? 'status-cancelled' : 'status-pending';
            const statusLabel = venda.status === 'paid' ? 'Paga' :
                venda.status === 'cancelled' ? 'Cancelada' : 'Pendente';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${venda.codigo}</td>
                <td>${venda.client_name}</td>
                <td>${formatCurrency(venda.total)}</td>
                <td>${formatDate(venda.data)}</td>
                <td>${venda.payment_method || '-'}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button class="action-btn edit" onclick="openVendaDetalhes('${doc.id}')">👁️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
// ORÇAMENTO - VENDAS-ORCAMENTO.HTML
// ============================================

let orcamentoItensTemp = [];

async function loadOrcClientes() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await getDocs(
            query(collection(db, 'users', user.uid, 'clients'), orderBy('name'))
        );

        const select = document.getElementById('orcCliente');
        if (!select) return;

        select.innerHTML = '<option value="">Selecionar cliente...</option>';

        snapshot.forEach(doc => {
            const cliente = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = cliente.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
    }
}

async function loadOrcProdutos() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await getDocs(
            query(collection(db, 'users', user.uid, 'products'), orderBy('name'))
        );

        const select = document.getElementById('orcProduto');
        if (!select) return;

        select.innerHTML = '<option value="">Buscar produto...</option>';

        snapshot.forEach(doc => {
            const produto = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${produto.codigo} - ${produto.name}`;
            option.dataset.produtoId = doc.id;
            option.dataset.produtoCodigo = produto.codigo;
            option.dataset.produtoNome = produto.name;
            option.dataset.preco = produto.sale_price || 0;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

function adicionarProdutoOrcamento() {
    const select = document.getElementById('orcProduto');
    if (!select || select.value === '') {
        showToast('Selecione um produto', 'warning');
        return;
    }

    const option = select.options[select.selectedIndex];
    const produtoId = option.value;
    const codigo = option.dataset.produtoCodigo;
    const nome = option.dataset.produtoNome;
    const preco = parseFloat(option.dataset.preco) || 0;

    const itemExistente = orcamentoItensTemp.find(item => item.produtoId === produtoId);
    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        orcamentoItensTemp.push({
            produtoId,
            codigo,
            nome,
            preco,
            quantidade: 1,
            desconto: 0
        });
    }

    select.value = '';
    renderOrcamentoItens();
    calcularTotalOrcamento();
}

function removerProdutoOrcamento(index) {
    orcamentoItensTemp.splice(index, 1);
    renderOrcamentoItens();
    calcularTotalOrcamento();
}

function renderOrcamentoItens() {
    const tbody = document.getElementById('orcItens');
    if (!tbody) return;

    if (orcamentoItensTemp.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-message">Nenhum produto adicionado</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    orcamentoItensTemp.forEach((item, index) => {
        const embalagem = item.embalagem || 'UN';
        const subtotal = (item.preco * item.quantidade) - (item.desconto || 0);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.codigo}</td>
            <td>${item.nome}</td>
            <td>
                <select onchange="updateProdutoOrcamento(${index}, 'embalagem', this.value)">
                    <option value="UN" ${embalagem === 'UN' ? 'selected' : ''}>UN</option>
                    <option value="PC" ${embalagem === 'PC' ? 'selected' : ''}>PC</option>
                    <option value="CX" ${embalagem === 'CX' ? 'selected' : ''}>CX</option>
                </select>
            </td>
            <td>
                <input type="number" value="${item.quantidade}" min="1"
                    onchange="updateProdutoOrcamento(${index}, 'quantidade', this.value)" style="width: 70px;">
            </td>
            <td>
                <input type="number" value="${item.preco}" min="0" step="0.01"
                    onchange="updateProdutoOrcamento(${index}, 'preco', this.value)" style="width: 100px;">
            </td>
            <td>
                <input type="number" value="${item.desconto || 0}" min="0" step="0.01"
                    onchange="updateProdutoOrcamento(${index}, 'desconto', this.value)" style="width: 80px;">
            </td>
            <td>${formatCurrency(subtotal)}</td>
            <td>
                <button type="button" class="action-btn delete" onclick="removerProdutoOrcamento(${index})">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateProdutoOrcamento(index, campo, valor) {
    if (campo === 'quantidade' || campo === 'preco' || campo === 'desconto') {
        orcamentoItensTemp[index][campo] = parseFloat(valor) || 0;
    } else {
        orcamentoItensTemp[index][campo] = valor;
    }
    renderOrcamentoItens();
    calcularTotalOrcamento();
}

function calcularTotalOrcamento() {
    let subtotal = 0;
    orcamentoItensTemp.forEach(item => {
        subtotal += (item.preco * item.quantidade) - (item.desconto || 0);
    });

    const desconto = parseFloat(document.getElementById('orcDesconto')?.value || 0);
    const total = subtotal - desconto;

    const subtotalEl = document.getElementById('orcSubtotal');
    const totalEl = document.getElementById('orcTotal');

    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (totalEl) totalEl.textContent = formatCurrency(total);
}

async function registrarOrcamento() {
    const user = auth.currentUser;
    if (!user) return;

    const clienteSelect = document.getElementById('orcCliente');
    const dataEl = document.getElementById('orcData');
    const validadeEl = document.getElementById('orcValidade');

    if (!clienteSelect.value || !dataEl.value || !validadeEl.value) {
        showToast('Preencha todos os campos obrigatórios', 'warning');
        return;
    }

    if (orcamentoItensTemp.length === 0) {
        showToast('Adicione pelo menos um produto', 'warning');
        return;
    }

    try {
        const option = clienteSelect.options[clienteSelect.selectedIndex];
        const clienteNome = option.textContent;
        const clienteId = clienteSelect.value;

        let subtotal = 0;
        orcamentoItensTemp.forEach(item => {
            subtotal += (item.preco * item.quantidade) - (item.desconto || 0);
        });

        const desconto = parseFloat(document.getElementById('orcDesconto')?.value || 0);
        const total = subtotal - desconto;
        const codigo = generateCode('ORC');

        // Data de expiração
        const dataValidade = new Date(dataEl.value);
        dataValidade.setDate(dataValidade.getDate() + parseInt(validadeEl.value));
        const dataValidadeStr = dataValidade.toISOString().split('T')[0];

        await addDoc(collection(db, 'users', user.uid, 'quotations'), {
            codigo,
            client_id: clienteId,
            client_name: clienteNome,
            items: orcamentoItensTemp,
            subtotal,
            desconto,
            total,
            data: dataEl.value,
            data_validade: dataValidadeStr,
            observacoes: document.getElementById('orcObservacoes')?.value || '',
            status: 'pending',
            created_at: new Date().toISOString()
        });

        showToast('Orçamento registrado com sucesso!', 'success');

        // Limpar formulário
        document.getElementById('orcamentoForm')?.reset();
        orcamentoItensTemp = [];
        renderOrcamentoItens();
        calcularTotalOrcamento();

    } catch (error) {
        console.error('Erro ao registrar orçamento:', error);
        showToast('Erro ao registrar orçamento', 'error');
    }
}

async function loadOrcamentos() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await getDocs(
            query(collection(db, 'users', user.uid, 'quotations'), orderBy('data', 'desc'))
        );

        const tbody = document.getElementById('orcamentosTable');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-message">Nenhum orçamento registrado</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const orc = doc.data();
            const statusClass = orc.status === 'approved' ? 'status-completed' :
                orc.status === 'rejected' ? 'status-cancelled' : 'status-pending';
            const statusLabel = orc.status === 'approved' ? 'Aprovado' :
                orc.status === 'rejected' ? 'Rejeitado' : 'Pendente';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${orc.codigo}</td>
                <td>${orc.client_name}</td>
                <td>${formatCurrency(orc.total)}</td>
                <td>${formatDate(orc.data)}</td>
                <td>${formatDate(orc.data_validade)}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button class="action-btn edit" onclick="openOrcDetalhes('${doc.id}')">👁️</button>
                    <button class="action-btn delete" onclick="deletarOrcamento('${doc.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar orçamentos:', error);
        showToast('Erro ao carregar orçamentos', 'error');
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage.includes('vendas-nova')) {
        loadVendaClientes();
        loadVendaProdutos();
        document.getElementById('btnAdicionarProduto')?.addEventListener('click', adicionarProdutoVenda);
        document.getElementById('vendaForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            registrarVenda();
        });
        document.getElementById('btnLimpar')?.addEventListener('click', () => {
            vendaItensTemp = [];
            document.getElementById('vendaForm').reset();
            renderVendaItens();
            calcularTotalVenda();
        });
        document.getElementById('vendaDesconto')?.addEventListener('change', calcularTotalVenda);
        document.getElementById('vendaFrete')?.addEventListener('change', calcularTotalVenda);
    } else if (currentPage.includes('vendas-historico')) {
        loadSalesHistory();
        document.getElementById('searchInput')?.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            document.querySelectorAll('#vendasTable tr').forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(searchTerm) ? '' : 'none';
            });
        });
    } else if (currentPage.includes('vendas-orcamento')) {
        loadOrcClientes();
        loadOrcProdutos();
        loadOrcamentos();
        document.getElementById('btnAdicionarProduto')?.addEventListener('click', adicionarProdutoOrcamento);
        document.getElementById('orcamentoForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            registrarOrcamento();
        });
        document.getElementById('btnLimpar')?.addEventListener('click', () => {
            orcamentoItensTemp = [];
            document.getElementById('orcamentoForm').reset();
            renderOrcamentoItens();
            calcularTotalOrcamento();
        });
        document.getElementById('orcDesconto')?.addEventListener('change', calcularTotalOrcamento);
    }

    // Modal close handlers
    document.querySelectorAll('[id*="close"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
});
