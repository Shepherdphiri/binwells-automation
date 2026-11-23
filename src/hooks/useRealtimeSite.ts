import {useCallback, useEffect, useRef, useState} from 'react';
import type {
  BrandSettings,
  FaqItem,
  GalleryImage,
  NewsItem,
  PublicSiteState,
  QuoteInquiry,
  ServiceItem,
} from '../types.ts';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting';

interface RealtimeHookOptions {
  adminToken: string | null;
  onAdminInquiryCreated?: (inquiry: QuoteInquiry) => void;
}

export function useRealtimeSite({adminToken, onAdminInquiryCreated}: RealtimeHookOptions) {
  const [siteState, setSiteState] = useState<PublicSiteState | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [lastEventTime, setLastEventTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const adminTokenRef = useRef<string | null>(adminToken);
  const onAdminInquiryRef = useRef(onAdminInquiryCreated);

  adminTokenRef.current = adminToken;
  onAdminInquiryRef.current = onAdminInquiryCreated;

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch('/api/state', {cache: 'no-store'});
      if (!res.ok) throw new Error('Unable to load site configuration.');
      const data = (await res.json()) as PublicSiteState;
      setSiteState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error loading site.');
    }
  }, []);

  useEffect(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);

  useEffect(() => {
    let disposed = false;

    function connect() {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (disposed) {
          socket.close();
          return;
        }
        setConnectionState('connected');
        if (adminTokenRef.current) {
          socket.send(JSON.stringify({type: 'admin:auth', token: adminTokenRef.current}));
        }
      };

      socket.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string) as {event: string; payload: unknown};
          const nowIso = new Date().toISOString();

          switch (msg.event) {
            case 'state:init': {
              setSiteState(msg.payload as PublicSiteState);
              setError(null);
              break;
            }
            case 'clients:count': {
              const {connectedClients} = msg.payload as {connectedClients: number};
              setSiteState((prev) => (prev ? {...prev, connectedClients} : prev));
              break;
            }
            case 'brand:updated': {
              const brand = msg.payload as BrandSettings;
              setSiteState((prev) => (prev ? {...prev, brand} : prev));
              setLastEventTime(nowIso);
              break;
            }
            case 'services:updated': {
              const services = msg.payload as ServiceItem[];
              setSiteState((prev) => (prev ? {...prev, services} : prev));
              setLastEventTime(nowIso);
              break;
            }
            case 'news:created': {
              const created = msg.payload as NewsItem;
              setSiteState((prev) => {
                if (!prev) return prev;
                if (prev.news.some((n) => n.id === created.id)) return prev;
                const nextNews = [created, ...prev.news].sort((a, b) => {
                  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
                });
                return {...prev, news: nextNews};
              });
              setLastEventTime(nowIso);
              break;
            }
            case 'news:updated': {
              const updated = msg.payload as NewsItem;
              setSiteState((prev) => {
                if (!prev) return prev;
                const nextNews = prev.news
                  .map((n) => (n.id === updated.id ? updated : n))
                  .sort((a, b) => {
                    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
                  });
                return {...prev, news: nextNews};
              });
              setLastEventTime(nowIso);
              break;
            }
            case 'news:deleted': {
              const {id} = msg.payload as {id: string};
              setSiteState((prev) => {
                if (!prev) return prev;
                return {...prev, news: prev.news.filter((n) => n.id !== id)};
              });
              setLastEventTime(nowIso);
              break;
            }
            case 'gallery:updated': {
              const gallery = msg.payload as GalleryImage[];
              setSiteState((prev) => (prev ? {...prev, gallery} : prev));
              setLastEventTime(nowIso);
              break;
            }
            case 'faqs:updated': {
              const faqs = msg.payload as FaqItem[];
              setSiteState((prev) => (prev ? {...prev, faqs} : prev));
              setLastEventTime(nowIso);
              break;
            }
            case 'admin:inquiry_created': {
              const inquiry = msg.payload as QuoteInquiry;
              onAdminInquiryRef.current?.(inquiry);
              setLastEventTime(nowIso);
              break;
            }
            default:
              break;
          }
        } catch {
          // Ignore invalid socket frames
        }
      };

      socket.onclose = () => {
        if (disposed) return;
        setConnectionState('reconnecting');
        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, 2000);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    // Sync state immediately when browser tab returns to foreground or network reconnects
    const handleSyncTrigger = () => {
      if (document.visibilityState === 'hidden') return;
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({type: 'state:request'}));
      } else {
        void fetchSnapshot();
      }
    };

    window.addEventListener('online', handleSyncTrigger);
    document.addEventListener('visibilitychange', handleSyncTrigger);

    return () => {
      disposed = true;
      window.removeEventListener('online', handleSyncTrigger);
      document.removeEventListener('visibilitychange', handleSyncTrigger);
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [fetchSnapshot]);

  // Re-authenticate socket when admin logs in or logs out
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (adminToken) {
      ws.send(JSON.stringify({type: 'admin:auth', token: adminToken}));
    } else {
      ws.send(JSON.stringify({type: 'admin:logout'}));
    }
  }, [adminToken]);

  return {
    siteState,
    connectionState,
    lastEventTime,
    error,
    refresh: fetchSnapshot,
  };
}
