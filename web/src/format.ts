export const fmtDuration = (s: number | null | undefined) => {
  if (s == null || !isFinite(s)) return "—";
  const total = Math.round(s);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return m ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s`;
};

export const fmtTarget = (s: number) => (s < 60 ? `${Math.round(s)}s` : s % 60 === 0 ? `${s / 60}m` : fmtDuration(s));

export const fmtBytes = (n: number | null | undefined) => {
  if (!n) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i ? 1 : 0)} ${units[i]}`;
};

export const fmtTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

export const fmtAgo = (ts: number) => {
  const d = Date.now() / 1000 - ts;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)} min ago`;
  if (d < 86400) return `${Math.floor(d / 3600)} h ago`;
  if (d < 86400 * 7) return `${Math.floor(d / 86400)} d ago`;
  return new Date(ts * 1000).toLocaleDateString();
};

export const fmtUntil = (iso: string | null) => {
  if (!iso) return "";
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  if (s <= 1) return "now";
  if (s < 60) return `in ${Math.ceil(s)}s`;
  return `in ${Math.ceil(s / 60)} min`;
};
