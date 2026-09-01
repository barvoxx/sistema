/**
 * BARVOX - Compras Module
 * Handles clients, suppliers, products, costs, stock, orders, and pricing
 */

import { db, auth, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, query, where, orderBy } from './firebase-config.js';
import { formatCPFCNPJ, showToast, generateCode } from './utils.js';

// ============================================
// IMPORTAR EXCEL
// ============================================

async function importarProdutosExcel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());
            
            // Se for CSV
            let produtos = [];
            
            if (file.name.endsWith('.csv')) {
                produtos = processarCSV(text);
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                // Para Excel, precisamos da biblioteca XLSX
                // Se não tiver, converter para CSV manualmente
                showToast('Por favor, exporte o arquivo como CSV para importar', 'warning');
                return;
            } else {
                showToast('Formato não suportado. Use CSV ou Excel', 'error');
                return;
            }

            if (produtos.length === 0) {
                showToast('Nenhum produto encontrado no arquivo', 'warning');
                return;
            }

            // Confirmar importação
            if (!confirm(`Deseja importar ${produtos.length} produtos?`)) return;

            const user = auth.currentUser;
            if (!user) {
                showToast('Usuário não autenticado', 'error');
                return;
            }

            let successCount = 0;
            let errorCount = 0;

            for (const produto of produtos) {
                try {
                    const dados = {
                        codigo: produto.codigo || generateCode('PRD'),
                        name: produto.nome || produto.name || '',
                        ncm: produto.ncm || '',
                        ipi: parseFloat(produto.ipi) || 0,
                        referencia: produto.referencia || '',
                        estoque_atual: parseFloat(produto.estoque || 0) || 0,
                        suppliers: produto.fornecedores ? produto.fornecedores.split(';').map(f => f.trim()) : [],
                        packaging_pc: parseInt(produto.packaging_pc) || 0,
                        packaging_un: parseInt(produto.packaging_un) || 0,
                        packaging_cx: parseInt(produto.packaging_cx) || 0,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    await addDoc(collection(db, 'users', user.uid, 'products'), dados);
                    
                    successCount++;
                } catch (error) {
                    console.error('Erro ao importar produto:', error);
                    errorCount++;
                }
            }

            showToast(`Importação concluída: ${successCount} sucesso, ${errorCount} erros`, 'success');
            loadProdutos();

        } catch (error) {
            console.error('Erro ao processar arquivo:', error);
            showToast('Erro ao processar arquivo', 'error');
        }
    };
    
    input.click();
}

function processarCSV(texto) {
    const linhas = texto.split('\n').filter(l => l.trim());
    if (linhas.length < 2) return [];

    const headers = linhas[0].toLowerCase().split(',').map(h => h.trim());
    const produtos = [];

    for (let i = 1; i < linhas.length; i++) {
        const valores = linhas[i].split(',');
        if (valores.length < 2) continue;

        const produto = {};
        headers.forEach((header, index) => {
            produto[header.replace(/"/g, '')] = valores[index]?.trim().replace(/"/g, '') || '';
        });

        if (produto.nome || produto.name) {
            produtos.push(produto);
        }
    }

    return produtos;
}

// ============================================
// CADASTRO DE CLIENTES - CADASTRO-CLIENTES.HTML
// ============================================

async function loadClientes() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await getDocs(
            query(collection(db, 'users', user.uid, 'clients'), orderBy('name'))
        );

        const tbody = document.getElementById('clientesTable') || document.getElementById('tabelaClientes');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-message">Nenhum cliente registrado</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const cliente = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cliente.codigo}</td>
                <td>${cliente.name}</td>
                <td>${formatCPFCNPJ(cliente.cpf_cnpj || '')}</td>
                <td>${cliente.city || '-'}</td>
                <td>${cliente.phone || '-'}</td>
                <td>${cliente.email || '-'}</td>
                <td>
                    <button class="action-btn edit" onclick="openClienteModal('${doc.id}', true)">✏️</button>
                    <button class="action-btn delete" onclick="deletarCliente('${doc.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        showToast('Erro ao carregar clientes', 'error');
    }
}

