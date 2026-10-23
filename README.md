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

Depois do primeiro "Salvar" no painel, o catálogo passa a viver no **KV** e as fotos novas também no **KV** (sem cartão de crédito). Se um dia quiser, ligue um bucket **R2** com o nome `FOTOS` e as fotos novas passam a ir para ele.
O `seed/` só é usado enquanto o KV estiver vazio.

## Como editar o catálogo (equipe)

1. Abra o site e vá em `/#admin` (ou role até o rodapé e toque em **Área restrita**). Digite a senha.
2. Aparece a barra escura **Edição** na parte de baixo: **+ Produto**, **Empresa** (nome, WhatsApp, cor, categorias) e **Sair**.
3. Nos cards aparece o botão **Editar** e as setas para mudar a ordem.
4. No produto: toque em **Adicionar fotos** (galeria ou câmera). A marca d'água é aplicada sozinha. A primeira foto é a capa.
5. **Tamanhos**: separe com vírgula (ex.: `Solteiro, Casal, Queen, King`). Eles viram botões de escolha no produto e entram na mensagem do WhatsApp.
6. **Mostrar no catálogo** desligado deixa o produto como rascunho: só a equipe logada vê. Bom para preparar tudo antes de publicar.
7. **Salvar e novo** cadastra vários produtos seguidos. **Duplicar** copia um produto parecido.

Cada categoria tem um modelo de ficha: em **Colchões** os campos já vêm como Tipo, Altura, Firmeza, Tecnologia e
Observação, e os tamanhos como Solteiro, Casal, Queen, King.

## Visual (Tailwind)

O visual usa Tailwind CSS v4, já compilado em `public/app.css` (arquivo que vai para o GitHub). Por isso a
Cloudflare **não precisa de build**: deixe o *Build command* vazio e o *Output directory* como `public`.

As ferramentas de desenvolvimento ficam na pasta `tools/`, de propósito: a raiz do projeto não tem
`package.json`, então a Cloudflare não tenta instalar nada antes de publicar.

Só rode isto se mudar classes ou o tema (`src/input.css` ou o HTML):

```
npm --prefix tools ci          # uma vez
npm --prefix tools run css     # gera public/app.css
```

Depois faça o commit do `public/app.css` junto com a alteração. O número da versão aparece no rodapé do
site (`VERSAO` no `public/index.html`); aumente quando publicar algo novo, para saber qual está no ar.

## Publicar na Cloudflare (grátis)

1. Suba este repositório para o GitHub.
2. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** e escolha o repositório.
   - Build command: *(vazio)*
   - Build output directory: `public`
3. Crie o KV: **Storage & Databases → KV → Create** (ex.: `catalogo-pioneira`).
4. No projeto Pages: **Settings → Bindings** → adicione
   - KV namespace, variável `CATALOG` → o KV criado
   - (opcional) R2 bucket, variável `FOTOS`. Exige cartão cadastrado; sem ele, as fotos ficam no KV
5. **Settings → Variables and Secrets** → adicione como **Secret**:
   - `ADMIN_PASSWORD` → a senha compartilhada
   - `SESSION_SECRET` → um texto longo e aleatório (opcional, mas recomendado)
6. Faça um novo deploy (Deployments → Retry) para os bindings valerem.

Para entrar: abra o site, clique em **Área restrita** (rodapé) e digite a senha.

## Testar no computador

```
npm --prefix tools ci
npm --prefix tools run dev     # http://localhost:8788  (senha de teste: teste123)
```

## Usar sem backend (só arquivos estáticos)

Se a API não existir, a página lê `public/seed/catalog.json` e `public/seed/*.jpg` diretamente e esconde
a "Área restrita". Aí você edita o JSON, adiciona as fotos (com `scripts/watermark_seed.py`) e republica.

## Outra empresa (colchões, material de limpeza)

Faça uma cópia deste projeto (outro repositório ou pasta) e troque:
- `public/seed/catalog.json`: dados da empresa, abas e produtos (ou edite tudo pelo painel);
- `public/seed/*.jpg`: gere com `python3 -I scripts/watermark_seed.py <fotos> public/seed "@instagram_da_empresa"`;
- crie outro projeto Pages, com **KV e senha próprios**.

## Sobre a proteção das fotos

- A marca d'água é gravada na própria imagem (fotos novas recebem no navegador, antes do envio; a foto
  limpa nunca chega ao servidor). Há ainda uma marca extra sobreposta na tela.
- Bloqueios de botão direito, arrastar e impressão, e a URL da foto não abre em nova aba.
- Isso dificulta salvar a foto, mas **não impede print de tela**; por isso a marca fica na imagem.

## Limites conhecidos

- Fotos substituídas ou removidas no painel continuam guardadas (ocupam espaço sem aparecer no site). O KV grátis tem 1 GB, cerca de 2.000 fotos.
- Cinco senhas erradas seguidas bloqueiam o IP por 15 minutos.
