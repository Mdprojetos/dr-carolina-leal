# Clínica Dra. Carolina Leal — site institucional

Site de uma página, em pt-BR, feito com HTML, CSS e JavaScript puros. A abertura tem uma cena 3D: um dente que gira e acompanha o mouse e, conforme a pessoa rola a página, pousa no letreiro da fachada da clínica como logo.

## Estrutura

```
index.html          Página única (SEO, Open Graph, JSON-LD "Dentist")
css/styles.css      Estilos com design tokens no :root (cores, fontes, espaços)
js/main.js          Menu, "aberto agora", controle da rolagem e fallback
js/tooth-scene.js   Cena 3D (dente + fachada) com Three.js
assets/favicon.svg  Favicon (dente)
site.webmanifest    Manifesto básico
serve.ps1           Servidor local para Windows (sem Node/Python)
```

## Como rodar localmente

O site precisa de um servidor local (não abra o `index.html` com dois cliques). No Windows:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Depois acesse http://localhost:8080. Qualquer outro servidor estático também funciona, como `npx serve` ou `python -m http.server`.

## Dependência externa

- **Three.js 0.160.0**, carregado via CDN (jsDelivr) por import map, somente depois que a página termina de carregar. É a única biblioteca do projeto e é usada apenas na abertura.
- **Google Fonts:** Marcellus (títulos, ecoa as letras clássicas do letreiro) e Manrope (texto).

## Design tokens

Ficam todos no `:root` de `css/styles.css`:

| Token | Valor | Uso |
|---|---|---|
| `--c-bg` | `#F2F5FA` | Fundo claro levemente azulado |
| `--c-brand-900` | `#123A8F` | Azul profundo (botões, seção escura) |
| `--c-brand-700` | `#1D5AC4` | Azul do letreiro da fachada |
| `--c-accent` | `#4D8FEF` | Azul-céu decorativo |
| `--c-accent-ink` | `#1A55BA` | Azul para textos de destaque (contraste AA) |
| `--c-ink` | `#0F1D3A` | Texto principal (azul-marinho) |

## Breakpoints

Mobile-first: 480, 768, 1024 e 1280px. Testado em 360, 768, 1024 e 1440px, sem rolagem horizontal e com alvos de toque de pelo menos 44px.

## Acessibilidade e desempenho

- HTML semântico, link "Pular para o conteúdo", menu acessível por teclado (Esc fecha) e foco visível.
- Com `prefers-reduced-motion` ativado, sem WebGL ou se o 3D falhar, a abertura vira uma versão estática com o dente e a fachada em SVG.
- Ao navegar por Tab até um botão da abertura, a página rola até ele ficar visível.
- O 3D só renderiza enquanto a abertura está na tela, e usa menos detalhe e resolução em celulares.
- Lighthouse ainda não foi medido. Rode no Chrome DevTools (aba Lighthouse) depois de publicar.

## ✏️ Itens para trocar ou confirmar

Todos estão marcados no código com `<!-- TROCAR -->` ou `<!-- CONFIRMAR -->`.

- [x] **Nome oficial:** "Dra. Carolina Leal · Odontologia Especializada", conforme o letreiro da fachada. (O repositório ainda se chama "dr-patricia-moreira".)
- [ ] **CRO** da responsável técnica, no rodapé (exigência do CFO para publicidade odontológica).
- [ ] **Foto da clínica** (seção "A clínica"): hoje é um placeholder do Unsplash (`photo-1704455306251`).
- [ ] **Imagem de compartilhamento (og:image)**, 1200×630: hoje é um placeholder do Unsplash.
- [ ] **Domínio próprio:** hoje `canonical`, `og:url` e JSON-LD apontam para `dr-carolina-leal.vercel.app`. Trocar se a clínica registrar um domínio.
- [ ] **Lista de tratamentos** oferecidos.
- [ ] **Autora do 1º depoimento** (hoje aparece como "Paciente da clínica").
- [x] **Fachada 3D:** remodelada a partir da foto real (`assets/fachada.webp`): letreiro azul, marquise metálica, vitrine com pilares azuis, portão de enrolar e sobrado. Ajustes em `buildFacade()` (`js/tooth-scene.js`). A foto também aparece na versão sem animação.
- [ ] **Logo oficial** (arquivo vetorial/PNG) para usar no cabeçalho e no favicon. Hoje é um dente desenhado provisoriamente.
- [x] **Paleta:** o site adota o azul da marca (letreiro da fachada).
- [ ] Favicon em PNG (`apple-touch-icon` 180×180) para iPhone.

## Depoimentos

São avaliações reais do Google enviadas pela clínica, com pequenas correções de digitação. Para incluir mais, copie um `<li>` da seção `#depoimentos`.
