"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DEPTH from "./star-depth.json";
import type { SkyConstellation } from "./constellations";

/**
 * A constellation is a line-of-sight coincidence, not a group of neighbours.
 * This view puts every star at its real distance (HYG 4.1 parallax) and lets the
 * player swing the camera off Earth's viewpoint until the figure falls apart.
 */

type Depth = { ly: number | null; est?: boolean; ux: number; uy: number; uz: number; ci?: number; name?: string };
type Star3 = { id: string; mag: number; ly: number; est: boolean; ci: number | null; name: string | null; p: Vec };
type Vec = [number, number, number];
type Angles = { yaw: number; pitch: number };

const DEPTHS = DEPTH as Record<string, Depth>;
const MAX_PITCH = 1.35, MIN_ZOOM = 0.5, MAX_ZOOM = 6;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Vec, s: number): Vec => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec) => Math.sqrt(dot(a, a));
const norm = (a: Vec): Vec => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// Rough B–V colour index to a visible tint. Blue-white hot stars through red giants.
function ciColor(ci: number | null) {
  if (ci === null) return "#e8f2ff";
  if (ci < 0) return "#b6cdff";
  if (ci < 0.3) return "#e6eeff";
  if (ci < 0.6) return "#fff7e8";
  if (ci < 1.0) return "#ffe6bb";
  if (ci < 1.5) return "#ffc890";
  return "#ff9f78";
}

// Past roughly this distance Hipparcos/Gaia parallax error is large enough that the
// figure is an order of magnitude, not a measurement. Say so rather than print it flat.
export const FAR_LY = 800;
export const formatLy = (ly: number) => (ly >= FAR_LY ? "≈" : "") + Math.round(ly).toLocaleString("th-TH");

function starSize(mag: number) {
  return 0.5 + (5.6 - Math.min(mag, 5.6)) * 0.12;
}

