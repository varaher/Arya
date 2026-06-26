import { useEffect, useRef } from "react";

type DrishyaWorld = "night" | "film" | "everyday";

interface Props {
  world: DrishyaWorld;
  active: boolean;
}

export default function DrishyaBackground({ world, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (world !== "night") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    interface Star { x: number; y: number; radius: number; opacity: number; speed: number; drift: number; }
    const stars: Star[] = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.4 + 0.3,
      opacity: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 0.15 + 0.02,
      drift: (Math.random() - 0.5) * 0.08,
    }));

    let animId: number;
    let t = 0;

    function draw() {
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#0a0e1a");
      grad.addColorStop(0.5, "#0d1425");
      grad.addColorStop(1, "#070a10");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const bloom = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.38, 0,
        canvas.width * 0.5, canvas.height * 0.38, canvas.width * 0.45
      );
      bloom.addColorStop(0, `rgba(180,130,60,${active ? 0.07 : 0.03})`);
      bloom.addColorStop(1, "transparent");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      t += 0.012;
      for (const s of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.speed * 8 + s.x);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240,235,210,${s.opacity * twinkle})`;
        ctx.fill();
        s.x += s.drift;
        s.y -= s.speed * 0.3;
        if (s.y < -2) { s.y = canvas.height + 2; s.x = Math.random() * canvas.width; }
        if (s.x < -2) s.x = canvas.width + 2;
        if (s.x > canvas.width + 2) s.x = -2;
      }
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, [world, active]);

  useEffect(() => {
    if (world !== "film") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function resize() { canvas!.width = window.innerWidth; canvas!.height = window.innerHeight; }
    resize();
    window.addEventListener("resize", resize);

    interface Mote { x: number; y: number; r: number; vx: number; vy: number; o: number; }
    const motes: Mote[] = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -(Math.random() * 0.25 + 0.05),
      o: Math.random() * 0.18 + 0.04,
    }));

    let animId: number;
    let t = 0;

    function draw() {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, "#1a0f05");
      grad.addColorStop(0.4, "#2a1a08");
      grad.addColorStop(1, "#0f0a04");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      t += 0.008;
      const rayOpacity = (active ? 0.12 : 0.06) + 0.03 * Math.sin(t);
      const rayGrad = ctx.createLinearGradient(
        canvas.width * 0.85, 0, canvas.width * 0.2, canvas.height * 0.7
      );
      rayGrad.addColorStop(0, `rgba(240,180,60,${rayOpacity})`);
      rayGrad.addColorStop(0.4, `rgba(240,160,40,${rayOpacity * 0.4})`);
      rayGrad.addColorStop(1, "transparent");
      ctx.fillStyle = rayGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < 600; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.015})`;
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
      }

      for (const m of motes) {
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240,200,120,${m.o})`;
        ctx.fill();
        m.x += m.vx; m.y += m.vy;
        if (m.y < -5) { m.y = canvas.height + 5; m.x = Math.random() * canvas.width; }
      }

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, [world, active]);

  useEffect(() => {
    if (world !== "everyday") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function resize() { canvas!.width = window.innerWidth; canvas!.height = window.innerHeight; }
    resize();
    window.addEventListener("resize", resize);

    interface Dust { x: number; y: number; r: number; vx: number; vy: number; o: number; }
    const dust: Dust[] = Array.from({ length: 25 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.1,
      vy: -(Math.random() * 0.15 + 0.03),
      o: Math.random() * 0.1 + 0.03,
    }));

    let animId: number;
    let t = 0;

    function draw() {
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#2a1f0f");
      grad.addColorStop(0.5, "#1f1608");
      grad.addColorStop(1, "#150f04");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      t += 0.006;
      const winGrad = ctx.createRadialGradient(
        canvas.width * 0.15, canvas.height * 0.3, 0,
        canvas.width * 0.15, canvas.height * 0.3, canvas.width * 0.5
      );
      const gOpacity = (active ? 0.1 : 0.05) + 0.02 * Math.sin(t * 0.7);
      winGrad.addColorStop(0, `rgba(200,150,60,${gOpacity})`);
      winGrad.addColorStop(1, "transparent");
      ctx.fillStyle = winGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const d of dust) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,190,130,${d.o})`;
        ctx.fill();
        d.x += d.vx; d.y += d.vy;
        if (d.y < -5) { d.y = canvas.height + 5; d.x = Math.random() * canvas.width; }
      }

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, [world, active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
