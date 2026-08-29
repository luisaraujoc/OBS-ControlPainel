# OBS Soundboard & Painel de Controle

PWA (Progressive Web App) para controlar o OBS Studio direto do celular, na mesma rede
local, sem precisar sair do jogo ou ir até o computador. Conecta no OBS via
**OBS WebSocket v5** e oferece 6 módulos:

- 🔊 **Soundboard** — grade de botões que disparam sons (hotkeys do OBS).
- 🎬 **Cenas** — troca a cena ativa.
- 👁 **Fontes** — liga/desliga a visibilidade de fontes de uma cena, adiciona fontes
  novas e reseleciona a janela/processo de fontes de captura (ex: corrigir a captura de
  áudio do Discord sem minimizar o jogo).
- 🎚 **Mixer** — controla volume e mute das fontes de áudio.
- 🔴 **Lives** — inicia/para a saída primária do OBS (`StartStream`) e cada saída extra
  do **Aitum Multistream** (Twitch, TikTok, etc.), com um "Iniciar tudo" que sobe a
  primária, espera ela entrar no ar e liga as demais na ordem.
- ⚙️ **Configurações** — define o IP/porta do OBS e a senha de autenticação, tudo pelo
  próprio app.

---

## Requisitos

### No computador com OBS
1. **OBS Studio 28+** (já vem com o WebSocket Server v5 embutido, não precisa plugin
   pra isso).
2. **Habilitar o WebSocket Server**: no OBS, vá em
   `Ferramentas > Configurações do Servidor WebSocket` e marque **"Habilitar Servidor
   WebSocket"**. Anote:
   - O **IP local** do computador na rede (ex: `192.168.3.12`) — dá pra ver com
     `ipconfig` (Windows) na mesma janela de configurações do OBS.
   - A **porta** (padrão `4455`).
   - Se marcar **"Habilitar Autenticação"**, defina/anote a senha — o app suporta os
     dois casos (com ou sem senha), configurável na tela de Configurações.
3. **Plugin "Soundboard Dock"** (⚠️ **obrigatório só para o módulo Soundboard** — os
   outros módulos, Cenas/Fontes/Mixer, funcionam com o OBS puro, sem esse plugin):
   - O módulo Soundboard **não lê seus sons diretamente** — ele funciona detectando os
     atalhos (hotkeys) que o plugin **Soundboard Dock** registra no OBS, no formato
     `Soundboard: 'nome do som'`.
   - Instale o plugin Soundboard Dock no OBS e cadastre seus sons nele normalmente.
   - Sem esse plugin instalado (ou sem nenhum som cadastrado nele), o botão
     "🔄 Sincronizar sons" do app não vai encontrar nada — isso é esperado, não é bug.
4. **Plugin "Aitum Multistream"** (⚠️ **obrigatório só para as saídas extras do módulo
   Lives** — iniciar/parar a saída primária do OBS funciona com o OBS puro):
   - A parte "Aitum Multistream" do módulo Lives usa um **vendor obs-websocket**
     (`aitum-multistream`) que **não existe nas releases oficiais** do plugin. É preciso
     a build do **fork com o vendor**:
     <https://github.com/w0rxbend/obs-aitum-multistream> (PR #19 do repo oficial).
   - Requests usados: `status`, `get_outputs`, `start_output {name}`,
     `stop_output {name}`; evento `output_state_changed` mantém o app em sincronia com
     os cliques feitos no dock do OBS.
   - Com o plugin **oficial** (sem o vendor) instalado, o app detecta a ausência e a
     seção "Aitum Multistream" some sozinha — sobra só o controle da saída primária.
   - **Backup antes de trocar o plugin:** a config fica em
     `%APPDATA%\obs-studio\plugin_config\aitum-multistream\config.json` (perfis, saídas
     e **stream keys em texto puro** — trate como segredo). O binário oficial fica em
     `<OBS>\obs-plugins\64bit\aitum-multistream.dll`.

### Para rodar o app
- **Node.js 18+** e `npm` instalados no computador que vai servir o app (pode ser o
  mesmo computador do OBS ou outro na mesma rede).
- Celular e computador **na mesma rede Wi-Fi/local**.

---

## Instalação e configuração

```bash
npm install
```

Copie o arquivo de exemplo de variáveis de ambiente:

