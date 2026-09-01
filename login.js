// ============================================
// LOGIC DE LOGIN E CADASTRO - BARVOX
// ============================================

import { registerUser, loginUser } from './auth.js';
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const messageBox = document.getElementById('message');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // ============================================
    // TROCA DE ABAS
    // ============================================

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');

            // Remove classe active de todas as abas
            tabContents.forEach(content => {
                content.classList.remove('active');
            });

            tabBtns.forEach(b => {
                b.classList.remove('active');
            });

            // Adiciona classe active à aba selecionada
            document.getElementById(tabName).classList.add('active');
            btn.classList.add('active');

            // Limpar mensagens
            hideMessage();
        });
    });

    // ============================================
    // FORMULÁRIO DE LOGIN
    // ============================================

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            showMessage('Por favor, preencha todos os campos', 'error');
            return;
        }

        // Desabilitar botão
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Entrando...';

        // Fazer login
        const result = await loginUser(username, password);

        if (result.success) {
            showMessage('Login realizado com sucesso!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showMessage(result.message, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Entrar';
        }
    });

    // ============================================
    // FORMULÁRIO DE CADASTRO
    // ============================================

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const password2 = document.getElementById('regPassword2').value;
        const phone = document.getElementById('regPhone').value.trim();

        // Validações
        if (!username || !email || !password || !password2 || !phone) {
            showMessage('Por favor, preencha todos os campos', 'error');
            return;
        }

        if (password !== password2) {
            showMessage('As senhas não correspondem', 'error');
            return;
        }

        // Desabilitar botão
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Criando conta...';

        // Registrar usuário
        const result = await registerUser(username, email, password, phone);

        if (result.success) {
            showMessage('Conta criada com sucesso! Redirecionando...', 'success');
            
            // Limpar formulário
            registerForm.reset();

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showMessage(result.message, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Criar Conta';
        }
    });

    // ============================================
    // FUNÇÕES AUXILIARES
    // ============================================

    function showMessage(text, type = 'info') {
        messageBox.textContent = text;
        messageBox.className = `message show ${type}`;
    }

    function hideMessage() {
        messageBox.classList.remove('show');
    }
});

// ============================================
// VERIFICAÇÃO DE USUARIO LOGADO
// ============================================

// Se o usuário já está logado, redirecionar para dashboard
onAuthStateChanged(auth, (user) => {
    if (user && (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/'))) {
        window.location.href = 'dashboard.html';
    }
});
