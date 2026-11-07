import { useCallback, useEffect, useRef, useState } from 'react';
import { logError, logInfo, logWarn } from '../utils/logger';
import { getStreamerBotSettings, saveStreamerBotSettings } from '../utils/storage';

const RECONNECT_DELAY_MS = 3000;
const REQUEST_TIMEOUT_MS = 10000;
const MAX_CHAT_MESSAGES = 200;

// Normaliza os eventos de chat da Twitch e do YouTube pro mesmo formato,
// pra renderizar os dois na mesma lista sem o componente saber da diferença.
function normalizeChatMessage(msg) {
  const source = msg?.event?.source;
  const type = msg?.event?.type;
  const data = msg?.data || {};

  if (source === 'Twitch' && type === 'ChatMessage') {
    const user = data.user || {};
    return {
      platform: 'twitch',
      username: user.name || user.login || 'Desconhecido',
      color: user.color || null,
      text: data.text || '',
      isAction: !!data.meta?.isMe,
      isSub: !!user.subscribed,
      isMod: (user.badges || []).some((b) => b.name === 'moderator'),
      timestamp: msg.timeStamp || new Date().toISOString(),
    };
  }

  if (source === 'YouTube' && type === 'Message') {
    const user = data.user || {};
    return {
      platform: 'youtube',
      username: user.name || user.login || 'Desconhecido',
      color: null,
      text: data.message || '',
      isAction: false,
      isSub: !!user.isSponsor,
      isMod: !!user.isModerator,
      timestamp: data.publishedAt || msg.timeStamp || new Date().toISOString(),
    };
  }

  return null;
}

// Deriva o endereço do Streamer.bot: mesmo host do OBS, porta própria, sem auth.
export function streamerBotUrlFromObs(obsUrl, port) {
  let host = '127.0.0.1';
  try {
    host = new URL(obsUrl).hostname || host;
  } catch {
    const m = String(obsUrl || '').match(/^(?:wss?:\/\/)?([^/:]+)/i);
    if (m) host = m[1];
  }
  return `ws://${host}:${port || 4456}/`;
}

const IDLE_INFO = { name: null, version: null, os: null, instanceId: null };