async function openClienteModal(clienteId = null, edit = false) {
    const modal = document.getElementById('clienteModal');
    if (!modal) {
        showToast('Modal não encontrada', 'error');
        return;
    }

    const form = document.getElementById('clienteForm');
    if (!form) {
        showToast('Formulário não encontrado', 'error');
        return;
    }

    // Limpar formulário
    form.reset();

    if (edit && clienteId) {
        const user = auth.currentUser;
        const docSnap = await getDoc(doc(db, 'users', user.uid, 'clients', clienteId));

        if (docSnap.exists()) {
            const cliente = docSnap.data();
            document.getElementById('clienteNome').value = cliente.name || '';
            document.getElementById('clienteCPFCNPJ').value = cliente.cpf_cnpj || '';
            document.getElementById('clienteCEP').value = cliente.cep || '';
            document.getElementById('clienteCidade').value = cliente.city || '';
            document.getElementById('clienteBairro').value = cliente.neighborhood || '';
            document.getElementById('clienteRua').value = cliente.street || '';
            document.getElementById('clienteNumero').value = cliente.number || '';
            document.getElementById('clienteTelefone').value = cliente.phone || '';
            document.getElementById('clienteEmail').value = cliente.email || '';

            document.getElementById('clienteModalTitle').textContent = 'Editar Cliente';

            form.onsubmit = async (e) => {
                e.preventDefault();
                await salvarCliente(clienteId);
            };
        }
    } else {
        document.getElementById('clienteModalTitle').textContent = 'Novo Cliente';
        form.onsubmit = async (e) => {
            e.preventDefault();
            await salvarCliente();
        };
    }

    modal.style.display = 'flex';
}



async function salvarCliente(clienteId = null) {
    const user = auth.currentUser;
    if (!user) return;

    const dados = {
        name: document.getElementById('clienteNome').value,
        cpf_cnpj: document.getElementById('clienteCPFCNPJ').value,
        cep: document.getElementById('clienteCEP').value,
        city: document.getElementById('clienteCidade').value,
        neighborhood: document.getElementById('clienteBairro').value,
        street: document.getElementById('clienteRua').value,
        number: document.getElementById('clienteNumero').value,
        phone: document.getElementById('clienteTelefone').value,
        email: document.getElementById('clienteEmail').value,
        updated_at: new Date().toISOString()
    };

    try {
        if (clienteId) {
            await updateDoc(doc(db, 'users', user.uid, 'clients', clienteId), dados);
            showToast('Cliente atualizado com sucesso', 'success');
        } else {
            dados.codigo = generateCode('CLI');
            dados.created_at = new Date().toISOString();
            await addDoc(collection(db, 'users', user.uid, 'clients'), dados);
            showToast('Cliente criado com sucesso', 'success');
        }

        document.getElementById('clienteModal').style.display = 'none';
        loadClientes();
    } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        showToast('Erro ao salvar cliente: ' + error.message, 'error');
    }
}

async function deletarCliente(clienteId) {
    if (!confirm('Tem certeza que deseja deletar este cliente?')) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
        await deleteDoc(doc(db, 'users', user.uid, 'clients', clienteId));

        showToast('Cliente deletado com sucesso', 'success');
        loadClientes();
    } catch (error) {
        console.error('Erro ao deletar cliente:', error);
        showToast('Erro ao deletar cliente', 'error');
    }
}

// ============================================
// CADASTRO DE FORNECEDORES - CADASTRO-FORNECEDORES.HTML
// ============================================

