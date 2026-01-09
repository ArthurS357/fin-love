```markdown
# 💜 Fin Love - Finanças a Dois

> Gerencie suas finanças, conquiste sonhos e conecte-se com quem você ama.

**Fin Love** é uma plataforma moderna de gestão financeira pessoal e para casais. Diferente de planilhas frias, o Fin Love combina controle rigoroso de gastos, inteligência artificial, gestão de patrimônio e gamificação para tornar a jornada financeira envolvente e colaborativa.

![Project Status](https://img.shields.io/badge/status-active-emerald)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Funcionalidades Principais

### 📊 Gestão Completa
- **Controle de Transações:** Registre receitas, despesas e investimentos.
- **Parcelamentos Inteligentes:** Suporte nativo para compras no cartão de crédito parceladas.
- **Relatórios Visuais:** Gráficos interativos de pizza e barras para entender para onde vai o dinheiro.
- **Timeline de Extrato:** Visualização agrupada por dia para facilitar a conferência.

### 👩‍❤️‍👨 Modo Casal (Sync)
- **Conexão de Contas:** Vincule sua conta com a do seu parceiro(a) via e-mail.
- **Visão Compartilhada:** Veja o saldo e gastos do parceiro (com opção de privacidade).
- **Love Alerts:** Envie "nudges" rápidos como *"Te amo"*, *"Bora investir?"* ou *"Registra aí!"*.
- **Caixinha dos Sonhos:** Meta de poupança compartilhada com barra de progresso.

### 🤖 Inteligência Artificial (Gemini)
- **Coach Financeiro:** Receba conselhos personalizados baseados no seu histórico.
- **Personalidades:** Escolha entre um Auditor Rigoroso, um Amigo ou um Filósofo.
- **Análise de Planejamento:** A IA analisa seu orçamento mensal e sugere correções.

### 📈 Investimentos & Patrimônio
- **Carteira de Ativos:** Gerencie Renda Fixa, Ações, FIIs e Cripto.
- **Alocação de Ativos:** Gráfico de pizza para visualizar a diversificação da carteira.
- **Integração Automática:** Opção de lançar o investimento como despesa no extrato automaticamente.

### 🏆 Gamificação & Perfil
- **Sistema de Níveis:** Evolua de *Iniciante* a *Lendário* conforme usa o app.
- **Conquistas (Badges):** Desbloqueie medalhas como "Primeiro Investimento", "Poupador", etc.
- **Segurança:** Proteção de dados, modo privacidade (esconder valores) e exportação segura de CSV.

---

## 🛠️ Tecnologias Utilizadas

O projeto foi construído com uma stack moderna focada em performance e DX (Developer Experience):

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router & Server Actions)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/) (Design System "Dark/Cyberpunk")
- **Banco de Dados:** [Prisma ORM](https://www.prisma.io/) (SQLite em Dev / PostgreSQL em Prod)
- **Autenticação:** JWT (Jose + BCrypt)
- **IA:** Google Generative AI SDK (Gemini Flash/Pro)
- **Gráficos:** Recharts
- **Ícones:** Lucide React
- **Notificações:** Sonner

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- Node.js 18+
- NPM ou Yarn

### Passo a Passo

1. **Clone o repositório**
   ```bash
   git clone [https://github.com/seu-usuario/fin-love.git](https://github.com/seu-usuario/fin-love.git)
   cd fin-love

```

2. **Instale as dependências**
```bash
npm install

```


3. **Configure as Variáveis de Ambiente**
Crie um arquivo `.env` na raiz do projeto com as seguintes chaves:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="sua_chave_secreta_super_segura"
GOOGLE_API_KEY="sua_chave_api_do_google_gemini"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

```


4. **Prepare o Banco de Dados**
```bash
npx prisma migrate dev --name init

```


5. **Rode o Servidor de Desenvolvimento**
```bash
npm run dev

```


6. **Acesse:** Abra [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) no seu navegador.

---

## 🛡️ Segurança

O projeto segue boas práticas de segurança, incluindo:

* **Sanitização de CSV:** Prevenção contra injeção de fórmulas (CSV Injection) na exportação de relatórios.
* **Server Actions:** Validação de dados com Zod no lado do servidor.
* **Verificação de Propriedade:** Garante que usuários só acessem/editem seus próprios dados.
* **Senhas:** Hashing robusto com BCrypt.

---

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir Issues ou Pull Requests.

1. Faça um Fork do projeto
2. Crie sua Feature Branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: Adiciona MinhaFeature'`)
4. Push para a Branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](https://www.google.com/search?q=LICENSE) para mais detalhes.

---

Feito com 💜 e código.

```

```