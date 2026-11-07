import { useEffect, useState } from 'react';
import { useOverlays } from '../hooks/useOverlays';
import { getOverlaySettings, saveOverlaySource } from '../utils/storage';

// Remove acentos e caixa pra comparar nomes de fonte ("Início" == "inicio").
function norm(s = '') {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Agrupa as fontes de navegador em início/fim pelo nome, e dentro de cada
// grupo separa a versão vertical (nome contém "vertical") da horizontal —
// assim "Inicio Live" e "Inicio Live Vertical" formam um par editado junto.
function classifyTelasSources(sources) {
  const inicio = [];
  const fim = [];
  for (const name of sources) {
    const n = norm(name);
    const vertical = n.includes('vertical');
    if (n.includes('inicio')) inicio.push({ name, vertical });
    else if (n.includes('fim')) fim.push({ name, vertical });
  }
  const bySort = (a, b) => Number(a.vertical) - Number(b.vertical);
  inicio.sort(bySort);
  fim.sort(bySort);
  return { inicio, fim };
}

// Overlays do Pederas — ver "Roteiro controlar os overlays do Pederas pelo
// app (OBS WebSocket).md" na raiz do projeto para o contrato completo.
const TABS = [
  { id: 'telas', label: 'Início / Fim' },
  { id: 'canais', label: 'Board de Canais' },
  { id: 'vertical', label: 'Cena Vertical' },
];

function telasParamsToForm(params) {
  let modoContagem = 'nenhuma';
  let valorContagem = '';
  if (params.ate) {
    modoContagem = 'horario';
    valorContagem = params.ate;
  } else if (params.min) {
    modoContagem = 'minutos';
    valorContagem = params.min;
  }
  return {
    tela: params.tela === 'fim' ? 'fim' : 'inicio',
    topo: params.topo || '',
    titulo: params.titulo || '',
    sub: params.sub || '',
    modoContagem,
    valorContagem,
    fim: params.fim || '',
    selo: params.selo || '',
    selosub: params.selosub || '',
    cor: params.cor || '',
    id: params.id || '',
  };
}

function telasFormToParams(form) {
  const out = {
    tela: form.tela,
    topo: form.topo,
    titulo: form.titulo,
    sub: form.sub,
    fim: form.fim,
    selo: form.selo,
    selosub: form.selosub,
    cor: form.cor,
  };
  if (form.modoContagem === 'minutos') {
    out.min = form.valorContagem;
    out.ate = '';
  } else if (form.modoContagem === 'horario') {
    out.ate = form.valorContagem;
    out.min = '';
  } else {
    out.min = '';
    out.ate = '';
  }
  return out;
}

const TELAS_EMPTY_FORM = telasParamsToForm({});

function StatusBanner({ status }) {
  if (!status) return null;
  const isError = status.startsWith('❌');
  return (
    <div className={`rounded-lg p-3 text-sm ${isError ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
      {status}
    </div>
  );
}

function SourcePicker({ sources, value, onChange, onAir }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm text-gray-300">Fonte no OBS</label>
        {value && onAir !== null && (
          <span className={`text-xs flex items-center gap-1 ${onAir ? 'text-green-400' : 'text-gray-500'}`}>
            <span className={`inline-block w-2 h-2 rounded-full ${onAir ? 'bg-green-500' : 'bg-gray-500'}`} />
            {onAir ? 'no ar' : 'fora do ar'}
          </span>
        )}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Selecione...</option>
        {sources.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

function TelasForm({ overlays, sources, connected }) {
  const [role, setRole] = useState('inicio'); // 'inicio' | 'fim' — decide o grupo de fontes
  const [form, setForm] = useState(TELAS_EMPTY_FORM);
  const [onAirMap, setOnAirMap] = useState({});
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const { inicio, fim } = classifyTelasSources(sources);
  const group = role === 'inicio' ? inicio : fim;

  const loadGroup = async (targetRole, targetGroup) => {
    setStatus('');
    if (targetGroup.length === 0) {
      setForm(TELAS_EMPTY_FORM);
      setOnAirMap({});
      return;
    }
    const primary = targetGroup.find((s) => !s.vertical) || targetGroup[0];
    try {
      const params = await overlays.readParams(primary.name);
      setForm({ ...telasParamsToForm(params), tela: targetRole });
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
    const airEntries = await Promise.all(
      targetGroup.map(async (s) => {
        if (s.vertical) return [s.name, true];
        const air = await overlays.isOnAir(s.name);
        return [s.name, air !== false];
      })
    );
    setOnAirMap(Object.fromEntries(airEntries));
  };

  useEffect(() => {
    if (connected) loadGroup(role, group);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, role, sources.join('|')]);

  const field = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Um botão só: atualiza ao vivo (sem piscar pra quem já está vendo) e já
  // grava + recarrega na URL em seguida, pros dois lados do par (horizontal
  // e vertical) de uma vez. O evento ao vivo não dá erro se não tiver
  // ninguém escutando, então manda sempre, sem checar se está no ar.
  const handleSave = async () => {
    if (group.length === 0) return;
    setBusy(true);
    setStatus('');
    try {
      const changes = telasFormToParams({ ...form, tela: role });
      for (const s of group) {
        await overlays.liveUpdate({ alvo: role, ...changes }).catch(() => {});
        await overlays.saveParams(s.name, changes);
      }
      setStatus(`✅ Salvo e atualizado: ${group.map((s) => s.name).join(', ')}`);
      loadGroup(role, group);
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-gray-500 flex flex-col gap-0.5">
        <span>Detectado pelo nome da fonte no OBS:</span>
        <span>🟢 Início: {inicio.length ? inicio.map((s) => s.name).join(', ') : 'nenhuma fonte com "inicio" no nome'}</span>
        <span>🔴 Fim: {fim.length ? fim.map((s) => s.name).join(', ') : 'nenhuma fonte com "fim" no nome'}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setRole('inicio')}
          className={`py-2 rounded-lg font-semibold ${
            role === 'inicio' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-300'
          }`}
        >
          🟢 Início
        </button>
        <button
          onClick={() => setRole('fim')}
          className={`py-2 rounded-lg font-semibold ${
            role === 'fim' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-300'
          }`}
        >
          🔴 Fim
        </button>
      </div>

      {group.length === 0 ? (
        <p className="text-center text-gray-400 text-sm bg-gray-900 rounded-xl p-4">
          Nenhuma fonte com "{role}" no nome. Confira o nome das fontes de navegador no OBS.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            {group.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between text-xs bg-gray-900 rounded-lg px-3 py-1.5"
              >
                <span className="text-gray-300">
                  {s.name}
                  {s.vertical && <span className="text-gray-500"> · vertical</span>}
                </span>
                <span className={`flex items-center gap-1 ${onAirMap[s.name] ? 'text-green-400' : 'text-gray-500'}`}>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      onAirMap[s.name] ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  />
                  {onAirMap[s.name] ? 'no ar' : 'fora do ar'}
                </span>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-300">Linha de cima</label>
            <input
              value={form.topo}
              onChange={field('topo')}
              placeholder="Peder4sGames"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-300">Título (use | para quebrar a linha)</label>
            <input
              value={form.titulo}
              onChange={field('titulo')}
              placeholder="Hoje tem|Rivals"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-300">Frase de baixo</label>
            <input
              value={form.sub}
              onChange={field('sub')}
              placeholder="Pega o lanche e chama a galera!"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-300">Contagem</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                ['nenhuma', 'Nenhuma'],
                ['minutos', 'Minutos'],
                ['horario', 'Até horário'],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setForm((f) => ({ ...f, modoContagem: val }))}
                  className={`py-1.5 rounded-lg text-sm font-medium ${
                    form.modoContagem === val ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.modoContagem !== 'nenhuma' && (
              <input
                value={form.valorContagem}
                onChange={field('valorContagem')}
                placeholder={form.modoContagem === 'minutos' ? '5' : '20:30'}
                className="w-full px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            )}
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-300">Texto quando a contagem zerar</label>
            <input
              value={form.fim}
              onChange={field('fim')}
              placeholder="JÁ!"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm mb-1 text-gray-300">Selo (sem contagem)</label>
              <input
                value={form.selo}
                onChange={field('selo')}
                placeholder="PRÓXIMA"
                className="w-full px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-300">Selo sub</label>
              <input
                value={form.selosub}
                onChange={field('selosub')}
                placeholder="até a"
                className="w-full px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-300">Cor de destaque</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={`#${form.cor || '19e6c8'}`}
                onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value.replace('#', '') }))}
                className="w-10 h-10 rounded bg-gray-800 border-none cursor-pointer"
              />
              <input
                value={form.cor}
                onChange={field('cor')}
                placeholder="19e6c8"
                className="flex-1 px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={busy}
            className="py-3 rounded-xl font-bold text-white bg-blue-700 active:bg-blue-800 disabled:opacity-50"
          >
            {busy ? '...' : '💾 Salvar'}
          </button>

          <StatusBanner status={status} />
        </>
      )}
    </div>
  );
}