async function loadFornecedores() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await getDocs(
            query(collection(db, 'users', user.uid, 'suppliers'), orderBy('name'))
        );

        const tbody = document.getElementById('fornecedoresTable') || document.getElementById('tabelaFornecedores');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-message">Nenhum fornecedor registrado</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const fornecedor = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${fornecedor.codigo}</td>
                <td>${fornecedor.name}</td>
                <td>${formatCPFCNPJ(fornecedor.cpf_cnpj || '')}</td>
                <td>${fornecedor.city || '-'}</td>
                <td>${fornecedor.phone || '-'}</td>
                <td>${fornecedor.email || '-'}</td>
                <td>
                    <button class="action-btn edit" onclick="openFornecedorModal('${doc.id}', true)">✏️</button>
                    <button class="action-btn delete" onclick="deletarFornecedor('${doc.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
        showToast('Erro ao carregar fornecedores', 'error');
    }
}

async function openFornecedorModal(fornecedorId = null, edit = false) {
    const modal = document.getElementById('fornecedorModal');
    if (!modal) {
        showToast('Modal não encontrada', 'error');
        return;
    }

    const form = document.getElementById('fornecedorForm');
    if (!form) {
        showToast('Formulário não encontrado', 'error');
        return;
    }

    // Limpar formulário
    form.reset();

    if (edit && fornecedorId) {
        const user = auth.currentUser;
        const docSnap = await getDoc(doc(db, 'users', user.uid, 'suppliers', fornecedorId));

        if (docSnap.exists()) {
            const fornecedor = docSnap.data();
            document.getElementById('fornecedorNome').value = fornecedor.name || '';
            document.getElementById('fornecedorCPFCNPJ').value = fornecedor.cpf_cnpj || '';
            document.getElementById('fornecedorIE').value = fornecedor.state_registration || '';
            document.getElementById('fornecedorCEP').value = fornecedor.cep || '';
            document.getElementById('fornecedorCidade').value = fornecedor.city || '';
            document.getElementById('fornecedorBairro').value = fornecedor.neighborhood || '';
            document.getElementById('fornecedorRua').value = fornecedor.street || '';
            document.getElementById('fornecedorNumero').value = fornecedor.number || '';
            document.getElementById('fornecedorTelefone').value = fornecedor.phone || '';
            document.getElementById('fornecedorEmail').value = fornecedor.email || '';

            document.getElementById('fornecedorModalTitle').textContent = 'Editar Fornecedor';

            form.onsubmit = async (e) => {
                e.preventDefault();
                await salvarFornecedor(fornecedorId);
            };
        }
    } else {
        document.getElementById('fornecedorModalTitle').textContent = 'Novo Fornecedor';
        form.onsubmit = async (e) => {
            e.preventDefault();
            await salvarFornecedor();
        };
    }

    modal.style.display = 'flex';
}


async function salvarFornecedor(fornecedorId = null) {
    const user = auth.currentUser;
    if (!user) return;

    const dados = {
        name: document.getElementById('fornecedorNome').value,
        cpf_cnpj: document.getElementById('fornecedorCPFCNPJ').value,
        state_registration: document.getElementById('fornecedorIE').value,
        cep: document.getElementById('fornecedorCEP').value,
        city: document.getElementById('fornecedorCidade').value,
        neighborhood: document.getElementById('fornecedorBairro').value,
        street: document.getElementById('fornecedorRua').value,
        number: document.getElementById('fornecedorNumero').value,
        phone: document.getElementById('fornecedorTelefone').value,
        email: document.getElementById('fornecedorEmail').value,
        updated_at: new Date().toISOString()
    };

    try {
        if (fornecedorId) {
            await updateDoc(doc(db, 'users', user.uid, 'suppliers', fornecedorId), dados);
            showToast('Fornecedor atualizado com sucesso', 'success');
        } else {
            dados.codigo = generateCode('FOR');
            dados.created_at = new Date().toISOString();
            await addDoc(collection(db, 'users', user.uid, 'suppliers'), dados);
            showToast('Fornecedor criado com sucesso', 'success');
        }

        document.getElementById('fornecedorModal').style.display = 'none';
        loadFornecedores();
    } catch (error) {
        console.error('Erro ao salvar fornecedor:', error);
        showToast('Erro ao salvar fornecedor: ' + error.message, 'error');
    }
}

