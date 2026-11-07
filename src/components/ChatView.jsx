import { useEffect, useRef } from 'react';

const PLATFORM_BADGE = {
  twitch: { icon: '🟣', label: 'Twitch' },
  youtube: { icon: '🔴', label: 'YouTube' },
};

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatView({ sb, embed = false }) {
  const scrollRef = useRef(null);

  // No modo embed (fonte de navegador do OBS) o fundo precisa ser
  // transparente, não a cor de fundo padrão do app.
  useEffect(() => {
    if (!embed) return undefined;
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'transparent';
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, [embed]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sb.chatMessages]);

  return (
    <div className={`flex flex-col h-full min-h-0 ${embed ? '' : 'bg-gray-950'}`}>
      {!embed && (
        <div className="flex items-center justify-between px-4 py-2 text-gray-400 text-xs border-b border-gray-800">
          <span>
            {sb.enabled
              ? sb.connected
                ? 'Recebendo chat do Streamer.bot'
                : 'Aguardando conexão com o Streamer.bot...'
              : 'Conector do Streamer.bot está desligado (ative em Configurações).'}
          </span>
          <button
            onClick={sb.clearChat}
            className="px-2 py-1 rounded bg-gray-800 active:bg-gray-700"
          >
            Limpar
          </button>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1">
        {sb.chatMessages.map((m) => {
          const badge = PLATFORM_BADGE[m.platform] || { icon: '💬', label: m.platform };
          return (
            <div
              key={m.id}
              className="text-[15px] leading-snug break-words"
              style={{ textShadow: embed ? '0 1px 3px rgba(0,0,0,0.9)' : 'none' }}
            >
              <span className="mr-1" title={badge.label}>{badge.icon}</span>
              {!embed && (
                <span className="text-gray-500 text-xs mr-1">{formatTime(m.timestamp)}</span>
              )}
              {m.isMod && <span className="mr-1" title="Moderador">🛡️</span>}
              {m.isSub && <span className="mr-1" title="Inscrito/Membro">⭐</span>}
              <span
                className="font-bold"
                style={{ color: m.color || (embed ? '#ffffff' : '#e5e7eb') }}
              >
                {m.username}
              </span>
              <span className={embed ? 'text-white' : 'text-gray-200'}>
                {': '}
                {m.isAction ? <em>{m.text}</em> : m.text}
              </span>
            </div>
          );
        })}
        {sb.chatMessages.length === 0 && !embed && (
          <p className="text-gray-600 text-sm text-center mt-8">
            Nenhuma mensagem ainda. Mande um "oi" no chat da Twitch/YouTube pra testar.
          </p>
        )}
      </div>
    </div>
  );
}
