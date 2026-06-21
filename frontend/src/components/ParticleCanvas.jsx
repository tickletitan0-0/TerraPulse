import { useEffect, useRef } from "react";

// Drifting particle effect for hero sections. Pass a `colors` array to theme
// it per page — particles pick randomly from the given colors each time they
// respawn, so a two-tone palette (e.g. an accent + white) blends naturally.
function ParticleCanvas({ colors = ["#00cfff", "#ffffff"], count = 60 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const pickColor = () => colors[Math.floor(Math.random() * colors.length)];

    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2.5 + 0.5,
      opacity: Math.random(),
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -(Math.random() * 0.8 + 0.3),
      color: pickColor(),
    }));

    let animId;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity -= 0.003;
        if (p.opacity <= 0 || p.y < 0) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height;
          p.opacity = Math.random() * 0.8 + 0.2;
          p.speedX = (Math.random() - 0.5) * 0.4;
          p.speedY = -(Math.random() * 0.8 + 0.3);
          p.color = pickColor();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
    // Re-running on colors/count change keeps the effect in sync if a page
    // ever swaps its palette dynamically; for typical use these are constants.
  }, [colors, count]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0, left: 0,
        width: "100%", height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

export default ParticleCanvas;
