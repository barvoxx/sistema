// ============================================
// FUNÇÕES DE AUTENTICAÇÃO - BARVOX
// ============================================

import { auth, db, getUserUID, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail,
    updateProfile,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// ============================================
// VALIDAÇÕES
// ============================================

// Validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validar senha (mínimo 6 caracteres)
function isValidPassword(password) {
    return password.length >= 6;
}

// Validar telefone (formato: (XX) XXXXX-XXXX ou sem formatação)
function isValidPhone(phone) {
    const phoneRegex = /^(\(?\d{2}\)?[\s-]?)?9?\d{4}-?\d{4}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}

// Validar nome de usuário (3-20 caracteres, apenas letras, números e underscore)
function isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
}

// ============================================
// REGISTRO DE NOVO USUÁRIO
// ============================================

async function registerUser(username, email, password, phone) {
    try {
        // Validações
        if (!isValidUsername(username)) {
            throw new Error('Nome de usuário deve ter 3-20 caracteres (letras, números e _)');
        }

        if (!isValidEmail(email)) {
            throw new Error('Email inválido');
        }

        if (!isValidPassword(password)) {
            throw new Error('Senha deve ter no mínimo 6 caracteres');
        }

        if (!isValidPhone(phone)) {
            throw new Error('Telefone inválido');
        }

        // Verificar se username já existe
        const usernameExists = await getDocs(
            query(collection(db, 'users'), where('username', '==', username.toLowerCase()))
        );

        if (!usernameExists.empty) {
            throw new Error('Nome de usuário já existe');
        }

        // Criar usuário no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // Salvar dados do usuário no Firestore
        await setDoc(doc(db, 'users', uid), {
            username: username.toLowerCase(),
            email: email,
            phone: phone,
            createdAt: new Date(),
            company_name: '',
            preferences: {
                theme: 'light',
                language: 'pt-BR'
            }
        });

        console.log('Usuário registrado com sucesso:', uid);
        return { success: true, uid: uid };

    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return { success: false, message: error.message };
    }
}

// ============================================
// LOGIN DE USUÁRIO
// ============================================

async function loginUser(username, password) {
    try {
        // Buscar usuário pelo username
        const userSnapshot = await getDocs(
            query(collection(db, 'users'), where('username', '==', username.toLowerCase()))
        );

        if (userSnapshot.empty) {
            throw new Error('Usuário não encontrado');
        }

        const userData = userSnapshot.docs[0].data();
        const email = userData.email;

        // Fazer login com email e senha
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        console.log('Login realizado com sucesso:', userCredential.user.uid);
        return { success: true, uid: userCredential.user.uid };

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        
        // Mensagem mais clara para o usuário
        if (error.code === 'auth/wrong-password') {
            return { success: false, message: 'Senha incorreta' };
        } else if (error.code === 'auth/user-not-found') {
            return { success: false, message: 'Usuário não encontrado' };
        } else {
            return { success: false, message: error.message };
        }
    }
}

// ============================================
// LOGOUT
// ============================================

async function logoutUser() {
    try {
        await signOut(auth);
        console.log('Logout realizado com sucesso');
        return { success: true };
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        return { success: false, message: error.message };
    }
}

// ============================================
// RECUPERAÇÃO DE SENHA
// ============================================

async function resetPassword(email) {
    try {
        if (!isValidEmail(email)) {
            throw new Error('Email inválido');
        }

        await sendPasswordResetEmail(auth, email);
        console.log('Email de recuperação enviado para:', email);
        return { success: true };

    } catch (error) {
        console.error('Erro ao enviar email de recuperação:', error);
        return { success: false, message: error.message };
    }
}

// ============================================
// ATUALIZAR PERFIL DO USUÁRIO
// ============================================

async function updateUserProfile(displayName) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        await updateProfile(user, {
            displayName: displayName
        });

        console.log('Perfil atualizado com sucesso');
        return { success: true };

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        return { success: false, message: error.message };
    }
}

// ============================================
// OBTER DADOS DO USUÁRIO
// ============================================

async function getUserData() {
    try {
        const uid = getUserUID();
        if (!uid) {
            throw new Error('Usuário não autenticado');
        }

        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) {
            throw new Error('Dados do usuário não encontrados');
        }

        return { success: true, data: userDoc.data() };

    } catch (error) {
        console.error('Erro ao obter dados do usuário:', error);
        return { success: false, message: error.message };
    }
}

// ============================================
// ATUALIZAR DADOS DO USUÁRIO
// ============================================

async function updateUserData(userData) {
    try {
        const uid = getUserUID();
        if (!uid) {
            throw new Error('Usuário não autenticado');
        }

        await updateDoc(doc(db, 'users', uid), userData);
        console.log('Dados do usuário atualizados');
        return { success: true };

    } catch (error) {
        console.error('Erro ao atualizar dados do usuário:', error);
        return { success: false, message: error.message };
    }
}

// ============================================
// DELETAR CONTA DE USUÁRIO
// ============================================

async function deleteUserAccount(password) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        // Re-autenticar o usuário
        const credential = EmailAuthProvider.credential(
            user.email,
            password
        );
        await reauthenticateWithCredential(user, credential);

        // Deletar dados do Firestore
        const uid = user.uid;
        await deleteDoc(doc(db, 'users', uid));

        // Deletar usuário do Firebase Auth
        await deleteUser(user);

        console.log('Conta deletada com sucesso');
        return { success: true };

    } catch (error) {
        console.error('Erro ao deletar conta:', error);
        return { success: false, message: error.message };
    }
}

// ============================================
// VERIFICAR SE USERNAME EXISTE
// ============================================

async function checkUsernameExists(username) {
    try {
        const userSnapshot = await getDocs(
            query(collection(db, 'users'), where('username', '==', username.toLowerCase()))
        );

        return { exists: !userSnapshot.empty };

    } catch (error) {
        console.error('Erro ao verificar username:', error);
        return { exists: false, error: error.message };
    }
}

// ============================================
// VERIFICAR SE EMAIL EXISTE
// ============================================

async function checkEmailExists(email) {
    try {
        const userSnapshot = await getDocs(
            query(collection(db, 'users'), where('email', '==', email))
        );

        return { exists: !userSnapshot.empty };

    } catch (error) {
        console.error('Erro ao verificar email:', error);
        return { exists: false, error: error.message };
    }
}

// Exportar funções para uso em outros módulos
export { 
    registerUser, 
    loginUser, 
    logoutUser, 
    resetPassword, 
    updateUserProfile, 
    getUserData, 
    updateUserData, 
    deleteUserAccount, 
    checkUsernameExists, 
    checkEmailExists 
};
