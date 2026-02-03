import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { JWT_SECRET } from '@/lib/auth';
import { randomBytes } from 'crypto';
import { sendPasswordResetEmail } from '@/lib/mail';
import { z } from 'zod';
import { registerSchema, loginSchema, passwordSchema } from '@/lib/schemas';

// Tipos inferidos
type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type PasswordInput = z.infer<typeof passwordSchema>;

// Auxiliar para gerar Token (agora reutilizável)
async function generateToken(userId: string) {
    return await new SignJWT({ sub: userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(JWT_SECRET);
}

export async function registerService(data: RegisterInput) {
    const { name, email, password } = data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error('Email já em uso.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            spendingLimit: 2000
        },
    });

    const token = await generateToken(user.id);
    return { token, user };
}

export async function loginService(data: LoginInput) {
    const { email, password } = data;

    const user = await prisma.user.findUnique({ where: { email } });

    // Verifica senha
    const isValid = user && (await bcrypt.compare(password, user.password));

    if (!isValid) {
        // SEGURANÇA: Delay artificial de 1s para mitigar ataques de força bruta
        // Isso impede que atacantes testem milhares de senhas por segundo
        await new Promise(resolve => setTimeout(resolve, 1000));
        throw new Error('Credenciais inválidas.');
    }

    const token = await generateToken(user!.id);
    return { token, user };
}

export async function updatePasswordService(userId: string, data: PasswordInput) {
    const { currentPassword, newPassword } = data;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const isValid = user && (await bcrypt.compare(currentPassword, user.password));

    if (!isValid) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay de segurança também aqui
        throw new Error('Senha atual incorreta.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    });

    return { success: true };
}

export async function forgotPasswordService(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    // Segurança: Não revelamos se o email existe ou não, apenas retornamos sucesso
    if (!user) return { success: true };

    const token = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hora

    await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry }
    });

    await sendPasswordResetEmail(email, token);
    return { success: true };
}

export async function resetPasswordService(token: string, password: string) {
    if (password.length < 6) throw new Error('Mínimo 6 caracteres.');

    const user = await prisma.user.findFirst({
        where: {
            resetToken: token,
            resetTokenExpiry: { gt: new Date() }
        }
    });

    if (!user) throw new Error('Link inválido ou expirado.');

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null
        }
    });

    return { success: true };
}