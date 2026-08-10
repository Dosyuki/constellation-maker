"use client";

import { useState } from "react";

export type SiteView = "game" | "mockup" | "flow";

const UI_STEPS = [
  { key:"attract", no:"01", title:"Attract Mode", th:"เชิญชวนให้เริ่มภารกิจ", note:"จอผนังสื่อสารได้จากระยะไกล พร้อมคำเชิญที่เข้าใจได้โดยไม่ต้องใช้ Controller", timer:"—", score:"0/—" },
  { key:"setup", no:"02", title:"Player Setup", th:"ตรวจจำนวนผู้เล่น", note:"ระบบยืนยันจำนวนผู้เล่นและแจ้งอย่างสุภาพเมื่อยังต้องการผู้เล่นเพิ่ม", timer:"READY", score:"4 PLAYERS" },
  { key:"memory", no:"03", title:"Memory Hint", th:"จดจำราศีเมถุน", note:"แสดงรูปร่างคำตอบเพียง 2 วินาที ก่อนซ่อนและเปิดรับการเคลื่อนไหว", timer:"02", score:"0/45" },
  { key:"play", no:"04", title:"Gameplay", th:"สร้างราศีสิงห์", note:"เวลาเป็นข้อมูลสำคัญที่สุด ตามด้วยคำสั่ง จำนวนเป้าหมายที่พบ และคะแนนสะสม", timer:"18", score:"12/45" },
  { key:"assist", no:"05", title:"Hint Assist", th:"ยังขาดอีก 2 ดาว", note:"เส้นประและวงแสงช่วยบอกทิศทาง โดยไม่ทำให้ดาวหลอกดูผิดอย่างชัดเจน", timer:"05", score:"3/5" },
  { key:"reveal", no:"06", title:"Answer Reveal", th:"เกือบสมบูรณ์แล้ว!", note:"ใช้สี ไอคอน รูปทรง และข้อความร่วมกัน เพื่อให้ผู้เล่นทุกคนเข้าใจผลลัพธ์", timer:"+4", score:"80%" },
  { key:"summary", no:"07", title:"Final Summary", th:"ภารกิจสำเร็จ", note:"สรุปคะแนน ความแม่นยำ และรอบที่ทำได้ดีที่สุด ก่อนเริ่ม Session ใหม่", timer:"38", score:"84%" },
  { key:"operator", no:"08", title:"Operator Dashboard", th:"ควบคุมและดูแลระบบ", note:"ติดตามสองจอ Sensor, latency, Hint Assist, Error log และ Emergency Stop จากที่เดียว", timer:"LIVE", score:"22/22" },
] as const;

const FLOW_STEPS = [
  { title:"Attract Mode", duration:"รอผู้เล่น", purpose:"ดึงดูดความสนใจและอธิบายวิธีเล่นในประโยคเดียว", player:"เห็นชื่อเกมและคำเชิญให้ยืนบนดาว", system:"วนภาพเคลื่อนไหวแบบ Low Motion และรอ input เริ่มต้น" },
  { title:"Player Setup", duration:"ตามสถานการณ์", purpose:"ยืนยันจำนวนผู้เล่นให้เพียงพอกับ Target Nodes", player:"เห็นจำนวนผู้เล่นและสถานะความพร้อม", system:"อ่าน Sensor และแจ้ง Operator หากต้องเชิญผู้เล่นเพิ่ม" },
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

function StarField({kind}:{kind:string}){
  const stars=kind==="operator"?8:13;
  return <div className={`demo-starfield state-${kind}`} aria-hidden="true">{Array.from({length:stars},(_,i)=><span key={i} className={(i<5&&["play","assist","reveal"].includes(kind))?"lit":""} style={{left:`${12+(i*19)%76}%`,top:`${18+(i*31)%64}%`,animationDelay:`${i*.08}s`}}>✦</span>)}{kind==="memory"&&<div className="memory-lines"/>}</div>
}

function MockScreen({step}:{step:(typeof UI_STEPS)[number]}){
  const isOperator=step.key==="operator";
  return <div className={`mock-screen mock-${step.key}`}><div className="mock-grid"/><div className="mock-screen-top"><span>ROUND {step.key==="summary"?"5":"2"} / 5</span><small>{isOperator?"SYSTEM ONLINE":"WALL DISPLAY"}</small></div>
    {isOperator?<div className="operator-preview"><aside><b>OPERATOR</b><span className="selected">● ภาพรวม Session</span><span>◌ ควบคุมรอบ</span><span>◌ Sensor & Calibration</span><span>◌ ชุดโจทย์</span><span className="emergency">หยุดฉุกเฉิน</span></aside><section><div className="operator-heading"><div><small>LIVE · ROUND 2 / 5</small><h3>ภาพรวม Session</h3></div><b>42 ms</b></div><div className="operator-cards"><article><small>WALL DISPLAY</small><strong>สร้างราศีสิงห์</strong><span>18 SEC</span></article><article><small>SENSORS</small><strong>22 / 22</strong><span>ONLINE</span></article><article><small>ROUND CONTROL</small><strong>Hint Assist</strong><span>BOTH</span></article></div></section></div>:<>
      <div className="mock-screen-center"><span className="mock-symbol">{step.key==="summary"?"✦":step.key==="memory"?"♊":"♌"}</span><p>{step.title.toUpperCase()}</p><h3>{step.th}</h3><small>{step.key==="memory"?"GEMINI":"CONSTELLATION MAKER"}</small></div><StarField kind={step.key}/><div className="mock-metric"><strong>{step.timer}</strong><small>{step.key==="summary"?"TOTAL SCORE":step.key==="reveal"?"ROUND SCORE":"TIME LEFT"}</small></div><div className="mock-score"><small>{step.key==="summary"?"ACCURACY":"SCORE"}</small><strong>{step.score}</strong></div>
      {step.key==="attract"&&<button className="mock-cta">ยืนบนดาวเพื่อเริ่มภารกิจ →</button>}{step.key==="reveal"&&<div className="reveal-banner">✓ เลือกถูก 4 จุด <span>× ดาวหลอก 1 จุด</span></div>}{step.key==="summary"&&<div className="summary-stats"><span>38 / 45<small>คะแนนรวม</small></span><span>84%<small>ความแม่นยำ</small></span><span>5 / 5<small>รอบที่ดีที่สุด</small></span></div>}
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
