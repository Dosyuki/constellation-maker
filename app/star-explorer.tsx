"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ZODIAC, ZODIAC_SIMPLIFIED, type SkyConstellation } from "./constellations";
import { HOROSCOPES } from "./horoscope-data";
import Sky3D, { FAR_LY, formatLy } from "./sky-3d";
import DEPTH from "./star-depth.json";

type View = { k: number; tx: number; ty: number };
type Bounds = { x0: number; x1: number; y0: number; y1: number };
type Box = { w: number; h: number };
type Detail = "simple" | "real";

const MIN_ZOOM = 0.6, MAX_ZOOM = 7, PAD = 8, START_BOOST = 1.12;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Red giants — the blurbs mention their colour, so the map should show it.
const WARM = new Set(["hip80763", "hip21421"]);

type Fact = { dates: string; alpha: string; alphaTh: string; alphaId: string; blurb: string; look: string };

const FACTS: Record<string, Fact> = {
  aries: { dates: "21 มี.ค. – 19 เม.ย.", alpha: "Hamal", alphaTh: "ฮามาล", alphaId: "hip9884",
    blurb: "แกะทองคำจากตำนานกรีก เป็นราศีที่รูปทรงเรียบง่ายที่สุดในสิบสองราศี",
    look: "เส้นหักสั้น ๆ จากดาวสว่างสามดวงเรียงกัน จำได้แม้ในเมืองที่ฟ้าไม่มืดสนิท" },
  taurus: { dates: "20 เม.ย. – 20 พ.ค.", alpha: "Aldebaran", alphaTh: "อัลเดบารัน", alphaId: "hip21421",
    blurb: "วัวกระทิงที่หันหน้าเข้าหานายพราน หัววัวคือกระจุกดาวไฮยาดีสรูปตัว V",
    look: "ดาวสีส้มแดงคือตาของวัว ไล่ปลายตัว V ออกไปสองข้างจะเจอปลายเขา" },
  gemini: { dates: "21 พ.ค. – 20 มิ.ย.", alpha: "Pollux", alphaTh: "พอลลักซ์", alphaId: "hip37826",
    blurb: "ฝาแฝดคาสเตอร์กับพอลลักซ์ ยืนเคียงกันเป็นรูปคนสองคนเต็มตัว",
    look: "หัวฝาแฝดคือดาวสว่างสองดวงติดกัน จากนั้นลำตัวเป็นเส้นดาวขนานทอดลงมา" },
  cancer: { dates: "21 มิ.ย. – 22 ก.ค.", alpha: "Al Tarf", alphaTh: "อัลทาร์ฟ", alphaId: "hip40526",
    blurb: "ปูที่จางที่สุดในจักรราศี ต้องอาศัยคืนฟ้ามืดจริงถึงจะเห็นครบทั้งรูป",
    look: "กลางลำตัวมีกระจุกดาวรังผึ้ง M44 ที่ส่องกล้องสองตาแล้วแตกเป็นดาวเป็นสิบดวง" },
  leo: { dates: "23 ก.ค. – 22 ส.ค.", alpha: "Regulus", alphaTh: "เรกูลัส", alphaId: "hip49669",
    blurb: "สิงโตหมอบ หัวกับแผงคอประกอบกันเป็นรูปเคียวกลับด้าน",
    look: "เรกูลัสคือหัวใจสิงห์อยู่ตรงฐานเคียว ปลายอีกฝั่งของลำตัวคือหาง" },
  virgo: { dates: "23 ส.ค. – 22 ก.ย.", alpha: "Spica", alphaTh: "สไปกา", alphaId: "hip65474",
    blurb: "หญิงสาวถือรวงข้าว เป็นกลุ่มดาวที่กินพื้นที่ใหญ่เป็นอันดับสองของท้องฟ้า",
    look: "สไปกาคือรวงข้าวในมือ สว่างพอจะใช้เป็นหมุดนำทางไปหากลุ่มดาวอื่นได้" },
  libra: { dates: "23 ก.ย. – 22 ต.ค.", alpha: "Zubeneschamali", alphaTh: "ซูเบเนสชามาลี", alphaId: "hip74785",
    blurb: "ตราชั่ง เป็นราศีเดียวที่ไม่ใช่คนและไม่ใช่สัตว์",
    look: "เดิมเคยเป็นก้ามของแมงป่อง ชื่อดาวจึงยังแปลว่าก้ามเหนือกับก้ามใต้" },
  scorpius: { dates: "23 ต.ค. – 21 พ.ย.", alpha: "Antares", alphaTh: "แอนทาเรส", alphaId: "hip80763",
    blurb: "แมงป่องที่มีหางโค้งงอชัดเจนที่สุดในบรรดากลุ่มดาวทั้งหมด",
    look: "แอนทาเรสสีแดงส้มคือหัวใจแมงป่อง ไล่หางลงไปจะจบที่เหล็กในสองดวงติดกัน" },
  sagittarius: { dates: "22 พ.ย. – 21 ธ.ค.", alpha: "Kaus Australis", alphaTh: "เคาส์ ออสตราลิส", alphaId: "hip90185",
    blurb: "คนครึ่งม้ากำลังน้าวธนู แต่คนส่วนใหญ่จำเป็นรูปกาน้ำชามากกว่า",
    look: "ลูกศรเล็งไปทางใจกลางทางช้างเผือก ย่านที่ดาวหนาแน่นที่สุดของฟ้าฤดูร้อน" },
  capricornus: { dates: "22 ธ.ค. – 19 ม.ค.", alpha: "Deneb Algedi", alphaTh: "เดเนบ อัลเกดี", alphaId: "hip107556",
    blurb: "แพะทะเล ครึ่งบนเป็นแพะ ครึ่งล่างเป็นหางปลา",
    look: "รูปทรงเป็นสามเหลี่ยมกว้างแบน ดาวไม่สว่างนักแต่เค้าโครงจำง่าย" },
  aquarius: { dates: "20 ม.ค. – 18 ก.พ.", alpha: "Sadalsuud", alphaTh: "ซาดัลซูอุด", alphaId: "hip106278",
    blurb: "คนแบกหม้อน้ำ เทสายน้ำลงมาเป็นแถวดาวยาวทอดไปทางใต้",
    look: "หาไหล่กับแขนให้เจอก่อน แล้วค่อยไล่สายน้ำที่ไหลลงไป" },
  pisces: { dates: "19 ก.พ. – 20 มี.ค.", alpha: "Alpherg", alphaTh: "อัลเฟิร์ก", alphaId: "hip7097",
    blurb: "ปลาสองตัวถูกผูกหางเข้าหากันด้วยเชือกเส้นเดียว",
    look: "วงดาวเล็ก ๆ ที่เรียกว่า Circlet คือหัวปลาตัวหนึ่ง อยู่ใต้สี่เหลี่ยมเพกาซัส" },
};

