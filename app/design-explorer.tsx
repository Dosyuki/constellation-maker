"use client";

import { useState } from "react";
import { ZODIAC } from "./constellations";

export type SiteView = "game" | "mockup" | "flow";

const UI_STEPS = [
  { key:"attract", no:"01", title:"Attract Mode", th:"มองเห็นภารกิจได้ตั้งแต่ระยะไกล", note:"ราศีสิงห์จริงจากชุดข้อมูลในเกมค่อย ๆ ลอยและวาดเส้นขึ้นมา พร้อมแสงชีพจรที่ปุ่มเริ่ม เพื่อดึงสายตาโดยไม่รบกวนพื้นที่จัดแสดง", timer:"∞", score:"LEO" },
  { key:"memory", no:"02", title:"Memory Hint", th:"จดจำราศีสิงห์ใน 2 วินาที", note:"เผยดาวเป้าหมายและเส้นเชื่อมครบทั้งรูปชั่วคราว ผู้เล่นจึงรู้ว่าต้องจำทั้งตำแหน่งและความสัมพันธ์ของดาวก่อนภาพค่อย ๆ หายไป", timer:"02", score:"9 STARS" },
  { key:"play", no:"03", title:"Gameplay", th:"ร่วมกันสร้างราศีสิงห์", note:"แสดงเฉพาะดาวที่ทีมเหยียบสำเร็จและเส้นที่ค้นพบแล้ว สถานะ 4/9 ช่วยให้รู้ความคืบหน้าโดยไม่เปิดเผยคำตอบที่เหลือ", timer:"18", score:"4/9" },
  { key:"assist", no:"04", title:"Hint Assist", th:"ยังขาดดาวเป้าหมายอีก 2 จุด", note:"ช่วง 10 วินาทีท้าย ระบบค่อย ๆ เติมเส้นประบอกทิศทาง แล้วให้วงแสงรอบเป้าหมายเต้นใน 5 วินาทีสุดท้าย โดยดาวหลอกยังคงหน้าตาเป็นกลาง", timer:"05", score:"7/9" },
  { key:"reveal", no:"05", title:"Answer Reveal", th:"ดูสิ่งที่ทีมทำได้ในรอบนี้", note:"เขียวคือดาวที่เลือกถูก ชมพูคือดาวหลอกที่เหยียบ และวงเส้นประคือดาวเป้าหมายที่พลาด พร้อมวาดรูปคำตอบจริงให้เทียบได้ทันที", timer:"+7", score:"78%" },
  { key:"summary", no:"06", title:"Final Summary", th:"ภารกิจสำเร็จ — เห็นผลลัพธ์ใน 3 วินาที", note:"รวมคะแนน ความแม่นยำ และจำนวนรอบไว้ในภาพเดียว พร้อมใช้ราศีที่เพิ่งสร้างเป็นฉากรางวัลเพื่อเชื่อมความสำเร็จกับการเล่น", timer:"38", score:"84%" },
  { key:"operator", no:"07", title:"Operator Dashboard", th:"ควบคุมและดูแลระบบจากจุดเดียว", note:"ผู้ดูแลเห็นสถานะ Wall Display, Sensor 22 จุด, latency และระดับ Hint Assist พร้อมปุ่มหยุดฉุกเฉินที่แยกจากคำสั่งทั่วไปอย่างชัดเจน", timer:"LIVE", score:"22/22" },
] as const;