export function useStreamerBot({ obsUrl }) {
  const [settings, setSettings] = useState(getStreamerBotSettings);
  const [connected, setConnected] = useState(false);
  const [info, setInfo] = useState(IDLE_INFO);
  const [actions, setActions] = useState([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);

  const wsRef = useRef(null);
  const pendingRef = useRef(new Map());
  const listenersRef = useRef(new Set());
  const reqIdRef = useRef(0);
  const chatIdRef = useRef(0);

  const wsUrl = streamerBotUrlFromObs(obsUrl, settings.port);
  const enabled = settings.enabled !== false;

  // ---- envio de requests com correlação por id ---------------------------
  const sendRequest = useCallback((request, extra) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error(`Streamer.bot não conectado (request: ${request})`));
    }
    reqIdRef.current += 1;
    const id = `sb-${reqIdRef.current}`;
    const payload = { request, id, ...(extra || {}) };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingRef.current.delete(id);
        reject(new Error(`Streamer.bot: timeout aguardando resposta de "${request}".`));
      }, REQUEST_TIMEOUT_MS);
      pendingRef.current.set(id, { resolve, reject, timer });
      try {
        ws.send(JSON.stringify(payload));
      } catch (err) {
        clearTimeout(timer);
        pendingRef.current.delete(id);
        reject(err);
      }
    });
  }, []);

  // ---- API de alto nível ------------------------------------------------
  const getInfo = useCallback(async () => {
    const res = await sendRequest('GetInfo');
    return res?.info || res?.data || {};
  }, [sendRequest]);

  const refreshActions = useCallback(async () => {
    setLoadingActions(true);
    try {
      const res = await sendRequest('GetActions');
      const list = (res?.actions || []).map((a) => ({
        id: a.id,
        name: a.name,
        group: a.group || '',
        enabled: a.enabled !== false,
        subCount: a.subaction_count ?? 0,
      }));
      list.sort(
        (a, b) =>
          a.group.localeCompare(b.group, 'pt-BR') ||
          a.name.localeCompare(b.name, 'pt-BR')
      );
      setActions(list);
      logInfo(`Streamer.bot: ${list.length} ação(ões) carregada(s).`);
      return list;
    } catch (err) {
      logError(`Streamer.bot: falha ao listar ações — ${err?.message || err}`);
      return [];
    } finally {
      setLoadingActions(false);
    }
  }, [sendRequest]);

  const doAction = useCallback(
    async (id, name, args) => {
      try {
        await sendRequest('DoAction', {
          action: { id, name },
          args: args || {},
        });
        logInfo(`Streamer.bot: ação "${name || id}" disparada.`);
        return true;
      } catch (err) {
        logError(`Streamer.bot: falha ao disparar "${name || id}" — ${err?.message || err}`);
        return false;
      }
    },
    [sendRequest]
  );

  const subscribe = useCallback(
    (events) => sendRequest('Subscribe', { events }),
    [sendRequest]
  );

  const onEvent = useCallback((handler) => {
    listenersRef.current.add(handler);
    return () => listenersRef.current.delete(handler);
  }, []);

  const clearChat = useCallback(() => setChatMessages([]), []);

  // ---- ciclo de vida da conexão ---------------------------------------
  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      setInfo(IDLE_INFO);
      setActions([]);
      return undefined;
    }

    let disposed = false;
    let reconnectTimer = null;
    let ws = null;

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, RECONNECT_DELAY_MS);
    };

    const flushPending = (reason) => {
      for (const [, p] of pendingRef.current) {
        clearTimeout(p.timer);
        p.reject(new Error(reason));
      }
      pendingRef.current.clear();
    };

    const connect = () => {
      if (disposed) return;
      logInfo(`Streamer.bot: conectando a ${wsUrl}...`);
      try {
        ws = new WebSocket(wsUrl);
      } catch (err) {
        logError(`Streamer.bot: URL inválida (${wsUrl}) — ${err?.message || err}`);
        return;
      }
      wsRef.current = ws;

      ws.onopen = async () => {
        if (disposed) return;
        setConnected(true);
        logInfo('Streamer.bot: WebSocket aberto.');
        try {
          const i = await getInfo();
          if (disposed) return;
          setInfo({
            name: i.name || null,
            version: i.version || null,
            os: i.os || null,
            instanceId: i.instanceId || null,
          });
          logInfo(
            `Streamer.bot detectado: ${i.name || '?'} v${i.version || '?'} (${i.os || '?'}).`
          );
          await refreshActions();
          try {
            await subscribe({ Twitch: ['ChatMessage'], YouTube: ['Message'] });
            logInfo('Streamer.bot: inscrito nos eventos de chat (Twitch/YouTube).');
          } catch (err) {
            logWarn(`Streamer.bot: falha ao inscrever no chat — ${err?.message || err}`);
          }
        } catch (err) {
          logWarn(`Streamer.bot: conectou mas não respondeu ao GetInfo — ${err?.message || err}`);
        }
      };

      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        // Resposta a um request nosso
        if (msg.id && pendingRef.current.has(msg.id)) {
          const p = pendingRef.current.get(msg.id);
          pendingRef.current.delete(msg.id);
          clearTimeout(p.timer);
          if (msg.status === 'ok' || msg.status === undefined) p.resolve(msg);
          else p.reject(new Error(msg.error || msg.status || 'erro do Streamer.bot'));
          return;
        }
        // Mensagem "Hello" enviada pelo servidor ao conectar
        if (msg.request === 'Hello' || (msg.data && msg.data.version && !msg.event)) {
          const d = msg.data || {};
          setInfo((prev) => ({
            name: d.name || prev.name,
            version: d.version || prev.version,
            os: d.os || prev.os,
            instanceId: d.instanceId || prev.instanceId,
          }));
          return;
        }
        // Evento do Streamer.bot (Twitch/YouTube/General/Raw/...)
        if (msg.event) {
          const chatMsg = normalizeChatMessage(msg);
          if (chatMsg) {
            chatIdRef.current += 1;
            const withId = { ...chatMsg, id: chatIdRef.current };
            setChatMessages((prev) => {
              const next = [...prev, withId];
              return next.length > MAX_CHAT_MESSAGES
                ? next.slice(next.length - MAX_CHAT_MESSAGES)
                : next;
            });
          }
          for (const listener of listenersRef.current) {
            try {
              listener(msg);
            } catch (err) {
              logError(`Streamer.bot: handler de evento falhou — ${err?.message || err}`);
            }
          }
        }
      };

      ws.onerror = () => {
        // onclose sempre vem em seguida; o log fica lá pra não duplicar
      };

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        setConnected(false);
        flushPending('Streamer.bot: conexão fechada.');
        if (!disposed) {
          logWarn(`Streamer.bot: conexão fechada, tentando de novo em ${RECONNECT_DELAY_MS / 1000}s...`);
          scheduleReconnect();
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      flushPending('Streamer.bot: conector reiniciado.');
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.onopen = null;
        try {
          ws.close();
        } catch {
          // já fechado
        }
      }
      wsRef.current = null;
      setConnected(false);
    };
  }, [enabled, wsUrl, getInfo, refreshActions, subscribe]);

  const updateSettings = useCallback((patch) => {
    const merged = saveStreamerBotSettings(patch);
    setSettings(merged);
  }, []);

  const testConnection = useCallback((url) => {
    return new Promise((resolve) => {
      let done = false;
      let test;
      const finish = (result) => {
        if (done) return;
        done = true;
        try {
          test.onopen = test.onerror = test.onclose = test.onmessage = null;
          test.close();
        } catch {
          // ignora
        }
        resolve(result);
      };
      const timer = setTimeout(() => finish({ ok: false, error: 'Timeout (sem resposta em 5s).' }), 5000);
      try {
        test = new WebSocket(url);
      } catch (err) {
        clearTimeout(timer);
        resolve({ ok: false, error: err?.message || String(err) });
        return;
      }
      test.onopen = () => {
        test.send(JSON.stringify({ request: 'GetInfo', id: 'sb-test' }));
      };
      test.onmessage = (ev) => {
        clearTimeout(timer);
        try {
          const msg = JSON.parse(ev.data);
          const i = msg?.info || msg?.data || {};
          finish({ ok: true, info: i });
        } catch {
          finish({ ok: true, info: {} });
        }
      };
      test.onerror = () => {
        clearTimeout(timer);
        finish({ ok: false, error: `Não foi possível conectar em ${url}. O WebSocket Server do Streamer.bot está ligado nessa porta?` });
      };
    });
  }, []);

  return {
    settings,
    updateSettings,
    wsUrl,
    enabled,
    connected,
    info,
    actions,
    loadingActions,
    refreshActions,
    doAction,
    subscribe,
    onEvent,
    sendRequest,
    testConnection,
    chatMessages,
    clearChat,
  };
}
