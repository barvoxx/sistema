# BARVOX - Sistema de Gestão Empresarial

Sistema web completo para gestão de vendas, compras, estoque, financeiro e relatórios.

## 🚀 Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Python (para automação)
- **Banco de Dados**: Firebase Firestore
- **Hosting**: GitHub Pages
- **Autenticação**: Firebase Authentication

## 📁 Estrutura do Projeto

Todos os arquivos estão na raiz para facilitar hospedagem no GitHub Pages:

```
BARVOX/
├── index.html                 # Página de login
├── dashboard.html             # Dashboard principal
├── cadastro-clientes.html     # Cadastro de clientes
├── cadastro-fornecedores.html # Cadastro de fornecedores
├── cadastro-produtos.html     # Cadastro de produtos
├── compras-pedidos.html       # Pedidos de compra
├── compras-custos.html        # Tabela de custos
├── compras-estoque.html       # Gerenciamento de estoque
├── financeiro-pagar.html      # Contas a pagar
├── financeiro-receber.html    # Contas a receber
├── vendas-nova.html           # Nova venda
├── vendas-historico.html      # Histórico de vendas
├── vendas-orcamento.html      # Orçamento para cliente
├── relatorios.html            # Página de relatórios
├── style-login.css            # Estilos da tela de login
├── style-dashboard.css        # Estilos do dashboard
├── style-global.css           # Estilos globais
├── firebase-config.js         # Configuração do Firebase
├── auth.js                    # Funções de autenticação
├── login.js                   # Logic da tela de login
├── dashboard.js               # Logic do dashboard
├── compras.js                 # Logic do módulo de compras
├── financeiro.js              # Logic do módulo financeiro
├── vendas.js                  # Logic do módulo de vendas
├── relatorios.js              # Logic do módulo de relatórios
├── utils.js                   # Funções auxiliares
├── menu-lateral.html          # Menu lateral (compartilhado)
└── README.md
```

## 📋 Módulos do Sistema

### 1. **Autenticação**
- Login com usuário e senha
- Cadastro de novos usuários
- Recuperação de senha

### 2. **Dashboard**
- Gráficos de receitas, custos, margens
- Fluxo de caixa em tempo real
- KPIs principais

### 3. **Compras**
- Cadastro de clientes
- Cadastro de fornecedores
- Cadastro de produtos (com importação Excel)
- Tabela de custos
- Gerenciamento de estoque
- Pedidos de compra

### 4. **Financeiro**
- Contas a pagar
- Contas pagas
- Contas a receber
- Contas recebidas

### 5. **Vendas**
- Nova venda
- Geração de notas
- Histórico de vendas
- Orçamento (PDF)

### 6. **Relatórios**
- Exportação para PDF
- Exportação para Excel

## 🔧 Configuração Inicial

### 1. Preparar o Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto
3. Ative **Authentication** → Método de login: Email/Password
4. Crie um banco de dados **Firestore** em modo de desenvolvimento
5. Copie suas credenciais (clique em "Configurações do Projeto")

### 2. Configurar credenciais no projeto

Edite o arquivo `firebase-config.js` e substitua pelos seus valores:

```javascript
const firebaseConfig = {
    apiKey: "sua_api_key",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "seu-messaging-sender-id",
    appId: "seu-app-id"
};
```

### 3. Hospedar no GitHub Pages

1. Crie um repositório no GitHub chamado `BARVOX`
2. Faça push dos arquivos
3. Vá para **Settings** → **Pages**
4. Selecione **Source**: `main branch`
5. Seu site estará em: `https://seuusuario.github.io/BARVOX/`

### 4. Testando localmente

Abra o arquivo `index.html` no navegador ou use um servidor local:

```bash
# Com Python 3
python -m http.server 8000
```

## 📝 Notas de Desenvolvimento

- Dados separados por usuário no Firestore
- IDs automáticos para produtos, clientes, fornecedores
- Estoque atualizado automaticamente
- Integração com Firebase em tempo real
- Estrutura plana facilita hospedagem em GitHub Pages
- Menu lateral compartilhado entre todas as páginas
- Responsivo para desktop, tablet e mobile
