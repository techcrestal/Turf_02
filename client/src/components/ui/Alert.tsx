interface AlertProps {
  title?: string;
  message: string;
  variant?: 'danger' | 'info';
}

export default function Alert({ title, message, variant = 'danger' }: AlertProps) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${variant === 'danger' ? 'border-red-300 bg-red-50 text-red-800' : 'border-slate-300 bg-slate-50 text-slate-900'}`}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <p>{message}</p>
    </div>
  );
}
