"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadErrorAlertProps {
  message: string;
  onRetry?: () => void;
  disableActions?: boolean;
  className?: string;
}

export function UploadErrorAlert({
  message,
  onRetry,
  disableActions,
  className,
}: UploadErrorAlertProps) {
  return (
    <Alert
      variant="destructive"
      className={cn("flex items-start gap-3 rounded-lg border-red-200 bg-red-50", className)}
    >
      <AlertCircle className="mt-0.5 size-4 text-red-600" />
      <div className="flex flex-1 flex-col gap-2">
        <AlertDescription className="text-sm text-red-700">{message}</AlertDescription>
        {onRetry && (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-red-200 text-red-700 hover:bg-red-100"
              disabled={disableActions}
              onClick={onRetry}
            >
              <RefreshCw className="mr-2 size-3.5" />
              Reintentar
            </Button>
          </div>
        )}
      </div>
    </Alert>
  );
}


