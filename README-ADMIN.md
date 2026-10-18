# MK — Área interna e catálogo compartilhado

## O que muda

- `/admin` é a entrada da MK, com e-mail, senha e saída da conta.
- Cadastro, edição, foto, exclusão, vendido/reativação e WhatsApp compartilhado.
- A vitrine consulta o mesmo catálogo para todos os visitantes.
- O cadastro local aberto foi removido. Favoritos continuam locais para cada visitante.
- Sem projeto e conta configurados, o painel bloqueia o acesso. A vitrine exibe os exemplos como demonstração; eles não são importados como produtos reais.

## Ativação (projeto Supabase separado)

1. Crie um projeto Supabase exclusivo para a MK. Escolha conscientemente a organização e confira eventual custo/plano antes de criar. Não use os bancos de EPIs ou da conveniência por engano.
2. No SQL Editor desse projeto execute `database/setup.sql` uma única vez.
3. Em Authentication > Users crie a conta da MK. A MK deve definir a própria senha por um fluxo seguro do Supabase; não publique senhas no GitHub nem as envie pelo chat. Configure o provedor de e-mail/SMTP e os links do projeto se usar convite/redefinição pelo Supabase. O login do site aceita a senha definida, sem cadastro público.
4. Em Authentication desative novos cadastros públicos. O bloqueio principal continua sendo a autorização no servidor e a allowlist no banco.
5. Copie o UUID da conta da MK e execute no SQL Editor:

   ```sql
   insert into public.mk_admins(user_id) values ('UUID_REAL_DA_MK');
   ```

   Não conceda acesso a outras contas. Para revogar acesso imediatamente, remova o UUID dessa tabela.

6. Na Vercel, no projeto correto da MK, configure as três variáveis (Production e Preview, se desejado):

   | Variável | Valor |
   |---|---|
   | `SUPABASE_URL` | URL do novo projeto MK |
   | `SUPABASE_PUBLISHABLE_KEY` | Chave publishable; uma chave anon legada também funciona |
   | `MK_ADMIN_USER_ID` | O mesmo UUID cadastrado em `mk_admins` |

   Não use `service_role`, `sb_secret_`, senha do banco ou senha da MK. As operações do servidor usam a sessão dela e obedecem às regras RLS.

7. Publique esta versão e faça um novo deploy após configurar as variáveis. O `vercel.json` prepara apenas os arquivos estáticos de `public`; `/api` contém as funções Node.js. Na Vercel mantenha Framework Other, raiz do repositório, Node 24 e permita as configurações de build/output do arquivo (Build: `node scripts/build.cjs`; Output: `public`). Não mantenha um override antigo de output `.`.

## Verificação obrigatória antes de considerar ativo

- Rode `node --test tests/*.test.cjs` e `node scripts/build.cjs`.
- Deslogado: uma tentativa de escrita em `/api/products` deve devolver 401; a API direta do Supabase também deve recusar escrita anônima por RLS.
- Outra conta autenticada: a API do site deve devolver 403, e as policies do banco não podem permitir cadastrar, atualizar ou excluir itens/contato/fotos.
- MK: faça login, cadastre foto/preço/descrição, edite e marque como vendido. Em outro navegador sem login confirme que o item aparece com o novo status.
- Exclua um produto de teste e confira que sai da vitrine; faça logout e confira que o painel não permite continuar.
- Revogue a allowlist enquanto a sessão estiver aberta: a próxima escrita deve devolver 403.
- Rode os advisors de segurança do Supabase e confira RLS e grants nas três tabelas e no bucket.

## Segurança e limites

Cookies de sessão são HttpOnly, Secure e SameSite Strict; nenhum token é salvo no localStorage. Escritas exigem Origin do próprio site. Cada operação confirma a identidade no Supabase Auth e a autorização na tabela `mk_admins`. Não se usa `user_metadata` para decidir acesso. O único UUID autorizado no servidor também precisa existir nessa tabela.

As fotos são convertidas no navegador para JPEG, limitadas a 2 MB no servidor e no bucket; caminhos são gerados no servidor. A leitura do bucket é pública porque as fotos aparecem no catálogo. Não envie documentos pessoais como foto de produto. Falhas de limpeza de fotos são registradas sem imprimir credenciais.

Os testes automatizados usam respostas simuladas e cobrem as barreiras do servidor. Eles não substituem a validação de RLS no projeto real. O banco real, a sessão completa em navegador e a publicação só podem ser verificados depois da ativação.

Não existe recuperação de senha própria nesta primeira versão. A senha pode ser redefinida pelo fluxo seguro do Supabase, com URLs/e-mail configurados. Nenhum usuário novo ganha acesso administrativo automaticamente.
