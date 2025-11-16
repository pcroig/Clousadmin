// ========================================
// Notifications Client - Manager
// ========================================

'use client';

import { SettingsLayout } from '@/components/settings/settings-layout';
import { NotificationsSettings } from '@/components/settings/notifications-settings';

export function NotificationsClient() {
  return (
    <SettingsLayout rol="manager">
      <NotificationsSettings />
    </SettingsLayout>
  );
}