async function deletarFornecedor(fornecedorId) {
    if (!confirm('Tem certeza que deseja deletar este fornecedor?')) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
        await deleteDoc(doc(db, 'users', user.uid, 'suppliers', fornecedorId));

        showToast('Fornecedor deletado com sucesso', 'success');
        loadFornecedores();
    } catch (error) {
        console.error('Erro ao deletar fornecedor:', error);
        showToast('Erro ao deletar fornecedor', 'error');
    }
}

// ============================================
// CADASTRO DE PRODUTOS - CADASTRO-PRODUTOS.HTML
// ============================================

async function loadProdutos() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await getDocs(
            query(collection(db, 'users', user.uid, 'products'), orderBy('name'))
        );

        const tbody = document.getElementById('produtosTable') || document.getElementById('tabelaProdutos');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-message">Nenhum produto registrado</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const produto = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${produto.codigo}</td>
                <td>${produto.name}</td>
                <td>${produto.ncm || '-'}</td>
                <td>${produto.suppliers?.join(', ') || '-'}</td>
                <td>${produto.estoque_atual || 0}</td>
                <td>${produto.packaging || 'UN'}</td>
                <td>
                    <button class="action-btn edit" onclick="openProdutoModal('${doc.id}', true)">✏️</button>
                    <button class="action-btn delete" onclick="deletarProduto('${doc.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showToast('Erro ao carregar produtos', 'error');
    }
}

async function openProdutoModal(produtoId = null, edit = false) {
    const user = auth.currentUser;
    if (!user) return;

    const modal = document.getElementById('produtoModal');
    const form = document.getElementById('produtoForm');
    
    if (!modal || !form) {
        showToast('Modal ou formulário não encontrado', 'error');
        return;
    }

    // Carregar fornecedores
    const snapshot = await getDocs(collection(db, 'users', user.uid, 'suppliers'));

    const select = document.getElementById('produtoFornecedor');
    select.innerHTML = '';
    
    snapshot.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = doc.data().name;
        select.appendChild(option);
    });

    // Limpar formulário
    form.reset();
    document.getElementById('produtoModalTitle').textContent = 'Novo Produto';

    if (edit && produtoId) {
        const docSnap = await getDoc(doc(db, 'users', user.uid, 'products', produtoId));

        if (docSnap.exists()) {
            const produto = docSnap.data();
            document.getElementById('produtoNome').value = produto.name || '';
            document.getElementById('produtoNCM').value = produto.ncm || '';
            document.getElementById('produtoIPI').value = produto.ipi || '';
            document.getElementById('produtoReferencia').value = produto.referencia || '';
            document.getElementById('produtoEstoque').value = produto.estoque_atual || 0;

            // Marcar fornecedores selecionados
            if (produto.suppliers && produto.suppliers.length > 0) {
                Array.from(select.options).forEach(option => {
                    option.selected = produto.suppliers.includes(option.value);
                });
            }

            // Marcar embalagens
            if (produto.packaging_pc) {
                document.getElementById('embPC').checked = true;
                document.getElementById('embPCQtd').value = produto.packaging_pc;
            }
            if (produto.packaging_un) {
                document.getElementById('embUN').checked = true;
                document.getElementById('embUNQtd').value = produto.packaging_un;
            }
            if (produto.packaging_cx) {
                document.getElementById('embCX').checked = true;
                document.getElementById('embCXQtd').value = produto.packaging_cx;
            }

            document.getElementById('produtoModalTitle').textContent = 'Editar Produto';

            form.onsubmit = async (e) => {
                e.preventDefault();
                await salvarProduto(produtoId);
            };
        }
    } else {
        form.onsubmit = async (e) => {
            e.preventDefault();
            await salvarProduto();
        };
    }

    modal.style.display = 'flex';
}

