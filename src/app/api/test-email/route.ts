import { NextResponse } from 'next/server';
import { sendRecurringBillsNotification } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Simulação de Contas (Mock Data)
  // Isso imita o que viria do banco de dados
  const contasFake = [
    { description: 'Spotify Premium (Teste)', amount: 21.90, date: new Date() },
    { description: 'Netflix 4K (Teste)', amount: 55.90, date: new Date() },
    { description: 'Internet Fibra (Teste)', amount: 120.00, date: new Date() },
  ];

  // 2. Defina o e-mail que vai receber o teste
  // Dica: Use o seu e-mail real aqui para ver chegando na caixa de entrada
  const emailDestino = 'arthursabino5342@gmail.com'; // <--- TROQUE ISSO PELO SEU EMAIL REAL
  const nomeUsuario = 'Arthur (Modo Teste)';

  console.log(`🚀 Iniciando teste de e-mail para: ${emailDestino}`);

  try {
    // 3. Chama a função de envio diretamente
    const sucesso = await sendRecurringBillsNotification(
      emailDestino,
      nomeUsuario,
      contasFake
    );

    if (sucesso) {
      return NextResponse.json({ 
        ok: true, 
        message: `✅ E-mail enviado com sucesso para ${emailDestino}! Verifique sua caixa de entrada ou Spam.` 
      });
    } else {
      return NextResponse.json({ 
        ok: false, 
        message: '❌ A função retornou falso. Verifique se a RESEND_API_KEY está correta no .env' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Erro interno ao tentar enviar.' 
    }, { status: 500 });
  }
}