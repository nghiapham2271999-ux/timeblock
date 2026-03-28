'use client'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Block, Task } from '@/lib/types'
import { fetchBlocks, saveBlocks } from '@/lib/api'

// ── helpers ──────────────────────────────────────────────
const MN = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MNS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DNS = ['CN','T2','T3','T4','T5','T6','T7']
const DFN = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy']
const COLORS = ['#3b5bdb','#2f9e44','#e03131','#f59f00','#7c3aed','#0891b2','#be185d','#059669']
function ord(n: number) { const s=['th','st','nd','rd'],v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]) }
function dk(d: Date) { return d.toISOString().slice(0,10) }
function sameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate() }
function toM(t: string) { const [h,m]=t.split(':').map(Number); return h*60+m }
function dur(s: string, e: string) { return Math.max(0, toM(e)-toM(s)) }
function getWeekDates(d: Date) {
  const day=d.getDay(), mon=new Date(d); mon.setDate(d.getDate()-((day+6)%7))
  return Array.from({length:7},(_,i)=>{ const x=new Date(mon); x.setDate(mon.getDate()+i); return x })
}

type View = 'daily' | 'weekly' | 'timeline'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [cur, setCur] = useState(new Date())
  const [view, setView] = useState<View>('daily')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [unsaved, setUnsaved] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [fPri, setFPri] = useState<string>('all')
  const [fSta, setFSta] = useState<string>('all')
  const [selDay, setSelDay] = useState<string|null>(null)
  const [weekData, setWeekData] = useState<Record<string,Block[]>>({})
  const [calOpen, setCalOpen] = useState(false)
  const [calView, setCalView] = useState(new Date())
  const [ddPri, setDdPri] = useState(false)
  const [ddSta, setDdSta] = useState(false)
  const [nBid, setNBid] = useState(100)
  const [nTid, setNTid] = useState(1000)
  const newBlockRef = useRef<{name:string,start:string,end:string}>({name:'',start:'09:00',end:'10:00'})

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  const loadDay = useCallback(async (date: Date) => {
    setLoading(true)
    const b = await fetchBlocks(dk(date))
    setBlocks(b)
    setUnsaved(false)
    setLoading(false)
  }, [])

  useEffect(() => { if (status === 'authenticated') loadDay(cur) }, [cur, status, loadDay])

  const loadWeek = useCallback(async (dates: Date[]) => {
    const result: Record<string,Block[]> = {}
    await Promise.all(dates.map(async d => { result[dk(d)] = await fetchBlocks(dk(d)) }))
    setWeekData(result)
  }, [])

  useEffect(() => {
    if (view === 'weekly' && status === 'authenticated') loadWeek(getWeekDates(cur))
  }, [view, cur, status, loadWeek])

  async function handleSave() {
    setSaving(true)
    const ok = await saveBlocks(dk(cur), blocks)
    setSaving(false)
    if (ok) { setSaved(true); setUnsaved(false); setTimeout(() => setSaved(false), 2000) }
  }

  function markUnsaved() { setUnsaved(true); setSaved(false) }
  function updateBlocks(fn: (prev: Block[]) => Block[]) { setBlocks(fn); markUnsaved() }

  function shiftDay(n: number) {
    const d = new Date(cur); d.setDate(d.getDate()+n); setCur(d)
  }
  function shiftWeek(n: number) {
    const d = new Date(cur); d.setDate(d.getDate()+n*7); setCur(d); setSelDay(null)
  }

  // stats
  function filteredBlocks(bList: Block[]) {
    if (fPri==='all' && fSta==='all') return bList
    return bList.map(b=>({...b,tasks:b.tasks.filter(t=>
      (fPri==='all'||t.priority===fPri) &&
      (fSta==='all'||(fSta==='todo'&&!t.done)||(fSta==='done'&&t.done))
    )}))
  }
  function calcStats(bList: Block[]) {
    const t=bList.reduce((a,b)=>a+b.tasks.length,0)
    const d=bList.reduce((a,b)=>a+b.tasks.filter(x=>x.done).length,0)
    const m=bList.reduce((a,b)=>a+dur(b.start,b.end),0)
    return {total:t,done:d,rem:t-d,planned:`${Math.floor(m/60)}h ${m%60}m`,pct:t?Math.round(d/t*100):0}
  }
  const fb = filteredBlocks(blocks)
  const st = calcStats(fb)

  if (status === 'loading' || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f7]">
      <div className="text-[#7c82a0] text-sm">Đang tải...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f0f2f7]" onClick={() => { setCalOpen(false); setDdPri(false); setDdSta(false) }}>
      <div className="max-w-3xl mx-auto">

        {/* HEADER */}
        <div className="bg-white border-b border-[#e4e7ef] px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#3b5bdb] rounded-lg flex items-center justify-center text-white text-base">⏱</div>
            <div>
              <div className="text-[15px] font-semibold text-[#1a1d2e]">Time Block</div>
              <div className="text-[11px] text-[#7c82a0]">{DFN[cur.getDay()].toUpperCase()}, {MN[cur.getMonth()].toUpperCase()} {String(ord(cur.getDate())).toUpperCase()}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session?.user?.image && <img src={session.user.image} className="w-7 h-7 rounded-full" alt="" />}
            <span className="text-[12px] text-[#7c82a0] hidden sm:block">{session?.user?.name}</span>
            <button onClick={handleSave} disabled={saving}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${saved?'bg-[#2f9e44] text-white':saving?'bg-[#f59f00] text-white':'bg-[#3b5bdb] text-white hover:opacity-90'}`}>
              {saving?'⏳ Đang lưu...':saved?'✓ Đã lưu':`💾 Lưu${unsaved?' *':''}`}
            </button>
            <button onClick={() => signOut()} className="px-3 py-1.5 rounded-lg text-[12px] border border-[#e4e7ef] text-[#7c82a0] hover:bg-[#f7f8fc]">Đăng xuất</button>
          </div>
        </div>

        {/* NAV */}
        <div className="bg-white border-b border-[#e4e7ef] px-5 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={() => view==='weekly'?shiftWeek(-1):shiftDay(-1)} className="w-7 h-7 rounded flex items-center justify-center text-[#7c82a0] hover:bg-[#f7f8fc] text-lg">‹</button>
            <div className="relative" onClick={e=>e.stopPropagation()}>
              <button onClick={() => { setCalView(new Date(cur.getFullYear(),cur.getMonth(),1)); setCalOpen(v=>!v) }}
                className="text-[13px] font-medium bg-[#f7f8fc] border border-[#e4e7ef] rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:border-[#3b5bdb]">
                📅 {MN[cur.getMonth()]} {ord(cur.getDate())}, {cur.getFullYear()}
              </button>
              {calOpen && <CalendarPicker cur={cur} calView={calView} setCalView={setCalView} onSelect={d=>{setCur(d);setCalOpen(false)}} />}
            </div>
            <button onClick={() => view==='weekly'?shiftWeek(1):shiftDay(1)} className="w-7 h-7 rounded flex items-center justify-center text-[#7c82a0] hover:bg-[#f7f8fc] text-lg">›</button>
          </div>
          <div className="flex gap-1">
            {(['Today','Tomorrow'] as const).map((label,i)=>(
              <button key={label} onClick={()=>{ const d=new Date(); d.setDate(d.getDate()+i); setCur(d) }}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#7c82a0] hover:bg-[#f7f8fc]">{label}</button>
            ))}
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-5 gap-2.5 px-5 py-3 bg-white border-b border-[#e4e7ef]">
          {[{l:'TOTAL',v:st.total,c:''},{l:'DONE',v:st.done,c:'text-[#2f9e44]'},{l:'LEFT',v:st.rem,c:''},{l:'TIME',v:st.planned,c:'text-[#3b5bdb]'},{l:'PROGRESS',v:st.pct+'%',c:'text-[#3b5bdb]'}].map(x=>(
            <div key={x.l} className="text-center">
              <div className="text-[10px] font-medium text-[#7c82a0] tracking-wider mb-0.5">{x.l}</div>
              <div className={`text-xl font-semibold ${x.c||'text-[#1a1d2e]'}`}>{x.v}</div>
            </div>
          ))}
        </div>

        {/* TOOLBAR */}
        <div className="bg-white border-b border-[#e4e7ef] px-5 py-2 flex items-center gap-1.5 flex-wrap" onClick={e=>e.stopPropagation()}>
          {(['daily','weekly','timeline'] as View[]).map(v=>(
            <button key={v} onClick={()=>{setView(v);setSelDay(null)}}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${view===v?'bg-[#f7f8fc] border border-[#e4e7ef] text-[#1a1d2e]':'text-[#7c82a0] hover:bg-[#f7f8fc]'}`}>
              {v==='daily'?'☰ Daily':v==='weekly'?'⊞ Weekly':'○ Timeline'}
            </button>
          ))}
          <div className="w-px h-5 bg-[#e4e7ef] mx-1" />
          {/* Priority filter */}
          <div className="relative">
            <button onClick={()=>{setDdPri(v=>!v);setDdSta(false)}}
              className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${fPri!=='all'?'border-[#3b5bdb] text-[#3b5bdb] bg-[#e8ecff]':'border-[#e4e7ef] text-[#7c82a0] hover:bg-[#f7f8fc]'}`}>
              ▲ {fPri==='all'?'All Priorities':fPri==='high'?'Ưu tiên cao':fPri==='medium'?'Trung bình':'Thấp'} ▾
            </button>
            {ddPri && <div className="absolute top-full mt-1 left-0 bg-white border border-[#e4e7ef] rounded-xl shadow-lg z-50 py-1 min-w-[160px]">
              {[['all','All Priorities'],['high','Ưu tiên cao'],['medium','Trung bình'],['low','Thấp']].map(([v,l])=>(
                <div key={v} onClick={()=>{setFPri(v);setDdPri(false)}}
                  className={`px-4 py-2 text-[13px] cursor-pointer flex items-center gap-2 hover:bg-[#f7f8fc] ${fPri===v?'text-[#3b5bdb]':'text-[#1a1d2e]'}`}>
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${fPri===v?'bg-[#3b5bdb] border-[#3b5bdb] text-white':'border-[#e4e7ef]'}`}>{fPri===v?'✓':''}</div>
                  {l}
                </div>
              ))}
            </div>}
          </div>
          {/* Status filter */}
          <div className="relative">
            <button onClick={()=>{setDdSta(v=>!v);setDdPri(false)}}
              className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${fSta!=='all'?'border-[#3b5bdb] text-[#3b5bdb] bg-[#e8ecff]':'border-[#e4e7ef] text-[#7c82a0] hover:bg-[#f7f8fc]'}`}>
              ● {fSta==='all'?'All Status':fSta==='todo'?'Chưa làm':'Hoàn thành'} ▾
            </button>
            {ddSta && <div className="absolute top-full mt-1 left-0 bg-white border border-[#e4e7ef] rounded-xl shadow-lg z-50 py-1 min-w-[150px]">
              {[['all','All Status'],['todo','Chưa làm'],['done','Hoàn thành']].map(([v,l])=>(
                <div key={v} onClick={()=>{setFSta(v);setDdSta(false)}}
                  className={`px-4 py-2 text-[13px] cursor-pointer flex items-center gap-2 hover:bg-[#f7f8fc] ${fSta===v?'text-[#3b5bdb]':'text-[#1a1d2e]'}`}>
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${fSta===v?'bg-[#3b5bdb] border-[#3b5bdb] text-white':'border-[#e4e7ef]'}`}>{fSta===v?'✓':''}</div>
                  {l}
                </div>
              ))}
            </div>}
          </div>
          {(fPri!=='all'||fSta!=='all') && (
            <button onClick={()=>{setFPri('all');setFSta('all')}} className="text-[11px] text-[#3b5bdb] underline ml-1">✕ Xóa lọc</button>
          )}
          {view==='daily' && (
            <button onClick={()=>setShowForm(v=>!v)} className="ml-auto px-3 py-1.5 bg-[#3b5bdb] text-white rounded-lg text-[12px] font-medium hover:opacity-90">
              + Add Block
            </button>
          )}
        </div>

        {/* MAIN CONTENT */}
        {view==='daily' && (
          <DailyView blocks={blocks} fb={fb} fPri={fPri} fSta={fSta} showForm={showForm}
            setShowForm={setShowForm} nBid={nBid} nTid={nTid} setNBid={setNBid} setNTid={setNTid}
            updateBlocks={updateBlocks} />
        )}
        {view==='weekly' && (
          <WeeklyView cur={cur} weekData={weekData} selDay={selDay} setSelDay={setSelDay}
            shiftWeek={shiftWeek} fPri={fPri} fSta={fSta} />
        )}
        {view==='timeline' && (
          <TimelineView blocks={blocks} fb={fb} fPri={fPri} fSta={fSta} cur={cur} />
        )}
      </div>
    </div>
  )
}

// ── CALENDAR PICKER ────────────────────────────────────────
function CalendarPicker({ cur, calView, setCalView, onSelect }: {
  cur: Date, calView: Date, setCalView: (d:Date)=>void, onSelect: (d:Date)=>void
}) {
  const y=calView.getFullYear(), m=calView.getMonth()
  const first=new Date(y,m,1), last=new Date(y,m+1,0)
  const startDow=(first.getDay()+6)%7
  const today=new Date()
  const days: (number|null)[] = [...Array(startDow).fill(null), ...Array.from({length:last.getDate()},(_,i)=>i+1)]
  return (
    <div className="absolute top-full mt-1.5 left-0 bg-white border border-[#e4e7ef] rounded-xl shadow-xl z-50 p-3 w-[250px]">
      <div className="flex items-center justify-between mb-2.5">
        <button onClick={()=>setCalView(new Date(y,m-1,1))} className="w-6 h-6 flex items-center justify-center rounded text-[#7c82a0] hover:bg-[#f7f8fc]">‹</button>
        <span className="text-[13px] font-600">{MN[m]} {y}</span>
        <button onClick={()=>setCalView(new Date(y,m+1,1))} className="w-6 h-6 flex items-center justify-center rounded text-[#7c82a0] hover:bg-[#f7f8fc]">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {DNS.map(d=><div key={d} className="text-center text-[10px] font-semibold text-[#7c82a0] py-1">{d}</div>)}
        {days.map((d,i)=> d===null ? <div key={i}/> : (
          <div key={i} onClick={()=>onSelect(new Date(y,m,d))}
            className={`text-center text-[12px] py-1.5 rounded-lg cursor-pointer
              ${sameDay(new Date(y,m,d),cur)?'bg-[#3b5bdb] text-white font-semibold':
                sameDay(new Date(y,m,d),today)?'text-[#3b5bdb] font-semibold':
                'hover:bg-[#f7f8fc] text-[#1a1d2e]'}`}>
            {d}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── DAILY VIEW ─────────────────────────────────────────────
function DailyView({ blocks, fb, fPri, fSta, showForm, setShowForm, nBid, nTid, setNBid, setNTid, updateBlocks }: {
  blocks: Block[], fb: Block[], fPri: string, fSta: string
  showForm: boolean, setShowForm: (v:boolean)=>void
  nBid: number, nTid: number, setNBid: (n:number)=>void, setNTid: (n:number)=>void
  updateBlocks: (fn:(prev:Block[])=>Block[])=>void
}) {
  const fbMap = Object.fromEntries(fb.map(b=>[b.id,b]))
  const [newBlk, setNewBlk] = useState({name:'',start:'09:00',end:'10:00'})

  function toggleBlock(id: number) {
    updateBlocks(prev=>prev.map(b=>b.id===id?{...b,col:!b.col}:b))
  }
  function editBlockName(id: number, name: string) {
    updateBlocks(prev=>prev.map(b=>b.id===id?{...b,name,_ed:false}:b))
  }
  function toggleTask(bid: number, tid: number) {
    updateBlocks(prev=>prev.map(b=>b.id===bid?{...b,tasks:b.tasks.map(t=>t.id===tid?{...t,done:!t.done}:t)}:b))
  }
  function cyclePri(bid: number, tid: number) {
    const p=['high','medium','low'] as const
    updateBlocks(prev=>prev.map(b=>b.id===bid?{...b,tasks:b.tasks.map(t=>t.id===tid?{...t,priority:p[(p.indexOf(t.priority)+1)%3]}:t)}:b))
  }
  function deleteBlock(id: number) {
    if (!confirm('Xóa block này?')) return
    updateBlocks(prev=>prev.filter(b=>b.id!==id))
  }
  function deleteTask(bid: number, tid: number) {
    updateBlocks(prev=>prev.map(b=>b.id===bid?{...b,tasks:b.tasks.filter(t=>t.id!==tid)}:b))
  }
  function addTask(bid: number) {
    const name=prompt('Tên công việc:'); if(!name?.trim()) return
    updateBlocks(prev=>prev.map(b=>b.id===bid?{...b,tasks:[...b.tasks,{id:nTid,text:name.trim(),priority:'medium',done:false,time:'0/30m'}]}:b))
    setNTid(nTid+1)
  }
  function addBlock() {
    if(!newBlk.name.trim()){alert('Nhập tên block!');return}
    updateBlocks(prev=>[...prev,{id:nBid,start:newBlk.start,end:newBlk.end,name:newBlk.name,col:false,tasks:[]}])
    setNBid(nBid+1); setNewBlk({name:'',start:'09:00',end:'10:00'}); setShowForm(false)
  }
  function editTaskName(bid: number, tid: number, text: string) {
    updateBlocks(prev=>prev.map(b=>b.id===bid?{...b,tasks:b.tasks.map(t=>t.id===tid?{...t,text,_ed:false}:t)}:b))
  }

  const priLabel = (p:string) => p==='high'?'CAO':p==='medium'?'TB':'THẤP'
  const priClass = (p:string) => p==='high'?'bg-[#fff0f0] text-[#e03131]':p==='medium'?'bg-[#fff8e1] text-[#f59f00]':'bg-[#f3f8ff] text-[#3b7dd8]'

  return (
    <div className="p-4 flex flex-col gap-2.5">
      {!blocks.length && <div className="text-center py-10 text-[#7c82a0] text-sm">Chưa có block. Nhấn <strong>+ Add Block</strong> để bắt đầu.</div>}
      {blocks.map(b=>{
        const fb2=fbMap[b.id], tasks=fb2?fb2.tasks:[], faded=!fb2&&(fPri!=='all'||fSta!=='all'), d2=dur(b.start,b.end)
        return (
          <div key={b.id} className={`bg-white rounded-xl border border-[#e4e7ef] overflow-hidden transition-opacity ${faded?'opacity-35':''}`}>
            {/* Block header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#e4e7ef] cursor-pointer select-none"
              onClick={()=>!b._ed&&toggleBlock(b.id)}>
              <span className="text-[11px] text-[#7c82a0] opacity-40 cursor-grab">⠿⠿</span>
              <div className="flex items-center gap-1 font-mono text-[12px] text-[#7c82a0] shrink-0">
                <span className="text-[#1a1d2e]" onDoubleClick={e=>{e.stopPropagation();const v=prompt('Giờ bắt đầu (HH:MM):',b.start);if(v&&/^\d{1,2}:\d{2}$/.test(v))updateBlocks(p=>p.map(x=>x.id===b.id?{...x,start:v}:x))}}>{b.start}</span>
                <span className="opacity-40 text-[10px]">→</span>
                <span className="text-[#1a1d2e]" onDoubleClick={e=>{e.stopPropagation();const v=prompt('Giờ kết thúc (HH:MM):',b.end);if(v&&/^\d{1,2}:\d{2}$/.test(v))updateBlocks(p=>p.map(x=>x.id===b.id?{...x,end:v}:x))}}>{b.end}</span>
              </div>
              <div className="flex-1 min-w-0" onClick={e=>e.stopPropagation()}>
                {b._ed
                  ? <input autoFocus className="text-[13px] font-semibold w-full border border-[#3b5bdb] rounded px-1.5 py-0.5 outline-none"
                      defaultValue={b.name}
                      onBlur={e=>editBlockName(b.id,e.target.value||b.name)}
                      onKeyDown={e=>{if(e.key==='Enter')editBlockName(b.id,(e.target as HTMLInputElement).value||b.name);if(e.key==='Escape')updateBlocks(p=>p.map(x=>x.id===b.id?{...x,_ed:false}:x))}} />
                  : <span className="text-[13px] font-semibold text-[#1a1d2e]" onDoubleClick={e=>{e.stopPropagation();updateBlocks(p=>p.map(x=>x.id===b.id?{...x,_ed:true}:x))}}>{b.name}</span>
                }
              </div>
              <span className="text-[11px] text-[#7c82a0] bg-[#f7f8fc] border border-[#e4e7ef] px-2 py-0.5 rounded-full shrink-0">{d2}m</span>
              <button onClick={e=>{e.stopPropagation();deleteBlock(b.id)}} className="text-[13px] text-[#7c82a0] hover:text-[#e03131] p-1 rounded">🗑</button>
              <span className={`text-[10px] text-[#7c82a0] transition-transform ${b.col?'-rotate-90':''}`}>▾</span>
            </div>
            {/* Tasks */}
            {!b.col && (
              <div>
                {tasks.map(t=>(
                  <div key={t.id} className="flex items-center gap-2 px-3 py-2 border-b border-[#e4e7ef] last:border-0 hover:bg-[#f7f8fc]">
                    <span className="text-[11px] text-[#7c82a0] opacity-30 cursor-grab">⠿⠿</span>
                    <div onClick={()=>toggleTask(b.id,t.id)}
                      className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center cursor-pointer shrink-0 ${t.done?'bg-[#2f9e44] border-[#2f9e44]':'border-[#e4e7ef] bg-white'}`}>
                      {t.done && <span className="text-white text-[9px]">✓</span>}
                    </div>
                    {t._ed
                      ? <input autoFocus className="flex-1 text-[13px] border border-[#3b5bdb] rounded px-1.5 py-0.5 outline-none"
                          defaultValue={t.text}
                          onBlur={e=>editTaskName(b.id,t.id,e.target.value||t.text)}
                          onKeyDown={e=>{if(e.key==='Enter')editTaskName(b.id,t.id,(e.target as HTMLInputElement).value||t.text);if(e.key==='Escape')updateBlocks(p=>p.map(x=>x.id===b.id?{...x,tasks:x.tasks.map(y=>y.id===t.id?{...y,_ed:false}:y)}:x))}} />
                      : <span className={`flex-1 text-[13px] ${t.done?'line-through text-[#7c82a0]':'text-[#1a1d2e]'}`}
                          onDoubleClick={()=>updateBlocks(p=>p.map(x=>x.id===b.id?{...x,tasks:x.tasks.map(y=>y.id===t.id?{...y,_ed:true}:y)}:x))}>{t.text}</span>
                    }
                    <span onClick={()=>cyclePri(b.id,t.id)} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full cursor-pointer shrink-0 ${priClass(t.priority)}`}>{priLabel(t.priority)}</span>
                    <span onClick={()=>toggleTask(b.id,t.id)} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full cursor-pointer shrink-0 ${t.done?'bg-[#d3f9d8] text-[#2f9e44]':'bg-[#e8ecff] text-[#3b5bdb]'}`}>{t.done?'DONE':'TO DO'}</span>
                    <span className="font-mono text-[11px] text-[#7c82a0] shrink-0">⏱ {t.time}</span>
                    <button onClick={()=>deleteTask(b.id,t.id)} className="text-[12px] text-[#7c82a0] hover:text-[#e03131] opacity-0 group-hover:opacity-100 p-1">✕</button>
                  </div>
                ))}
                {!faded && (
                  <div onClick={()=>addTask(b.id)} className="px-3 py-2 text-[12px] text-[#7c82a0] cursor-pointer flex items-center gap-1.5 border-t border-[#e4e7ef] hover:bg-[#f7f8fc] hover:text-[#3b5bdb]">
                    + ADD TASK
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Add block form */}
      {showForm && (
        <div className="bg-white border-2 border-dashed border-[#e4e7ef] rounded-xl p-4 flex gap-2 flex-wrap items-center">
          <input value={newBlk.name} onChange={e=>setNewBlk(p=>({...p,name:e.target.value}))} placeholder="Tên block..." className="flex-1 min-w-[120px] border border-[#e4e7ef] rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-[#3b5bdb] bg-[#f7f8fc]" />
          <input value={newBlk.start} onChange={e=>setNewBlk(p=>({...p,start:e.target.value}))} placeholder="09:00" className="w-24 border border-[#e4e7ef] rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-[#3b5bdb] bg-[#f7f8fc]" />
          <input value={newBlk.end} onChange={e=>setNewBlk(p=>({...p,end:e.target.value}))} placeholder="10:00" className="w-24 border border-[#e4e7ef] rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-[#3b5bdb] bg-[#f7f8fc]" />
          <button onClick={addBlock} className="bg-[#3b5bdb] text-white rounded-lg px-4 py-1.5 text-[13px] font-medium">Thêm</button>
          <button onClick={()=>setShowForm(false)} className="border border-[#e4e7ef] text-[#7c82a0] rounded-lg px-3 py-1.5 text-[13px]">Hủy</button>
        </div>
      )}
    </div>
  )
}

// ── TIMELINE VIEW ──────────────────────────────────────────
function TimelineView({ blocks, fb, fPri, fSta, cur }: { blocks: Block[], fb: Block[], fPri: string, fSta: string, cur: Date }) {
  const SH=7, EH=20, PPH=48
  const now=new Date(), isToday=sameDay(cur,now), nowM=now.getHours()*60+now.getMinutes()
  const fbMap = Object.fromEntries(fb.map(b=>[b.id,b]))
  const conflicts: string[] = []
  for(let i=0;i<blocks.length;i++) for(let j=i+1;j<blocks.length;j++){
    const a=blocks[i],b=blocks[j]
    if(toM(a.start)<toM(b.end)&&toM(b.start)<toM(a.end)) conflicts.push(`"${a.name}" & "${b.name}"`)
  }
  return (
    <div className="p-4">
      {conflicts.length>0 && <div className="bg-[#fff0f0] border border-[#ffc5c5] rounded-lg px-3 py-2 text-[12px] text-[#e03131] mb-3">⚠ Chồng giờ: {conflicts.join(', ')}</div>}
      {!blocks.length && <div className="text-center py-10 text-[#7c82a0] text-sm">Không có block nào.</div>}
      {blocks.length>0 && (
        <>
          <div className="flex gap-3 flex-wrap mb-3">
            {blocks.map((b,i)=>(
              <div key={b.id} className="flex items-center gap-1.5 text-[11px] text-[#7c82a0]">
                <div className="w-2.5 h-2.5 rounded-sm" style={{background:COLORS[i%COLORS.length]}} />
                {b.name}
              </div>
            ))}
            {isToday && <div className="flex items-center gap-1.5 text-[11px] text-[#7c82a0]"><div className="w-2.5 h-2.5 rounded-sm bg-[#e03131]"/>Hiện tại</div>}
          </div>
          <div className="flex bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
            <div className="w-11 shrink-0 border-r border-[#e4e7ef]">
              {Array.from({length:EH-SH+1},(_,i)=>(
                <div key={i} className="h-12 flex items-start justify-end pr-2 pt-0.5 text-[10px] text-[#7c82a0] font-mono">{String(SH+i).padStart(2,'0')}:00</div>
              ))}
            </div>
            <div className="flex-1 relative" style={{minHeight:`${(EH-SH)*PPH}px`}}>
              {Array.from({length:EH-SH},(_,i)=>(
                <div key={i} className="h-12 border-b border-dashed border-[#e4e7ef]" />
              ))}
              <div className="absolute inset-0">
                {blocks.map((b,i)=>{
                  const top=((toM(b.start)-SH*60)/60)*PPH
                  const ht=Math.max(22,(dur(b.start,b.end)/60)*PPH)
                  const hasF=!!fbMap[b.id]
                  const op=(fPri!=='all'||fSta!=='all')&&!hasF?0.3:1
                  const dn=b.tasks.filter(t=>t.done).length
                  return (
                    <div key={b.id} className="absolute left-1.5 right-1.5 rounded-lg px-2 py-1 overflow-hidden" style={{top,height:ht,background:COLORS[i%COLORS.length],opacity:op}}>
                      <div className="text-[11px] font-semibold text-white truncate">{b.name}</div>
                      {ht>30 && <div className="text-[10px] text-white/75 font-mono">{b.start}–{b.end}</div>}
                      {ht>50 && <div className="text-[10px] text-white/90">✓ {dn}/{b.tasks.length}</div>}
                    </div>
                  )
                })}
                {isToday && nowM>=SH*60 && nowM<=EH*60 && (
                  <div className="absolute left-0 right-0 h-0.5 bg-[#e03131] pointer-events-none" style={{top:((nowM-SH*60)/60)*PPH}}>
                    <div className="absolute -left-1 -top-1.5 w-2 h-2 rounded-full bg-[#e03131]" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── WEEKLY VIEW ────────────────────────────────────────────
function WeeklyView({ cur, weekData, selDay, setSelDay, shiftWeek, fPri, fSta }: {
  cur: Date, weekData: Record<string,Block[]>, selDay: string|null, setSelDay: (d:string|null)=>void
  shiftWeek: (n:number)=>void, fPri: string, fSta: string
}) {
  const wds = getWeekDates(cur)
  const s=wds[0], e=wds[6], today=new Date()
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={()=>shiftWeek(-1)} className="px-3 py-1.5 border border-[#e4e7ef] rounded-lg text-[12px] text-[#7c82a0] hover:bg-[#f7f8fc]">‹ Tuần trước</button>
        <span className="text-[13px] font-semibold">{s.getDate()} {MNS[s.getMonth()]} – {e.getDate()} {MNS[e.getMonth()]} {e.getFullYear()}</span>
        <button onClick={()=>shiftWeek(1)} className="px-3 py-1.5 border border-[#e4e7ef] rounded-lg text-[12px] text-[#7c82a0] hover:bg-[#f7f8fc]">Tuần sau ›</button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 mb-3">
        {wds.map(d=>{
          const key=dk(d), db=weekData[key]||[]
          const allT=db.flatMap(b=>b.tasks.filter(t=>(fPri==='all'||t.priority===fPri)&&(fSta==='all'||(fSta==='todo'&&!t.done)||(fSta==='done'&&t.done))))
          const tot=allT.length, dn=allT.filter(t=>t.done).length, pct=tot?Math.round(dn/tot*100):0
          const isT=sameDay(d,today), isSel=selDay===key
          const hi=allT.filter(t=>t.priority==='high'), med=allT.filter(t=>t.priority==='medium'), lo=allT.filter(t=>t.priority==='low')
          return (
            <div key={key} onClick={()=>setSelDay(isSel?null:key)}
              className={`bg-white rounded-xl border overflow-hidden cursor-pointer transition-all ${isT?'border-[#3b5bdb]':'border-[#e4e7ef]'} ${isSel?'ring-2 ring-[#3b5bdb] ring-offset-1 bg-[#e8ecff]':'hover:border-[#3b5bdb]'}`}>
              <div className="px-2 py-1.5 border-b border-[#e4e7ef]">
                <div className="text-[10px] font-semibold text-[#7c82a0] tracking-wider">{DNS[d.getDay()]}</div>
                <div className={`text-[17px] font-semibold leading-tight ${isT?'text-[#3b5bdb]':'text-[#1a1d2e]'}`}>{d.getDate()}</div>
              </div>
              <div className="px-2 py-1.5">
                <div className="flex justify-between text-[11px] mb-1"><span className="text-[#7c82a0]">{dn}/{tot}</span><span className={`font-semibold ${pct===100?'text-[#2f9e44]':pct>0?'text-[#f59f00]':'text-[#7c82a0]'}`}>{pct}%</span></div>
                <div className="h-1 bg-[#e4e7ef] rounded-full mb-1.5"><div className={`h-full rounded-full ${pct===100?'bg-[#2f9e44]':'bg-[#3b5bdb]'}`} style={{width:`${pct}%`}}/></div>
                <div className="flex flex-col gap-0.5">
                  {tot===0 && <div className="text-[10px] text-[#7c82a0] text-center">Trống</div>}
                  {hi.length>0 && <div className="flex justify-between"><span className="text-[10px]">🔴</span><span className="text-[9px] font-semibold px-1.5 rounded-full bg-[#fff0f0] text-[#e03131]">{hi.filter(t=>t.done).length}/{hi.length}</span></div>}
                  {med.length>0 && <div className="flex justify-between"><span className="text-[10px]">🟡</span><span className="text-[9px] font-semibold px-1.5 rounded-full bg-[#fff8e1] text-[#f59f00]">{med.filter(t=>t.done).length}/{med.length}</span></div>}
                  {lo.length>0 && <div className="flex justify-between"><span className="text-[10px]">🔵</span><span className="text-[9px] font-semibold px-1.5 rounded-full bg-[#f3f8ff] text-[#3b7dd8]">{lo.filter(t=>t.done).length}/{lo.length}</span></div>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Day detail panel */}
      {selDay && (()=>{
        const sd=new Date(selDay+'T00:00:00'), sdb=weekData[selDay]||[]
        const allT2=sdb.flatMap(b=>b.tasks)
        const tot2=allT2.length, dn2=allT2.filter(t=>t.done).length
        const byP={high:allT2.filter(t=>t.priority==='high'),medium:allT2.filter(t=>t.priority==='medium'),low:allT2.filter(t=>t.priority==='low')}
        return (
          <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e4e7ef] flex items-center justify-between">
              <span className="text-[14px] font-semibold">{DFN[sd.getDay()]}, {sd.getDate()} {MN[sd.getMonth()]} {sd.getFullYear()}</span>
              <button onClick={()=>setSelDay(null)} className="text-[#7c82a0] hover:text-[#1a1d2e] text-lg">✕</button>
            </div>
            <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-[#e4e7ef]">
              {[{l:'TỔNG',v:tot2},{l:'XONG',v:dn2,c:'text-[#2f9e44]'},{l:'CÒN',v:tot2-dn2},{l:'TIẾN ĐỘ',v:(tot2?Math.round(dn2/tot2*100):0)+'%',c:'text-[#3b5bdb]'}].map(x=>(
                <div key={x.l} className="text-center"><div className="text-[10px] text-[#7c82a0] font-medium tracking-wider mb-0.5">{x.l}</div><div className={`text-[17px] font-semibold ${x.c||''}`}>{x.v}</div></div>
              ))}
            </div>
            <div className="flex gap-3 px-4 py-2.5 border-b border-[#e4e7ef] flex-wrap">
              {(['high','medium','low'] as const).map(p=>{const arr=byP[p];if(!arr.length)return null;const d2=arr.filter(t=>t.done).length;return(
                <div key={p} className="flex items-center gap-1.5 text-[11px] text-[#7c82a0]">
                  <div className={`w-2 h-2 rounded-full ${p==='high'?'bg-[#e03131]':p==='medium'?'bg-[#f59f00]':'bg-[#3b7dd8]'}`}/>
                  {p==='high'?'Cao':p==='medium'?'TB':'Thấp'}: <strong className="text-[#1a1d2e]">{d2}/{arr.length}</strong>
                </div>
              )})}
            </div>
            <div className="p-4 flex flex-col gap-2">
              {sdb.length===0 && <div className="text-center text-[#7c82a0] text-sm py-4">Không có dữ liệu</div>}
              {sdb.map(b=>(
                <div key={b.id} className="border border-[#e4e7ef] rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-[#f7f8fc] flex items-center gap-2 text-[12px] font-semibold">
                    <span className="font-mono text-[11px] text-[#7c82a0]">{b.start}→{b.end}</span>
                    <span className="flex-1">{b.name}</span>
                    <span className="text-[11px] text-[#7c82a0] font-normal">{b.tasks.filter(t=>t.done).length}/{b.tasks.length} xong</span>
                  </div>
                  {b.tasks.map(t=>(
                    <div key={t.id} className="flex items-center gap-2 px-3 py-2 border-t border-[#e4e7ef]">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${t.done?'bg-[#2f9e44] border-[#2f9e44]':'border-[#e4e7ef]'}`}>{t.done&&<span className="text-white text-[8px]">✓</span>}</div>
                      <span className={`flex-1 text-[12px] ${t.done?'line-through text-[#7c82a0]':''}`}>{t.text}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.priority==='high'?'bg-[#fff0f0] text-[#e03131]':t.priority==='medium'?'bg-[#fff8e1] text-[#f59f00]':'bg-[#f3f8ff] text-[#3b7dd8]'}`}>{t.priority==='high'?'CAO':t.priority==='medium'?'TB':'THẤP'}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.done?'bg-[#d3f9d8] text-[#2f9e44]':'bg-[#e8ecff] text-[#3b5bdb]'}`}>{t.done?'DONE':'TO DO'}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
