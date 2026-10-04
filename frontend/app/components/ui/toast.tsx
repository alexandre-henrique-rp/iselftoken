import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useToast } from "~/context/ToastContext";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] animate-in slide-in-from-right"
          style={{
            backgroundColor: toast.type === "error" ? "#7f1d1d" : toast.type === "success" ? "#14532d" : "#1e293b",
            border: toast.type === "error" ? "1px solid #ef4444" : toast.type === "success" ? "1px solid #22c55e" : "1px solid #64748b",
          }}
        >
          {toast.type === "error" && <AlertCircle className="w-5 h-5 text-red-400" />}
          {toast.type === "success" && <CheckCircle className="w-5 h-5 text-green-400" />}
          {toast.type === "info" && <Info className="w-5 h-5 text-blue-400" />}
          
          <p className="flex-1 text-sm font-medium text-white">{toast.message}</p>
          
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}