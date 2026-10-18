# Atualização: etiquetas editáveis

1. No projeto Supabase da MK (`esujgvljadlqxrfqcmuy`), abra o SQL Editor. Copie e execute **somente** `database/etiquetas.sql`. Não execute `setup.sql` novamente.
2. Copie os arquivos e pastas deste pacote para a raiz da pasta clonada do projeto, substituindo os arquivos correspondentes. Preserve a pasta `lib`, pois ela contém a mudança do servidor.
3. No GitHub Desktop faça Commit e Push origin. Aguarde a Vercel concluir a publicação.
4. Abra `/admin`. O formulário agora tem **Etiqueta da vitrine**, com sugestão inicial **Preço de noiado**, opções e prévia. Você também pode editar a etiqueta de um produto já cadastrado. Deixe vazio para ocultá-la.
5. Cadastre ou edite um produto e confira o texto em uma aba anônima da vitrine. Confira também que mudar para vendido não apaga a etiqueta.

Os produtos atuais continuam com **Peça única** quando tinham essa marcação. A atualização SQL pode ser repetida sem apagar os textos editados. O limite é de 24 caracteres. Não há mudança de login, senha, permissões ou variáveis da Vercel.

Para uma instalação nova, execute primeiro `database/setup.sql` do pacote completo da área interna e depois `database/etiquetas.sql` deste pacote.

Validação local: `node --test tests/*.test.cjs`. O servidor aceita apenas texto, com tamanho limitado; a vitrine escapa o conteúdo antes de exibir. A atualização do banco real e a publicação não foram aplicadas pela conexão deste ambiente, que continua sem permissão de escrita. O teste em produção deve ser concluído depois dos passos acima.