```bash
cp .env.example .env
```

Edite o `.env` com o IP/porta e senha do seu OBS (isso serve só como **valor inicial
padrão** — dá pra trocar depois direto pelo app, na tela de Configurações, sem precisar
mexer no `.env` de novo nem rebuildar):

```
VITE_OBS_WS_URL=ws://192.168.3.12:4455
VITE_OBS_WS_PASSWORD=
```

Deixe `VITE_OBS_WS_PASSWORD` vazio se o seu WebSocket Server não usa autenticação.

---

## Rodando o app

### Modo desenvolvimento (recomendado pra testar rápido)
```bash
npm run dev
```
O Vite sobe um servidor acessível pela rede local (já configurado com `host: true`).
O terminal mostra algo como:
```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```
Abra o endereço de **Network** no navegador do celular (Chrome/Safari), estando na
mesma rede do computador.

### Build de produção
```bash
npm run build
npm run preview
```
`npm run preview` sobe uma versão otimizada (mesma que seria publicada), também
acessível pela rede.

### Instalar como app no celular (PWA)
Com o app aberto no navegador do celular:
- **Android (Chrome)**: menu ⋮ → "Adicionar à tela inicial" / "Instalar app".
- **iPhone (Safari)**: botão de compartilhar → "Adicionar à Tela de Início".

Depois de instalado, ele abre em tela cheia como um app nativo e funciona offline pra
tudo que não depende de falar com o OBS (a conexão em si, claro, só funciona com o OBS
ligado e acessível na rede).

---

## Primeiro uso

1. Abra o app. A barra superior mostra 🔴 "Reconectando ao OBS..." até conectar — ele
   tenta reconectar sozinho a cada 3 segundos se cair.
2. Se o IP/senha do `.env` já estiverem certos, deve conectar (🟢 "OBS conectado")
   automaticamente. Se não conectar, vá em **⚙️ Configurações** no menu principal:
   - Preencha o endereço (`IP:porta`, ex: `192.168.3.12:4455`).
   - Marque "Servidor WebSocket exige senha" **somente** se você ativou autenticação no
     OBS, e preencha a senha.
   - Use **"Testar conexão"** antes de salvar — ele tenta conectar de verdade e mostra
     ✅ sucesso ou ❌ o motivo do erro (ex: senha incorreta).
   - **"Salvar"** grava a configuração no celular (fica só nesse aparelho/navegador) e
     o app reconecta sozinho com o novo endereço.
3. Volte ao menu (← Menu) e escolha o módulo que quiser.

---

## Os módulos

### 🔊 Soundboard
- Ao conectar pela primeira vez, o app tenta sincronizar automaticamente com os sons do
  Soundboard Dock (botão **"🔄 Sincronizar sons"** faz isso manualmente também).
- Toque num botão pra disparar o som. **Segure (long press, ~0,5s)** um botão pra
  editar nome, ícone e cor — essas edições ficam salvas só no celular, sem alterar nada
  no OBS, e sobrevivem a uma nova sincronização.
- **▶ Play / ⏸ Pausar / ⏹ Parar**: agem em **todas** as fontes de mídia do OBS, não só
  nos sons do soundboard — útil se algo travou ou pra pausar tudo de uma vez.
- **"Descobrir atalhos"**: mostra no painel de Logs todos os hotkeys e fontes que o OBS
  conhece — útil pra configurar manualmente um botão que aponte pra outro tipo de
  atalho, caso precise.
- **"Restaurar padrão"**: apaga as edições de nome/cor/ícone feitas no app (não mexe no
  OBS nem no Soundboard Dock).

### 🎬 Cenas
Lista todas as cenas do OBS, destaca a atual e troca ao tocar. Se você trocar de cena
direto no OBS, o app atualiza sozinho.

### 👁 Fontes
- Escolha a cena no seletor do topo pra ver as fontes dela.
- Toque numa fonte pra ligar/desligar a visibilidade (👁 / 🚫).
- **"+ Fonte"**: cria uma fonte nova na cena escolhida (Captura de Tela, Captura de
  Janela, Captura de Jogo, Áudio de Aplicativo, Navegador, Mídia, etc.).
