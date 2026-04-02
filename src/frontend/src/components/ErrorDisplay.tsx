import { AlertCircle } from "lucide-react";

export default function ErrorDisplay({
  message = "Something went wrong",
}: { message?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 gap-3"
      data-ocid="error_state"
    >
      <AlertCircle className="w-8 h-8" style={{ color: "var(--brand-red)" }} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
