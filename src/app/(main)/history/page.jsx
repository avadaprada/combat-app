'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import html2canvas from 'html2canvas-pro'

const BAKEMONO_IMG = "https://raw.githubusercontent.com/avadaprada/combat-console-repository/refs/heads/main/BAKEMONO%20PNG-BROWN.png"

export default function HistoryPage() {
  const [historyData, setHistoryData] = useState([])
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  
  // State Filter
  const [filterResult, setFilterResult] = useState('all') // all | win | lose | draw
  const [searchTerm, setSearchTerm] = useState('')
  
  // State Halaman Detail
  const [selectedDuel, setSelectedDuel] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  
  // State Download Gambar
  const resultRef = useRef(null)
  const [isDownloadingResult, setIsDownloadingResult] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function loadHistory() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const combatId = user.email.split('@')[0].trim().toUpperCase()
      setMyId(combatId)

      try {
        const res = await fetch(`/api/history?id=${combatId}`)
        const result = await res.json()
        
        if (result.success && result.data.history) {
          const sorted = result.data.history.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          setHistoryData(sorted)
        } else {
          setErrorMsg(result.message || 'Gagal memuat history.')
        }
      } catch (err) {
        setErrorMsg('Terjadi kesalahan koneksi.')
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [])

  // Filter Logic
  const filteredData = historyData.filter(duel => {
    let matchResult = true;
    if (filterResult !== 'all') {
      if (duel.winner === 'draw') {
        matchResult = filterResult === 'draw';
      } else {
        const myRole = duel.a.id === myId ? 'A' : 'B';
        const isWin = duel.winner === myRole;
        matchResult = filterResult === 'win' ? isWin : !isWin;
      }
    }

    const opponentName = duel.a.id === myId ? duel.b.name : duel.a.name;
    const matchSearch = (opponentName || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchResult && matchSearch;
  });

  // Fungsi Klik History (Tarik Foto Terbaru)
  const handleSelectDuel = async (duel) => {
    setDetailLoading(true);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/profile?id=${duel.a.id}`),
        fetch(`/api/profile?id=${duel.b.id}`)
      ]);
      const dataA = await resA.json();
      const dataB = await resB.json();
      
      const enrichedDuel = { ...duel };
      if (dataA.success) enrichedDuel.a.photoUrl = dataA.data.photoUrl;
      if (dataB.success) enrichedDuel.b.photoUrl = dataB.data.photoUrl;
      
      setSelectedDuel(enrichedDuel);
    } catch (e) {
      console.error("Gagal muat foto", e);
      setSelectedDuel(duel); // Fallback
    } finally {
      setDetailLoading(false);
    }
  };

  const downloadResultImage = async () => {
    if (!resultRef.current) return;
    setIsDownloadingResult(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const canvas = await html2canvas(resultRef.current, {
        scale: 2,
        backgroundColor: '#1C2330',
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `duel-result-${selectedDuel.duelKey}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert('Gagal menyimpan gambar: ' + err.message);
    } finally {
      setIsDownloadingResult(false);
    }
  };

  if (loading) {
    return <div className="text-[#EDE2CF] flex items-center justify-center font-bold tracking-widest py-20 min-h-screen">MEMUAT RIWAYAT...</div>
  }

  // ================= TAMPILAN DETAIL (HALAMAN BARU) =================
  if (selectedDuel) {
    const { a, b, resultDetail, winner, updatedAt, log } = selectedDuel;

    if (detailLoading) {
      return <div className="text-[#EDE2CF] flex items-center justify-center font-bold tracking-widest py-20 min-h-screen">MEMUAT DETAIL PERTARUNGAN...</div>
    }

    return (
      <div className="max-w-[1500px] mx-auto p-4 md:py-8 min-h-screen flex flex-col items-center">
        
        {/* Tombol Kembali */}
        <div className="w-full mb-6">
          <button 
            onClick={() => setSelectedDuel(null)} 
            className="border border-[#998776] text-[#EDE2CF] px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#998776] hover:text-[#1C2330] transition-colors"
          >
            ← Kembali ke Daftar History
          </button>
        </div>

                {/* ================= AREA HASIL DUEL (POINT CALCULATION) ================= */}
        <style>{`
          @keyframes winnerGlow {
            0%, 100% { box-shadow: 0 0 15px 2px rgba(227, 208, 179, 0.4), inset 0 0 10px rgba(227, 208, 179, 0.2); border-color: #e3d0b3; }
            50% { box-shadow: 0 0 30px 8px rgba(227, 208, 179, 0.8), inset 0 0 20px rgba(227, 208, 179, 0.5); border-color: #ffffff; }
          }
          @keyframes textShine {
            0% { text-shadow: 0 0 5px rgba(227, 208, 179, 0.5); }
            50% { text-shadow: 0 0 15px rgba(227, 208, 179, 1), 0 0 25px rgba(227, 208, 179, 0.8); }
            100% { text-shadow: 0 0 5px rgba(227, 208, 179, 0.5); }
          }
          .winner-glow {
            animation: winnerGlow 2s ease-in-out infinite;
          }
          .winner-text {
            animation: textShine 2s ease-in-out infinite;
            color: #ffffff !important;
          }
        `}</style>

        <div ref={resultRef} className="relative w-full max-w-[1400px] bg-[#1c222e] p-8 md:p-12 flex justify-center overflow-hidden">
          
          {/* BINGKAI EMAS UTAMA */}
          <div className="relative w-full bg-[#1c222e] border-[4px] border-[#e3d0b3] p-10 font-sans shadow-2xl">
            
            {/* ORNAMEN SUDUT TIPIS */}
            <div className="absolute top-0 left-0 w-24 h-12 border-r-[4px] border-b-[4px] border-[#1c222e] z-0 bg-[#e3d0b3] pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-12 h-24 border-l-[4px] border-b-[4px] border-[#1c222e] z-0 bg-[#e3d0b3] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-12 h-24 border-r-[4px] border-t-[4px] border-[#1c222e] z-0 bg-[#e3d0b3] pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-24 h-12 border-l-[4px] border-t-[4px] border-[#1c222e] z-0 bg-[#e3d0b3] pointer-events-none"></div>

            {/* Header */}
            <h1 className="text-4xl font-bold text-center tracking-wider text-[#e3d0b3] mt-4 mb-6">
              Duel selesai — {winner === 'draw' ? 'SERI' : (winner === 'A' ? `${a.name} MENANG!` : `${b.name} MENANG!`)}
            </h1>
            
            <div className="text-center text-[#cfc1a6] text-sm mb-12 pb-6 border-b border-[#8c7f73] border-dashed">
              {resultDetail?.reasonText || "Duel telah berakhir."}
            </div>

            {/* Profil Pemain */}
            <div className="flex justify-center items-center gap-18 px-10 mb-10">
              
              {/* PEMAIN A */}
              <div className={`flex flex-col items-center w-1/3 transition-all duration-500 ${winner !== 'draw' && winner !== 'A' ? 'opacity-60 grayscale-[30%]' : 'opacity-100'}`}>
                <div className="relative mb-4">
                  {winner !== 'draw' && (
                    <div className={`absolute top-2 -right-8 z-20 px-6 py-1 transform rotate-45 shadow-md text-xs font-bold tracking-widest ${winner === 'A' ? 'bg-[#e3d0b3] text-[#1c222e]' : 'bg-[#85200c] text-white'}`}>
                      {winner === 'A' ? 'MENANG' : 'KALAH'}
                    </div>
                  )}
                  <div className={`w-32 h-32 rounded-full border-4 p-1 relative z-10 bg-[#1c222e] overflow-hidden ${
                    winner === 'A' ? 'border-[#e3d0b3] winner-glow' : 
                    winner === 'draw' ? 'border-[#8c7f73]' : 
                    'border-[#85200c] shadow-[0_0_15px_rgba(133,32,12,0.4)]'
                  }`}>
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#8c7f73]">
                      <defs>
                        <pattern id="meander-hist-a" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                          <path d="M0 5 h5 v-5 h5 v10 h-5 v-5 h-5 z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </pattern>
                      </defs>
                      <circle cx="50" cy="50" r="46" fill="url(#meander-hist-a)" stroke="currentColor" strokeWidth="3" />
                    </svg>
                    <img src={a.photoUrl || BAKEMONO_IMG} alt="A" className="relative z-10 w-full h-full rounded-full object-cover bg-[#12161f]" crossOrigin="anonymous" />
                    {winner !== 'draw' && winner !== 'A' && (
                      <div className="absolute inset-0 bg-[#85200c]/30 mix-blend-multiply z-20 pointer-events-none"></div>
                    )}
                  </div>
                </div>
                <div className={`text-2xl font-bold mb-1 text-center ${
                  winner === 'A' ? 'text-[#e3d0b3] winner-text' : 
                  winner === 'draw' ? 'text-[#e3d0b3]' : 
                  'text-[#f0b9a8]'
                }`}>
                  {a.name}
                </div>
                <div className="text-sm text-[#8c7f73] tracking-widest mb-6 text-center">ID: {a.id}</div>
                
                <div className="w-full px-4">
                  {/* BAR VP (KREM) */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-[#8c7f73] w-6 font-bold">VP</span>
                    <div className="flex-1 h-3 bg-[#12161f] border border-[#8c7f73]">
                      <div className="h-full bg-[#e3d0b3]" style={{ width: `${(a.vp / (a.maxVp || 1)) * 100}%` }}></div>
                    </div>
                    <span className="text-sm font-bold text-white w-8 text-right">{a.vp}</span>
                  </div>
                  {/* BAR AE (MERAH) */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8c7f73] w-6 font-bold">AE</span>
                    <div className="flex-1 h-3 bg-[#12161f] border border-[#8c7f73]">
                      <div className="h-full bg-[#85200c]" style={{ width: `${(a.ae / (a.maxAe || 1)) * 100}%` }}></div>
                    </div>
                    <span className="text-sm font-bold text-white w-8 text-right">{a.ae}</span>
                  </div>
                </div>
              </div>

              <div className="text-5xl font-bold text-[#85200c] italic text-center shrink-0">VS</div>

              {/* PEMAIN B */}
              <div className={`flex flex-col items-center w-1/3 transition-all duration-500 ${winner !== 'draw' && winner !== 'B' ? 'opacity-60 grayscale-[30%]' : 'opacity-100'}`}>
                <div className="relative mb-4">
                  {winner !== 'draw' && (
                    <div className={`absolute top-2 -right-8 z-20 px-8 py-1 transform rotate-45 shadow-md text-xs font-bold tracking-widest ${winner === 'B' ? 'bg-[#e3d0b3] text-[#1c222e]' : 'bg-[#85200c] text-white'}`}>
                      {winner === 'B' ? 'MENANG' : 'KALAH'}
                    </div>
                  )}
                  <div className={`w-32 h-32 rounded-full border-4 p-1 relative z-10 bg-[#1c222e] overflow-hidden ${
                    winner === 'B' ? 'border-[#e3d0b3] winner-glow' : 
                    winner === 'draw' ? 'border-[#8c7f73]' : 
                    'border-[#85200c] shadow-[0_0_15px_rgba(133,32,12,0.4)]'
                  }`}>
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#8c7f73]">
                      <defs>
                        <pattern id="meander-hist-b" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                          <path d="M0 5 h5 v-5 h5 v10 h-5 v-5 h-5 z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </pattern>
                      </defs>
                      <circle cx="50" cy="50" r="46" fill="url(#meander-hist-b)" stroke="currentColor" strokeWidth="3" />
                    </svg>
                    <img src={b.photoUrl || BAKEMONO_IMG} alt="B" className="relative z-10 w-full h-full rounded-full object-cover bg-[#12161f]" crossOrigin="anonymous" />
                    {winner !== 'draw' && winner !== 'B' && (
                      <div className="absolute inset-0 bg-[#85200c]/30 mix-blend-multiply z-20 pointer-events-none"></div>
                    )}
                  </div>
                </div>
                <div className={`text-2xl font-bold mb-1 text-center ${
                  winner === 'B' ? 'text-[#e3d0b3] winner-text' : 
                  winner === 'draw' ? 'text-[#e3d0b3]' : 
                  'text-[#f0b9a8]'
                }`}>
                  {b.name}
                </div>
                <div className="text-sm text-[#8c7f73] tracking-widest mb-6 text-center">ID: {b.id}</div>
                
                <div className="w-full px-4">
                  {/* BAR VP (KREM) */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-[#8c7f73] w-6 font-bold">VP</span>
                    <div className="flex-1 h-3 bg-[#12161f] border border-[#8c7f73]">
                      <div className="h-full bg-[#e3d0b3]" style={{ width: `${(b.vp / (b.maxVp || 1)) * 100}%` }}></div>
                    </div>
                    <span className="text-sm font-bold text-white w-8 text-right">{b.vp}</span>
                  </div>
                  {/* BAR AE (MERAH) */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8c7f73] w-6 font-bold">AE</span>
                    <div className="flex-1 h-3 bg-[#12161f] border border-[#8c7f73]">
                      <div className="h-full bg-[#85200c]" style={{ width: `${(b.ae / (b.maxAe || 1)) * 100}%` }}></div>
                    </div>
                    <span className="text-sm font-bold text-white w-8 text-right">{b.ae}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* KOTAK EXP BREAKDOWN */}
            <div className="flex justify-center gap-10 md:gap-35 px-6 mt-10 font-mono">
              
              {/* BOX A */}
              <div className="w-full max-w-[450px] border border-[#8c7f73] bg-[#12161f] p-6 relative flex flex-col">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#e3d0b3]"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#e3d0b3]"></div>
                
                {resultDetail?.a ? (
                  <>
                    <div className="text-center text-sm text-[#cfc1a6] mb-4">
                      (EXP Material Unik {resultDetail.a.totalMaterialExp} + Turn {resultDetail.a.turnCount}) ÷ Divisor {resultDetail.a.divisor} = <span className="text-[#e3d0b3] font-bold">{resultDetail.a.finalExp} EXP</span>
                    </div>
                    <div className="text-center text-xs text-[#8c7f73] tracking-widest uppercase mb-4 border-b border-[#8c7f73] pb-2">EXP</div>
                    
                    <div className="space-y-2 mb-6 flex-1">
                      {(resultDetail.a.materials || []).map((m, idx) => (
                        <div key={idx} className="flex justify-between text-sm text-[#cfc1a6] border-b border-[#8c7f73]/30 pb-1">
                          <span>{m.name}</span>
                          <span>+{m.exp} EXP</span>
                        </div>
                      ))}
                      {resultDetail.a.materials?.length === 0 && <div className="text-center text-[#8c7f73] text-xs">Tidak ada material</div>}
                    </div>

                    <div className="flex justify-between text-sm font-bold text-[#e3d0b3] border-t border-[#8c7f73] pt-4 mt-auto">
                      <span>EXP +{resultDetail.a.finalExp}</span>
                      <span>CP +{resultDetail.a.finalCp}</span>
                      <span>GT +{resultDetail.a.gt}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-[#8c7f73] text-xs">Data rincian tidak tersedia (duel lama).</div>
                )}
              </div>

              {/* BOX B */}
              <div className="w-full max-w-[450px] border border-[#8c7f73] bg-[#12161f] p-6 relative flex flex-col">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#e3d0b3]"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#e3d0b3]"></div>
                
                {resultDetail?.b ? (
                  <>
                    <div className="text-center text-sm text-[#cfc1a6] mb-4">
                      (EXP Material Unik {resultDetail.b.totalMaterialExp} + Turn {resultDetail.b.turnCount}) ÷ Divisor {resultDetail.b.divisor} = <span className="text-[#e3d0b3] font-bold">{resultDetail.b.finalExp} EXP</span>
                    </div>
                    <div className="text-center text-xs text-[#8c7f73] tracking-widest uppercase mb-4 border-b border-[#8c7f73] pb-2">EXP</div>
                    
                    <div className="space-y-2 mb-6 flex-1">
                      {(resultDetail.b.materials || []).map((m, idx) => (
                        <div key={idx} className="flex justify-between text-sm text-[#cfc1a6] border-b border-[#8c7f73]/30 pb-1">
                          <span>{m.name}</span>
                          <span>+{m.exp} EXP</span>
                        </div>
                      ))}
                      {resultDetail.b.materials?.length === 0 && <div className="text-center text-[#8c7f73] text-xs">Tidak ada material</div>}
                    </div>

                    <div className="flex justify-between text-sm font-bold text-[#e3d0b3] border-t border-[#8c7f73] pt-4 mt-auto">
                      <span>EXP +{resultDetail.b.finalExp}</span>
                      <span>CP +{resultDetail.b.finalCp}</span>
                      <span>GT +{resultDetail.b.gt}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-[#8c7f73] text-xs">Data rincian tidak tersedia (duel lama).</div>
                )}
              </div>

            </div>

            {/* Footer Tanggal */}
            <div className="text-center text-xs text-[#8c7f73] tracking-widest uppercase mt-12 border-t border-[#8c7f73] border-dashed pt-6">
              DUEL SELESAI: {new Date(updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(updatedAt).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} WIB
            </div>

          </div>
        </div>

        {/* TOMBOL SIMPAN GAMBAR */}
        <div className="flex justify-center mt-6 mb-10 w-full max-w-[1400px]">
          <button 
            onClick={downloadResultImage} 
            disabled={isDownloadingResult} 
            className="bg-[#1C2330] border-2 border-[#e3d0b3] text-[#e3d0b3] px-8 py-3 text-sm font-bold tracking-widest uppercase hover:bg-[#e3d0b3] hover:text-[#1C2330] transition-all shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            {isDownloadingResult ? 'MENYIMPAN...' : 'SIMPAN HASIL SEBAGAI GAMBAR'}
          </button>
        </div>

        {/* LOG PERTARUNGAN */}
        <div className="w-full mb-20">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-[#EDE2CF] text-sm font-bold tracking-[3px] uppercase whitespace-nowrap font-sans">Log Pertarungan</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-[#998776] to-transparent"></div>
          </div>
          
          <div className="bg-[#12161f] border border-[#8c7f73] p-6 font-mono text-xs leading-relaxed max-h-[600px] overflow-y-auto custom-scrollbar flex flex-col gap-4">
            {log && log.length > 0 ? (
              [...log].map((entry, idx) => {
                const isA = entry.actor === 'A';
                const actorName = isA ? a.name : b.name;
                
                // Cek kondisi khusus
                const isFainted = entry.format === 'fainted' || (entry.vpAfter !== undefined && entry.vpAfter <= 0 && entry.dmgVp > 0) || (entry.note && entry.note.includes('PINGSAN'));
                const isSkipTurn = entry.material === '-' || !entry.material;
                const isDefensive = entry.format === 'defensive';

                let displayNote = entry.note || `Menggunakan ${entry.material}`;
                if (isFainted) {
                  displayNote = "FAINTED: VP telah habis, tidak bisa melanjutkan duel";
                } else if (isSkipTurn) {
                  displayNote = entry.note && entry.note.toLowerCase().includes('stun') 
                    ? "[ SKIP TURN: Tidak dapat melakukan aksi karena terkena efek Stun ]" 
                    : "[ SKIP TURN: AE tidak mencukupi untuk melakukan aksi ]";
                }

                return (
                  <div key={idx} className={`relative w-full border ${isA ? 'border-[#85200c]/50 bg-[#1a1414]' : 'border-[#e3d0b3]/50 bg-[#1c222e]'} rounded p-4`}>
                    <div className="text-[#8c7f73] mb-1">TURN {entry.turn} <span className="text-[#e3d0b3] font-bold ml-2">{actorName}</span></div>
                    
                    {/* Tampilkan statistik sebelum turn (KECUALI untuk Defensive / Skip / Fainted) */}
                    {!(isFainted || isSkipTurn || isDefensive) && (
                      <div className="text-white/70">{entry.aeBefore}AE / {entry.vpBefore}VP</div>
                    )}

                    <div className="my-2 py-1.5 border-y border-dashed border-[#8c7f73]/30">
                      {isFainted || isSkipTurn ? (
                        <div className={isFainted ? "text-[#85200c] font-bold text-xs" : "text-[#f0b9a8] font-bold text-xs"}>
                          {isFainted ? "FAINTED: VP telah habis, tidak bisa melanjutkan duel" : displayNote}
                        </div>
                      ) : (
                        <>
                          <div>[ <span className="text-[#e3d0b3] font-bold">{entry.format ? entry.format.substring(0,3).toUpperCase() : '???'}</span> ] <span className="text-white font-bold">{entry.material}</span></div>
                          <div className="text-[#f0b9a8] mt-1">TOTAL DMG: {entry.dmgAe || 0}AE & {entry.dmgVp || 0}VP</div>
                        </>
                      )}
                    </div>
                    
                    <div className="text-white/70">{entry.aeAfter}AE / {entry.vpAfter}VP</div>
                  </div>
                )
              })
            ) : (
              <div className="text-center text-[#8c7f73] py-10">Log pertarungan tidak tersedia.</div>
            )}
          </div>
        </div>

      </div>
    )
  }

  // ================= TAMPILAN DAFTAR HISTORY =================
  return (
    <div className="max-w-[1100px] mx-auto p-4 md:py-8 min-h-screen">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-[#EDE2CF] text-sm font-bold tracking-[3px] uppercase whitespace-nowrap font-sans">Combat History</h1>
        <div className="flex-1 h-[1px] bg-gradient-to-r from-[#998776] to-transparent"></div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-[#1C2330] p-4 border border-[#998776]">
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          {['all', 'win', 'lose', 'draw'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterResult(f)}
              className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider border transition-colors whitespace-nowrap ${
                filterResult === f ? 'bg-[#EDE2CF] text-[#1C2330] border-[#EDE2CF]' : 'bg-transparent text-[#EDE2CF] border-[#998776] hover:border-[#EDE2CF]'
              }`}
            >
              {f === 'all' ? 'Semua' : f === 'win' ? 'Menang' : f === 'lose' ? 'Kalah' : 'Seri'}
            </button>
          ))}
        </div>

        <div className="w-full md:w-[300px]">
          <input
            type="text"
            placeholder="Cari nama lawan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#12161f] border border-[#998776] text-[#EDE2CF] text-sm px-4 py-2 focus:outline-none focus:border-[#EDE2CF]"
          />
        </div>
      </div>

      {/* LIST DUEL */}
      <div className="flex flex-col gap-4">
        {filteredData.length === 0 ? (
          <div className="text-center text-[#998776] py-20 font-sans">Belum ada duel yang cocok dengan filter ini.</div>
        ) : (
          filteredData.map((duel, idx) => {
            const myRole = duel.a.id === myId ? 'A' : 'B';
            const opponent = myRole === 'A' ? duel.b : duel.a;
            
            let badgeText = 'SERI';
            let badgeColor = 'border-[#998776] text-[#EDE2CF]';
            
            if (duel.winner !== 'draw') {
              const isWin = duel.winner === myRole;
              badgeText = isWin ? 'MENANG' : 'KALAH';
              badgeColor = isWin ? 'bg-[#EDE2CF] text-[#1C2330]' : 'bg-[#A52D17] text-[#EDE2CF]';
            }

            return (
              <div 
                key={idx}
                onClick={() => handleSelectDuel(duel)}
                className="flex items-center justify-between bg-[#1C2330] border border-[#998776] p-4 hover:border-[#EDE2CF] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  {/* Foto default akan diganti saat di klik, karena API list tidak mengirim foto */}
                  <div className="w-12 h-12 rounded-full border border-[#998776] bg-[#12161f] flex items-center justify-center overflow-hidden">
                    <img 
                      src={BAKEMONO_IMG} 
                      alt="Lawan" 
                      className="w-full h-full object-cover opacity-50" 
                    />
                  </div>
                  
                  <div>
                    <div className="text-[#EDE2CF] font-bold text-lg leading-tight">
                      {opponent.name}
                    </div>
                    <div className="text-[#998776] text-xs mt-1 uppercase tracking-wider">
                      Tier {opponent.tier} • {new Date(duel.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div className={`px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase border ${badgeColor} group-hover:shadow-lg transition-shadow`}>
                  {badgeText}
                </div>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}