- Fontes de **Captura de Janela**, **Captura de Jogo** e **Áudio de Aplicativo** ganham
  um botão extra (🪟/🎧) que mostra, ao vivo, a lista de janelas/processos abertos no
  computador agora — a mesma lista que aparece dentro do OBS — pra você reselecionar
  sem precisar abrir o OBS. É o caso típico de "a captura de áudio do Discord parou de
  funcionar": abre o picker, escolhe o Discord de novo, pronto.

### 🎚 Mixer
Lista as fontes de áudio com um slider de volume (0–100%) e botão de mute (🔊/🔇),
sincronizado em tempo real com o que acontece no OBS (se você mexer direto no mixer do
OBS, o app reflete a mudança).

### 🔴 Lives
Controla o "ir ao ar" pelo celular, em duas partes:

- **Saída primária do OBS** — botão iniciar/parar (`StartStream`/`StopStream`), bolinha
  de status (verde / amarelo piscando = reconectando) e cronômetro ao vivo. É a
  transmissão que o Twitch, o YouTube e as saídas do Aitum sem encoder próprio precisam
  ter no ar primeiro.
- **Saídas do Aitum Multistream** — uma linha por saída configurada no dock do Aitum
  (Twitch, TikTok, etc.), com emoji da plataforma, status e botão Iniciar/Parar. Saída
  marcada como `requires_main` fica bloqueada com aviso enquanto a primária não está no
  ar. Cliques no dock do OBS refletem no app na hora (evento `output_state_changed`), e
  vice-versa. Sem o plugin com o vendor, essa seção não aparece.
- **Iniciar tudo / Parar tudo** — "Iniciar tudo" sobe a primária, espera ela entrar no
  ar (timeout ~20s) e liga cada saída do Aitum na sequência; "Parar tudo" faz o inverso.

**YouTube como saída primária:** o popup "Gerenciar Transmissão → Criar e iniciar" do
OBS **não é automatizável** por obs-websocket (limitação do OBS, não do app). Para o
`StartStream` funcionar direto, use serviço **Personalizado** no OBS com a **chave de
transmissão reutilizável** do YouTube e ligue **"Iniciar automaticamente"** no YouTube
Studio — aí a live sobe sozinha quando a saída primária entra no ar. Criar uma
transmissão nova (título/miniatura dinâmicos) pelo celular exigiria um backend com a
YouTube Live Streaming API — não implementado.

O módulo Lives não grava nada em `localStorage`.

### ⚙️ Configurações
IP/porta e senha do WebSocket, com teste de conexão antes de salvar (ver seção
"Primeiro uso" acima).

---

## Onde ficam os dados

Tudo é salvo **localmente no navegador do celular** (`localStorage`), nada vai pra
nenhum servidor:
- `custom_labels` — edições de nome/cor/ícone dos botões do Soundboard.
- `discovered_buttons` — a lista de botões gerada automaticamente a partir do
  Soundboard Dock.
- `obs_connection_settings` — IP/porta/senha configurados na tela de Configurações.

Limpar os dados do site no navegador (ou desinstalar o app) apaga tudo isso e volta ao
padrão do `.env`.

---

## Solução de problemas

- **Fica em "Reconectando ao OBS..." pra sempre**: confira se o IP/porta em
  Configurações está certo, se o WebSocket Server está habilitado no OBS, e se
  celular/computador estão na mesma rede (sem VPN separando os dois, por exemplo).
- **"Falha na autenticação"**: senha errada ou o OBS exige senha e o checkbox de
  autenticação está desmarcado no app (ou vice-versa).
- **"🔄 Sincronizar sons" não encontra nada**: o plugin Soundboard Dock não está
  instalado no OBS, ou não tem nenhum som cadastrado nele ainda.
- **Botão de selecionar janela/processo dá erro ao abrir**: a propriedade que o app
  pede pro OBS pode variar um pouco entre versões/tipos de fonte — copie a mensagem de
  erro exata do painel de Logs pra investigar qual é o nome certo pra sua versão.

---

## Scripts disponíveis

| Comando           | O que faz                                              |
|--------------------|--------------------------------------------------------|
| `npm run dev`      | Sobe o servidor de desenvolvimento (acessível na rede) |
| `npm run build`    | Gera a build de produção em `dist/`                    |
| `npm run preview`  | Serve a build de produção pra testar antes de publicar |
