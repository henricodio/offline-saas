'use client';

import { MessageCircle, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TelegramBotButton() {
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [botUrl, setBotUrl] = useState<string>('');

  useEffect(() => {
    // Obtener el nombre del bot desde variables de entorno
    const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (username) {
      setBotUsername(username);
      setBotUrl(`https://t.me/${username}`);
    }
  }, []);

  if (!botUrl) {
    return null;
  }

  const handleOpenBot = () => {
    // Intentar abrir en Telegram app primero, luego en web
    const telegramAppUrl = `tg://resolve?domain=${botUsername}`;
    const telegramWebUrl = botUrl;

    // Intentar abrir en app
    const link = document.createElement('a');
    link.href = telegramAppUrl;
    link.click();

    // Si no funciona, abrir en web después de 1 segundo
    setTimeout(() => {
      window.open(telegramWebUrl, '_blank');
    }, 1000);
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
