# Roteiro: controlar os overlays do Pederas pelo app (OBS WebSocket)

Nov 5, 2026 · @Luis Coutinho

## O que são os overlays

Cada overlay do Pederas é uma página HTML com fundo transparente que o OBS abre numa **fonte de navegador** (Browser Source). O OBS tem um Chrome embutido: ele carrega a página, desenha por cima da cena e roda as animações em JavaScript como qualquer site.

O que muda entre uma live e outra (título, contagem, nome do canal) vai nos **parâmetros da URL**, depois do `?`. Exemplo: `telas-live.html?tela=inicio&titulo=Rivals|valendo+a+Elite&ate=20:30`. A página lê esses parâmetros ao abrir e monta o texto.

O app conversa com o OBS pelo **OBS WebSocket** (porta 4455, já embutido no OBS 28 ou mais novo). Por ele, o app consegue:

- **Caminho A:** ler a URL de uma fonte, mudar os parâmetros e gravar de volta. O OBS recarrega a página sozinho.
- **Caminho B:** mandar um evento direto para dentro da página aberta, que troca o texto na hora sem recarregar.

Com isso, o app vira o painel de edição e você não precisa abrir as propriedades da fonte no OBS.

## Os overlays do Pederas

São quatro arquivos, e as telas de início e fim são as únicas que já aceitam atualização ao vivo (Caminho B). As outras funcionam pelo Caminho A.

| Overlay | Arquivo | Tamanho da fonte | Parâmetros na URL | Ao vivo (B) |
| --- | --- | --- | --- | --- |
| Telas de início e fim (vertical) | `telas-live.html` | 1080 × 1920 | `tela` `topo` `titulo` `sub` `selo` `selosub` `min` `ate` `fim` `cor` `id` | Sim |
| Telas de início e fim (horizontal) | `telas-live-horizontal.html` | 1920 × 1080 | os mesmos da vertical | Sim |
| Board de canais girando | `roda-canais.html` | 720 × 300 | `youtube` `twitch` `kick` `titulo` `escala` `parado` `giro` | Não |
| Cena vertical (fundo, jogo e chat) | `cena-vertical.html` | 1080 × 1920 | `fundo` `cor` `guia` | Não |

### Campos das telas de início e fim

| Campo | O que faz | Exemplo |
| --- | --- | --- |
| `tela` | Escolhe a tela e carrega os textos padrão dela | `inicio` ou `fim` |
| `topo` | Linha pequena acima do título | `Peder4sGames` |
| `titulo` | Texto grande; `\|` quebra a linha | `Hoje tem\|Rivals` |
| `sub` | Frase de baixo | `Pega o lanche e chama a galera!` |
| `ate` | Contagem até um horário (HH:MM) | `20:30` |
| `min` | Contagem em minutos a partir de agora | `5` |
| `fim` | Texto do selo quando a contagem zera | `JÁ!` |
| `selo` / `selosub` | Textos do selo quando não há contagem | `PRÓXIMA` / `até a` |
| `cor` | Cor de destaque, sem `#` | `19e6c8` |
| `id` | Nome da fonte, para o app mirar só nela (fica só na URL) | `inicio-vertical` |

No evento ao vivo valem os mesmos campos, mais `alvo`: o `id` de uma fonte, ou `inicio`/`fim` para atingir todas as fontes naquela tela. Sem `alvo`, todas as telas abertas recebem a mudança. Mandar `ate` ou `min` vazios (`""`) desliga a contagem.

## Preparar o OBS (uma vez só)

Depois destes passos, você não precisa mais abrir as propriedades das fontes.

1. **Ligue o WebSocket:** Ferramentas → Configurações do servidor WebSocket → Ativar, porta `4455`, com senha. O app conecta em `ws://IP-do-PC:4455`.
2. **Junte os overlays numa pasta fixa**, por exemplo `C:\Overlays\Pederas\`. Não mude essa pasta de lugar depois, porque as URLs apontam para ela.
3. **Crie cada fonte de navegador com "Arquivo local" DESMARCADO.** Escreva o caminho no campo URL: `file:///C:/Overlays/Pederas/telas-live.html?tela=inicio&id=inicio-vertical`. Com "Arquivo local" marcado, o OBS ignora tudo depois do `?`.
4. **Dê nomes fixos às fontes:** o app encontra cada fonte pelo nome. Sugestão: `Tela Início (V)`, `Tela Fim (V)`, `Tela Início (H)`, `Tela Fim (H)`, `Board Canais`, `Cena Vertical`.
5. **Coloque um `id` em cada tela** (`id=inicio-vertical`, `id=fim-horizontal`...). Isso permite que um evento ao vivo atinja só uma delas.
6. **Ajuste o tamanho de cada fonte** de acordo com a tabela acima.
7. **Desmarque "Desligar a fonte quando não estiver visível"** nas telas de início e fim. Assim a página continua aberta e recebe os eventos mesmo fora da cena atual.

