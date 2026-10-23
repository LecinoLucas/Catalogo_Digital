# Catálogo Digital

Catálogo de produtos em uma página só (`public/index.html`), com abas, fotos protegidas por marca d'água
e painel de edição protegido por senha. Hospedagem: **Cloudflare Pages** (plano gratuito).

## Como funciona

| Parte | Arquivo |
|---|---|
| Página (catálogo + painel de edição) | `public/index.html` |
| Dados iniciais (empresa, abas, produtos) | `public/seed/catalog.json` |
| Fotos iniciais, já com marca d'água | `public/seed/*.jpg` |
| API: login, salvar catálogo, upload, servir fotos | `functions/api/[[path]].js` |
| Gera as fotos com marca d'água | `scripts/watermark_seed.py` |

Depois do primeiro "Salvar" no painel, o catálogo passa a viver no **KV** e as fotos novas no **R2**.
O `seed/` só é usado enquanto o KV estiver vazio.

## Publicar na Cloudflare (grátis)

1. Suba este repositório para o GitHub.
2. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** e escolha o repositório.
   - Build command: *(vazio)*
   - Build output directory: `public`
3. Crie os recursos: **Storage & Databases → KV → Create** (ex.: `catalogo-pioneira`) e **R2 → Create bucket**
   (ex.: `catalogo-pioneira-fotos`).
4. No projeto Pages: **Settings → Bindings** → adicione
   - KV namespace, variável `CATALOG` → o KV criado
   - R2 bucket, variável `FOTOS` → o bucket criado
5. **Settings → Variables and Secrets** → adicione como **Secret**:
   - `ADMIN_PASSWORD` → a senha compartilhada
   - `SESSION_SECRET` → um texto longo e aleatório (opcional, mas recomendado)
6. Faça um novo deploy (Deployments → Retry) para os bindings valerem.

Para entrar: abra o site, clique em **Área restrita** (rodapé) e digite a senha.

## Testar no computador

```
npm install
npm run dev        # http://localhost:8788  (senha de teste: teste123)
```

## Usar sem backend (só arquivos estáticos)

Se a API não existir, a página lê `public/seed/catalog.json` e `public/seed/*.jpg` diretamente e esconde
a "Área restrita". Aí você edita o JSON, adiciona as fotos (com `scripts/watermark_seed.py`) e republica.

## Outra empresa (colchões, material de limpeza)

Faça uma cópia deste projeto (outro repositório ou pasta) e troque:
- `public/seed/catalog.json`: dados da empresa, abas e produtos (ou edite tudo pelo painel);
- `public/seed/*.jpg`: gere com `python3 -I scripts/watermark_seed.py <fotos> public/seed "@instagram_da_empresa"`;
- crie outro projeto Pages, com **KV, R2 e senha próprios**.

## Sobre a proteção das fotos

- A marca d'água é gravada na própria imagem (fotos novas recebem no navegador, antes do envio; a foto
  limpa nunca chega ao servidor). Há ainda uma marca extra sobreposta na tela.
- Bloqueios de botão direito, arrastar e impressão, e a URL da foto não abre em nova aba.
- Isso dificulta salvar a foto, mas **não impede print de tela**; por isso a marca fica na imagem.

## Limites conhecidos

- Fotos substituídas ou removidas no painel continuam no R2 (ocupam espaço sem aparecer no site).
- Cinco senhas erradas seguidas bloqueiam o IP por 15 minutos.
