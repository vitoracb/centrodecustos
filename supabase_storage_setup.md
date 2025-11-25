# Configuração do Supabase Storage

Para que os arquivos PDF e imagens sejam visualizados corretamente, você precisa configurar o bucket no Supabase Storage e suas políticas RLS (Row-Level Security).

## Passos para configurar:

1. **Acesse o Supabase Dashboard:**
   - Vá para https://app.supabase.com
   - Selecione seu projeto

2. **Crie o bucket "documentos":**
   - No menu lateral, clique em **Storage**
   - Clique em **New bucket**
   - Nome do bucket: `documentos`
   - **IMPORTANTE:** Marque **Public bucket** (para permitir acesso público aos arquivos)
   - Clique em **Create bucket**

3. **Configure as políticas RLS (OBRIGATÓRIO):**
   - No menu lateral, clique em **SQL Editor**
   - Clique em **New query**
   - Copie e cole o conteúdo do arquivo `supabase_storage_policies.sql`
   - Clique em **Run** para executar o SQL
   
   **OU configure manualmente:**
   - Vá em **Storage** > **Policies**
   - Selecione o bucket `documentos`
   - Clique em **New Policy**
   - Configure as seguintes políticas:
     
     **Política 1 - Upload (INSERT):**
     - Policy name: `Allow anon users to upload files`
     - Allowed operation: `INSERT`
     - Target roles: `anon` (não authenticated, pois o app usa chave anônima)
     - Policy definition: 
       ```sql
       bucket_id = 'documentos' AND (storage.foldername(name))[1] = 'expenses'
       ```
     
     **Política 2 - Leitura (SELECT):**
     - Policy name: `Allow anon users to read files`
     - Allowed operation: `SELECT`
     - Target roles: `anon`
     - Policy definition: 
       ```sql
       bucket_id = 'documentos'
       ```
     
     **Política 3 - Atualização (UPDATE):**
     - Policy name: `Allow anon users to update files`
     - Allowed operation: `UPDATE`
     - Target roles: `anon`
     - Policy definition: 
       ```sql
       bucket_id = 'documentos'
       ```
     
     **Política 4 - Exclusão (DELETE):**
     - Policy name: `Allow anon users to delete files`
     - Allowed operation: `DELETE`
     - Target roles: `anon`
     - Policy definition: 
       ```sql
       bucket_id = 'documentos'
       ```

4. **Teste:**
   - Após criar o bucket e as políticas, tente fazer upload de um documento de despesa
   - O arquivo deve ser salvo no Supabase Storage sem erros
   - Quando você visualizar o documento, ele deve carregar corretamente

## Nota importante:

- Os arquivos serão salvos na pasta `expenses/` dentro do bucket `documentos`
- Cada arquivo terá um nome único baseado no timestamp
- Os arquivos antigos (com URIs locais) continuarão funcionando, mas novos uploads usarão o Storage
- **Se você receber erro "violates row-level security policy", significa que as políticas RLS não foram configuradas corretamente**