async function salvarProduto(produtoId = null) {
    const user = auth.currentUser;
    if (!user) return;

    const fornecedores = Array.from(document.getElementById('produtoFornecedor').selectedOptions).map(opt => opt.value);

    const dados = {
        name: document.getElementById('produtoNome').value,
        ncm: document.getElementById('produtoNCM').value || '',
        ipi: parseFloat(document.getElementById('produtoIPI').value) || 0,
        referencia: document.getElementById('produtoReferencia').value || '',
        estoque_atual: parseFloat(document.getElementById('produtoEstoque').value) || 0,
        suppliers: fornecedores,
        packaging_pc: document.getElementById('embPC').checked ? parseInt(document.getElementById('embPCQtd').value) || 0 : 0,
        packaging_un: document.getElementById('embUN').checked ? parseInt(document.getElementById('embUNQtd').value) || 0 : 0,
        packaging_cx: document.getElementById('embCX').checked ? parseInt(document.getElementById('embCXQtd').value) || 0 : 0,
        updated_at: new Date().toISOString()
    };

    try {
        if (produtoId) {
            await updateDoc(doc(db, 'users', user.uid, 'products', produtoId), dados);
            showToast('Produto atualizado com sucesso', 'success');
        } else {
            dados.codigo = generateCode('PRD');
            dados.created_at = new Date().toISOString();
            await addDoc(collection(db, 'users', user.uid, 'products'), dados);
            showToast('Produto criado com sucesso', 'success');
        }

        document.getElementById('produtoModal').style.display = 'none';
        loadProdutos();
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        showToast('Erro ao salvar produto: ' + error.message, 'error');
    }
}

async function deletarProduto(produtoId) {
    if (!confirm('Tem certeza que deseja deletar este produto?')) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
        await deleteDoc(doc(db, 'users', user.uid, 'products', produtoId));

        showToast('Produto deletado com sucesso', 'success');
        loadProdutos();
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        showToast('Erro ao deletar produto', 'error');
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage.includes('cadastro-clientes')) {
        loadClientes();
        document.getElementById('btnNovoCliente')?.addEventListener('click', () => openClienteModal());
        document.getElementById('closeClienteModal')?.addEventListener('click', () => {
            document.getElementById('clienteModal').style.display = 'none';
        });
        document.getElementById('cancelClienteBtn')?.addEventListener('click', () => {
            document.getElementById('clienteModal').style.display = 'none';
        });
    } else if (currentPage.includes('cadastro-fornecedores')) {
        loadFornecedores();
        document.getElementById('btnNovoFornecedor')?.addEventListener('click', () => openFornecedorModal());
        document.getElementById('closeFornecedorModal')?.addEventListener('click', () => {
            document.getElementById('fornecedorModal').style.display = 'none';
        });
        document.getElementById('cancelFornecedorBtn')?.addEventListener('click', () => {
            document.getElementById('fornecedorModal').style.display = 'none';
        });
    } else if (currentPage.includes('cadastro-produtos')) {
        loadProdutos();
        document.getElementById('btnNovoProduto')?.addEventListener('click', () => openProdutoModal());
        document.getElementById('btnImportarExcel')?.addEventListener('click', () => importarProdutosExcel());
        document.getElementById('closeProdutoModal')?.addEventListener('click', () => {
            document.getElementById('produtoModal').style.display = 'none';
        });
        document.getElementById('cancelProdutoBtn')?.addEventListener('click', () => {
            document.getElementById('produtoModal').style.display = 'none';
        });
    }

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            document.querySelectorAll('table tbody tr').forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(searchTerm) ? '' : 'none';
            });
        });
    }

    // Fechar modal clicando fora dela
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
});
