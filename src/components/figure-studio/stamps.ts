import type { Rect, Style } from "./types";

export interface StampDef {
  id: string;
  name: string;
  category: "solids" | "physics" | "optics" | "chemistry" | "biology" | "geometry" | "marks";
  draw: (ctx: CanvasRenderingContext2D, r: Rect, style: Style) => void;
}

export const STAMP_CATEGORIES: { id: StampDef["category"]; label: string }[] = [
  { id: "geometry", label: "Geometry & Theorems" },
  { id: "solids", label: "3D Mensuration" },
  { id: "physics", label: "Circuits & Mechanics" },
  { id: "optics", label: "Light & Optics" },
  { id: "chemistry", label: "Chemistry Lab" },
  { id: "biology", label: "Biology Diagrams" },
  { id: "marks", label: "Marks & Braces" },
];

export const STAMP_REGISTRY: Record<string, StampDef> = {
  // ---------------- 3D Solids ----------------
  cuboid: {
    id: "cuboid",
    name: "Cuboid",
    category: "solids",
    draw: (ctx, r) => {
      const dx = r.w * 0.28;
      const dy = r.h * 0.22;
      const fw = r.w - dx;
      const fh = r.h - dy;

      ctx.beginPath();
      // Front face
      ctx.rect(r.x, r.y + dy, fw, fh);
      ctx.stroke();

      // Top face
      ctx.beginPath();
      ctx.moveTo(r.x, r.y + dy);
      ctx.lineTo(r.x + dx, r.y);
      ctx.lineTo(r.x + r.w, r.y);
      ctx.lineTo(r.x + fw, r.y + dy);
      ctx.closePath();
      ctx.stroke();

      // Right face
      ctx.beginPath();
      ctx.moveTo(r.x + fw, r.y + dy);
      ctx.lineTo(r.x + r.w, r.y);
      ctx.lineTo(r.x + r.w, r.y + fh);
      ctx.lineTo(r.x + fw, r.y + r.h);
      ctx.closePath();
      ctx.stroke();

      // Hidden edges (dashed)
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(r.x, r.y + r.h);
      ctx.lineTo(r.x + dx, r.y + fh);
      ctx.lineTo(r.x + dx, r.y);
      ctx.moveTo(r.x + dx, r.y + fh);
      ctx.lineTo(r.x + r.w, r.y + fh);
      ctx.stroke();
      ctx.restore();
    },
  },

  cylinder: {
    id: "cylinder",
    name: "Cylinder",
    category: "solids",
    draw: (ctx, r) => {
      const rx = r.w / 2;
      const ry = Math.min(r.h * 0.18, rx * 0.6);
      const cx = r.x + rx;

      // Top ellipse
      ctx.beginPath();
      ctx.ellipse(cx, r.y + ry, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Sides
      ctx.beginPath();
      ctx.moveTo(r.x, r.y + ry);
      ctx.lineTo(r.x, r.y + r.h - ry);
      ctx.moveTo(r.x + r.w, r.y + ry);
      ctx.lineTo(r.x + r.w, r.y + r.h - ry);
      ctx.stroke();

      // Bottom lower half
      ctx.beginPath();
      ctx.ellipse(cx, r.y + r.h - ry, rx, ry, 0, 0, Math.PI);
      ctx.stroke();

      // Bottom upper half (dashed hidden)
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(cx, r.y + r.h - ry, rx, ry, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },
  },

  cone: {
    id: "cone",
    name: "Cone",
    category: "solids",
    draw: (ctx, r) => {
      const rx = r.w / 2;
      const ry = Math.min(r.h * 0.18, rx * 0.6);
      const cx = r.x + rx;
      const apex = { x: cx, y: r.y };

      // Sides
      ctx.beginPath();
      ctx.moveTo(r.x, r.y + r.h - ry);
      ctx.lineTo(apex.x, apex.y);
      ctx.lineTo(r.x + r.w, r.y + r.h - ry);
      ctx.stroke();

      // Bottom lower half
      ctx.beginPath();
      ctx.ellipse(cx, r.y + r.h - ry, rx, ry, 0, 0, Math.PI);
      ctx.stroke();

      // Bottom upper half (dashed hidden)
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(cx, r.y + r.h - ry, rx, ry, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },
  },

  sphere: {
    id: "sphere",
    name: "Sphere",
    category: "solids",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const radius = Math.min(r.w, r.h) / 2;
      const ry = radius * 0.28;

      // Outer circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Equator lower half
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius, ry, 0, 0, Math.PI);
      ctx.stroke();

      // Equator upper half (dashed)
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius, ry, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },
  },

  hemisphere: {
    id: "hemisphere",
    name: "Hemisphere",
    category: "solids",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const rx = r.w / 2;
      const ry = rx * 0.32;
      const topY = r.y + ry;

      // Base rim
      ctx.beginPath();
      ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Curved dome
      ctx.beginPath();
      ctx.arc(cx, topY, rx, 0, Math.PI, false);
      ctx.stroke();
    },
  },

  triangular_prism: {
    id: "triangular_prism",
    name: "Triangular Prism",
    category: "solids",
    draw: (ctx, r) => {
      const dx = r.w * 0.35;
      const dy = r.h * 0.25;

      const p1 = { x: r.x + (r.w - dx) * 0.5, y: r.y + dy };
      const p2 = { x: r.x, y: r.y + r.h };
      const p3 = { x: r.x + r.w - dx, y: r.y + r.h };

      const q1 = { x: p1.x + dx, y: p1.y - dy };
      const q2 = { x: p2.x + dx, y: p2.y - dy };
      const q3 = { x: p3.x + dx, y: p3.y - dy };

      // Front triangle
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.stroke();

      // Back top & right edges
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(q1.x, q1.y);
      ctx.lineTo(q3.x, q3.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(q1.x, q1.y);
      ctx.lineTo(q2.x, q2.y);
      ctx.lineTo(q3.x, q3.y);
      ctx.stroke();

      // Hidden edges
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(q2.x, q2.y);
      ctx.stroke();
      ctx.restore();
    },
  },

  // ---------------- Physics / Circuits ----------------
  resistor: {
    id: "resistor",
    name: "Resistor",
    category: "physics",
    draw: (ctx, r) => {
      const cy = r.y + r.h / 2;
      const lead = r.w * 0.18;
      const zigW = r.w - lead * 2;
      const steps = 6;
      const dx = zigW / steps;
      const amp = r.h * 0.35;

      ctx.beginPath();
      ctx.moveTo(r.x, cy);
      ctx.lineTo(r.x + lead, cy);
      for (let i = 0; i < steps; i++) {
        const x = r.x + lead + (i + 0.5) * dx;
        const y = cy + (i % 2 === 0 ? -amp : amp);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(r.x + r.w - lead, cy);
      ctx.lineTo(r.x + r.w, cy);
      ctx.stroke();
    },
  },

  battery: {
    id: "battery",
    name: "DC Cell / Battery",
    category: "physics",
    draw: (ctx, r) => {
      const cy = r.y + r.h / 2;
      const cx = r.x + r.w / 2;
      const gap = Math.min(16, r.w * 0.12);

      // Leads
      ctx.beginPath();
      ctx.moveTo(r.x, cy);
      ctx.lineTo(cx - gap, cy);
      ctx.moveTo(cx + gap, cy);
      ctx.lineTo(r.x + r.w, cy);
      ctx.stroke();

      // Positive long plate
      ctx.beginPath();
      ctx.moveTo(cx - gap, cy - r.h * 0.4);
      ctx.lineTo(cx - gap, cy + r.h * 0.4);
      ctx.stroke();

      // Negative short thick plate
      ctx.save();
      ctx.lineWidth = ctx.lineWidth * 2.2;
      ctx.beginPath();
      ctx.moveTo(cx + gap, cy - r.h * 0.22);
      ctx.lineTo(cx + gap, cy + r.h * 0.22);
      ctx.stroke();
      ctx.restore();
    },
  },

  bulb: {
    id: "bulb",
    name: "Bulb",
    category: "physics",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const radius = Math.min(r.w, r.h) * 0.35;

      // Circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // X inside
      const offset = radius * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx - offset, cy - offset);
      ctx.lineTo(cx + offset, cy + offset);
      ctx.moveTo(cx + offset, cy - offset);
      ctx.lineTo(cx - offset, cy + offset);
      ctx.stroke();

      // Terminals
      ctx.beginPath();
      ctx.moveTo(r.x, cy);
      ctx.lineTo(cx - radius, cy);
      ctx.moveTo(cx + radius, cy);
      ctx.lineTo(r.x + r.w, cy);
      ctx.stroke();
    },
  },

  switch_open: {
    id: "switch_open",
    name: "Switch (Open)",
    category: "physics",
    draw: (ctx, r) => {
      const cy = r.y + r.h * 0.65;
      const d1 = r.x + r.w * 0.3;
      const d2 = r.x + r.w * 0.7;
      const dotR = 3;

      // Leads
      ctx.beginPath();
      ctx.moveTo(r.x, cy);
      ctx.lineTo(d1, cy);
      ctx.moveTo(d2, cy);
      ctx.lineTo(r.x + r.w, cy);
      ctx.stroke();

      // Terminals
      ctx.beginPath();
      ctx.arc(d1, cy, dotR, 0, Math.PI * 2);
      ctx.arc(d2, cy, dotR, 0, Math.PI * 2);
      ctx.stroke();

      // Lever angled up
      ctx.beginPath();
      ctx.moveTo(d1, cy);
      ctx.lineTo(d2 - 4, cy - r.h * 0.45);
      ctx.stroke();
    },
  },

  switch_closed: {
    id: "switch_closed",
    name: "Switch (Closed)",
    category: "physics",
    draw: (ctx, r) => {
      const cy = r.y + r.h / 2;
      const d1 = r.x + r.w * 0.3;
      const d2 = r.x + r.w * 0.7;
      const dotR = 3;

      ctx.beginPath();
      ctx.moveTo(r.x, cy);
      ctx.lineTo(r.x + r.w, cy);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(d1, cy, dotR, 0, Math.PI * 2);
      ctx.arc(d2, cy, dotR, 0, Math.PI * 2);
      ctx.stroke();
    },
  },

  ammeter: {
    id: "ammeter",
    name: "Ammeter (A)",
    category: "physics",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const radius = Math.min(r.w, r.h) * 0.38;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(r.x, cy);
      ctx.lineTo(cx - radius, cy);
      ctx.moveTo(cx + radius, cy);
      ctx.lineTo(r.x + r.w, cy);
      ctx.stroke();

      ctx.save();
      ctx.font = `bold ${Math.round(radius * 1.1)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("A", cx, cy);
      ctx.restore();
    },
  },

  voltmeter: {
    id: "voltmeter",
    name: "Voltmeter (V)",
    category: "physics",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const radius = Math.min(r.w, r.h) * 0.38;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(r.x, cy);
      ctx.lineTo(cx - radius, cy);
      ctx.moveTo(cx + radius, cy);
      ctx.lineTo(r.x + r.w, cy);
      ctx.stroke();

      ctx.save();
      ctx.font = `bold ${Math.round(radius * 1.1)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("V", cx, cy);
      ctx.restore();
    },
  },

  bar_magnet: {
    id: "bar_magnet",
    name: "Bar Magnet (N-S)",
    category: "physics",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, r.y);
      ctx.lineTo(cx, r.y + r.h);
      ctx.stroke();

      ctx.save();
      ctx.font = `bold ${Math.round(r.h * 0.55)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("N", r.x + r.w * 0.25, r.y + r.h / 2);
      ctx.fillText("S", r.x + r.w * 0.75, r.y + r.h / 2);
      ctx.restore();
    },
  },

  ground: {
    id: "ground",
    name: "Ground / Earth",
    category: "physics",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const stemH = r.h * 0.5;

      ctx.beginPath();
      ctx.moveTo(cx, r.y);
      ctx.lineTo(cx, r.y + stemH);

      // Horizontal lines of decreasing width
      ctx.moveTo(cx - r.w * 0.4, r.y + stemH);
      ctx.lineTo(cx + r.w * 0.4, r.y + stemH);

      ctx.moveTo(cx - r.w * 0.25, r.y + stemH + r.h * 0.2);
      ctx.lineTo(cx + r.w * 0.25, r.y + stemH + r.h * 0.2);

      ctx.moveTo(cx - r.w * 0.1, r.y + stemH + r.h * 0.4);
      ctx.lineTo(cx + r.w * 0.1, r.y + stemH + r.h * 0.4);
      ctx.stroke();
    },
  },

  pulley: {
    id: "pulley",
    name: "Pulley",
    category: "physics",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h * 0.4;
      const radius = Math.min(r.w, r.h) * 0.3;

      // Wheel
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Axle dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      // Ceiling mount
      ctx.beginPath();
      ctx.moveTo(cx, r.y);
      ctx.lineTo(cx, cy);
      ctx.stroke();

      // Rope over pulley
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx - radius, r.y + r.h);
      ctx.moveTo(cx + radius, cy);
      ctx.lineTo(cx + radius, r.y + r.h);
      ctx.stroke();
    },
  },

  // ---------------- Optics ----------------
  convex_lens: {
    id: "convex_lens",
    name: "Convex Lens",
    category: "optics",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const top = { x: cx, y: r.y };
      const bot = { x: cx, y: r.y + r.h };
      const cur = r.w * 0.45;

      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.quadraticCurveTo(cx - cur, r.y + r.h / 2, bot.x, bot.y);
      ctx.quadraticCurveTo(cx + cur, r.y + r.h / 2, top.x, top.y);
      ctx.closePath();
      ctx.stroke();
    },
  },

  concave_lens: {
    id: "concave_lens",
    name: "Concave Lens",
    category: "optics",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const cur = r.w * 0.35;

      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + r.w, r.y);
      ctx.quadraticCurveTo(cx + cur, r.y + r.h / 2, r.x + r.w, r.y + r.h);
      ctx.lineTo(r.x, r.y + r.h);
      ctx.quadraticCurveTo(cx - cur, r.y + r.h / 2, r.x, r.y);
      ctx.closePath();
      ctx.stroke();
    },
  },

  plane_mirror: {
    id: "plane_mirror",
    name: "Plane Mirror",
    category: "optics",
    draw: (ctx, r) => {
      // Reflecting surface
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x, r.y + r.h);
      ctx.stroke();

      // Silvered hatch lines on the right
      const steps = 10;
      const dy = r.h / steps;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const y = r.y + i * dy;
        ctx.moveTo(r.x, y);
        ctx.lineTo(r.x + 8, y + 6);
      }
      ctx.stroke();
    },
  },

  prism: {
    id: "prism",
    name: "Glass Prism",
    category: "optics",
    draw: (ctx, r) => {
      ctx.beginPath();
      ctx.moveTo(r.x + r.w / 2, r.y);
      ctx.lineTo(r.x + r.w, r.y + r.h);
      ctx.lineTo(r.x, r.y + r.h);
      ctx.closePath();
      ctx.stroke();
    },
  },

  // ---------------- Chemistry ----------------
  beaker: {
    id: "beaker",
    name: "Beaker",
    category: "chemistry",
    draw: (ctx, r) => {
      const lip = 6;
      ctx.beginPath();
      ctx.moveTo(r.x - lip, r.y);
      ctx.lineTo(r.x + r.w + lip, r.y);
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x, r.y + r.h - 8);
      ctx.quadraticCurveTo(r.x, r.y + r.h, r.x + 8, r.y + r.h);
      ctx.lineTo(r.x + r.w - 8, r.y + r.h);
      ctx.quadraticCurveTo(r.x + r.w, r.y + r.h, r.x + r.w, r.y + r.h - 8);
      ctx.lineTo(r.x + r.w, r.y);
      ctx.stroke();

      // Liquid level (dashed)
      ctx.save();
      ctx.setLineDash([3, 3]);
      const ly = r.y + r.h * 0.45;
      ctx.beginPath();
      ctx.moveTo(r.x + 4, ly);
      ctx.lineTo(r.x + r.w - 4, ly);
      ctx.stroke();
      ctx.restore();
    },
  },

  conical_flask: {
    id: "conical_flask",
    name: "Conical Flask",
    category: "chemistry",
    draw: (ctx, r) => {
      const neckW = r.w * 0.28;
      const neckH = r.h * 0.35;
      const cx = r.x + r.w / 2;

      ctx.beginPath();
      // Lip
      ctx.moveTo(cx - neckW / 2 - 4, r.y);
      ctx.lineTo(cx + neckW / 2 + 4, r.y);
      // Neck
      ctx.moveTo(cx - neckW / 2, r.y);
      ctx.lineTo(cx - neckW / 2, r.y + neckH);
      // Flare down to base
      ctx.lineTo(r.x, r.y + r.h);
      ctx.lineTo(r.x + r.w, r.y + r.h);
      ctx.lineTo(cx + neckW / 2, r.y + neckH);
      ctx.lineTo(cx + neckW / 2, r.y);
      ctx.stroke();
    },
  },

  test_tube: {
    id: "test_tube",
    name: "Test Tube",
    category: "chemistry",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const radius = r.w / 2;

      ctx.beginPath();
      ctx.moveTo(r.x - 3, r.y);
      ctx.lineTo(r.x + r.w + 3, r.y);
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x, r.y + r.h - radius);
      ctx.arc(cx, r.y + r.h - radius, radius, Math.PI, 0, true);
      ctx.lineTo(r.x + r.w, r.y);
      ctx.stroke();
    },
  },

  // ---------------- Marks & Braces ----------------
  brace_right: {
    id: "brace_right",
    name: "Curly Brace }",
    category: "marks",
    draw: (ctx, r) => {
      const my = r.y + r.h / 2;
      const cr = Math.min(10, r.h * 0.15);
      const tipX = r.x + r.w;

      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.quadraticCurveTo(r.x + cr, r.y, r.x + cr, r.y + cr);
      ctx.lineTo(r.x + cr, my - cr);
      ctx.quadraticCurveTo(r.x + cr, my, tipX, my);
      ctx.quadraticCurveTo(r.x + cr, my, r.x + cr, my + cr);
      ctx.lineTo(r.x + cr, r.y + r.h - cr);
      ctx.quadraticCurveTo(r.x + cr, r.y + r.h, r.x, r.y + r.h);
      ctx.stroke();
    },
  },

  perpendicular_mark: {
    id: "perpendicular_mark",
    name: "Perpendicular symbol ⊥",
    category: "marks",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y + r.h);
      ctx.lineTo(r.x + r.w, r.y + r.h);
      ctx.moveTo(cx, r.y);
      ctx.lineTo(cx, r.y + r.h);
      ctx.stroke();
    },
  },

  // ---------------- More Solids ----------------
  cube: {
    id: "cube",
    name: "Cube",
    category: "solids",
    draw: (ctx, r) => {
      const s = Math.min(r.w, r.h) * 0.72;
      const ox = r.x + (r.w - s) * 0.2;
      const oy = r.y + (r.h - s) * 0.6;
      const d = s * 0.38;

      ctx.beginPath();
      // Front
      ctx.rect(ox, oy, s, s);
      // Top
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + d, oy - d);
      ctx.lineTo(ox + s + d, oy - d);
      ctx.lineTo(ox + s, oy);
      // Right
      ctx.lineTo(ox + s + d, oy - d);
      ctx.lineTo(ox + s + d, oy + s - d);
      ctx.lineTo(ox + s, oy + s);
      ctx.stroke();

      // Hidden
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(ox, oy + s);
      ctx.lineTo(ox + d, oy + s - d);
      ctx.lineTo(ox + s + d, oy + s - d);
      ctx.moveTo(ox + d, oy + s - d);
      ctx.lineTo(ox + d, oy - d);
      ctx.stroke();
      ctx.restore();
    },
  },

  pyramid: {
    id: "pyramid",
    name: "Square Pyramid",
    category: "solids",
    draw: (ctx, r) => {
      const apex = { x: r.x + r.w / 2, y: r.y };
      const f1 = { x: r.x + r.w * 0.1, y: r.y + r.h };
      const f2 = { x: r.x + r.w * 0.8, y: r.y + r.h * 0.95 };
      const b2 = { x: r.x + r.w * 0.95, y: r.y + r.h * 0.7 };
      const b1 = { x: r.x + r.w * 0.25, y: r.y + r.h * 0.75 };

      ctx.beginPath();
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(f1.x, f1.y);
      ctx.lineTo(f2.x, f2.y);
      ctx.lineTo(apex.x, apex.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.lineTo(f2.x, f2.y);
      ctx.stroke();

      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(b1.x, b1.y);
      ctx.lineTo(f1.x, f1.y);
      ctx.moveTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.stroke();
      ctx.restore();
    },
  },

  // ---------------- More Physics & Circuits ----------------
  ac_source: {
    id: "ac_source",
    name: "AC Source ~",
    category: "physics",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const radius = Math.min(r.w, r.h) * 0.35;

      ctx.beginPath();
      // Leads
      ctx.moveTo(r.x, cy);
      ctx.lineTo(cx - radius, cy);
      ctx.moveTo(cx + radius, cy);
      ctx.lineTo(r.x + r.w, cy);
      // Circle
      ctx.moveTo(cx + radius, cy);
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Sine wave inside
      const sw = radius * 0.8;
      const sh = radius * 0.45;
      ctx.beginPath();
      ctx.moveTo(cx - sw, cy);
      ctx.bezierCurveTo(cx - sw / 2, cy - sh * 1.5, cx - sw / 4, cy - sh * 1.5, cx, cy);
      ctx.bezierCurveTo(cx + sw / 4, cy + sh * 1.5, cx + sw / 2, cy + sh * 1.5, cx + sw, cy);
      ctx.stroke();
    },
  },

  galvanometer: {
    id: "galvanometer",
    name: "Galvanometer (G)",
    category: "physics",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const radius = Math.min(r.w, r.h) * 0.36;

      ctx.beginPath();
      ctx.moveTo(r.x, cy);
      ctx.lineTo(cx - radius, cy);
      ctx.moveTo(cx + radius, cy);
      ctx.lineTo(r.x + r.w, cy);
      ctx.moveTo(cx + radius, cy);
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.font = `bold ${Math.round(radius * 0.95)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillText("G", cx, cy);
      ctx.restore();
    },
  },

  capacitor: {
    id: "capacitor",
    name: "Capacitor ||",
    category: "physics",
    draw: (ctx, r) => {
      const cy = r.y + r.h / 2;
      const cx = r.x + r.w / 2;
      const gap = Math.max(8, r.w * 0.16);
      const plateH = r.h * 0.7;

      ctx.beginPath();
      // Leads
      ctx.moveTo(r.x, cy);
      ctx.lineTo(cx - gap / 2, cy);
      ctx.moveTo(cx + gap / 2, cy);
      ctx.lineTo(r.x + r.w, cy);
      // Plates
      ctx.moveTo(cx - gap / 2, cy - plateH / 2);
      ctx.lineTo(cx - gap / 2, cy + plateH / 2);
      ctx.moveTo(cx + gap / 2, cy - plateH / 2);
      ctx.lineTo(cx + gap / 2, cy + plateH / 2);
      ctx.stroke();
    },
  },

  variable_resistor: {
    id: "variable_resistor",
    name: "Rheostat / Variable Resistor",
    category: "physics",
    draw: (ctx, r) => {
      const cy = r.y + r.h * 0.55;
      const segW = r.w * 0.08;
      const peakH = r.h * 0.22;

      ctx.beginPath();
      ctx.moveTo(r.x, cy);
      ctx.lineTo(r.x + r.w * 0.16, cy);
      let curX = r.x + r.w * 0.16;
      let dir = -1;
      for (let i = 0; i < 6; i++) {
        curX += segW;
        ctx.lineTo(curX, cy + dir * peakH);
        dir = -dir;
      }
      ctx.lineTo(curX + segW * 0.6, cy);
      ctx.lineTo(r.x + r.w, cy);
      ctx.stroke();

      // Diagonal arrow
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(r.x + r.w * 0.22, r.y + r.h * 0.95);
      ctx.lineTo(r.x + r.w * 0.78, r.y + r.h * 0.15);
      ctx.stroke();
      // Arrowhead
      const tipX = r.x + r.w * 0.78;
      const tipY = r.y + r.h * 0.15;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - 8, tipY + 2);
      ctx.lineTo(tipX - 2, tipY + 8);
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      ctx.restore();
    },
  },

  rheostat: {
    id: "rheostat",
    name: "Rheostat",
    category: "physics",
    draw: (ctx, r) => {
      const cy = r.y + r.h * 0.55;
      const segW = r.w * 0.08;
      const peakH = r.h * 0.22;

      ctx.beginPath();
      ctx.moveTo(r.x, cy);
      ctx.lineTo(r.x + r.w * 0.16, cy);
      let curX = r.x + r.w * 0.16;
      let dir = -1;
      for (let i = 0; i < 6; i++) {
        curX += segW;
        ctx.lineTo(curX, cy + dir * peakH);
        dir = -dir;
      }
      ctx.lineTo(curX + segW * 0.6, cy);
      ctx.lineTo(r.x + r.w, cy);
      ctx.stroke();

      // Diagonal arrow
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(r.x + r.w * 0.22, r.y + r.h * 0.95);
      ctx.lineTo(r.x + r.w * 0.78, r.y + r.h * 0.15);
      ctx.stroke();
      // Arrowhead
      const tipX = r.x + r.w * 0.78;
      const tipY = r.y + r.h * 0.15;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - 8, tipY + 2);
      ctx.lineTo(tipX - 2, tipY + 8);
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      ctx.restore();
    },
  },

  fuse: {
    id: "fuse",
    name: "Electric Fuse",
    category: "physics",
    draw: (ctx, r) => {
      const cy = r.y + r.h / 2;
      const rw = r.w * 0.6;
      const rh = r.h * 0.35;
      const rx = r.x + (r.w - rw) / 2;
      const ry = cy - rh / 2;

      ctx.beginPath();
      // Leads
      ctx.moveTo(r.x, cy);
      ctx.lineTo(rx, cy);
      ctx.moveTo(rx + rw, cy);
      ctx.lineTo(r.x + r.w, cy);
      // Rectangle body
      ctx.rect(rx, ry, rw, rh);
      // Internal wire
      ctx.moveTo(rx, cy);
      ctx.lineTo(rx + rw, cy);
      ctx.stroke();
    },
  },

  spring: {
    id: "spring",
    name: "Spring with Mass",
    category: "physics",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      // Ceiling mount
      ctx.beginPath();
      ctx.moveTo(cx - 20, r.y);
      ctx.lineTo(cx + 20, r.y);
      for (let x = cx - 18; x <= cx + 18; x += 6) {
        ctx.moveTo(x, r.y);
        ctx.lineTo(x + 5, r.y - 6);
      }
      ctx.moveTo(cx, r.y);
      ctx.lineTo(cx, r.y + 12);
      ctx.stroke();

      // Coils
      let y = r.y + 12;
      const coilH = (r.h * 0.55) / 7;
      const coilW = r.w * 0.28;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      for (let i = 0; i < 7; i++) {
        const sign = i % 2 === 0 ? 1 : -1;
        ctx.lineTo(cx + sign * coilW, y + coilH * 0.5);
        ctx.lineTo(cx, y + coilH);
        y += coilH;
      }
      ctx.lineTo(cx, y + 10);
      ctx.stroke();

      // Mass block
      const mw = r.w * 0.45;
      const mh = r.h * 0.2;
      ctx.beginPath();
      ctx.rect(cx - mw / 2, y + 10, mw, mh);
      ctx.stroke();
      ctx.save();
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillText("m", cx, y + 10 + mh / 2);
      ctx.restore();
    },
  },

  inclined_plane: {
    id: "inclined_plane",
    name: "Inclined Plane & Block",
    category: "physics",
    draw: (ctx, r) => {
      const pBaseL = { x: r.x + 8, y: r.y + r.h - 8 };
      const pBaseR = { x: r.x + r.w - 8, y: r.y + r.h - 8 };
      const pTop = { x: r.x + 8, y: r.y + 16 };

      // Wedge
      ctx.beginPath();
      ctx.moveTo(pBaseL.x, pBaseL.y);
      ctx.lineTo(pBaseR.x, pBaseR.y);
      ctx.lineTo(pTop.x, pTop.y);
      ctx.closePath();
      ctx.stroke();

      // Angle mark at base R
      ctx.beginPath();
      ctx.arc(pBaseR.x, pBaseR.y, 24, Math.PI, Math.PI * 1.18);
      ctx.stroke();

      // Block on slope
      const t = 0.5;
      const slopeX = pTop.x + (pBaseR.x - pTop.x) * t;
      const slopeY = pTop.y + (pBaseR.y - pTop.y) * t;
      const slopeAngle = Math.atan2(pBaseR.y - pTop.y, pBaseR.x - pTop.x);

      ctx.save();
      ctx.translate(slopeX, slopeY);
      ctx.rotate(slopeAngle);
      ctx.beginPath();
      ctx.rect(-16, -20, 32, 20);
      ctx.stroke();
      ctx.restore();
    },
  },

  pendulum: {
    id: "pendulum",
    name: "Simple Pendulum",
    category: "physics",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const topY = r.y + 6;

      // Ceiling
      ctx.beginPath();
      ctx.moveTo(cx - 24, topY);
      ctx.lineTo(cx + 24, topY);
      for (let x = cx - 22; x <= cx + 22; x += 6) {
        ctx.moveTo(x, topY);
        ctx.lineTo(x + 5, topY - 6);
      }
      ctx.stroke();

      // Dashed vertical rest line
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, topY);
      ctx.lineTo(cx, r.y + r.h - 16);
      ctx.stroke();
      ctx.restore();

      // String at angle
      const bobAngle = 0.42; // rad
      const len = r.h * 0.75;
      const bobX = cx + Math.sin(bobAngle) * len;
      const bobY = topY + Math.cos(bobAngle) * len;

      ctx.beginPath();
      ctx.moveTo(cx, topY);
      ctx.lineTo(bobX, bobY);
      ctx.stroke();

      // Bob
      ctx.beginPath();
      ctx.arc(bobX, bobY, 11, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      ctx.stroke();

      // Deflection arc
      ctx.beginPath();
      ctx.arc(cx, topY, len * 0.45, Math.PI / 2, Math.PI / 2 + bobAngle);
      ctx.stroke();
    },
  },

  // ---------------- More Optics ----------------
  glass_slab: {
    id: "glass_slab",
    name: "Glass Slab Refraction",
    category: "optics",
    draw: (ctx, r) => {
      const slabW = r.w * 0.7;
      const slabH = r.h * 0.42;
      const sx = r.x + (r.w - slabW) / 2;
      const sy = r.y + (r.h - slabH) / 2;

      // Glass slab boundary
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, sy, slabW, slabH);
      ctx.stroke();
      ctx.fillStyle = "rgba(30, 96, 117, 0.05)";
      ctx.fill();
      ctx.restore();

      // Points
      const incX = sx + slabW * 0.35;
      const incY = sy;
      const refX = sx + slabW * 0.52;
      const refY = sy + slabH;

      // Incident ray
      ctx.beginPath();
      ctx.moveTo(sx + 8, r.y + 6);
      ctx.lineTo(incX, incY);
      ctx.stroke();

      // Incident arrow
      const iMidX = (sx + 8 + incX) / 2;
      const iMidY = (r.y + 6 + incY) / 2;
      ctx.beginPath();
      ctx.moveTo(iMidX, iMidY);
      ctx.lineTo(iMidX - 6, iMidY - 3);
      ctx.lineTo(iMidX - 4, iMidY + 4);
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();

      // Normal 1 (dashed)
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(incX, incY - 24);
      ctx.lineTo(incX, incY + 24);
      ctx.stroke();
      ctx.restore();

      // Refracted ray inside slab
      ctx.beginPath();
      ctx.moveTo(incX, incY);
      ctx.lineTo(refX, refY);
      ctx.stroke();

      // Normal 2 (dashed)
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(refX, refY - 24);
      ctx.lineTo(refX, refY + 24);
      ctx.stroke();
      ctx.restore();

      // Emergent ray (parallel to incident)
      const emX = refX + (incX - (sx + 8));
      const emY = r.y + r.h - 6;
      ctx.beginPath();
      ctx.moveTo(refX, refY);
      ctx.lineTo(emX, emY);
      ctx.stroke();

      // Emergent arrow
      const eMidX = (refX + emX) / 2;
      const eMidY = (refY + emY) / 2;
      ctx.beginPath();
      ctx.moveTo(eMidX, eMidY);
      ctx.lineTo(eMidX - 6, eMidY - 3);
      ctx.lineTo(eMidX - 4, eMidY + 4);
      ctx.closePath();
      ctx.fill();
    },
  },

  concave_mirror: {
    id: "concave_mirror",
    name: "Concave Mirror",
    category: "optics",
    draw: (ctx, r) => {
      const cy = r.y + r.h / 2;
      const mx = r.x + r.w * 0.65;
      const arcR = r.h * 0.7;

      // Principal axis
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(r.x, cy);
      ctx.lineTo(r.x + r.w, cy);
      ctx.stroke();
      ctx.restore();

      // Mirror curve
      ctx.beginPath();
      ctx.arc(mx + arcR - 10, cy, arcR, Math.PI * 0.82, Math.PI * 1.18);
      ctx.stroke();

      // Silvering hatch marks on outer / right side
      for (let a = Math.PI * 0.83; a <= Math.PI * 1.17; a += 0.045) {
        const px = mx + arcR - 10 + Math.cos(a) * arcR;
        const py = cy + Math.sin(a) * arcR;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + 6, py - 4);
        ctx.stroke();
      }
    },
  },

  convex_mirror: {
    id: "convex_mirror",
    name: "Convex Mirror",
    category: "optics",
    draw: (ctx, r) => {
      const cy = r.y + r.h / 2;
      const mx = r.x + r.w * 0.35;
      const arcR = r.h * 0.7;

      // Principal axis
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(r.x, cy);
      ctx.lineTo(r.x + r.w, cy);
      ctx.stroke();
      ctx.restore();

      // Mirror curve
      ctx.beginPath();
      ctx.arc(mx - arcR + 10, cy, arcR, -Math.PI * 0.18, Math.PI * 0.18);
      ctx.stroke();

      // Silvering hatch marks on inner / right side
      for (let a = -Math.PI * 0.17; a <= Math.PI * 0.17; a += 0.045) {
        const px = mx - arcR + 10 + Math.cos(a) * arcR;
        const py = cy + Math.sin(a) * arcR;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + 6, py - 4);
        ctx.stroke();
      }
    },
  },

  light_ray: {
    id: "light_ray",
    name: "Light Ray with Arrow",
    category: "optics",
    draw: (ctx, r) => {
      const cy = r.y + r.h / 2;
      ctx.beginPath();
      ctx.moveTo(r.x, cy);
      ctx.lineTo(r.x + r.w, cy);
      ctx.stroke();

      // Arrow in middle
      const midX = r.x + r.w * 0.55;
      ctx.beginPath();
      ctx.moveTo(midX, cy);
      ctx.lineTo(midX - 10, cy - 5);
      ctx.lineTo(midX - 7, cy);
      ctx.lineTo(midX - 10, cy + 5);
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    },
  },

  // ---------------- More Chemistry ----------------
  bunsen_burner: {
    id: "bunsen_burner",
    name: "Bunsen Burner & Flame",
    category: "chemistry",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const baseY = r.y + r.h - 6;

      // Base
      ctx.beginPath();
      ctx.moveTo(cx - 28, baseY);
      ctx.lineTo(cx + 28, baseY);
      ctx.lineTo(cx + 22, baseY - 8);
      ctx.lineTo(cx - 22, baseY - 8);
      ctx.closePath();
      ctx.stroke();

      // Gas side pipe
      ctx.beginPath();
      ctx.moveTo(cx - 10, baseY - 14);
      ctx.lineTo(cx - 32, baseY - 14);
      ctx.stroke();

      // Chimney barrel
      const chimneyTopY = r.y + r.h * 0.38;
      ctx.beginPath();
      ctx.rect(cx - 8, chimneyTopY, 16, baseY - 8 - chimneyTopY);
      ctx.stroke();

      // Air hole collar
      ctx.beginPath();
      ctx.arc(cx, baseY - 24, 3, 0, Math.PI * 2);
      ctx.stroke();

      // Flame
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - 8, chimneyTopY);
      ctx.bezierCurveTo(cx - 18, chimneyTopY - 24, cx - 12, r.y + 6, cx, r.y);
      ctx.bezierCurveTo(cx + 12, r.y + 6, cx + 18, chimneyTopY - 24, cx + 8, chimneyTopY);
      ctx.closePath();
      ctx.stroke();

      // Inner flame core
      ctx.beginPath();
      ctx.moveTo(cx - 4, chimneyTopY);
      ctx.bezierCurveTo(cx - 8, chimneyTopY - 14, cx - 6, r.y + 16, cx, r.y + 12);
      ctx.bezierCurveTo(cx + 6, r.y + 12, cx + 8, chimneyTopY - 14, cx + 4, chimneyTopY);
      ctx.stroke();
      ctx.restore();
    },
  },

  stand_test_tube: {
    id: "stand_test_tube",
    name: "Stand Holding Test Tube",
    category: "chemistry",
    draw: (ctx, r) => {
      const standX = r.x + 16;
      const baseY = r.y + r.h - 8;

      // Heavy base
      ctx.beginPath();
      ctx.rect(standX - 10, baseY, 60, 8);
      ctx.stroke();

      // Vertical rod
      ctx.beginPath();
      ctx.moveTo(standX, baseY);
      ctx.lineTo(standX, r.y + 10);
      ctx.stroke();

      // Clamp arm
      const clampY = r.y + r.h * 0.35;
      ctx.beginPath();
      ctx.moveTo(standX, clampY);
      ctx.lineTo(standX + 38, clampY);
      // Clamp jaws
      ctx.moveTo(standX + 34, clampY - 8);
      ctx.lineTo(standX + 42, clampY - 8);
      ctx.moveTo(standX + 34, clampY + 8);
      ctx.lineTo(standX + 42, clampY + 8);
      ctx.stroke();

      // Test tube held by clamp
      const ttx = standX + 38;
      const tty = r.y + r.h * 0.18;
      const tth = r.h * 0.65;
      const ttw = 16;

      ctx.beginPath();
      ctx.moveTo(ttx - ttw / 2 - 2, tty);
      ctx.lineTo(ttx + ttw / 2 + 2, tty);
      ctx.moveTo(ttx - ttw / 2, tty);
      ctx.lineTo(ttx - ttw / 2, tty + tth - ttw / 2);
      ctx.arc(ttx, tty + tth - ttw / 2, ttw / 2, Math.PI, 0, true);
      ctx.lineTo(ttx + ttw / 2, tty);
      ctx.stroke();

      // Liquid level inside tube
      const liqY = tty + tth * 0.45;
      ctx.beginPath();
      ctx.moveTo(ttx - ttw / 2, liqY);
      ctx.quadraticCurveTo(ttx, liqY + 2, ttx + ttw / 2, liqY);
      ctx.stroke();
    },
  },

  u_tube: {
    id: "u_tube",
    name: "U-Tube Manometer",
    category: "chemistry",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const legGap = r.w * 0.42;
      const tubeW = 14;
      const topY = r.y + 8;
      const bottomY = r.y + r.h - tubeW - 8;

      // Outer U
      ctx.beginPath();
      ctx.moveTo(cx - legGap / 2 - tubeW / 2, topY);
      ctx.lineTo(cx - legGap / 2 - tubeW / 2, bottomY);
      ctx.arc(cx, bottomY, legGap / 2 + tubeW / 2, Math.PI, 0, true);
      ctx.lineTo(cx + legGap / 2 + tubeW / 2, topY);

      // Inner U
      ctx.moveTo(cx - legGap / 2 + tubeW / 2, topY);
      ctx.lineTo(cx - legGap / 2 + tubeW / 2, bottomY);
      ctx.arc(cx, bottomY, legGap / 2 - tubeW / 2, Math.PI, 0, true);
      ctx.lineTo(cx + legGap / 2 - tubeW / 2, topY);
      ctx.stroke();

      // Liquid levels
      ctx.beginPath();
      ctx.moveTo(cx - legGap / 2 - tubeW / 2, bottomY - 20);
      ctx.lineTo(cx - legGap / 2 + tubeW / 2, bottomY - 20);
      ctx.moveTo(cx + legGap / 2 - tubeW / 2, bottomY - 45);
      ctx.lineTo(cx + legGap / 2 + tubeW / 2, bottomY - 45);
      ctx.stroke();
    },
  },

  // ---------------- Biology Diagrams ----------------
  plant_cell: {
    id: "plant_cell",
    name: "Plant Cell (Wall & Vacuole)",
    category: "biology",
    draw: (ctx, r) => {
      // Outer cell wall
      ctx.beginPath();
      ctx.roundRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8, 14);
      ctx.stroke();

      // Inner cell membrane
      ctx.beginPath();
      ctx.roundRect(r.x + 9, r.y + 9, r.w - 18, r.h - 18, 10);
      ctx.stroke();

      // Large central vacuole
      ctx.beginPath();
      ctx.roundRect(r.x + r.w * 0.28, r.y + r.h * 0.22, r.w * 0.45, r.h * 0.55, 12);
      ctx.stroke();

      // Nucleus
      const ncx = r.x + r.w * 0.18;
      const ncy = r.y + r.h * 0.45;
      ctx.beginPath();
      ctx.arc(ncx, ncy, Math.min(r.w, r.h) * 0.1, 0, Math.PI * 2);
      ctx.stroke();
      // Nucleolus
      ctx.beginPath();
      ctx.arc(ncx, ncy, 3, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();

      // Chloroplasts (oval dots)
      const chlo = [
        { x: r.x + r.w * 0.82, y: r.y + r.h * 0.25 },
        { x: r.x + r.w * 0.82, y: r.y + r.h * 0.72 },
        { x: r.x + r.w * 0.38, y: r.y + r.h * 0.15 },
        { x: r.x + r.w * 0.45, y: r.y + r.h * 0.84 },
      ];
      for (const pt of chlo) {
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, 8, 4, 0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
  },

  animal_cell: {
    id: "animal_cell",
    name: "Animal Cell",
    category: "biology",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const rx = (r.w - 12) / 2;
      const ry = (r.h - 12) / 2;

      // Rounded cell membrane
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Centered nucleus
      const nR = Math.min(rx, ry) * 0.35;
      ctx.beginPath();
      ctx.arc(cx - 8, cy, nR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - 8, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();

      // Mitochondria ovals
      ctx.beginPath();
      ctx.ellipse(cx + rx * 0.45, cy - ry * 0.3, 11, 6, 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx + rx * 0.3, cy + ry * 0.4, 10, 5, -0.4, 0, Math.PI * 2);
      ctx.stroke();
    },
  },

  neuron: {
    id: "neuron",
    name: "Neuron (Nerve Cell)",
    category: "biology",
    draw: (ctx, r) => {
      const somaX = r.x + r.w * 0.22;
      const somaY = r.y + r.h * 0.5;
      const somaR = Math.min(r.w, r.h) * 0.16;

      // Soma & nucleus
      ctx.beginPath();
      ctx.arc(somaX, somaY, somaR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(somaX, somaY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();

      // Dendrites branching left
      const dendrites = [-0.9, -0.5, 0, 0.5, 0.9];
      for (const angle of dendrites) {
        const dx = somaX + Math.cos(Math.PI + angle) * somaR;
        const dy = somaY + Math.sin(Math.PI + angle) * somaR;
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx - 16, dy + angle * 12);
        ctx.lineTo(dx - 24, dy + angle * 16 - 4);
        ctx.moveTo(dx - 16, dy + angle * 12);
        ctx.lineTo(dx - 24, dy + angle * 16 + 4);
        ctx.stroke();
      }

      // Axon line
      const axonEndX = r.x + r.w * 0.82;
      ctx.beginPath();
      ctx.moveTo(somaX + somaR, somaY);
      ctx.lineTo(axonEndX, somaY);
      ctx.stroke();

      // Myelin sheaths
      const count = 3;
      const mWidth = (axonEndX - (somaX + somaR) - 20) / count;
      let startX = somaX + somaR + 8;
      for (let i = 0; i < count; i++) {
        ctx.beginPath();
        ctx.roundRect(startX, somaY - 9, mWidth - 4, 18, 4);
        ctx.stroke();
        startX += mWidth;
      }

      // Axon terminal buttons
      ctx.beginPath();
      ctx.moveTo(axonEndX, somaY);
      ctx.lineTo(r.x + r.w - 6, somaY - 14);
      ctx.moveTo(axonEndX, somaY);
      ctx.lineTo(r.x + r.w - 4, somaY);
      ctx.moveTo(axonEndX, somaY);
      ctx.lineTo(r.x + r.w - 6, somaY + 14);
      ctx.stroke();
    },
  },

  // ---------------- Geometry Theorems ----------------
  circle_tangents: {
    id: "circle_tangents",
    name: "Circle Tangents (PA = PB)",
    category: "geometry",
    draw: (ctx, r) => {
      const cr = Math.min(r.w, r.h) * 0.32;
      const ox = r.x + cr + 8;
      const oy = r.y + r.h / 2;
      const px = r.x + r.w - 12;
      const py = oy;

      // Circle
      ctx.beginPath();
      ctx.arc(ox, oy, cr, 0, Math.PI * 2);
      ctx.stroke();

      // Tangent points A and B
      const distOP = px - ox;
      if (distOP > cr) {
        const tangentAng = Math.acos(cr / distOP);
        const ax = ox + Math.cos(tangentAng) * cr;
        const ay = oy - Math.sin(tangentAng) * cr;
        const bx = ox + Math.cos(tangentAng) * cr;
        const by = oy + Math.sin(tangentAng) * cr;

        // Radii OA, OB
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ax, ay);
        ctx.moveTo(ox, oy);
        ctx.lineTo(bx, by);
        ctx.stroke();

        // Tangents PA, PB
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(ax, ay);
        ctx.moveTo(px, py);
        ctx.lineTo(bx, by);
        ctx.stroke();

        // Center O dot
        ctx.beginPath();
        ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();

        // Point P dot
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },

  cyclic_quad: {
    id: "cyclic_quad",
    name: "Cyclic Quadrilateral",
    category: "geometry",
    draw: (ctx, r) => {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const radius = Math.min(r.w, r.h) * 0.44;

      // Outer Circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // 4 Vertices
      const angles = [Math.PI * 0.25, Math.PI * 0.72, Math.PI * 1.3, Math.PI * 1.82];
      const pts = angles.map((a) => ({
        x: cx + Math.cos(a) * radius,
        y: cy + Math.sin(a) * radius,
      }));

      // Inscribed quadrilateral
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.stroke();

      // Dashed diagonals
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.moveTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[3].x, pts[3].y);
      ctx.stroke();
      ctx.restore();
    },
  },
};

