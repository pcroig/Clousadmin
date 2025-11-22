// ========================================
// Notifications Client - Empleado
// ========================================

'use client';

import { NotificationsSettings } from '@/components/settings/notifications-settings';
import { SettingsLayout } from '@/components/settings/settings-layout';

export function NotificationsClient() {
  return (
    <SettingsLayout rol="empleado">
      <NotificationsSettings />
    </SettingsLayout>
  );
}






















