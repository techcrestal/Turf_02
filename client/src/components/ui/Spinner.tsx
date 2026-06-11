interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function Spinner({ size = 'md' }: SpinnerProps) {
  const classes = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-5 w-5' : 'h-8 w-8';
  return <div className={`animate-spin rounded-full border-4 border-slate-200 border-t-accent ${classes}`} />;
}
