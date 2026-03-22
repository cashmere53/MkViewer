type WatchStatus = "watching" | "missing" | "idle";

type StatusBarProps = {
  path: string;
  updatedAt: number | null;
  watchStatus: WatchStatus;
};

export function StatusBar({ path, updatedAt, watchStatus }: StatusBarProps) {
  const statusLabel =
    watchStatus === "watching" ? "Watching" : watchStatus === "missing" ? "Missing" : "Idle";

  const timeLabel = updatedAt
    ? new Date(updatedAt).toLocaleTimeString()
    : "-";

  return (
    <footer className="status-bar">
      <span className="status-item">{path || "No file selected"}</span>
      <span className="status-item">Updated: {timeLabel}</span>
      <span className={`status-dot status-${watchStatus}`}>{statusLabel}</span>
    </footer>
  );
}