**Mudança em relação ao que eu tinha dito antes:** deixe **desmarcado** "Atualizar navegador quando a cena ficar ativa". Com essa opção ligada, toda troca de cena recarrega a página pela URL e desfaz o que o app mandou ao vivo. Use `ate=` para a contagem, que segue o relógio e não depende disso.

## Caminho A: ler e salvar a URL da fonte

O app lê a URL com `GetInputSettings`, transforma os parâmetros em campos de formulário e grava a URL nova com `SetInputSettings`. O OBS recarrega a fonte na hora, então a animação de entrada toca de novo. Esse caminho funciona com **todos** os overlays.

```javascript
// obs-websocket-js v5  (npm i obs-websocket-js)
import OBSWebSocket from 'obs-websocket-js';

export const obs = new OBSWebSocket();
await obs.connect('ws://192.168.0.10:4455', 'SUA_SENHA');

// 1. Lista as fontes de navegador, para montar o menu do app
export async function listarOverlays() {
  const { inputs } = await obs.call('GetInputList', { inputKind: 'browser_source' });
  return inputs.map(i => i.inputName);
}

// 2. Lê os parâmetros atuais de uma fonte -> { tela: 'inicio', titulo: '...', ate: '20:30' }
export async function lerParametros(fonte) {
  const { inputSettings } = await obs.call('GetInputSettings', { inputName: fonte });
  if (inputSettings.is_local_file || !inputSettings.url) {
    throw new Error(`"${fonte}": desmarque "Arquivo local" e use a URL file:///`);
  }
  return Object.fromEntries(new URL(inputSettings.url).searchParams);
}

