export function Brand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-950">
        <span className="font-mono text-[11px] font-bold text-white tracking-tighter">io</span>
      </div>
      <span className="font-semibold tracking-tight text-slate-950">
        Insight<span className="text-violet-600">Ops</span>
      </span>
    </div>
  );
}
