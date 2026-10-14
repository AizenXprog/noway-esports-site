# NOWAY ESPORTS — Portal oficial

## Versão inicial pronta para implantação

Site institucional estático e responsivo, com a identidade oficial em preto e amarelo elétrico da NOWAY. As logos, a arte oficial e a foto fornecidas estão incluídas em `assets/`.

### Páginas e recursos
- Landing page institucional, história da transição MORI → NOWAY, elenco e perfis individuais.
- Biografia integral de Nielss Uno, conforme o texto enviado, e foto fornecida.
- Founder Niel e Team Manager Prado, com papéis de gestão separados das vagas móveis de jogador.
- Competições e notícias preparados para dados **confirmados**; sem resultados inventados.
- Mídias, Twitch, Konect, loja futura, layout mobile e navegação acessível.

### Publicação na Vercel
1. Crie um repositório GitHub **separado** para o site, por exemplo `noway-esports-site`.
2. Inclua todos os arquivos deste diretório na raiz do repositório.
3. No Vercel, escolha **Add New → Project → Import Git Repository**, selecione o repositório e faça deploy.
4. Tipo de projeto: **Other**, **sem** comando de build. Diretório de saída: raiz (`.`), quando exigido.
5. Ao conectar o GitHub, cada alteração publicada na branch principal inicia uma nova implantação da Vercel automaticamente.

> A conexão do repositório à Vercel deve ser autorizada pelo responsável da conta. Este projeto não usa credenciais no código.

### Como atualizar pelo ChatGPT
Após o repositório estar conectado, alterações podem ser feitas diretamente via integração do GitHub. Editar `site-data.js` atualiza nomes, biografias, redes sociais, campeonatos e conteúdos. `styles.css` altera a aparência; `index.html` altera a estrutura; `script.js` altera comportamentos.

### Política do elenco
A presença no elenco é independente do cargo de gestão. Niel é Founder; Prado é Team Manager; todas as vagas competitivas são móveis. Não presumir titularidade ou listar resultados não confirmados.

### Teste local
Abrir `index.html` em um navegador ou executar `python -m http.server 8000` nesta pasta e acessar `http://localhost:8000`.

### Arquivos
- `index.html` — estrutura e conteúdo estático
- `site-data.js` — dados do time (principal arquivo para atualizações)
- `script.js` — perfis, navegação e mídia
- `styles.css` — identidade visual e responsividade
- `vercel.json` — configuração de publicação e headers
- `assets/` — imagens e logos