function SimpleOverlayForm({ overlays, sources, role, fields }) {
  const [sourceName, setSourceName] = useState(() => getOverlaySettings().sources[role] || '');
  const [form, setForm] = useState({});
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const loadSource = async (name) => {
    setStatus('');
    if (!name) return;
    try {
      const params = await overlays.readParams(name);
      const next = {};
      for (const f of fields) next[f.key] = params[f.key] ?? (f.type === 'checkbox' ? '' : '');
      setForm(next);
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  };

  const handleSourceChange = (name) => {
    setSourceName(name);
    saveOverlaySource(role, name);
    loadSource(name);
  };

  const field = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? (e.target.checked ? 'true' : '') : e.target.value }));

  const handleSave = async () => {
    if (!sourceName) return;
    setBusy(true);
    setStatus('');
    try {
      await overlays.saveParams(sourceName, form);
      setStatus('✅ Salvo — a fonte recarregou');
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <SourcePicker sources={sources} value={sourceName} onChange={handleSourceChange} onAir={null} />

      {sourceName &&
        fields.map((f) => (
          <div key={f.key}>
            {f.type === 'checkbox' ? (
              <label className="flex items-center gap-2 text-white select-none">
                <input type="checkbox" checked={form[f.key] === 'true'} onChange={field(f.key)} className="w-4 h-4" />
                {f.label}
              </label>
            ) : (
              <>
                <label className="block text-sm mb-1 text-gray-300">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={form[f.key] || ''}
                  onChange={field(f.key)}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </>
            )}
          </div>
        ))}

      {sourceName && (
        <button
          onClick={handleSave}
          disabled={busy}
          className="py-3 rounded-xl font-bold text-white bg-blue-700 active:bg-blue-800 disabled:opacity-50"
        >
          {busy ? '...' : '💾 Salvar'}
        </button>
      )}

      <StatusBanner status={status} />
    </div>
  );
}

