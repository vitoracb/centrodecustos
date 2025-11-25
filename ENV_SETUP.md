# 🔐 Configuração de Variáveis de Ambiente

## Passo 1: Criar arquivo .env

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
EXPO_PUBLIC_SUPABASE_URL=https://wksbxreajxkzwhvngege.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indrc2J4cmVhanhrendodm5nZWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTUxOTgsImV4cCI6MjA3OTU5MTE5OH0.5Dto7MtTQthEdy86LjZDQhjhufzb_hShzz5Nwe0YqNI
NODE_ENV=development
```

## Passo 2: Verificar .gitignore

O arquivo `.env` já está no `.gitignore`, então suas credenciais não serão commitadas.

## Passo 3: Reiniciar o servidor

Após criar o arquivo `.env`, reinicie o servidor de desenvolvimento:

```bash
npm run dev
```

## ⚠️ Importante

- **NUNCA** commite o arquivo `.env` no Git
- Use valores diferentes para desenvolvimento e produção
- Para produção, configure as variáveis de ambiente na plataforma de deploy (EAS, Vercel, etc.)

