'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { AppNotification } from '@/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface Props {
  /** トースト出現時のコールバック（任意） */
  onNewNotification?: (n: AppNotification) => void;
}

function fmtTime(iso: string) {
  try {
    return format(new Date(iso), 'M/d HH:mm', { locale: ja });
  } catch {
    return iso;
  }
}

export function NotificationCenter({ onNewNotification }: Props) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data: AppNotification[] = await res.json();
      if (!Array.isArray(data)) return;

      // 新しく現れた通知のみトーストとブラウザ通知を出す
      if (initialized.current) {
        const fresh = data.filter((n) => !seenIds.current.has(n.id));
        for (const n of fresh) {
          showToast(n);
          showBrowserNotification(n);
          onNewNotification?.(n);
        }
      }
      data.forEach((n) => seenIds.current.add(n.id));
      initialized.current = true;
      setItems(data);
    } catch {
      /* ignore */
    }
  }, [onNewNotification]);

  // 初回 + 15秒ごとにポーリング
  useEffect(() => {
    fetchItems();
    const id = setInterval(fetchItems, 15_000);
    return () => clearInterval(id);
  }, [fetchItems]);

  // ブラウザ通知の権限状態
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const requestBrowserPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setBrowserPermission(perm);
  };

  const showToast = (n: AppNotification) => {
    const toast: ToastItem = {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
    };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 6000);
  };

  const showBrowserNotification = (n: AppNotification) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification(n.title, {
        body: n.message,
        icon: '/favicon.ico',
        tag: n.id,
      });
    } catch {
      /* ignore */
    }
  };

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' });
    fetchItems();
  };

  const handleClearAll = async () => {
    if (!confirm('全ての通知を削除しますか？')) return;
    await fetch('/api/notifications?all=1', { method: 'DELETE' });
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    fetchItems();
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <>
      {/* ベルボタン */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="通知"
      >
        <span className="text-xl">{unreadCount > 0 ? '🔔' : '🔕'}</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 通知パネル */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-2 sm:right-4 top-14 z-40 w-[calc(100vw-1rem)] sm:w-96 max-h-[70vh] bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <h3 className="text-sm font-bold text-gray-800">🔔 通知</h3>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                  className="text-purple-600 hover:underline disabled:text-gray-300 disabled:no-underline"
                >
                  全て既読
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={items.length === 0}
                  className="text-red-500 hover:underline disabled:text-gray-300 disabled:no-underline"
                >
                  クリア
                </button>
              </div>
            </div>

            {/* ブラウザ通知の許可リクエスト */}
            {browserPermission === 'default' && (
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-xs flex items-center justify-between">
                <span className="text-blue-800">🔔 ブラウザ通知をON</span>
                <button
                  onClick={requestBrowserPermission}
                  className="text-blue-600 font-medium hover:underline"
                >
                  許可する
                </button>
              </div>
            )}
            {browserPermission === 'denied' && (
              <div className="px-4 py-2 bg-orange-50 border-b border-orange-200 text-xs text-orange-800">
                ⚠️ ブラウザ通知がブロックされています
              </div>
            )}
            {browserPermission === 'granted' && (
              <div className="px-4 py-2 bg-green-50 border-b border-green-200 text-xs text-green-800">
                ✅ ブラウザ通知が有効です
              </div>
            )}

            <div className="overflow-y-auto flex-1">
              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <p className="text-3xl mb-2">📭</p>
                  通知はありません
                </div>
              ) : (
                <div>
                  {items.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                        !n.read ? 'bg-purple-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {!n.read && (
                            <span className="w-2 h-2 bg-purple-600 rounded-full shrink-0" />
                          )}
                          <p className={`text-sm font-medium ${
                            n.type === 'error' ? 'text-red-700' :
                            n.type === 'success' ? 'text-green-700' : 'text-gray-800'
                          }`}>
                            {n.title}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="text-gray-300 hover:text-red-500 text-xs shrink-0"
                          aria-label="削除"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 break-words">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {fmtTime(n.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* トースト */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl shadow-2xl px-4 py-3 border animate-slide-up ${
              t.type === 'success'
                ? 'bg-green-50 border-green-300 text-green-900'
                : t.type === 'error'
                ? 'bg-red-50 border-red-300 text-red-900'
                : 'bg-blue-50 border-blue-300 text-blue-900'
            }`}
          >
            <p className="text-sm font-bold mb-0.5">{t.title}</p>
            <p className="text-xs break-words">{t.message}</p>
          </div>
        ))}
      </div>
    </>
  );
}
