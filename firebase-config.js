// ============================================
// CONFIGURAÇÃO DO FIREBASE - BARVOX
// ============================================
// IMPORTANTE: Substitua os valores abaixo com suas credenciais reais do Firebase

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyCSY5_utLe785zRdsANqMnuRquhaz3hgrI",
    authDomain: "barvoxjmejoaopedro.firebaseapp.com",
    projectId: "barvoxjmejoaopedro",
    storageBucket: "barvoxjmejoaopedro.firebasestorage.app",
    messagingSenderId: "261901255620",
    appId: "1:261901255620:web:9316fa1b05523c36609a91",
    measurementId: "G-EZWDJ13SE1"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Referências dos serviços
const auth = getAuth(app);
const db = getFirestore(app);

// Configuração de usuário autenticado
let currentUser = null;

// Listener para mudanças de autenticação
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        console.log('Usuário autenticado:', user.email);
    } else {
        console.log('Nenhum usuário autenticado');
    }
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Obter usuário autenticado
function getCurrentUser() {
    return auth.currentUser || currentUser;
}

// Verificar se usuário está autenticado
function isUserAuthenticated() {
    return !!(auth.currentUser || currentUser);
}

// Obter UID do usuário
function getUserUID() {
    const user = auth.currentUser || currentUser;
    return user ? user.uid : null;
}

// Obter email do usuário
function getUserEmail() {
    const user = auth.currentUser || currentUser;
    return user ? user.email : null;
}

// Exportar para uso em outros módulos
export { 
    auth, 
    db, 
    getCurrentUser, 
    isUserAuthenticated, 
    getUserUID, 
    getUserEmail,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit
};

// ============================================
// ESTRUTURA DO FIRESTORE
// ============================================
/*
Coleções no Firestore:

users/ - Dados dos usuários
├── {uid}/
│   ├── username: string
│   ├── email: string
│   ├── phone: string
│   ├── createdAt: timestamp
│   └── company_name: string (opcional)

clients/ - Clientes (separado por usuário)
├── {uid}/
│   ├── {clientId}/
│   │   ├── name: string
│   │   ├── cpf_cnpj: string
│   │   ├── address: object
│   │   ├── phone: string
│   │   ├── email: string (opcional)
│   │   ├── code: string (gerado automaticamente)
│   │   └── createdAt: timestamp

suppliers/ - Fornecedores (separado por usuário)
├── {uid}/
│   ├── {supplierId}/
│   │   ├── name: string
│   │   ├── cpf_cnpj: string
│   │   ├── state_registration: string
│   │   ├── address: object
│   │   ├── phone: string
│   │   ├── email: string
│   │   ├── code: string
│   │   └── createdAt: timestamp

products/ - Produtos (separado por usuário)
├── {uid}/
│   ├── {productId}/
│   │   ├── name: string
│   │   ├── code: string
│   │   ├── ncm: string
│   │   ├── ipi: number
│   │   ├── packaging: array (PC, UN, CX)
│   │   ├── supplier_id: array
│   │   ├── reference: string
│   │   ├── stock: number
│   │   ├── stock_cost: number
│   │   └── createdAt: timestamp

purchases/ - Pedidos de compra
├── {uid}/
│   ├── {purchaseId}/
│   │   ├── code: string
│   │   ├── supplier_id: string
│   │   ├── payment_type: string
│   │   ├── purchase_date: timestamp
│   │   ├── items: array
│   │   ├── total_discount: number
│   │   ├── freight: number
│   │   ├── total_value: number
│   │   ├── status: string (pending, paid, cancelled)
│   │   └── createdAt: timestamp

sales/ - Vendas
├── {uid}/
│   ├── {saleId}/
│   │   ├── code: string
│   │   ├── client_id: string
│   │   ├── items: array
│   │   ├── total_discount: number
│   │   ├── freight: number
│   │   ├── payment_method: string
│   │   ├── total_value: number
│   │   ├── status: string (pending, paid, cancelled)
│   │   ├── invoice_number: string (opcional)
│   │   └── createdAt: timestamp

accounts_payable/ - Contas a pagar
├── {uid}/
│   ├── {accountId}/
│   │   ├── purchase_id: string
│   │   ├── supplier_id: string
│   │   ├── total_value: number
│   │   ├── paid_value: number
│   │   ├── remaining_value: number
│   │   ├── due_date: timestamp
│   │   ├── status: string (pending, paid, overdue)
│   │   └── createdAt: timestamp

accounts_receivable/ - Contas a receber
├── {uid}/
│   ├── {accountId}/
│   │   ├── sale_id: string
│   │   ├── client_id: string
│   │   ├── total_value: number
│   │   ├── received_value: number
│   │   ├── remaining_value: number
│   │   ├── due_date: timestamp
│   │   ├── status: string (pending, received, overdue)
│   │   └── createdAt: timestamp

quotations/ - Orçamentos
├── {uid}/
│   ├── {quotationId}/
│   │   ├── code: string
│   │   ├── client_id: string
│   │   ├── items: array
│   │   ├── total_value: number
│   │   ├── status: string (pending, approved, rejected, expired)
│   │   └── createdAt: timestamp
*/