// 3. Grava mudanças na URL (valor vazio ou null remove o parâmetro). O OBS recarrega a fonte.
export async function salvarParametros(fonte, mudancas) {
  const { inputSettings } = await obs.call('GetInputSettings', { inputName: fonte });
  const url = new URL(inputSettings.url);
  for (const [k, v] of Object.entries(mudancas)) {
    if (v === null || v === '') url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  await obs.call('SetInputSettings', { inputName: fonte, inputSettings: { url: url.toString() } });
}
```

Exemplo de uso: `await salvarParametros('Tela Início (V)', { titulo: 'Hoje tem|Rivals', ate: '20:30', min: null })`.

O `URL` do JavaScript cuida da codificação: espaço vira `+`, `|` vira `%7C`, acentos viram `%C3%A9` e assim por diante. A página decodifica tudo sozinha.

## Caminho B: atualizar ao vivo, sem recarregar

O plugin de navegador do OBS (`obs-browser`) aceita o pedido `emit_event`, que entrega um evento JavaScript a todas as fontes de navegador abertas. As telas de início e fim escutam o evento `pederas`: o texto troca com uma animação curta, e a contagem continua de onde estava.

```javascript
// manda uma mudança ao vivo para as telas de início/fim
export async function atualizarAoVivo(dados) {
  await obs.call('CallVendorRequest', {
    vendorName: 'obs-browser',
    requestType: 'emit_event',
    requestData: { event_name: 'pederas', event_data: dados },
  });
}

// só a tela de início vertical (id=inicio-vertical na URL dela)
await atualizarAoVivo({ alvo: 'inicio-vertical', titulo: 'Hoje tem|Rivals', ate: '20:30' });

// todas as telas de início abertas, vertical e horizontal juntas
await atualizarAoVivo({ alvo: 'inicio', sub: 'Faltam 5 min, chama a galera!' });

// vira a tela para "fim" (carrega os textos padrão do fim) sem trocar de fonte
await atualizarAoVivo({ alvo: 'inicio-vertical', tela: 'fim' });
```

O que a página faz ao receber o evento:

- Ignora o evento se `alvo` não bater com o `id` dela nem com a tela que ela está mostrando.
- Muda só os campos que vieram no evento e mantém o resto.
- Recalcula a contagem só se vier `ate` ou `min`. Campo vazio desliga a contagem.
- Com `tela`, recarrega os textos padrão daquela tela e aplica o resto do evento por cima.

O limite é que o evento não fica salvo em lugar nenhum. Se a fonte for recarregada (por você, por um `SetInputSettings` ou se o OBS reiniciar), ela volta ao que está na URL. Por isso o app junta os dois caminhos, como explicado na próxima seção.

## Montando a tela no app

A regra é simples: **se a fonte está no ar, muda ao vivo (B) e salva na URL (A) depois; se não está, salva direto na URL (A).** Assim nada pisca na frente do público e nada se perde num recarregamento.

&#91;embedded content: botão Aplicar · 1 decisão, 2 caminhos\]

No ar, o público vê a mudança na hora e a URL só é gravada quando a fonte sai de cena. Fora do ar, a URL é gravada direto.

### Formulário das telas de início e fim

| Campo no app | Tipo | Vira o parâmetro |
| --- | --- | --- |
| Tela | botões Início / Fim | `tela` |
| Linha de cima | texto curto | `topo` |
| Título | texto, com dica "use \| para quebrar a linha" | `titulo` |
| Frase de baixo | texto | `sub` |
| Contagem | opção Nenhuma / Minutos / Até horário | `min` ou `ate` (o outro vai vazio) |
| Texto quando zerar | texto curto | `fim` |
| Cor | seletor de cor | `cor` (sem `#`) |
| Aplicar em | lista: esta fonte / todas de início / todas de fim | `alvo` |

Ao abrir o formulário, preencha os campos com `lerParametros(fonte)`. Assim o app mostra o que já está configurado.

### O botão Aplicar

```javascript
const pendentes = new Map(); // fonte -> mudanças feitas ao vivo e ainda não salvas na URL

async function estaNoAr(fonte) {
  const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
  const { sceneItems } = await obs.call('GetSceneItemList', { sceneName: currentProgramSceneName });
  return sceneItems.some(i => i.sourceName === fonte && i.sceneItemEnabled);
}

export async function aplicar(fonte, idDaFonte, mudancas, { naVertical = false } = {}) {
  // na tela vertical do Aitum o OBS não informa a cena no ar: trata como "no ar" por segurança
  const noAr = naVertical || await estaNoAr(fonte);
  if (noAr) {
    await atualizarAoVivo({ alvo: idDaFonte, ...mudancas });
    pendentes.set(fonte, { ...(pendentes.get(fonte) || {}), ...mudancas });
  } else {
    await salvarParametros(fonte, mudancas);
  }
}

// quando a cena muda, salva na URL o que foi feito ao vivo nas fontes que saíram do ar
obs.on('CurrentProgramSceneChanged', async () => {
  for (const [fonte, mudancas] of pendentes) {
    if (!(await estaNoAr(fonte))) {
      await salvarParametros(fonte, mudancas);
      pendentes.delete(fonte);
    }
  }
});
```

Para as fontes da tela vertical (Aitum), coloque um botão **Salvar padrão**, que chama `salvarParametros` com as mudanças pendentes. Use esse botão quando a live vertical não estiver mostrando aquela tela, por exemplo antes de começar ou depois de encerrar.

No board de canais e na cena vertical, que ainda não escutam eventos, o app usa só `salvarParametros`. Nesses casos o recarregamento é rápido e quase não aparece.

## Checklist de teste e problemas comuns

- [ ] O app conecta no WebSocket e `listarOverlays()` traz as seis fontes pelo nome
- [ ] `lerParametros('Tela Início (V)')` devolve `tela`, `id` e os textos
- [ ] Com a tela fora do ar, `salvarParametros` troca o título e a fonte recarrega com ele
- [ ] Com a tela no ar, `atualizarAoVivo` troca o título sem piscar e a contagem continua
- [ ] Um evento com `alvo: 'fim-horizontal'` não mexe nas telas de início
- [ ] Depois de trocar de cena, o que foi mudado ao vivo continua lá ao voltar

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| `lerParametros` dá erro de "Arquivo local" | A fonte usa arquivo local | Desmarque "Arquivo local" e cole a URL `file:///...` |
| Os parâmetros não fazem efeito | "Arquivo local" marcado, ou um erro de digitação no nome do campo | Confira com `lerParametros`; os nomes são minúsculos e sem acento |
| O evento ao vivo não muda nada | `alvo` diferente do `id` da URL, ou a fonte desligada quando escondida | Mande sem `alvo` para testar; desmarque "Desligar a fonte quando não estiver visível" |
| A mudança ao vivo some ao trocar de cena | "Atualizar navegador quando a cena ficar ativa" ligado | Desmarque essa opção |
| A contagem recomeça sozinha | Usou `min`, e a fonte recarregou | Prefira `ate=HH:MM`, que segue o relógio |
| `CallVendorRequest` dá erro de vendor | OBS antigo, sem o pedido `emit_event` | Atualize o OBS para a versão mais recente |
