import { Resend } from 'resend';

// Inicializa o Resend apenas se a chave existir
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

export async function sendPasswordResetEmail(email: string, token: string) {
  // Define o link base (localhost em desenvolvimento, domínio real em produção)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://finlove-one.vercel.app/';
  const resetLink = `${appUrl}/reset-password?token=${token}`;

  console.log("========================================");
  console.log(`📧 TENTANDO ENVIAR EMAIL PARA: ${email}`);
  
  // Se não tiver a chave configurada, apenas simula no console
  if (!resend) {
    console.log("⚠️  RESEND_API_KEY não encontrada. Modo simulação ativado.");
    console.log(`🔗 LINK DE RECUPERAÇÃO: ${resetLink}`);
    console.log("========================================");
    return true;
  }

  try {
    // Envio real pelo Resend
    await resend.emails.send({
      from: 'FinLove <onboarding@resend.dev>', // Email padrão de teste do Resend
      to: email,
      subject: 'Recuperação de Senha - FinLove',
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h1>Recuperação de Senha</h1>
          <p>Você solicitou a redefinição de senha para sua conta no FinLove.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <a href="${resetLink}" style="background-color: #ec4899; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
            Redefinir Minha Senha
          </a>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            Se não foi você, ignore este email. O link expira em 1 hora.
          </p>
        </div>
      `
    });
    
    console.log("✅ Email enviado com sucesso via Resend!");
    console.log("========================================");
    return true;
  } catch (error) {
    console.error("❌ Erro ao enviar email:", error);
    // Retorna false, mas loga o link por segurança em dev
    console.log(`(Fallback) Link: ${resetLink}`);
    return false;
  }
}