export default function Sky3D({
  constellation, box, picked, onPick, showLines, showLabels, alphaId,
}: {
  constellation: SkyConstellation;
  box: { w: number; h: number };
  picked: string | null;
  onPick: (id: string | null) => void;
  showLines: boolean;
  showLabels: boolean;
  alphaId: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [angles, setAngles] = useState<Angles>({ yaw: 0, pitch: 0 });
  const [zoom, setZoom] = useState(1);
  const [showRays, setShowRays] = useState(true);
  const [dragging, setDragging] = useState(false);

  // Real positions, in light years, with Earth at the origin.
  const stars = useMemo<Star3[]>(() => {
    const rows = constellation.points.map((p) => ({ p, d: DEPTHS[p.id] })).filter((r) => r.d);
    const known = rows.map((r) => r.d.ly).filter((v): v is number => typeof v === "number");
    const fallback = known.length ? Math.max(...known) * 1.15 : 500;
    return rows.map(({ p, d }) => {
      const ly = d.ly ?? fallback;
      return {
        id: p.id, mag: p.mag ?? 4.6, ly, est: !!d.est, ci: d.ci ?? null, name: d.name ?? null,
        p: [d.ux * ly, d.uy * ly, d.uz * ly] as Vec,
      };
    });
  }, [constellation]);

  const center = useMemo<Vec>(() => {
    if (!stars.length) return [0, 0, 1];
    const s = stars.reduce<Vec>((a, st) => add(a, st.p), [0, 0, 0]);
    return mul(s, 1 / stars.length);
  }, [stars]);

  // Orbit frame: at yaw 0 / pitch 0 the camera sits exactly where Earth is.
  const frame = useMemo(() => {
    const R = len(center) || 1;
    const ef = norm(mul(center, -1));                       // centroid → Earth
    const er = norm(cross(ef, [0, 0, 1]));
    const eu = cross(er, ef);
    return { R, ef, er, eu };
  }, [center]);

  const camera = useCallback((a: Angles) => {
    const { R, ef, er, eu } = frame;
    const dir = add(add(mul(ef, Math.cos(a.pitch) * Math.cos(a.yaw)), mul(er, Math.cos(a.pitch) * Math.sin(a.yaw))), mul(eu, Math.sin(a.pitch)));
    const pos = add(center, mul(dir, R));
    const forward = norm(sub(center, pos));
    const upRef: Vec = Math.abs(forward[2]) > 0.98 ? [0, 1, 0] : [0, 0, 1];
    const r0 = norm(cross(forward, upRef));
    const u0 = cross(r0, forward);
    const roll = clamp(a.yaw, -1.2, 1.2) * 0.22;
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const right = add(mul(r0, cr), mul(u0, sr));
    const up = sub(mul(u0, cr), mul(r0, sr));
    return { pos, forward, right, up };
  }, [center, frame]);

  type Cam = ReturnType<typeof camera>;
  const spread = useCallback((c: Cam, points: Vec[]) => {
    let mx = 1e-6, my = 1e-6;
    for (const p of points) {
      const v = sub(p, c.pos);
      const zs = dot(v, c.forward);
      if (zs <= 0) continue;
      mx = Math.max(mx, Math.abs(dot(v, c.right) / zs));
      my = Math.max(my, Math.abs(dot(v, c.up) / zs));
    }
    return Math.min((box.w * 0.36) / mx, (box.h * 0.34) / my);
  }, [box]);

  const cam = useMemo(() => camera(angles), [camera, angles]);
  const offEarth = Math.abs(angles.yaw) > 0.02 || Math.abs(angles.pitch) > 0.02;

  // Framing is anchored to the view from Earth. Swinging away only ever zooms OUT,
  // and only as far as needed to keep the scattered stars (and Earth) on screen —
  // the figure still visibly falls apart, it just does not fly off the canvas.
  const earthFocal = useMemo(() => spread(camera({ yaw: 0, pitch: 0 }), stars.map((s) => s.p)), [spread, camera, stars]);
  const focal = useMemo(() => {
    if (!offEarth) return earthFocal;
    const stayWith = spread(cam, stars.map((s) => s.p));
    const withEarth = spread(cam, [...stars.map((s) => s.p), [0, 0, 0] as Vec]);
    // Pull back far enough to show Earth if that is cheap; past a point the stars
    // matter more, so Earth is allowed to sit at the edge and the rays run off it.
    return clamp(Math.max(withEarth, stayWith * 0.45), earthFocal * 0.18, earthFocal);
  }, [offEarth, spread, cam, stars, earthFocal]);

  const project = useCallback((p: Vec) => {
    const v = sub(p, cam.pos);
    const zs = dot(v, cam.forward);
    if (zs <= 0.001) return null;
    const f = focal * zoom;
    return {
      x: box.w / 2 + (dot(v, cam.right) / zs) * f,
      y: box.h / 2 - (dot(v, cam.up) / zs) * f,
      zs,
    };
  }, [cam, focal, zoom, box]);

  const drawn = useMemo(() => {
    return stars
      .map((s) => {
        const pr = project(s.p);
        return pr ? { s, ...pr } : null;
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .sort((a, b) => b.zs - a.zs);
  }, [stars, project]);

  const byId = useMemo(() => new Map(drawn.map((d) => [d.s.id, d])), [drawn]);
  const earth = project([0, 0, 0]);

  // Earth is often far outside the framing once you swing away. Rather than zoom out
  // until the stars are specks, pin a marker to the edge pointing at where Earth is.
  const earthPin = useMemo(() => {
    if (!offEarth) return null;
    const inside = earth && earth.x > 3 && earth.x < box.w - 3 && earth.y > 3 && earth.y < box.h - 3;
    if (inside) return { x: earth.x, y: earth.y, edge: false };
    let dx: number, dy: number;
    if (earth) { dx = earth.x - box.w / 2; dy = earth.y - box.h / 2; }
    else {
      const v = sub([0, 0, 0], cam.pos);
      dx = -dot(v, cam.right); dy = dot(v, cam.up);
    }
    const k = Math.max(Math.abs(dx) / (box.w / 2 - 7), Math.abs(dy) / (box.h / 2 - 7)) || 1;
    return { x: box.w / 2 + dx / k, y: box.h / 2 + dy / k, edge: true };
  }, [offEarth, earth, cam, box]);

  // Drag orbits the camera; the swing button gives the same reveal hands-free.
  const drag = useRef({ active: false, x: 0, y: 0, moved: false });
  const anim = useRef<number | null>(null);
  const anglesRef = useRef(angles);
  useEffect(() => { anglesRef.current = angles; }, [angles]);
  const stopAnim = useCallback(() => { if (anim.current) cancelAnimationFrame(anim.current); anim.current = null; }, []);

  const animateTo = useCallback((target: Angles, ms = 900) => {
    stopAnim();
    const start = { ...anglesRef.current }, t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3);
      setAngles({ yaw: start.yaw + (target.yaw - start.yaw) * e, pitch: start.pitch + (target.pitch - start.pitch) * e });
      anim.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    anim.current = requestAnimationFrame(step);
  }, [stopAnim]);

  useEffect(() => () => stopAnim(), [stopAnim]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      setZoom((z) => clamp(z * Math.pow(0.9985, clamp(d, -240, 240)), MIN_ZOOM, MAX_ZOOM));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    stopAnim();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { active: true, x: e.clientX, y: e.clientY, moved: false };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    if (Math.hypot(dx, dy) > 2) drag.current.moved = true;
    drag.current.x = e.clientX; drag.current.y = e.clientY;
    setAngles((a) => ({ yaw: a.yaw + dx * 0.006, pitch: clamp(a.pitch + dy * 0.006, -MAX_PITCH, MAX_PITCH) }));
  };

  const pending = useRef<string | null>(null);
  const onPointerUp = () => {
    if (drag.current.active && !drag.current.moved) onPick(pending.current);
    drag.current.active = false;
    pending.current = null;
    setDragging(false);
  };

  const swingLabel = offEarth ? "กลับมุมจากโลก" : "หมุนออกจากโลก";
  const swing = () => animateTo(offEarth ? { yaw: 0, pitch: 0 } : { yaw: 0.8, pitch: 0.45 }, 1500);

  const known = stars.filter((s) => !s.est).map((s) => s.ly);
  const near = known.length ? Math.min(...known) : 0;
  const far = known.length ? Math.max(...known) : 0;

  return (
    <>
      <svg
        ref={svgRef}
        className="explorer-svg sky3d"
        viewBox={`0 0 ${box.w} ${box.h}`}
        data-dragging={dragging ? "yes" : "no"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="application"
        aria-label={`มุมมองสามมิติของ ${constellation.th} ลากเพื่อหมุนมุมกล้อง`}
      >
        <defs>
          <radialGradient id="deepsky" cx="50%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#0d2745" />
            <stop offset="60%" stopColor="#06121f" />
            <stop offset="100%" stopColor="#02060c" />
          </radialGradient>
          <filter id="glow3d" x="-260%" y="-260%" width="620%" height="620%">
            <feGaussianBlur stdDeviation="0.45" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width={box.w} height={box.h} fill="url(#deepsky)" />

        {showRays && earth && offEarth && (
          <g className="sight-rays">
            {drawn.map((d) => (
              <line key={"ray" + d.s.id} x1={earth.x} y1={earth.y} x2={d.x} y2={d.y} strokeWidth={0.09} />
            ))}
          </g>
        )}

        {showLines && (
          <g className="figure-lines-3d" strokeWidth={0.3}>
            {constellation.edges.map(([a, b], i) => {
              const p1 = byId.get(a), p2 = byId.get(b);
              if (!p1 || !p2) return null;
              return <line key={i + a + b} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />;
            })}
          </g>
        )}

        {earthPin && (
          <g className={"earth-marker" + (earthPin.edge ? " edge" : "")}>
            <circle cx={earthPin.x} cy={earthPin.y} r={0.9} />
            <circle className="earth-halo" cx={earthPin.x} cy={earthPin.y} r={2.4} />
            {earthPin.edge && (
              <path
                className="earth-arrow"
                d="M 0 -1.4 L 2.8 0 L 0 1.4 Z"
                transform={`translate(${earthPin.x} ${earthPin.y}) rotate(${(Math.atan2(earthPin.y - box.h / 2, earthPin.x - box.w / 2) * 180) / Math.PI}) translate(2.4 0)`}
              />
            )}
            <text
              x={earthPin.x > box.w * 0.7 ? earthPin.x - 3.4 : earthPin.x + 3.4}
              y={earthPin.y > box.h * 0.86 ? earthPin.y - 2.6 : earthPin.y + 1}
              textAnchor={earthPin.x > box.w * 0.7 ? "end" : "start"}
              fontSize={2.4}
            >{earthPin.edge ? "โลกอยู่ทางนี้" : "โลก"}</text>
          </g>
        )}

        <g className="stars-3d">
          {drawn.map(({ s, x, y, zs }) => {
            const perspective = Math.sqrt(s.ly / Math.max(zs, 0.001));
            const r = clamp(starSize(s.mag) * perspective, 0.18, 6);
            const isPicked = s.id === picked;
            const label = s.name ?? "HIP " + s.id.replace("hip", "");
            return (
              <g key={s.id} className={"sky-star" + (isPicked ? " picked" : "")}>
                <circle cx={x} cy={y} r={r * 2.5} fill={ciColor(s.ci)} opacity={0.12} />
                <circle cx={x} cy={y} r={r} fill={ciColor(s.ci)} filter="url(#glow3d)" />
                {isPicked && <circle className="star-ring" cx={x} cy={y} r={r * 3 + 1} strokeWidth={0.28} />}
                {(showLabels || s.id === alphaId || isPicked) && (
                  <text
                    className="star-label"
                    x={x > box.w - 30 ? x - r * 2.4 - 1 : x + r * 2.4 + 1}
                    y={y + 0.9}
                    textAnchor={x > box.w - 30 ? "end" : "start"}
                    fontSize={2.3}
                  >
                    {label} · {s.est ? "ระยะไม่แน่ชัด" : formatLy(s.ly) + " ปีแสง"}
                  </text>
                )}
                <circle
                  className="star-hit" cx={x} cy={y} r={Math.max(2.6, r * 2)}
                  onPointerDown={() => { pending.current = s.id === picked ? null : s.id; }}
                />
              </g>
            );
          })}
        </g>
      </svg>

      <div className="sky3d-dock">
        <button className={offEarth ? "swing back" : "swing"} onClick={swing}>{swingLabel}</button>
        <label className="fast-toggle"><input type="checkbox" checked={showRays} onChange={(e) => setShowRays(e.target.checked)} /><span />แนวสายตาจากโลก</label>
      </div>

      <div className="depth-readout">
        <small>ระยะจริงของดาวในกลุ่มนี้</small>
        <strong>{formatLy(near)} – {formatLy(far)} <i>ปีแสง</i></strong>
        <span>{offEarth ? "เห็นไหม — พอออกจากมุมของโลก รูปกลุ่มดาวก็หายไป" : "ลากเพื่อหมุนออกจากมุมของโลก"}</span>
      </div>
    </>
  );
}