function boundsOf(c: SkyConstellation): Bounds {
  const xs = c.points.map((p) => p.x), ys = c.points.map((p) => p.y);
  return { x0: Math.min(...xs) - PAD, x1: Math.max(...xs) + PAD, y0: Math.min(...ys) - PAD, y1: Math.max(...ys) + PAD };
}

// Panning is bounded the way a map is: the figure can never be dragged off screen.
function clampView(v: View, b: Bounds, box: Box): View {
  const ax = -b.x0 * v.k, bx = box.w - b.x1 * v.k, ay = -b.y0 * v.k, by = box.h - b.y1 * v.k;
  return {
    k: v.k,
    tx: clamp(v.tx, Math.min(ax, bx), Math.max(ax, bx)),
    ty: clamp(v.ty, Math.min(ay, by), Math.max(ay, by)),
  };
}

function fitZoom(b: Bounds, box: Box) {
  return clamp(Math.min(box.w / (b.x1 - b.x0), box.h / (b.y1 - b.y0)), MIN_ZOOM, MAX_ZOOM);
}

function fitView(b: Bounds, box: Box, boost = 1): View {
  const k = clamp(fitZoom(b, box) * boost, MIN_ZOOM, MAX_ZOOM);
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  return clampView({ k, tx: box.w / 2 - cx * k, ty: box.h / 2 - cy * k }, b, box);
}

