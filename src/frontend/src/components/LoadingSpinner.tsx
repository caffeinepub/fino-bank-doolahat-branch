import { Loader2 } from "lucide-react";

export default function LoadingSpinner({
  text = "Loading...",
}: { text?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 gap-3"
      data-ocid="loading_state"
    >
      <Loader2
        className="w-8 h-8 animate-spin"
        style={{ color: "var(--brand-red)" }}
      />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
