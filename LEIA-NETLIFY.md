# MK — Publicar na Netlify mantendo o Supabase

Este pacote adiciona suporte à Netlify ao repositório atual. Não recria o banco e não altera os produtos, a conta, a senha ou as regras do Supabase. A vitrine, o painel e as etiquetas permanecem iguais. O adaptador encaminha as quatro rotas `/api` para os mesmos handlers já usados na Vercel.

## 1. Enviar os arquivos

Extraia este ZIP e copie seu conteúdo para a raiz da pasta clonada `mk-preco-de-noiado`, preservando as pastas. O arquivo `netlify.toml` deve ficar ao lado de `package.json` e `index.html`. No GitHub Desktop faça Commit e Push origin. A Netlify deverá reconstruir o projeto ligado a esse repositório.

Não arraste os arquivos para a janela do GitHub Desktop. Cole na pasta aberta em Repository > Show in Explorer.

## 2. Configurar a Netlify

Abra o projeto já criado na Netlify, mostrado no seu print. Verifique que ele está conectado ao repositório `wa6x20star/mk-preco-de-noiado`, branch `main`.

O `netlify.toml` fornece:

| Configuração | Valor |
|---|---|
| Base directory | Raiz do repositório / vazio |
| Build command | `node scripts/build.cjs` |
| Publish directory | `public` |
| Functions directory | `netlify/functions` |
| Node.js | 24 |

Em Project configuration > Environment variables (os rótulos podem estar traduzidos), adicione as mesmas variáveis já usadas na Vercel:

| Nome | Valor |
|---|---|
| `SUPABASE_URL` | `https://esujgvljadlqxrfqcmuy.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | A chave Publishable do projeto MK, copiada do Supabase ou da configuração já feita na Vercel |
| `MK_ADMIN_USER_ID` | `ac9df97e-0f76-4f8f-90f6-79112b384bbe` |

Aplique em Production; no plano Free, use todos os escopos disponíveis. Se houver seleção de escopo, inclua Functions. Não coloque uma chave secreta/service_role nem a senha da conta nessas variáveis. Não envie esses valores ao GitHub.

Depois de salvar, em Deploys inicie uma nova publicação (Trigger deploy > Deploy project / Deploy site, conforme a interface). Variáveis adicionadas depois de um deploy só serão usadas numa nova publicação.

## 3. Testar antes de mudar os links

1. Aguarde a publicação concluir e abra o endereço `.netlify.app` informado no projeto.
2. Confira que os produtos já cadastrados aparecem com os mesmos dados e etiquetas.
3. Em `/admin`, faça login novamente com sua conta: os cookies da Vercel não são transferidos entre domínios.
4. Cadastre um produto de teste com foto, edite a etiqueta e altere para vendido.
5. Em aba anônima, confirme os dados na vitrine e que `/admin` exige login.
6. Teste o botão de WhatsApp e saia da conta.

As rotas `/api/session`, `/api/catalog`, `/api/products` e `/api/settings` devem aparecer como atendidas pela função `mk-api`. Se a vitrine abrir mas o painel falhar, confira em Functions/Logs se `mk-api` foi publicada, além das três variáveis.

Quando tudo funcionar na Netlify, atualize o link do Instagram e o domínio personalizado, se houver. Para encerrar a hospedagem comercial no Hobby, retire a publicação antiga da Vercel depois de validar a nova. Manter o código de suporte da Vercel no repositório não publica nada lá por si só; a integração Git pode continuar disparando deploys até ser desativada.

## Verificações feitas

O adaptador foi testado localmente para login, cookies seguros separados, bloqueio de visitantes/outras contas, validação de origem, catálogo público, upload de foto, edição com etiqueta, logout, limites de envio e rotas desconhecidas. Os testes usam respostas simuladas do Supabase. A publicação e os testes reais na Netlify dependem da configuração da sua conta e devem ser concluídos no painel.

O plano gratuito tem franquias e pode pausar projetos se esgotar os créditos; acompanhe Usage/Billing. Domínio próprio e eventuais custos do Supabase são separados da hospedagem.
