export const KNOWN_KINDS = {
  monitor_capture: { label: 'Captura de Tela', icon: '🖥️', pickerProperty: 'monitor_id' },
  window_capture: { label: 'Captura de Janela', icon: '🪟', pickerProperty: 'window' },
  game_capture: { label: 'Captura de Jogo', icon: '🎮', pickerProperty: 'window' },
  wasapi_process_output_capture: { label: 'Áudio de Aplicativo (BETA)', icon: '🎧', pickerProperty: 'window' },
  wasapi_input_capture: { label: 'Captura de Áudio (Microfone)', icon: '🎙️' },
  wasapi_output_capture: { label: 'Captura de Áudio (Desktop)', icon: '🔈' },
  browser_source: { label: 'Navegador', icon: '🌐' },
  image_source: { label: 'Imagem', icon: '🖼️' },
  ffmpeg_source: { label: 'Mídia', icon: '🎞️' },
  text_gdiplus_v3: { label: 'Texto', icon: '🔤' },
  dshow_input: { label: 'Dispositivo de Vídeo', icon: '📷' },
  color_source_v3: { label: 'Cor Sólida', icon: '🎨' },
};

export function describeKind(kind) {
  return KNOWN_KINDS[kind] || { label: kind, icon: '❓' };
}
