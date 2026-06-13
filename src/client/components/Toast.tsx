/**
 * Transient toast rendered via the shared `.toast` pill class. Renders nothing
 * when there is no active message. Driven by the `useToast` hook.
 */
interface ToastProps {
  message: string | null;
  onDismiss?: () => void;
}

export default function Toast({ message, onDismiss }: ToastProps) {
  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite" onClick={onDismiss}>
      {message}
    </div>
  );
}
