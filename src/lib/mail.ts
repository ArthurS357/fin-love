import { Resend } from 'resend';

// Inicializa o Resend apenas se a chave existir
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// URL base da aplicação
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://finlove-one.vercel.app/';

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${appUrl}/reset-password?token=${token}`;

  if (!resend) {
    console.log(`🔗 [DEV] Link de Recuperação para ${email}: ${resetLink}`);
    return true;
  }

  try {
    await resend.emails.send({
      from: 'FinLove <onboarding@resend.dev>',
      to: email,
      subject: 'Recuperação de Senha - FinLove',
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ec4899;">Recuperação de Senha</h1>
          <p>Você solicitou a redefinição de senha para sua conta no FinLove.</p>
          <a href="${resetLink}" style="background-color: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: bold;">
            Redefinir Minha Senha
          </a>
          <p style="font-size: 12px; color: #666;">Link válido por 1 hora.</p>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error("❌ Erro ao enviar email de senha:", error);
    return false;
  }
}

// --- NOVA FUNÇÃO: NOTIFICAÇÃO DE CONTAS ---
export async function sendRecurringBillsNotification(
  email: string,
  userName: string,
  bills: { description: string; amount: number; date: Date }[]
) {
  if (!resend) {
    console.log(`📧 [DEV] Simulação de email de contas para ${email} (${bills.length} itens)`);
    return true;
  }

  // Calcula o total
  const totalAmount = bills.reduce((acc, bill) => acc + Number(bill.amount), 0);
  const formattedTotal = totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Cria a lista de itens HTML
  const itemsHtml = bills.map(bill => `
    <li style="padding: 8px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
      <span>${bill.description}</span>
      <span style="font-weight: bold;">R$ ${Number(bill.amount).toFixed(2)}</span>
    </li>
  `).join('');

  try {
    await resend.emails.send({
      from: 'FinLove <onboarding@resend.dev>',
      to: email,
      subject: `🔔 ${bills.length} novas contas registradas`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px; border-radius: 16px;">
          <div style="background-color: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <h2 style="color: #8b5cf6; margin-top: 0;">Olá, ${userName} 👋</h2>
            <p style="font-size: 16px; line-height: 1.5;">
              O FinLove acabou de registrar <strong>${bills.length} transações automáticas</strong> para este mês.
            </p>
            
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${itemsHtml}
              </ul>
              <div style="margin-top: 16px; padding-top: 16px; border-top: 2px dashed #d1d5db; text-align: right; font-size: 18px;">
                Total: <strong style="color: #ec4899;">${formattedTotal}</strong>
              </div>
            </div>

            <p style="font-size: 14px; color: #666; text-align: center;">
              Essas contas já constam no seu histórico como "Pagas" ou "Pendentes" conforme sua configuração.
            </p>
            
            <div style="text-align: center; margin-top: 24px;">
              <a href="${appUrl}/dashboard" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Ver no Dashboard
              </a>
            </div>
          </div>
        </div>
      `
    });
    console.log(`✅ Email de contas enviado para ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Erro ao enviar notificação de contas:", error);
    return false;
  }
}