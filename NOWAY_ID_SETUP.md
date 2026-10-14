# NOWAY ID — ativação e operação

O NOWAY ID usa Supabase Auth e três tabelas privadas protegidas por Row Level Security.

## 1. Site URL e redirecionamentos
No Supabase, projeto `vdipsufzlqmnprbjiojb` → Authentication → URL Configuration:
- **Site URL**: `https://noway-esports-site.vercel.app`
- **Redirect URLs**: `https://noway-esports-site.vercel.app/**`

Não exponha senhas, credenciais secretas de serviços nem a chave `service_role` no site.

## 2. Google OAuth
No Google Cloud, configure OAuth consent / público. Crie um OAuth Client ID do tipo **Web application**.
- **Authorized redirect URI**: `https://vdipsufzlqmnprbjiojb.supabase.co/auth/v1/callback`
- **Authorized JavaScript origins**: `https://noway-esports-site.vercel.app`
No Supabase → Authentication → Sign In / Providers → Google, habilite o provedor e salve o Client ID e o Client Secret fornecidos pelo Google. O segredo fica apenas no painel do Supabase.

Se o Google OAuth ainda não estiver habilitado, o site informa isso e oferece o login por e-mail.

## 3. Ativar fundador (uma única vez)
Após concluir o login como proprietário, use **NOWAY ID → MINHA CONTA → COPIAR MEU ID**.
Confirme que esse UUID pertence à sua própria conta autenticada.
No SQL Editor do Supabase, com acesso de proprietário, execute:

```sql
update public.noway_profiles
set role = 'owner'
where id = '<UUID DA SUA CONTA>';
```

Nunca promova automaticamente o primeiro visitante a proprietário. Quem entrar sem convite é criado como `membro`. Somente o `owner` pode autorizar `jogador` e `manager` pelo painel.

## 4. Permitir acesso público na Vercel
Verifique Vercel → NOWAY Esports Site → Settings → Deployment Protection. Permita visitantes anônimos em produção e mantenha os previews protegidos. A configuração atual do projeto protege inclusive a URL padrão de produção.

## 5. Testes
- Google autentica e volta ao site com sessão.
- Login por e-mail envia link, que retorna para o domínio correto.
- Conta nova recebe papel `membro` e pode editar o nome.
- Envio de contato cria conversa com primeira mensagem e limite de até 5 novas solicitações/24h.
- Membros só veem suas próprias conversas.
- Proprietário vê todos os contatos, responde, atualiza o status e gerencia papéis.
- Mensagem bloqueada após resolução. No máximo 100 mensagens por usuário/24h.

O Site URL, configuração Google e Deployment Protection devem ser concluídos por um responsável com acesso aos painéis respectivos. Não é possível ativar apenas por front-end.
