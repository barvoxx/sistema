// ============================================
// FUNÇÕES AUXILIARES - BARVOX
// ============================================

// ============================================
// FORMATAÇÃO DE DADOS
// ============================================

// Formatar moeda
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Formatar data
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR');
}

// Formatar data e hora
function formatDateTime(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('pt-BR');
}

// Formatar CPF/CNPJ
function formatCPFCNPJ(value) {
    if (!value) return '';
    value = value.replace(/\D/g, '');
    
    if (value.length === 11) {
        // CPF
        return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (value.length === 14) {
        // CNPJ
        return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return value;
}

// Formatar telefone
function formatPhone(value) {
    if (!value) return '';
    value = value.replace(/\D/g, '');
    
    if (value.length === 11) {
        return value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (value.length === 10) {
        return value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    return value;
}

// Formatar CEP
function formatCEP(value) {
    if (!value) return '';
    value = value.replace(/\D/g, '');
    return value.replace(/(\d{5})(\d{3})/, '$1-$2');
}

// ============================================
// VALIDAÇÕES
// ============================================

// Validar CPF
function isValidCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }
    
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    
    if (remainder === 10 || remainder === 11) {
        remainder = 0;
    }
    
    if (remainder !== parseInt(cpf.substring(9, 10))) {
        return false;
    }
    
    sum = 0;
    
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    
    remainder = (sum * 10) % 11;
    
    if (remainder === 10 || remainder === 11) {
        remainder = 0;
    }
    
    if (remainder !== parseInt(cpf.substring(10, 11))) {
        return false;
    }
    
    return true;
}

// Validar CNPJ
function isValidCNPJ(cnpj) {
    cnpj = cnpj.replace(/\D/g, '');
    
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
        return false;
    }
    
    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    let digits = cnpj.substring(size);
    
    let sum = 0;
    let pos = size - 7;
    
    for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--;
        if (pos < 2) {
            pos = 9;
        }
    }
    
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    
    if (result !== parseInt(digits.charAt(0))) {
        return false;
    }
    
    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;
    
    for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--;
        if (pos < 2) {
            pos = 9;
        }
    }
    
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    
    if (result !== parseInt(digits.charAt(1))) {
        return false;
    }
    
    return true;
}

// ============================================
// GERAÇÃO DE IDs
// ============================================

// Gerar código único
function generateCode(prefix = '') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

// Gerar ID curto
function generateShortId() {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
}

// ============================================
// MANIPULAÇÃO DE ARRAYS E OBJETOS
// ============================================

// Remover duplicatas
function removeDuplicates(array, key) {
    if (!key) {
        return [...new Set(array)];
    }
    
    const seen = new Set();
    return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
}

// Agrupar array por propriedade
function groupBy(array, key) {
    return array.reduce((result, item) => {
        const group = item[key];
        if (!result[group]) {
            result[group] = [];
        }
        result[group].push(item);
        return result;
    }, {});
}

// Ordenar array de objetos
function sortBy(array, key, order = 'asc') {
    return [...array].sort((a, b) => {
        if (a[key] < b[key]) {
            return order === 'asc' ? -1 : 1;
        }
        if (a[key] > b[key]) {
            return order === 'asc' ? 1 : -1;
        }
        return 0;
    });
}

// ============================================
// MANIPULAÇÃO DO DOM
// ============================================

// Criar elemento HTML
function createElement(tag, className = '', innerHTML = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
}

// Mostrar loading
function showLoading(container) {
    const loading = createElement('div', 'loading');
    if (container) {
        container.innerHTML = '';
        container.appendChild(loading);
    }
}

// Limpar elemento
function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

// ============================================
// NOTIFICAÇÕES
// ============================================

// Mostrar notificação Toast
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${getToastColor(type)};
        color: white;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

function getToastColor(type) {
    const colors = {
        success: '#06d6a0',
        error: '#ef476f',
        warning: '#ffd166',
        info: '#118ab2'
    };
    return colors[type] || colors.info;
}

// ============================================
// LOCAL STORAGE
// ============================================

// Salvar no localStorage
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
        return false;
    }
}

// Carregar do localStorage
function loadFromStorage(key) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error('Erro ao carregar do localStorage:', error);
        return null;
    }
}

// Remover do localStorage
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Erro ao remover do localStorage:', error);
        return false;
    }
}

// ============================================
// EXCEL/CSV
// ============================================

// Exportar para CSV
function exportToCSV(data, filename = 'export.csv') {
    if (data.length === 0) {
        showToast('Nenhum dado para exportar', 'warning');
        return;
    }

    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';

    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            // Escapar valores que contêm vírgula ou aspas
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csv += values.join(',') + '\n';
    });

    downloadFile(csv, filename, 'text/csv');
}

// Download de arquivo
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================
// CÁLCULOS
// ============================================

// Calcular média
function calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((a, b) => a + b, 0);
    return sum / numbers.length;
}

// Calcular total
function calculateTotal(numbers) {
    return numbers.reduce((a, b) => a + b, 0);
}

// Calcular percentual
function calculatePercentage(value, total) {
    if (total === 0) return 0;
    return (value / total * 100).toFixed(2);
}

// ============================================
// DEBOUNCE E THROTTLE
// ============================================

// Debounce - executa função após X ms de inatividade
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// Throttle - executa função no máximo a cada X ms
function throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            func.apply(this, args);
            lastCall = now;
        }
    };
}

// Exportar funções para uso em outros módulos
export {
    formatCurrency,
    formatDate,
    formatDateTime,
    formatCPFCNPJ,
    formatPhone,
    formatCEP,
    isValidCPF,
    isValidCNPJ,
    generateCode,
    generateShortId,
    removeDuplicates,
    groupBy,
    sortBy,
    createElement,
    showLoading,
    clearElement,
    showToast,
    saveToStorage,
    loadFromStorage,
    removeFromStorage,
    exportToCSV,
    downloadFile,
    calculateAverage,
    calculateTotal,
    calculatePercentage,
    debounce,
    throttle
};
