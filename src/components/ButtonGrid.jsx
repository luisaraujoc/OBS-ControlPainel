import SoundButton from './SoundButton';

export default function ButtonGrid({ buttons, onTrigger, onEdit }) {
  return (
    <div className="soundboard-grid grid grid-cols-4 content-start gap-2 p-2 flex-1 min-h-0 overflow-y-auto">
      {buttons.map((button) => (
        <SoundButton key={button.id} button={button} onTrigger={onTrigger} onEdit={onEdit} />
      ))}
    </div>
  );
}
