import { supabase } from '@/db/supabase';

export type EventType = 'page_view' | 'click' | 'upload' | 'ocr' | 'recommendation' | 'demo';

export interface TrackingMetadata {
  [key: string]: any;
}

const getSessionId = () => {
  let sessionId = localStorage.getItem('app_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('app_session_id', sessionId);
  }
  return sessionId;
};

export const trackEvent = async (
  eventName: string,
  eventType: EventType,
  metadata: TrackingMetadata = {}
) => {
  try {
    const { error } = await supabase.from('tracking_events').insert({
      event_type: eventType,
      event_name: eventName,
      metadata,
      user_agent: navigator.userAgent,
      session_id: getSessionId(),
    });

    if (error) {
      console.error('Error tracking event:', error);
    }
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

export const usePageTracking = (pageName: string) => {
  const hasTracked = import.meta.env.DEV ? false : true; // In dev, we might want to avoid spamming or allow it
  
  // We'll call this in useEffect in pages
  return () => {
    trackEvent(pageName, 'page_view', { path: window.location.pathname });
  };
};
