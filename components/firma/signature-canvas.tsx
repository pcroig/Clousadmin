'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

export interface SignatureCanvasHandle {
  getDataURL: () => string | null;
  clear: () => void;
}

interface SignatureCanvasProps {
  onChange?: (hasDrawing: boolean) => void;
  className?: string;
}

export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(
  ({ onChange, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawing, setHasDrawing] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        getDataURL() {
          if (!canvasRef.current || !hasDrawing) return null;
          return canvasRef.current.toDataURL('image/png');
        },
        clear() {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setHasDrawing(false);
        },
      }),
      [hasDrawing]
    );

    useEffect(() => {
      onChange?.(hasDrawing);
    }, [hasDrawing, onChange]);

    const getCoords = (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    };

    const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const coords = getCoords(event);
      if (!coords) return;
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
    };

    const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const coords = getCoords(event);
      if (!coords) return;
      ctx.lineTo(coords.x, coords.y);
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
      setHasDrawing(true);
    };

    const stopDrawing = () => {
      setIsDrawing(false);
    };

    const handleClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawing(false);
    };

    return (
      <div className={className}>
        <canvas
          ref={canvasRef}
          width={800}
          height={240}
          className="w-full h-[240px] border border-dashed border-gray-300 rounded-lg bg-white touch-none"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
        />
        <div className="mt-2 flex justify-between text-sm text-gray-500">
          <span>Dibuja tu firma con el ratón o dedo</span>
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            Limpiar
          </Button>
        </div>
      </div>
    );
  }
);

SignatureCanvas.displayName = 'SignatureCanvas';

