import { useEffect } from 'react';

interface Props { message: string; onClose: () => void }

export default function Toast({ message, onClose }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div className="toast">{message}</div>
  );
}
