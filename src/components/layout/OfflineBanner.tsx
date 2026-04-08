'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { UI_TEXT } from '@/constants/ui-text';

export default function OfflineBanner() {
  const { state } = useApp();
  const [showOnlineRestored, setShowOnlineRestored] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!state.isOnline) {
      setWasOffline(true);
      setShowOnlineRestored(false);
    } else if (wasOffline && state.isOnline) {
      setShowOnlineRestored(true);
      const timer = setTimeout(() => {
        setShowOnlineRestored(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.isOnline, wasOffline]);

  if (!state.isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-600 text-white text-center text-sm py-2 px-4">
        ⚡ {UI_TEXT.common.offline}
      </div>
    );
  }

  if (showOnlineRestored) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white text-center text-sm py-2 px-4">
        ✓ {UI_TEXT.common.onlineRestored}
      </div>
    );
  }

  return null;
}
