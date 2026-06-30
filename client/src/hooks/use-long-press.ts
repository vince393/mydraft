import { useCallback, useEffect, useRef } from "react";

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  threshold?: number;
  moveTolerance?: number;
}

/**
 * Press-and-hold gesture for a single element that also keeps a normal tap/click.
 * Works for both mouse and touch via Pointer Events. A short tap fires `onClick`;
 * holding past `threshold` ms fires `onLongPress` (and the trailing click is
 * suppressed). Moving more than `moveTolerance` px (a scroll/drag) cancels.
 */
export function useLongPress({
  onLongPress,
  onClick,
  threshold = 500,
  moveTolerance = 10,
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);
  const cancelledRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only react to the primary button (left click / single touch). Ignore
      // right/middle clicks so desktop context menus behave normally.
      if (e.button !== undefined && e.button !== 0) return;
      triggeredRef.current = false;
      cancelledRef.current = false;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      clear();
      timerRef.current = setTimeout(() => {
        triggeredRef.current = true;
        onLongPress();
      }, threshold);
    },
    [clear, onLongPress, threshold],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startPosRef.current || !timerRef.current) return;
      const dx = Math.abs(e.clientX - startPosRef.current.x);
      const dy = Math.abs(e.clientY - startPosRef.current.y);
      if (dx > moveTolerance || dy > moveTolerance) {
        // Treat the drag/scroll as a cancellation: stop the long-press AND
        // suppress the trailing click so we don't accidentally open compose.
        cancelledRef.current = true;
        clear();
      }
    },
    [clear, moveTolerance],
  );

  const handlePointerUp = useCallback(() => {
    clear();
  }, [clear]);

  const handlePointerLeave = useCallback(() => {
    clear();
  }, [clear]);

  const handlePointerCancel = useCallback(() => {
    // System interruption (incoming call, gesture cancel): drop the gesture
    // entirely and suppress any trailing click.
    cancelledRef.current = true;
    clear();
  }, [clear]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Suppress the click if a long-press already fired OR the gesture was
      // cancelled by a drag/scroll/interruption — either way, no normal tap.
      if (triggeredRef.current || cancelledRef.current) {
        e.preventDefault();
        e.stopPropagation();
        triggeredRef.current = false;
        cancelledRef.current = false;
        return;
      }
      onClick?.();
    },
    [onClick],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerLeave,
    onPointerCancel: handlePointerCancel,
    onClick: handleClick,
    onContextMenu: handleContextMenu,
  };
}