const FLOW_STEPS = [
  { title:"Attract Mode", duration:"รอเริ่มเล่น", purpose:"ดึงดูดสายตาจากระยะไกลและสื่อวิธีเริ่มในประโยคเดียว", player:"เห็นราศีสิงห์ค่อย ๆ ลอย เส้นแสงวิ่ง และคำเชิญให้ยืนบนดาว", system:"วน motion 8 วินาที อ่าน input แรก แล้วส่งต่อไปเลือกโจทย์ทันที" },
  { title:"Round Selection", duration:"ทันที", purpose:"เลือกโจทย์ใหม่จาก 12 ราศีโดยไม่ซ้ำใน Session", player:"ไม่เห็นขั้นตอนสุ่ม", system:"บันทึก random seed, targets, edges และ decoys" },
  { title:"Memory Hint", duration:"2 วินาที", purpose:"ให้ผู้เล่นจดจำรูปร่างและเส้นเชื่อม", player:"เห็นชื่อราศีและรูปคำตอบชั่วคราว", system:"Fade in 0.4s · Hold 1.2s · Fade out 0.4s" },
  { title:"Ready Countdown", duration:"3 วินาที", purpose:"ให้ทุกคนมีเวลาเข้าตำแหน่งอย่างปลอดภัย", player:"เห็น 3 · 2 · 1 พร้อม visual/audio cue", system:"อ่าน Sensor ได้ แต่ยังไม่นับคะแนน" },
  { title:"Gameplay", duration:"40 วินาที", purpose:"ร่วมกันเลือก Target Stars และหลีกเลี่ยง Decoys", player:"เห็นเวลา คำสั่ง ดาว และเส้นที่ค้นพบ", system:"รับ Enter / Stay / Exit พร้อม debounce และ exit grace" },
  { title:"Hint Assist", duration:"10 วินาทีท้าย", purpose:"ช่วยบอกทิศทางโดยไม่เฉลยเร็วเกินไป", player:"10–6s เห็นเส้นประ · 5–1s เห็นดาวเป้าหมาย pulse", system:"Operator ปิดหรือปรับระดับ Assist ได้" },
  { title:"Lock & Check", duration:"≤ 1 วินาที", purpose:"หยุดรับ input และสร้าง snapshot ที่แน่นอน", player:"เห็นสถานะกำลังตรวจคำตอบ", system:"Lock input, snapshot active nodes และคำนวณคะแนนครั้งเดียว" },
  { title:"Answer Reveal", duration:"ประมาณ 3 วินาที", purpose:"อธิบายคำตอบที่ถูก ผิด และพลาดอย่างชัดเจน", player:"เห็นคำตอบจริงพร้อม feedback หลายรูปแบบ", system:"Target active = 1 คะแนน · Decoy = 0 คะแนน" },
  { title:"Score Pop-up", duration:"ประมาณ 2 วินาที", purpose:"ให้รางวัลและเตรียมเข้าสู่รอบถัดไป", player:"เห็นคะแนนรอบ คะแนนเต็ม และ completion rate", system:"บันทึก analytics แล้ววนกลับ Round Selection หากยังไม่ครบ 5 รอบ" },
  { title:"Final Summary", duration:"8–12 วินาที", purpose:"ปิดประสบการณ์และชวนกลุ่มถัดไป", player:"เห็นคะแนนรวม ความแม่นยำ และผลงานเด่น", system:"รอเริ่มใหม่หรือ reset กลับ Attract Mode" },
] as const;

function BrandNav({view,onView}:{view:SiteView;onView:(view:SiteView)=>void}){
  return <header className="explorer-topbar">
    <button className="explorer-brand" onClick={()=>onView("game")} aria-label="กลับหน้าเกม"><span>✦</span><b>CONSTELLATION MAKER</b></button>
    <nav aria-label="เลือกส่วนที่ต้องการดู"><button className={view==="game"?"active":""} onClick={()=>onView("game")}>เล่นเกม</button><button className={view==="mockup"?"active":""} onClick={()=>onView("mockup")}>UI Mockup</button><button className={view==="flow"?"active":""} onClick={()=>onView("flow")}>Game Flow</button></nav>
  </header>
}

const LEO = ZODIAC.find((item)=>item.id==="leo")!;
const LEO_POINTS = LEO.points.map((point)=>({...point,x:8+(point.x-13)*.92,y:10+(point.y-21.15)*1.85}));
const LEO_POINT_MAP = new Map(LEO_POINTS.map((point)=>[point.id,point]));

