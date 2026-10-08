"use client";
import { useEffect, useRef } from "react";

/** Brass measuring tape divider (cm ticks). The brand pattern, not a logo. */
export default function Tape({ start = 0 }: { start?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const dpr = devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      const x = c.getContext("2d")!;
      x.scale(dpr, dpr);
      x.strokeStyle = x.fillStyle = "#2A2208";
      x.font = '600 10px "Geist Mono",monospace';
      for (let i = 0, px = 8; px < w; i++, px += 4) {
        const isCm = i % 10 === 0, isHalf = i % 5 === 0;
        x.lineWidth = isCm ? 1.4 : 1;
        x.beginPath();
        x.moveTo(px + 0.5, 0);
        x.lineTo(px + 0.5, isCm ? h * 0.55 : isHalf ? h * 0.38 : h * 0.22);
        x.stroke();
        if (isCm && i > 0) x.fillText(String(start + i / 10), px + 3, h - 7);
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    document.fonts?.ready.then(draw);
    return () => ro.disconnect();
  }, [start]);
  return (
    <div className="tape" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}
