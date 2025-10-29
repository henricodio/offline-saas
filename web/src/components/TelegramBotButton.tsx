'use client';

import { MessageCircle, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TelegramBotButton() {
  const [botUrl, setBotUrl] = useState<string>('');

  useEffect(() => {
    // Obtener el nombre del bot desde variables de entorno
    const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (username) {
      setBotUrl(`https://t.me/${username}`);
    }
  }, []);

  if (!botUrl) {
    return null;
  }

  const handleOpenBot = () => {
    // Abrir directamente en Telegram Web (más confiable)
    if (botUrl) {
      window.open(botUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <button
      onClick={handleOpenBot}
      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-medium transition-all hover:shadow-lg"
      title="Abrir bot de Telegram"
    >
      <MessageCircle size={18} />
      <span>🤖 Abrir Bot</span>
      <ExternalLink size={14} className="opacity-75" />
    </button>
  );
}