function RealConstellation({kind}:{kind:string}){
  const revealed = kind==="memory" || kind==="attract" || kind==="reveal" || kind==="summary";
  return <div className={`real-constellation state-${kind}`} aria-label="ตัวอย่างราศีสิงห์จากข้อมูลจริงในเกม">
    <div className="constellation-name"><b>♌ LEO</b><small>REAL GAME DATA · 9 STARS</small></div>
    <div className="real-lines" aria-hidden="true">{LEO.edges.map(([from,to],i)=>{
      const a=LEO_POINT_MAP.get(from),b=LEO_POINT_MAP.get(to); if(!a||!b)return null;
      const dx=b.x-a.x,dy=(b.y-a.y)/2.3,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
      const discovered=revealed || (kind==="play"&&i<4) || (kind==="assist"&&i<7);
      return <i key={`${from}-${to}`} className={discovered?"discovered":"hint-line"} style={{left:`${a.x}%`,top:`${a.y}%`,width:`${length}%`,transform:`rotate(${angle}deg)`,animationDelay:`${i*.12}s`}}/>;
    })}</div>
    {LEO_POINTS.map((point,i)=>{
      const active=revealed || (kind==="play"&&i<4) || (kind==="assist"&&i<7);
      const missed=kind==="reveal"&&i>=7;
      return <span key={point.id} className={`real-star ${active?"active":""} ${missed?"missed":""}`} style={{left:`${point.x}%`,top:`${point.y}%`,animationDelay:`${i*.14}s`}}><i>✦</i><small>{String(i+1).padStart(2,"0")}</small></span>;
    })}
    {kind==="reveal"&&<span className="decoy-star" aria-label="ดาวหลอก">×</span>}
    {kind==="play"&&<div className="state-explainer"><b>4 / 9</b><span>ดาวเป้าหมายที่ค้นพบ</span></div>}
    {kind==="assist"&&<div className="state-explainer"><b>7 / 9</b><span>เส้นประ = ทิศทางใบ้ · วงแสง = เป้าหมาย</span></div>}
  </div>
}

function MockScreen({step}:{step:(typeof UI_STEPS)[number]}){
  const isOperator=step.key==="operator";
  return <div className={`mock-screen mock-${step.key}`}><div className="mock-grid"/><div className="mock-screen-top"><span>ROUND {step.key==="summary"?"5":"2"} / 5</span><small>{isOperator?"SYSTEM ONLINE":"WALL DISPLAY"}</small></div>
    {isOperator?<div className="operator-preview"><aside><b>OPERATOR</b><span className="selected">● ภาพรวม Session</span><span>◌ ควบคุมรอบ</span><span>◌ Sensor & Calibration</span><span>◌ ชุดโจทย์</span><span className="emergency">หยุดฉุกเฉิน</span></aside><section><div className="operator-heading"><div><small>LIVE · ROUND 2 / 5</small><h3>ภาพรวม Session</h3></div><b>42 ms</b></div><div className="operator-cards"><article><small>WALL DISPLAY</small><strong>สร้างราศีสิงห์</strong><span>18 SEC</span></article><article><small>SENSORS</small><strong>22 / 22</strong><span>ONLINE</span></article><article><small>ROUND CONTROL</small><strong>Hint Assist</strong><span>BOTH</span></article></div></section></div>:<>
      <div className="mock-screen-center"><span className="mock-symbol">{step.key==="summary"?"✦":"♌"}</span><p>{step.title.toUpperCase()}</p><h3>{step.th}</h3><small>CONSTELLATION MAKER · LEO</small></div><RealConstellation kind={step.key}/><div className="mock-metric"><strong>{step.timer}</strong><small>{step.key==="summary"?"TOTAL SCORE":step.key==="reveal"?"ROUND SCORE":"TIME LEFT"}</small></div><div className="mock-score"><small>{step.key==="summary"?"ACCURACY":step.key==="attract"?"CONSTELLATION":"SCORE"}</small><strong>{step.score}</strong></div>
      {step.key==="attract"&&<button className="mock-cta"><i/>ยืนบนดาวเพื่อเริ่มภารกิจ <span>→</span></button>}{step.key==="reveal"&&<div className="reveal-banner"><b>✓ ถูก 7 จุด</b><span>× ดาวหลอก 1 จุด</span><em>◌ พลาด 2 จุด</em></div>}{step.key==="summary"&&<div className="summary-stats"><span>38 / 45<small>คะแนนรวม</small></span><span>84%<small>ความแม่นยำ</small></span><span>5 / 5<small>รอบที่เล่น</small></span></div>}
    </>}
  </div>
}