function starRadius(mag = 4.6) {
  return 0.52 + (5.6 - Math.min(mag, 5.6)) * 0.13;
}

// Seeded so server and client render the same field.
function backdropStars() {
  let seed = 20260819;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  return Array.from({ length: 170 }, (_, i) => ({
    id: "bg" + i, x: -90 + rnd() * 300, y: -70 + rnd() * 230, r: 0.1 + rnd() * 0.3, o: 0.12 + rnd() * 0.45,
  }));
}

export default function StarExplorer({ onStart, onExit }: { onStart: () => void; onExit: () => void }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [box, setBox] = useState<Box>({ w: 100, h: 78 });
  const [detail, setDetail] = useState<Detail>("simple");
  const [index, setIndex] = useState(0);
  const [showLines, setShowLines] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [viewed, setViewed] = useState<Set<string>>(() => new Set([ZODIAC[0].id]));
  const [picked, setPicked] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [view, setView] = useState<View>(() => fitView(boundsOf(ZODIAC_SIMPLIFIED[0]), { w: 100, h: 78 }, START_BOOST));

  const catalog = detail === "simple" ? ZODIAC_SIMPLIFIED : ZODIAC;
  const current = catalog[index];
  const full = ZODIAC[index];
  const fact = FACTS[current.id];
  const horoscope = HOROSCOPES[current.id];
  const bounds = useMemo(() => boundsOf(current), [current]);
  const backdrop = useMemo(() => backdropStars(), []);
  const alphaStar = useMemo(() => full.points.find((p) => p.id === fact.alphaId) ?? full.points[0], [full, fact]);
  const pickedStar = picked ? current.points.find((p) => p.id === picked) : undefined;
  const pickedDepth = picked ? (DEPTH as Record<string, { ly: number | null; est?: boolean }>)[picked] : undefined;

  const viewRef = useRef(view), boundsRef = useRef(bounds), boxRef = useRef(box);
  const indexRef = useRef(index), detailRef = useRef(detail);
  useEffect(() => { indexRef.current = index; detailRef.current = detail; }, [index, detail]);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { boundsRef.current = bounds; }, [bounds]);
  useEffect(() => { boxRef.current = box; }, [box]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef({ active: false, lastX: 0, lastY: 0, moved: false, vx: 0, vy: 0, t: 0 });
  const pendingStar = useRef<string | null>(null);
  const pinch = useRef<{ dist: number } | null>(null);
  const momentum = useRef<number | null>(null);
  const anim = useRef<number | null>(null);

  const stopMomentum = useCallback(() => { if (momentum.current) cancelAnimationFrame(momentum.current); momentum.current = null; }, []);
  const stopAnim = useCallback(() => { if (anim.current) cancelAnimationFrame(anim.current); anim.current = null; }, []);

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const zoomAt = useCallback((factor: number, at?: { x: number; y: number }) => {
    setView((v) => {
      const k = clamp(v.k * factor, MIN_ZOOM, MAX_ZOOM);
      const p = at ?? { x: boxRef.current.w / 2, y: boxRef.current.h / 2 };
      const wx = (p.x - v.tx) / v.k, wy = (p.y - v.ty) / v.k;
      return clampView({ k, tx: p.x - wx * k, ty: p.y - wy * k }, boundsRef.current, boxRef.current);
    });
  }, []);

  const animateTo = useCallback((target: View, ms = 520) => {
    stopAnim(); stopMomentum();
    const start = viewRef.current, t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      setView({ k: start.k + (target.k - start.k) * e, tx: start.tx + (target.tx - start.tx) * e, ty: start.ty + (target.ty - start.ty) * e });
      anim.current = p < 1 ? requestAnimationFrame(step) : null;
    };
    anim.current = requestAnimationFrame(step);
  }, [stopAnim, stopMomentum]);

  const fitNow = useCallback((boost = 1) => animateTo(fitView(boundsRef.current, boxRef.current, boost)), [animateTo]);

  // The stage sets the viewBox width so the aspect ratio always matches — no letterboxing, exact pointer math.
  const firstFit = useRef(false);
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (!r.width || !r.height) return;
      const next = { w: clamp(78 * (r.width / r.height), 52, 260), h: 78 };
      setBox((prev) => (Math.abs(prev.w - next.w) < 0.4 ? prev : next));
      if (!firstFit.current) { firstFit.current = true; setView(fitView(boundsRef.current, next, START_BOOST)); }
      else setView((v) => clampView(v, boundsRef.current, next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Switching slides is driven from the controls, not from an effect, so the fly-to and the
  // state change happen in one pass.
  const goTo = useCallback((target: number, mode?: Detail) => {
    const next = (target + 12) % 12;
    const nextMode = mode ?? detailRef.current;
    const list = nextMode === "simple" ? ZODIAC_SIMPLIFIED : ZODIAC;
    setIndex(next);
    setDetail(nextMode);
    setPicked(null);
    setViewed((prev) => (prev.has(list[next].id) ? prev : new Set(prev).add(list[next].id)));
    animateTo(fitView(boundsOf(list[next]), boxRef.current, START_BOOST));
  }, [animateTo]);

  useEffect(() => () => { stopAnim(); stopMomentum(); }, [stopAnim, stopMomentum]);

  // React listens for wheel passively at the root, so this one has to be native.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      const p = toWorld(e.clientX, e.clientY);
      zoomAt(Math.pow(0.9985, clamp(d, -240, 240)), p ?? undefined);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [toWorld, zoomAt]);

  const step = useCallback((dir: number) => goTo(indexRef.current + dir), [goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "+" || e.key === "=") zoomAt(1.25);
      else if (e.key === "-" || e.key === "_") zoomAt(0.8);
      else if (e.key === "0") fitNow();
      else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, zoomAt, fitNow, onExit]);

  const pinchDistance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    stopMomentum(); stopAnim();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) { pinch.current = { dist: pinchDistance() }; drag.current.active = false; setDragging(false); return; }
    drag.current = { active: true, lastX: e.clientX, lastY: e.clientY, moved: false, vx: 0, vy: 0, t: performance.now() };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > 4 && pinch.current.dist > 4) {
        zoomAt(dist / pinch.current.dist, toWorld((a.x + b.x) / 2, (a.y + b.y) / 2) ?? undefined);
        pinch.current.dist = dist;
      }
      return;
    }

    if (!drag.current.active) return;
    const from = toWorld(drag.current.lastX, drag.current.lastY), to = toWorld(e.clientX, e.clientY);
    if (!from || !to) return;
    const dx = to.x - from.x, dy = to.y - from.y;
    const now = performance.now(), dt = Math.max(1, now - drag.current.t);
    drag.current.lastX = e.clientX; drag.current.lastY = e.clientY; drag.current.t = now;
    drag.current.vx = dx / dt; drag.current.vy = dy / dt;
    if (Math.hypot(dx, dy) > 0.2) drag.current.moved = true;
    setView((v) => clampView({ k: v.k, tx: v.tx + dx, ty: v.ty + dy }, boundsRef.current, boxRef.current));
  };

  // Only fling if the finger was still moving at release — a pause before letting go should stop dead.
  const glide = (vx: number, vy: number) => {
    if (Math.hypot(vx, vy) < 0.008 || performance.now() - drag.current.t > 90) return;
    let sx = vx, sy = vy, last = performance.now();
    const run = (now: number) => {
      const dt = Math.min(48, now - last); last = now;
      const decay = Math.exp(-dt / 170);
      sx *= decay; sy *= decay;
      setView((v) => clampView({ k: v.k, tx: v.tx + sx * dt, ty: v.ty + sy * dt }, boundsRef.current, boxRef.current));
      momentum.current = Math.hypot(sx, sy) > 0.004 ? requestAnimationFrame(run) : null;
    };
    momentum.current = requestAnimationFrame(run);
  };

  // The svg captures the pointer while dragging, so a star is selected here rather than with onClick.
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0 && drag.current.active) {
      drag.current.active = false;
      setDragging(false);
      if (!drag.current.moved && pendingStar.current) {
        const id = pendingStar.current;
        setPicked((cur) => (cur === id ? null : id));
      } else {
        glide(drag.current.vx, drag.current.vy);
      }
    }
    pendingStar.current = null;
  };

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => zoomAt(1.7, toWorld(e.clientX, e.clientY) ?? undefined);

  const fitK = fitZoom(bounds, box);
  const zoomPercent = Math.round((view.k / fitK) * 100);
  const transform = `translate(${view.tx} ${view.ty}) scale(${view.k})`;
  const gridLines = useMemo(() => Array.from({ length: 33 }, (_, i) => -60 + i * 10), []);

  return (
    <main className="learn-shell">
      <div className="ambient ambient-a" /><div className="ambient ambient-b" />

      <header className="topbar learn-topbar">
        <div className="brand"><span className="brand-mark">✦</span><span>CONSTELLATION MAKER</span></div>
        <div className="learn-title"><small>PRE-GAME · LEARN MODE</small><b>ห้องเรียนกลุ่มดาว</b></div>
        <div className="learn-actions">
          <button className="ghost-button" onClick={onExit}>← หน้าหลัก</button>
          <button className="go-button" onClick={onStart}>เริ่มภารกิจ <span>→</span></button>
        </div>
      </header>

      <div className="learn-body">
        <section className="explorer-panel">
          <div className="explorer-head">
            <span className="slide-count">{String(index + 1).padStart(2, "0")} <i>/ 12</i></span>
            <div className="explorer-name">
              <span className="explorer-symbol">{current.symbol}</span>
              <div><h2>{current.th}</h2><p>{current.en} · {fact.dates}</p></div>
            </div>
            <div className="explorer-toggles">
              <div className="seg" role="group" aria-label="ระดับรายละเอียดของรูปดาว">
                <button className={detail === "simple" ? "on" : ""} onClick={() => goTo(index, "simple")}>แบบในเกม</button>
                <button className={detail === "real" ? "on" : ""} onClick={() => goTo(index, "real")}>ท้องฟ้าจริง</button>
              </div>
              <div className="seg" role="group" aria-label="มุมมองแผนที่">
                <button className={!is3D ? "on" : ""} onClick={() => setIs3D(false)}>แผนที่ 2D</button>
                <button className={is3D ? "on" : ""} onClick={() => setIs3D(true)}>3 มิติ</button>
              </div>
              <label className="fast-toggle"><input type="checkbox" checked={showLines} onChange={(e) => setShowLines(e.target.checked)} /><span />เส้นเชื่อม</label>
              <label className="fast-toggle"><input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /><span />ชื่อดาว</label>
            </div>
          </div>

          <div className="explorer-stage" ref={stageRef} data-dragging={dragging ? "yes" : "no"}>
            {!is3D && (
            <svg
              ref={svgRef}
              className="explorer-svg"
              viewBox={`0 0 ${box.w} ${box.h}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onDoubleClick={onDoubleClick}
              role="application"
              aria-label={`แผนที่ดาว ${current.th} ลากเพื่อเลื่อน หมุนล้อเพื่อซูม`}
            >
              <defs>
                <radialGradient id="skyfill" cx="50%" cy="28%" r="78%">
                  <stop offset="0%" stopColor="#12365f" />
                  <stop offset="55%" stopColor="#08182b" />
                  <stop offset="100%" stopColor="#03080f" />
                </radialGradient>
                <filter id="starglow" x="-220%" y="-220%" width="540%" height="540%">
                  <feGaussianBlur stdDeviation="0.5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              <rect x="0" y="0" width={box.w} height={box.h} fill="url(#skyfill)" />

              <g className="backdrop-layer" transform={`translate(${view.tx * 0.32} ${view.ty * 0.32})`}>
                {backdrop.map((s) => <circle key={s.id} cx={s.x} cy={s.y} r={s.r} fill="#dcefff" opacity={s.o} />)}
              </g>

              <g transform={transform}>
                <g className="sky-grid" strokeWidth={0.16 / view.k}>
                  {gridLines.map((v) => <line key={"gx" + v} x1={v} y1={-70} x2={v} y2={210} />)}
                  {gridLines.map((v) => <line key={"gy" + v} x1={-90} y1={v} x2={260} y2={v} />)}
                </g>

                {showLines && (
                  <g className="figure-lines" strokeWidth={0.34 / view.k}>
                    {current.edges.map(([a, b], i) => {
                      const p1 = current.points.find((p) => p.id === a), p2 = current.points.find((p) => p.id === b);
                      if (!p1 || !p2) return null;
                      return <line key={i + a + b} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />;
                    })}
                  </g>
                )}

                <g className="figure-stars">
                  {current.points.map((p) => {
                    const r = starRadius(p.mag) / view.k;
                    const isAlpha = p.id === fact.alphaId;
                    const isPicked = p.id === picked;
                    const label = isAlpha ? fact.alpha : "HIP " + p.id.replace("hip", "");
                    return (
                      <g key={p.id} className={"sky-star" + (isAlpha ? " alpha" : "") + (isPicked ? " picked" : "") + (WARM.has(p.id) ? " warm" : "")}>
                        <circle className="star-halo" cx={p.x} cy={p.y} r={r * 2.6} />
                        <circle className="star-body" cx={p.x} cy={p.y} r={r} filter="url(#starglow)" />
                        {isPicked && <circle className="star-ring" cx={p.x} cy={p.y} r={r * 3.4} strokeWidth={0.3 / view.k} />}
                        {(showLabels || isAlpha) && (
                          <text
                            className="star-label"
                            x={p.x * view.k + view.tx > box.w - 17 ? p.x - r * 3 : p.x + r * 3}
                            y={p.y + 0.9 / view.k}
                            textAnchor={p.x * view.k + view.tx > box.w - 17 ? "end" : "start"}
                            fontSize={2.3 / view.k}
                          >{label}</text>
                        )}
                        <circle
                          className="star-hit" cx={p.x} cy={p.y} r={Math.max(3.2 / view.k, r * 2.2)}
                          onPointerDown={() => { pendingStar.current = p.id; }}
                        />
                      </g>
                    );
                  })}
                </g>
              </g>
            </svg>
            )}
            {is3D && (
              <Sky3D key={current.id + detail} constellation={current} box={box} picked={picked} onPick={setPicked} showLines={showLines} showLabels={showLabels} alphaId={fact.alphaId} />
            )}

            <button className="stage-nav prev" onClick={() => step(-1)} aria-label="กลุ่มดาวก่อนหน้า">‹</button>
            <button className="stage-nav next" onClick={() => step(1)} aria-label="กลุ่มดาวถัดไป">›</button>

            <div className="stage-hint"><span className="live-dot" />{is3D ? "ลากเพื่อหมุนมุมกล้องรอบกลุ่มดาว · หมุนล้อเพื่อซูม · แตะดาวเพื่อดูระยะจริง" : "ลากเพื่อเลื่อนแผนที่ · หมุนล้อหรือบีบนิ้วเพื่อซูม · ดับเบิลคลิกซูมเข้า · แตะดาวเพื่อดูข้อมูล"}</div>

            {!is3D && <div className="zoom-dock">
              <button onClick={() => zoomAt(1.3)} aria-label="ซูมเข้า">+</button>
              <button onClick={() => zoomAt(0.77)} aria-label="ซูมออก">−</button>
              <button className="fit" onClick={() => fitNow()} aria-label="พอดีจอ">⤢</button>
              <span className="zoom-read">{zoomPercent}%</span>
            </div>}

            {pickedStar && (
              <div className="star-readout">
                <small>{pickedStar.id === fact.alphaId ? "ดาวสว่างที่สุดของกลุ่ม" : "ดาวในรูปกลุ่มดาว"}</small>
                <strong>{pickedStar.id === fact.alphaId ? `${fact.alpha} · ${fact.alphaTh}` : "HIP " + pickedStar.id.replace("hip", "")}</strong>
                <span>ความสว่าง (magnitude) {pickedStar.mag?.toFixed(2) ?? "—"} · {(pickedStar.mag ?? 9) < 2 ? "เห็นได้ง่ายแม้ในเมือง" : (pickedStar.mag ?? 9) < 4 ? "เห็นได้ในฟ้าชานเมือง" : "ต้องฟ้ามืดจึงจะเห็น"}</span>
                <span className="readout-dist">{pickedDepth?.est ? "ระยะทางยังไม่แน่ชัด (วัดพารัลแลกซ์ไม่ได้)" : pickedDepth?.ly ? `อยู่ห่างจากโลก ${formatLy(pickedDepth.ly)} ปีแสง${pickedDepth.ly >= FAR_LY ? " · ดาวไกลระดับนี้ค่าที่วัดได้คลาดเคลื่อนสูง" : ""}` : ""}</span>
              </div>
            )}
          </div>

          <div className="zodiac-rail" role="group" aria-label="เลือกกลุ่มดาว">
            {catalog.map((c, i) => (
              <button key={c.id} className={"rail-item" + (i === index ? " on" : "") + (viewed.has(c.id) ? " seen" : "")} onClick={() => goTo(i)}>
                <span>{c.symbol}</span>
                <small>{c.th.replace("ราศี", "")}</small>
              </button>
            ))}
          </div>
        </section>

        <aside className="learn-aside">
          <div className="learn-progress">
            <div><span className="control-label">เรียนรู้แล้ว</span><strong>{viewed.size}<small> / 12 ราศี</small></strong></div>
            <div className="progress-bar"><i style={{ width: `${(viewed.size / 12) * 100}%` }} /></div>
          </div>

          <div className="fact-card">
            <p className="eyebrow">รู้จักกลุ่มดาวนี้</p>
            <p className="fact-blurb">{fact.blurb}</p>
            <div className="fact-look"><b>สังเกตยังไง</b><p>{fact.look}</p></div>
          </div>

          <div className="horoscope-card">
            <div className="horoscope-heading">
              <div><p className="eyebrow">ดวงประจำราศี</p><strong>อ่านดวงของ{current.th}</strong></div>
              <span aria-hidden="true">✦</span>
            </div>
            <div className="horoscope-grid">
              <article><b>การงาน / การเรียน</b><p>{horoscope.work}</p></article>
              <article><b>การเงิน</b><p>{horoscope.money}</p></article>
              <article><b>สุขภาพ</b><p>{horoscope.health}</p></article>
              <article><b>ความรัก</b><p>{horoscope.love}</p></article>
            </div>
            <small className="horoscope-note">ข้อมูลอ้างอิงจากหน้า DATA · ใช้เพื่อการเรียนรู้และความบันเทิง</small>
          </div>

          <div className="fact-alpha">
            <span className="control-label">ดาวสว่างที่สุด</span>
            <strong>{fact.alpha}</strong>
            <span className="alpha-th">{fact.alphaTh} · mag {alphaStar.mag?.toFixed(2) ?? "—"}</span>
          </div>

          <div className="fact-stats">
            <div><span className="control-label">ดาวในรูปนี้</span><strong>{current.points.length}</strong></div>
            <div><span className="control-label">เส้นเชื่อม</span><strong>{current.edges.length}</strong></div>
            <div><span className="control-label">ผู้เล่นที่ต้องใช้</span><strong>{current.points.length}</strong></div>
          </div>

          <p className="aside-note">
            {detail === "simple"
              ? "นี่คือรูปแบบย่อที่ใช้ในเกมจริง — 1 ผู้เล่นยืน 1 ดาว กดสลับเป็น “ท้องฟ้าจริง” เพื่อดูดาวทั้งหมดของกลุ่มนี้"
              : "นี่คือดาวทั้งหมดตามท้องฟ้าจริง เกมจะใช้รูปแบบย่อที่ดาวน้อยกว่า กดกลับไปที่ “แบบในเกม” เพื่อดูรูปที่ต้องจำ"}
          </p>

          <button className="go-button wide" onClick={onStart}>
            {viewed.size === 12 ? "ดูครบ 12 ราศีแล้ว เริ่มภารกิจ" : "พร้อมแล้ว เริ่มภารกิจ"} <span>→</span>
          </button>
          <button className="ghost-button wide" onClick={onExit}>กลับหน้าหลัก</button>
        </aside>
      </div>
    </main>
  );
}