const CANAIS_FIELDS = [
  { key: 'youtube', label: 'Canal do YouTube', placeholder: '@Peder4sGames' },
  { key: 'twitch', label: 'Canal da Twitch', placeholder: 'peder4sgames' },
  { key: 'kick', label: 'Canal da Kick', placeholder: 'peder4sgames' },
  { key: 'titulo', label: 'Título do board', placeholder: 'Me segue em todo canto!' },
  { key: 'escala', label: 'Escala', placeholder: '1' },
  { key: 'parado', label: 'Parar o giro', type: 'checkbox' },
  { key: 'giro', label: 'Duração do giro (segundos)', placeholder: '8' },
];

const VERTICAL_FIELDS = [
  { key: 'fundo', label: 'Fundo', placeholder: 'nome do fundo' },
  { key: 'cor', label: 'Cor', placeholder: '19e6c8' },
  { key: 'guia', label: 'Mostrar guia', type: 'checkbox' },
];

export default function OverlaysView({ obs }) {
  const overlays = useOverlays(obs);
  const [tab, setTab] = useState('telas');
  const [sources, setSources] = useState([]);

  useEffect(() => {
    if (!obs.connected) {
      setSources([]);
      return;
    }
    overlays.listOverlays().then(setSources);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obs.connected]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-2 rounded-lg text-sm font-semibold ${
                tab === t.id ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {sources.length === 0 && (
          <p className="text-center text-gray-400 text-sm bg-gray-900 rounded-xl p-4">
            {obs.connected
              ? 'Nenhuma fonte de navegador encontrada no OBS.'
              : 'Conecte ao OBS para ver as fontes dos overlays.'}
          </p>
        )}

        {tab === 'telas' && <TelasForm overlays={overlays} sources={sources} connected={obs.connected} />}
        {tab === 'canais' && (
          <SimpleOverlayForm overlays={overlays} sources={sources} role="rodaCanais" fields={CANAIS_FIELDS} />
        )}
        {tab === 'vertical' && (
          <SimpleOverlayForm overlays={overlays} sources={sources} role="cenaVertical" fields={VERTICAL_FIELDS} />
        )}
      </div>
    </div>
  );
}