export default function DesignExplorer({view,onView}:{view:Exclude<SiteView,"game">;onView:(view:SiteView)=>void}){
  const [uiIndex,setUiIndex]=useState(0),[flowIndex,setFlowIndex]=useState(0),isMock=view==="mockup",index=isMock?uiIndex:flowIndex,count=isMock?UI_STEPS.length:FLOW_STEPS.length;
  const setIndex=(next:number)=>isMock?setUiIndex(next):setFlowIndex(next),previous=()=>setIndex((index-1+count)%count),next=()=>setIndex((index+1)%count),ui=UI_STEPS[uiIndex],flow=FLOW_STEPS[flowIndex];
  return <main className="design-explorer"><BrandNav view={view} onView={onView}/><section className="explorer-hero"><div><p className="explorer-kicker">DESIGN DOCUMENTATION · INTERACTIVE WALKTHROUGH</p><h1>{isMock?"UI Mockup":"Game Flow"}</h1><p>{isMock?"สำรวจหน้าจอหลักของประสบการณ์สองจอ ตั้งแต่เชิญผู้เล่นจนถึงสรุปภารกิจ":"ติดตาม State, เวลา, สิ่งที่ผู้เล่นเห็น และการทำงานของระบบครบหนึ่ง Session"}</p></div><div className="explorer-count"><strong>{String(index+1).padStart(2,"0")}</strong><span>/ {String(count).padStart(2,"0")}</span></div></section>
    <div className="step-tabs" role="tablist" aria-label={isMock?"หน้าจอ UI":"ขั้นตอน Game Flow"}>{(isMock?UI_STEPS:FLOW_STEPS).map((item,i)=><button key={item.title} className={i===index?"active":i<index?"done":""} onClick={()=>setIndex(i)} role="tab" aria-selected={i===index}><i>{String(i+1).padStart(2,"0")}</i><span>{item.title}</span></button>)}</div>
    {isMock?<section className="mockup-stage"><div className="mockup-copy"><span className="step-number">{ui.no}</span><p className="explorer-kicker">{ui.title}</p><h2>{ui.th}</h2><p>{ui.note}</p><div className="design-tags"><span>จอผนัง</span><span>ระยะมอง 3–8 เมตร</span><span>TH + EN</span></div></div><MockScreen step={ui}/></section>:<section className="flow-stage"><div className="flow-node-card"><span className="step-number">{String(flowIndex+1).padStart(2,"0")}</span><p className="explorer-kicker">CURRENT STATE</p><h2>{flow.title}</h2><div className="duration-pill">◷ {flow.duration}</div></div><div className="flow-details"><article><small>เป้าหมายของขั้นตอน</small><p>{flow.purpose}</p></article><article><small>สิ่งที่ผู้เล่นเห็น</small><p>{flow.player}</p></article><article><small>การทำงานของระบบ</small><p>{flow.system}</p></article></div><div className="flow-rail">{FLOW_STEPS.map((item,i)=><button key={item.title} className={i===flowIndex?"active":i<flowIndex?"done":""} onClick={()=>setFlowIndex(i)}><i>{i<flowIndex?"✓":i+1}</i><span>{item.title}</span></button>)}</div></section>}
    <footer className="explorer-controls"><button onClick={previous}>← ขั้นก่อนหน้า</button><div><span>{isMock?ui.title:flow.title}</span><small>{index+1} จาก {count}</small></div><button className="next" onClick={next}>ขั้นถัดไป →</button></footer>
  </main>
}
