'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Modal from '@/components/Modal'
import html2canvas from 'html2canvas-pro'

const TIER_DECK_LIMIT = { Shodan: 5, Nidan: 6, Sandan: 8, Yondan: 10, Godan: 12 }
const TIER_ORDER = ["Shodan", "Nidan", "Sandan", "Yondan", "Godan"]

const LOGO_MAHOUTOKORO = "https://i.imgur.com/e2FcAoM.png"
const LOGO_MINISTRY = "https://raw.githubusercontent.com/avadaprada/combat-console-repository/refs/heads/main/Teks%20paragraf%20Anda%20(2).png"
const BAKEMONO_IMG = "https://raw.githubusercontent.com/avadaprada/combat-console-repository/refs/heads/main/BAKEMONO%20PNG-BROWN.png"

export default function ArenaPage() {
  const [view, setView] = useState('select') 
  const [loading, setLoading] = useState(false)
  const [arenaData, setArenaData] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  
  const [materialsList, setMaterialsList] = useState([])
  const [selectedStyle, setSelectedStyle] = useState('')
  const [selectedMaterials, setSelectedMaterials] = useState([])
  
  const [activeDeckCardIndex, setActiveDeckCardIndex] = useState(0)
  const [activeDuelCardIndex, setActiveDuelCardIndex] = useState(0)

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, materialName: '', material: null })

  const [duelData, setDuelData] = useState(null)
  const pollTimerRef = useRef(null)
  
  const logContainerRef = useRef(null)
  const matchDataRef = useRef(null)
  const resultRef = useRef(null)
  
  const [copiedId, setCopiedId] = useState(null)
  const [showMatchData, setShowMatchData] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDownloadingResult, setIsDownloadingResult] = useState(false)
  const [previewScale, setPreviewScale] = useState(0.5) 
  
  const [canContinueDuel, setCanContinueDuel] = useState(false)

  const [modal, setModal] = useState({ isOpen: false, message: '', type: 'info' })
  const supabase = createClient()
  const [isProcessingMove, setIsProcessingMove] = useState(false)
  const isProcessingRef = useRef(false)

  // ================= HITUNG SKALA KARTU PRE-COMBAT =================
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        // Lebar maksimal modal dikurangi padding (sekitar 48px)
        const maxModalWidth = Math.min(window.innerWidth - 48, 1400); 
        // Hitung skala. Kartu aslinya 1500px.
        const scale = maxModalWidth / 1500; 
        // Batasi agar tidak terlalu kecil (minimal 0.25) atau terlalu besar (maksimal 1)
        setPreviewScale(Math.max(0.25, Math.min(scale, 1)));
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showMatchData]);
  // =================================================================

  // ================== FITUR AUTO-RESUME ==================
  useEffect(() => {
    const cachedMats = localStorage.getItem('cc_materials_cache');
    if (cachedMats) {
      try { setMaterialsList(JSON.parse(cachedMats)); } catch (e) {}
    }

    const savedSession = localStorage.getItem('cc_arena_session');
    if (savedSession) {
      try {
        const { arenaData: savedArena, duelData: savedDuel, view: savedView } = JSON.parse(savedSession);
        if (savedArena && savedDuel) {
          setArenaData(savedArena);
          setDuelData(savedDuel);
          setView(savedView);
          
          if (savedView === 'result') {
            const combatId = savedArena.license.id;
            if (combatId) checkDailyLimit(combatId);
          }
        }
      } catch (e) {
        console.error("Gagal restore session", e);
        localStorage.removeItem('cc_arena_session');
      }
    }
  }, []);

  useEffect(() => {
    if ((view === 'duel' || view === 'result') && arenaData && duelData) {
      localStorage.setItem('cc_arena_session', JSON.stringify({ arenaData, duelData, view }));
    } else if (view === 'select' || view === 'practitioner') {
      localStorage.removeItem('cc_arena_session');
    }
  }, [view, arenaData, duelData]);
  // ========================================================

  const handleEnterPractitioner = async () => {
    setView('practitioner')
    setLoading(true)
    setErrorMsg('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const combatId = user.email.split('@')[0].trim().toUpperCase()

    try {
      const [arenaRes, matRes] = await Promise.all([
        fetch(`/api/arena/entry?id=${combatId}`),
        fetch('/api/materials')
      ]);

      const result = await arenaRes.json()
      const matData = await matRes.json()

      if (!result.success) {
        setErrorMsg(result.message || 'Gagal memuat arena.')
      } else if (!result.data.hasMatch) {
        setErrorMsg('Belum ada Ranked Match yang dipasangkan untukmu saat ini.')
      } else {
        setArenaData(result.data)
        
        if (result.data.duel.status === 'ongoing') {
          setView('duel')
        } else if (result.data.duel.status === 'finished' || result.data.duel.status === 'point_calculation') {
          setDuelData(result.data.duel)
          checkDailyLimit(combatId)
          setView('result')
          return
        }

        if (matData.success) {
          setMaterialsList(matData.data)
          localStorage.setItem('cc_materials_cache', JSON.stringify(matData.data))
        }
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan koneksi.')
    } finally {
      setLoading(false)
    }
  }

  const toggleMaterial = (matName) => {
    if (selectedMaterials.includes(matName)) {
      setSelectedMaterials(selectedMaterials.filter(n => n !== matName))
    } else {
      const limit = TIER_DECK_LIMIT[arenaData.license.tier] || 5
      if (selectedMaterials.length >= limit) {
        setModal({ isOpen: true, message: `Batas maksimal deck untuk tier ${arenaData.license.tier} adalah ${limit} material.`, type: 'error' })
        return
      }
      setSelectedMaterials([...selectedMaterials, matName])
    }
  }

  const handleConfirmDeck = async () => {
    if (!selectedStyle) return setModal({ isOpen: true, message: 'Pilih Combat Style terlebih dahulu!', type: 'error' })
    if (selectedMaterials.length === 0) return setModal({ isOpen: true, message: 'Pilih minimal 1 material!', type: 'error' })

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const combatId = user.email.split('@')[0].trim().toUpperCase()

    try {
      const res = await fetch('/api/arena/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: combatId,
          duelKey: arenaData.duel.duelKey,
          style: selectedStyle,
          materials: selectedMaterials
        })
      })
      const result = await res.json()
      
      if (result.success) {
        setModal({ isOpen: true, message: 'Deck terkonfirmasi! Menunggu lawan...', type: 'success' })
        setView('duel') 
      } else {
        setModal({ isOpen: true, message: 'Gagal konfirmasi: ' + result.message, type: 'error' })
      }
    } catch (err) {
      setModal({ isOpen: true, message: 'Error: ' + err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleUseMaterial = async (materialName) => {
    if (duelData.currentTurn !== arenaData.myRole || isProcessingRef.current) return

    isProcessingRef.current = true
    setIsProcessingMove(true)
    const startTime = Date.now();

    const prevDuelData = JSON.parse(JSON.stringify(duelData))
    const myRoleKey = arenaData.myRole.toLowerCase()
    const material = materialsList.find(m => m.name === materialName)
    const isRegen = material.format.toLowerCase().includes('regen');
    
    const optimisticData = { 
      ...duelData, 
      [myRoleKey]: {
        ...duelData[myRoleKey],
        ae: Math.max(0, duelData[myRoleKey].ae - (material.aeCost || 0)),
        uses: isRegen ? {
          ...duelData[myRoleKey].uses,
          regenTotal: ((duelData[myRoleKey].uses?.regenTotal) || 0) + 1
        } : duelData[myRoleKey].uses
      }
    }
    
    optimisticData.log = [
      ...optimisticData.log, 
      {
        turn: duelData.turnNumber,
        actor: arenaData.myRole,
        material: materialName,
        note: "sedang menyiapkan serangan",
        aeBefore: duelData[myRoleKey].ae,
        vpBefore: duelData[myRoleKey].vp,
        aeAfter: optimisticData[myRoleKey].ae,
        vpAfter: duelData[myRoleKey].vp,
        isOptimistic: true
      }
    ]

    setDuelData(optimisticData)

    const { data: { user } } = await supabase.auth.getUser()
    const combatId = user.email.split('@')[0].trim().toUpperCase()
    
    try {
      const res = await fetch('/api/arena/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: combatId,
          duelKey: arenaData.duel.duelKey,
          materialName: materialName,
          isCombo: false
        })
      })
      const result = await res.json()
      
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 1200) {
        await new Promise(resolve => setTimeout(resolve, 1200 - elapsedTime));
      }
      
      if (!result.success) {
        setDuelData(prevDuelData)
        setModal({ isOpen: true, message: result.message, type: 'error' })
      } else {
        setDuelData(result.data)
        if (result.data.status === 'finished' || result.data.status === 'point_calculation') {
          checkDailyLimit(combatId)
          setView('result')
        }
      }
    } catch (err) {
      setDuelData(prevDuelData)
      setModal({ isOpen: true, message: 'Error: ' + err.message, type: 'error' })
    } finally {
      isProcessingRef.current = false
      setIsProcessingMove(false)
    }
  }

  const checkDailyLimit = async (combatId) => {
    try {
      const res = await fetch(`/api/history?id=${combatId}`)
      const result = await res.json()
      if (result.success && result.data.history) {
        const todayStr = new Date().toDateString()
        const todayDuels = result.data.history.filter(h => new Date(h.updatedAt).toDateString() === todayStr)
        if (todayDuels.length < 3) {
          setCanContinueDuel(true)
        } else {
          setCanContinueDuel(false)
        }
      }
    } catch (e) {
      console.error("Gagal cek limit harian", e)
    }
  }

  const downloadResultImage = async () => {
    if (!resultRef.current) return;
    setIsDownloadingResult(true);
    
    const wrapper = document.getElementById('result-scale-wrapper');
    const originalClass = wrapper ? wrapper.className : '';

    try {
      if (wrapper) wrapper.className = 'origin-top shrink-0 w-[1250px]';
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(resultRef.current, {
        scale: 2, backgroundColor: '#1C2330', useCORS: true, logging: false, width: 1250, windowWidth: 1250
      });
      const link = document.createElement('a');
      link.download = `duel-result-${arenaData.license.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      setModal({ isOpen: true, message: 'Gagal menyimpan gambar: ' + err.message, type: 'error' });
    } finally {
      if (wrapper) wrapper.className = originalClass;
      setIsDownloadingResult(false);
    }
  }

  const downloadMatchData = async () => {
    if (!matchDataRef.current) return;
    setIsDownloading(true);

    try {
      // Clone elemen untuk dirender di luar layar pada ukuran desktop penuh (1500px)
      const clone = matchDataRef.current.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.top = '-99999px';
      clone.style.left = '0';
      clone.style.width = '1500px';
      clone.style.transform = 'none';
      clone.style.zIndex = '-1';
      document.body.appendChild(clone);

      // Tunggu sebentar agar gambar (img) ter-load sempurna di dalam clone
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#0f141c',
        useCORS: true,
        logging: false,
        width: 1500,
        windowWidth: 1500,
      });

      document.body.removeChild(clone);

      const link = document.createElement('a');
      link.download = `match-data-${arenaData.license.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      setModal({ isOpen: true, message: 'Gagal menyimpan gambar: ' + err.message, type: 'error' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFinalizeDuel = async (navigateTo) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const combatId = user.email.split('@')[0].trim().toUpperCase();

    try {
      await fetch('/api/arena/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: combatId, duelKey: duelData.duelKey })
      });

      localStorage.removeItem('cc_arena_session');
      
      if (navigateTo === 'dashboard') {
        window.location.href = '/dashboard';
      } else {
        setView('select');
        setArenaData(null);
        setDuelData(null);
      }
    } catch (e) {
      console.error("Gagal finalisasi", e);
      localStorage.removeItem('cc_arena_session');
      if (navigateTo === 'dashboard') window.location.href = '/dashboard';
      else { setView('select'); setArenaData(null); setDuelData(null); }
    }
  };

  const generateCombatFormat = (entry) => {
    const isFainted = entry.format === 'fainted' || (entry.vpAfter !== undefined && entry.vpAfter <= 0 && entry.dmgVp > 0) || (entry.note && entry.note.includes('PINGSAN'));
    if (isFainted) return `TURN ${entry.turn}\n\n${entry.aeBefore}AE / ${entry.vpBefore}VP\n\nFAINTED: VP telah habis, tidak bisa melanjutkan duel\n\n${entry.aeAfter}AE / ${entry.vpAfter}VP`;
    const isSkipTurn = entry.material === '-' || !entry.material;
    if (isSkipTurn) {
      let skipReason = "[ SKIP TURN: AE tidak mencukupi untuk melakukan aksi ]";
      if (entry.note && entry.note.toLowerCase().includes('stun')) skipReason = "[ SKIP TURN: Tidak dapat melakukan aksi karena terkena efek Stun ]";
      return `TURN ${entry.turn}\n\n${entry.aeBefore}AE / ${entry.vpBefore}VP\n\n${skipReason}\n\n${entry.aeAfter}AE / ${entry.vpAfter}VP`;
    }
    const fmtLabel = entry.format ? entry.format.substring(0, 3).toUpperCase() : '???'
    const mat = materialsList.find(m => m.name === entry.material);
    let ceText = '-'; let beText = '-';
    if (mat) {
      if (mat.coreDesc) ceText = mat.coreDesc.split('--')[0].trim();
      const boost = mat.boost || {};
      const parts = [];
      if (boost.echo) parts.push('Echo ' + boost.echo + ' Turn');
      if (boost.stun) parts.push('Stun ' + boost.stun + ' Turn');
      if (boost.stunResist) parts.push('Stun Resist ' + boost.stunResist + ' Turn');
      if (boost.energyDisrupt) parts.push('Energy Disrupt ' + Math.round(boost.energyDisrupt * 100) + '%');
      if (boost.turnbackAtk) parts.push('Turnback ATK x' + boost.turnbackAtk);
      if (boost.counterstrike) parts.push('Counterstrike');
      if (boost.rechargeBurst) parts.push('Recharge Burst');
      if (parts.length > 0) beText = parts.join(', ');
    }
    if (fmtLabel === 'DEF') return `TURN ${entry.turn}\n\n[ DEF ] ${entry.material}\n"CE: ${ceText}\nBE: ${beText}"\n\n${entry.aeAfter}AE / ${entry.vpAfter}VP`;
    return `TURN ${entry.turn}\n\n${entry.aeBefore}AE / ${entry.vpBefore}VP\n\n[ ${fmtLabel} ] ${entry.material}\n"CE: ${ceText}\nBE: ${beText}"\n\n${entry.aeAfter}AE / ${entry.vpAfter}VP`;
  }

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedId(index)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const calculateExpCp = () => {
    if (!duelData || !arenaData) return { exp: 0, cp: 0 };
    let totalMaterialExp = 0;
    const usedMats = new Set();
    (duelData.log || []).forEach(l => {
      if (l.actor === arenaData.myRole && l.material && l.material !== '-' && !usedMats.has(l.material)) {
        const mat = materialsList.find(m => m.name === l.material);
        if (mat) { totalMaterialExp += (mat.exp || 0); usedMats.add(l.material); }
      }
    });
    const divisor = TIER_DECK_LIMIT[arenaData.license.tier] > 5 ? 4 : 2;
    const finalExp = Math.round((totalMaterialExp + duelData.turnNumber) / divisor);
    const finalCp = Math.round(finalExp * 0.5);
    return { exp: finalExp, cp: finalCp };
  };

  const { exp: estExp, cp: estCp } = calculateExpCp();

  useEffect(() => {
    if (view !== 'duel' || !arenaData?.duel?.duelKey) return
    const fetchDuelState = async () => {
      try {
        if (isProcessingRef.current) return; 
        const res = await fetch(`/api/arena/state?duelKey=${arenaData.duel.duelKey}`)
        const result = await res.json()
        if (result.success) {
          setDuelData(result.data)
          if (result.data.status === 'finished' || result.data.status === 'point_calculation') {
            clearInterval(pollTimerRef.current)
            const { data: { user } } = await supabase.auth.getUser()
            if (user) checkDailyLimit(user.email.split('@')[0].trim().toUpperCase())
            setView('result')
          }
        }
      } catch (err) { console.error("Polling error", err) }
    }
    fetchDuelState()
    pollTimerRef.current = setInterval(fetchDuelState, 2500)
    return () => clearInterval(pollTimerRef.current)
  }, [view, arenaData])

  useEffect(() => {
    if (!logContainerRef.current) return;
    const container = logContainerRef.current;
    container.scrollTop = container.scrollHeight;
  }, [duelData?.log])

  const filteredDeckMaterials = materialsList.filter(m => {
    const typeKey = (m.type || '').trim().toLowerCase();
    const matchStyle = typeKey === (selectedStyle || '').trim().toLowerCase();
    
    const userTier = (arenaData?.license?.tier || '').trim().toLowerCase();
    const matTier = (m.tier || '').trim().toLowerCase();
    
    const userTierIndex = TIER_ORDER.findIndex(t => t.toLowerCase() === userTier);
    const matTierIndex = TIER_ORDER.findIndex(t => t.toLowerCase() === matTier);
    
    const matchTier = (userTierIndex !== -1 && matTierIndex !== -1) ? (matTierIndex <= userTierIndex) : true;
    
    return matchStyle && matchTier;
  });

  const myDeckNames = duelData && arenaData ? (duelData[arenaData.myRole === 'A' ? 'a' : 'b'].deck || []) : [];

  return (
    <div className="max-w-[1500px] mx-auto p-3 md:p-6">
      
      {/* ================= 1. PILIH MODE ================= */}
      {view === 'select' && (
        <>
          <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <h1 className="text-[#e3d0b3] text-xs md:text-sm font-bold tracking-[3px] uppercase whitespace-nowrap">Combat Arena</h1>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-[#8c7f73] to-transparent"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div onClick={handleEnterPractitioner} className="group relative border border-[#8c7f73] bg-[#1c222e] cursor-pointer hover:border-[#e3d0b3] transition-all hover:-translate-y-1 hover:shadow-2xl flex flex-col overflow-hidden">
              <div className="h-40 md:h-48 relative overflow-hidden">
                <img src="https://raw.githubusercontent.com/avadaprada/combat-console-repository/refs/heads/main/duel.png" className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" alt="Practitioner" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c222e] to-transparent"></div>
              </div>
              <div className="p-4 md:p-6 relative">
                <div className="absolute -top-6 md:-top-8 left-1/2 -translate-x-1/2 w-12 h-12 md:w-16 md:h-16 rounded-full bg-[#12161f] border border-[#8c7f73] flex items-center justify-center group-hover:border-[#e3d0b3] transition-colors">
                  <svg className="w-6 h-6 md:w-8 md:h-8 text-[#e3d0b3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.5 3.5 6 12l-2.5 5L6 20l5-2.5L19.5 9M17.5 6.5 19 5M5 19l2-2"></path></svg>
                </div>
                <h2 className="text-center text-[#e3d0b3] font-bold tracking-widest text-base md:text-lg mt-4 md:mt-6 mb-2">Practitioner Duel</h2>
                <p className="text-center text-[#8c7f73] text-[10px] md:text-xs uppercase tracking-widest">1 vs 1 Ranked Match</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= 2. DECK BUILDER (3D CAROUSEL) ================= */}
      {view === 'practitioner' && (
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <button onClick={() => setView('select')} className="border border-[#8c7f73] text-[#e3d0b3] px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold hover:bg-[#8c7f73] transition-colors">
              ← Pilih Mode Lain
            </button>
            <h2 className="text-[#e3d0b3] font-bold tracking-[3px] uppercase text-sm md:text-base">Persiapan Duel</h2>
          </div>
          
          {loading && <div className="text-center py-20 text-[#e3d0b3] text-sm md:text-base">Menyelaraskan energi arena...</div>}
          {!loading && errorMsg && <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 md:p-6 text-center text-sm md:text-base">{errorMsg}</div>}

          {!loading && arenaData && (
            <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
              
              <div className="lg:w-[350px] flex flex-row lg:flex-col justify-between lg:justify-start gap-2 lg:gap-4 shrink-0">
                <div className="flex-1 border border-[#8c7f73] p-3 md:p-6 bg-[#1c222e] text-center">
                  <div className="text-[8px] md:text-[10px] text-[#8c7f73] tracking-widest mb-1 md:mb-2">KAMU</div>
                  <img src={arenaData.license.photoUrl} alt="Kamu" className="w-16 h-16 md:w-24 md:h-24 mx-auto rounded-full border-2 border-[#e3d0b3] object-cover mb-2 md:mb-4" crossOrigin="anonymous" />
                  <h3 className="text-[#e3d0b3] font-bold text-sm md:text-xl">{arenaData.license.name}</h3>
                  <p className="text-[#8c7f73] text-[10px] md:text-xs">{arenaData.license.tier}</p>
                </div>
                
                <div className="hidden lg:block text-center text-[#85200c] font-bold text-2xl italic">VS</div>
                <div className="lg:hidden flex items-center justify-center text-[#85200c] font-bold text-sm italic px-2">VS</div>

                <div className="flex-1 border border-[#8c7f73] p-3 md:p-6 bg-[#1c222e] text-center">
                  <div className="text-[8px] md:text-[10px] text-[#8c7f73] tracking-widest mb-1 md:mb-2">LAWAN</div>
                  <img src={arenaData.opponent.photoUrl} alt="Lawan" className="w-16 h-16 md:w-24 md:h-24 mx-auto rounded-full border-2 border-[#85200c] object-cover mb-2 md:mb-4" crossOrigin="anonymous" />
                  <h3 className="text-[#e3d0b3] font-bold text-sm md:text-xl">{arenaData.opponent.name}</h3>
                  <p className="text-[#8c7f73] text-[10px] md:text-xs">{arenaData.opponent.tier}</p>
                </div>
              </div>

              <div className="flex-1 border border-[#8c7f73] p-4 md:p-6 bg-[#1c222e] flex flex-col justify-between">
                <div>
                  <h3 className="text-[#e3d0b3] font-bold text-base md:text-lg mb-3 md:mb-4 border-b border-[#8c7f73] pb-2">Susun Deck Material</h3>
                  
                  <div className="mb-4">
                    <div className="text-[#8c7f73] text-[10px] md:text-xs mb-2">1. Pilih Combat Style</div>
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {Object.entries(arenaData.license.combatStyle).map(([style, state]) => {
                        if (style === 'combination') return null;
                        const isUnlocked = state === true;
                        return (
                          <button 
                            key={style} disabled={!isUnlocked} 
                            onClick={() => { 
                              setSelectedStyle(style); 
                              setSelectedMaterials([]); 
                              setActiveDeckCardIndex(0); 
                            }}
                            className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider border transition-colors ${selectedStyle === style ? 'bg-[#e3d0b3] text-[#1c222e] border-[#e3d0b3]' : isUnlocked ? 'bg-transparent text-[#e3d0b3] border-[#8c7f73] hover:border-[#e3d0b3]' : 'bg-transparent text-[#5a5650] border-[#5a5650] cursor-not-allowed'}`}
                          >
                            {style}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="text-[#8c7f73] text-[10px] md:text-xs mb-2 flex justify-between">
                      <span>2. Pilih Material (Maks: {TIER_DECK_LIMIT[arenaData.license.tier] || 5})</span>
                      <span className="text-[#e3d0b3] font-bold">{selectedMaterials.length} terpilih</span>
                    </div>
                    
                    {!selectedStyle ? (
                      <div className="text-center text-[#8c7f73] py-8 border border-dashed border-[#8c7f73] text-xs md:text-sm flex-1 flex items-center justify-center rounded min-h-[320px]">Pilih style dulu.</div>
                    ) : filteredDeckMaterials.length === 0 ? (
                      <div className="text-center text-[#8c7f73] py-8 border border-dashed border-[#8c7f73] text-xs md:text-sm flex-1 flex items-center justify-center rounded min-h-[320px]">Belum ada material untuk style dan tier ini.</div>
                    ) : (
                      <div 
                        className="relative w-full h-[320px] md:h-[400px] flex justify-center items-center mt-2"
                        style={{ perspective: '1200px' }}
                      >
                        
                        <button 
                          onClick={() => { if (activeDeckCardIndex > 0) setActiveDeckCardIndex(activeDeckCardIndex - 1); }}
                          disabled={activeDeckCardIndex === 0}
                          className="absolute left-1 md:left-4 z-50 bg-[#1C2330] border border-[#998776] md:border-2 text-[#e3d0b3] w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full hover:bg-[#e3d0b3] hover:text-[#1C2330] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl"
                        >
                          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>

                        {filteredDeckMaterials.map((mat, index) => {
                          const offset = index - activeDeckCardIndex;
                          if (Math.abs(offset) > 2) return null;

                          const isSelected = selectedMaterials.includes(mat.name);
                          const isExclusive = mat.exclusive === true;
                          const hasAccess = isExclusive ? (arenaData.license.materialBuffs && arenaData.license.materialBuffs[mat.name]) : true;

                          let translateX = '0%'; let rotateZ = '0deg'; let scale = '1'; let zIndex = '30'; let brightness = 'brightness-100';

                          if (offset === -1) { translateX = '-60%'; rotateZ = '-10deg'; scale = '0.85'; zIndex = '20'; brightness = 'brightness-50'; }
                          else if (offset === -2) { translateX = '-110%'; rotateZ = '-20deg'; scale = '0.7'; zIndex = '10'; brightness = 'brightness-[0.3]'; }
                          else if (offset === 1) { translateX = '60%'; rotateZ = '10deg'; scale = '0.85'; zIndex = '20'; brightness = 'brightness-50'; }
                          else if (offset === 2) { translateX = '110%'; rotateZ = '20deg'; scale = '0.7'; zIndex = '10'; brightness = 'brightness-[0.3]'; }

                          return (
                            <div 
                              key={mat.name} 
                              onClick={() => {
                                if (offset !== 0) { setActiveDeckCardIndex(index); }
                                else {
                                  if (!hasAccess) return setModal({ isOpen: true, message: 'Material ini terkunci.', type: 'error' });
                                  toggleMaterial(mat.name);
                                }
                              }}
                              style={{ 
                                transform: `translateX(${translateX}) rotateZ(${rotateZ}) scale(${scale})`,
                                zIndex,
                                transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)'
                              }}
                              className={`absolute inset-0 m-auto w-[200px] md:w-[240px] h-[280px] md:h-[340px] border-[2px] md:border-[3px] ${offset === 0 ? (isSelected ? 'border-[#4a7c59]' : 'border-[#EDE2CF]') : 'border-[#998776]'} bg-[#12161f] flex flex-col cursor-pointer shadow-2xl ${brightness} rounded-lg overflow-hidden`}
                            >
                              <div className="relative w-full h-[65%] border-b border-[#998776]/50 overflow-hidden bg-[#1C2330]">
                                {mat.photoUrl ? (
                                  <img src={mat.photoUrl} alt={mat.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#998776] text-xs">No Image</div>
                                )}
                                
                                <div className="absolute top-2 left-2 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-black/70 border border-[#998776] text-[#e3d0b3]">{mat.format}</div>

                                {isSelected && offset === 0 && (
                                  <div className="absolute inset-0 bg-[#4a7c59]/30 flex items-center justify-center">
                                    <div className="bg-[#4a7c59] text-white rounded-full p-2 border-2 border-white shadow-lg">
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="p-3 flex-1 flex flex-col justify-between bg-[#12161f]">
                                <div>
                                  <div className="flex justify-between items-start">
                                    <h4 className="text-[#e3d0b3] font-bold text-sm md:text-base leading-tight">{mat.name}</h4>
                                    <span className="text-[#8c7f73] text-[9px] border border-[#8c7f73] px-1 rounded">{mat.tier}</span>
                                  </div>
                                  <div className="text-[#8c7f73] text-[9px] uppercase tracking-wider mt-1">{mat.element || mat.type}</div>
                                </div>
                                
                                <div className="flex gap-2 mt-2">
                                  <div className="flex-1 text-center bg-[#1C2330] border border-[#8c7f73] text-[#e3d0b3] text-xs font-bold py-1">AE: {mat.aeCost}</div>
                                </div>
                                
                                {offset === 0 && (
                                  <button className={`w-full mt-2 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-colors ${!hasAccess ? 'bg-[#85200c] border-[#85200c] text-white cursor-not-allowed' : isSelected ? 'bg-[#4a7c59] border-[#4a7c59] text-white' : 'bg-[#e3d0b3] border-[#e3d0b3] text-[#1c222e]'}`}>
                                    {!hasAccess ? 'Terkunci' : isSelected ? 'Batal Pilih' : 'Pilih Material'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        <button 
                          onClick={() => { if (activeDeckCardIndex < filteredDeckMaterials.length - 1) setActiveDeckCardIndex(activeDeckCardIndex + 1); }}
                          disabled={activeDeckCardIndex === filteredDeckMaterials.length - 1 || filteredDeckMaterials.length === 0}
                          className="absolute right-1 md:right-4 z-50 bg-[#1C2330] border border-[#998776] md:border-2 text-[#e3d0b3] w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full hover:bg-[#e3d0b3] hover:text-[#1C2330] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl"
                        >
                          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>

                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 md:pt-4 border-t border-[#8c7f73]">
                  <button onClick={handleConfirmDeck} disabled={loading || selectedMaterials.length === 0} className="w-full bg-[#e3d0b3] text-[#1c222e] font-bold py-2 md:py-3 text-xs md:text-sm tracking-widest uppercase hover:bg-white transition-colors disabled:opacity-50">
                    Konfirmasi Deck ({selectedMaterials.length} Kartu)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= 3. LAYAR DUEL ================= */}
      {view === 'duel' && duelData && (
        <div className="w-full h-[85dvh] md:h-[85vh] flex flex-col bg-[#12161f] border border-[#8c7f73] rounded-lg overflow-hidden relative shadow-2xl">
          
          <div className="bg-[#1c222e] p-2 md:p-3 border-b border-[#8c7f73] relative z-20 shadow-md">
            <div className="flex justify-between items-center mb-1 md:mb-2">
              <div className="flex items-center gap-2 md:gap-3">
                <img src={arenaData.opponent.photoUrl} alt="Opponent" className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-[#85200c] object-cover bg-[#12161f]" crossOrigin="anonymous"/>
                <div>
                  <h3 className="text-[#e3d0b3] font-bold text-xs md:text-sm leading-tight">{arenaData.opponent.name}</h3>
                  <span className="text-[#8c7f73] text-[8px] md:text-[9px] uppercase tracking-widest">{arenaData.opponent.tier}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 md:gap-4">
                <button onClick={() => setShowMatchData(true)} className="bg-[#12161f] border border-[#e3d0b3] text-[#e3d0b3] px-2 py-1 md:px-3 md:py-1 text-[8px] md:text-[10px] uppercase font-bold tracking-widest hover:bg-[#e3d0b3] hover:text-[#1c222e] transition-colors rounded-sm shadow-sm">
                  Pre-Combat
                </button>
                <div className="w-[1px] h-6 bg-[#8c7f73]/50 hidden md:block"></div>
                <div className="flex gap-2 md:gap-4 text-right">
                  <div>
                    <div className="text-[8px] md:text-[9px] text-[#8c7f73] tracking-wider mb-0.5">VP</div>
                    <div className="text-xs md:text-sm font-bold text-white leading-none">{duelData[arenaData.myRole === 'A' ? 'b' : 'a'].vp}</div>
                  </div>
                  <div>
                    <div className="text-[8px] md:text-[9px] text-[#8c7f73] tracking-wider mb-0.5">AE</div>
                    <div className="text-xs md:text-sm font-bold text-[#e3d0b3] leading-none">{duelData[arenaData.myRole === 'A' ? 'b' : 'a'].ae}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-1 md:gap-2 w-full">
              <div className="flex-1 bg-[#12161f] h-1 md:h-1.5 border border-[#8c7f73]">
                <div className="h-full bg-gradient-to-r from-[#85200c] to-red-500 transition-all duration-500" style={{ width: `${(duelData[arenaData.myRole === 'A' ? 'b' : 'a'].vp / arenaData.opponent.vp) * 100}%` }}></div>
              </div>
              <div className="flex-1 bg-[#12161f] h-1 md:h-1.5 border border-[#8c7f73]">
                <div className="h-full bg-gradient-to-r from-[#8c7f73] to-[#e3d0b3] transition-all duration-500" style={{ width: `${(duelData[arenaData.myRole === 'A' ? 'b' : 'a'].ae / arenaData.opponent.ae) * 100}%` }}></div>
              </div>
            </div>

            <div className="flex gap-1 mt-1 md:mt-2 overflow-x-auto custom-scrollbar pb-1">
              {(duelData[arenaData.myRole === 'A' ? 'b' : 'a'].deck || []).map((matName, i) => (
                <div key={i} className="text-[6px] md:text-[8px] bg-[#12161f] border border-[#5a5650] text-[#8c7f73] px-1 py-0.5 whitespace-nowrap rounded">
                  {matName}
                </div>
              ))}
            </div>
          </div>

          <div ref={logContainerRef} className="flex-1 overflow-y-auto p-2 md:p-4 flex flex-col gap-3 md:gap-5 custom-scrollbar bg-[#12161f]">
            {duelData.log && duelData.log.length > 0 ? (
              [...duelData.log].map((entry, idx) => {
                const isMe = entry.actor === arenaData.myRole;
                const actorName = isMe ? arenaData.license.name : arenaData.opponent.name;
                
                if (entry.isOptimistic) {
                  return (
                    <div key={`opt-${idx}`} className={`flex flex-col w-full max-w-[850px] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div className={`text-xs md:text-sm mb-1 md:mb-2 px-3 py-2 rounded bg-black/20 border-${isMe ? 'r' : 'l'}-2 ${isMe ? 'border-[#e3d0b3]' : 'border-[#85200c]'} flex items-center gap-2 md:gap-3`}>
                        <span className={`font-bold ${isMe ? 'text-[#e3d0b3]' : 'text-[#f0b9a8]'}`}>{actorName}</span>
                        <span className="text-[#998776] italic text-[10px] md:text-sm">{entry.note}</span>
                        <div className="flex gap-1 ml-1">
                          <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-[#e3d0b3] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-[#e3d0b3] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-[#e3d0b3] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )
                }

                const copyText = generateCombatFormat(entry);
                const isFainted = entry.format === 'fainted' || (entry.vpAfter !== undefined && entry.vpAfter <= 0 && entry.dmgVp > 0) || (entry.note && entry.note.includes('PINGSAN'));
                const isSkipTurn = entry.material === '-' || !entry.material;

                let displayNote = entry.note || `menggunakan ${entry.material}.`;
                if (isFainted) displayNote = "FAINTED: VP telah habis, tidak bisa melanjutkan duel";
                else if (isSkipTurn) displayNote = entry.note && entry.note.toLowerCase().includes('stun') ? "[ SKIP TURN: Tidak dapat melakukan aksi karena terkena efek Stun ]" : "[ SKIP TURN: AE tidak mencukupi untuk melakukan aksi ]";

                return (
                  <div key={idx} className={`flex flex-col w-full max-w-[850px] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                    <div className={`text-[10px] md:text-sm mb-1 md:mb-2 px-2 py-1 md:py-1.5 rounded bg-black/20 border-l-2 ${isMe ? 'text-right text-[#e3d0b3] border-[#e3d0b3]' : 'text-left text-[#f0b9a8] border-[#85200c]'}`}>
                      <span className="font-bold">{actorName}</span> {displayNote}
                    </div>
                    
                    <div className={`relative w-full border ${isMe ? 'border-[#e3d0b3]/50 bg-[#1c222e]' : 'border-[#85200c]/50 bg-[#1a1414]'} rounded p-2 md:p-3 font-mono text-[9px] md:text-[11px] leading-relaxed`}>
                      {isMe && (
                        <button onClick={() => handleCopy(copyText, idx)} className="absolute top-1 right-1 md:top-2 md:right-2 bg-[#12161f] border border-[#8c7f73] text-[#8c7f73] hover:text-[#e3d0b3] hover:border-[#e3d0b3] px-1.5 py-0.5 md:px-2 md:py-1 rounded text-[8px] md:text-[9px] font-sans font-bold uppercase transition-colors">
                          {copiedId === idx ? 'Tersalin ✓' : 'Copy Format'}
                        </button>
                      )}
                      <div className="text-[#8c7f73] mb-0.5 md:mb-1">TURN {entry.turn} <span className="text-[#e3d0b3] font-bold ml-1 md:ml-2">{actorName}</span></div>
                      
                      {isFainted || isSkipTurn ? (
                        <>
                          <div className="text-white/70">{entry.aeBefore}AE / {entry.vpBefore}VP</div>
                          <div className="my-1 md:my-1.5 py-1 border-y border-dashed border-[#8c7f73]/30">
                            <div className={isFainted ? "text-[#85200c] font-bold text-[10px] md:text-xs" : "text-[#f0b9a8] font-bold text-[10px] md:text-xs"}>
                              {isFainted ? "FAINTED: VP telah habis, tidak bisa melanjutkan duel" : displayNote}
                            </div>
                          </div>
                          <div className="text-white/70">{entry.aeAfter}AE / {entry.vpAfter}VP</div>
                        </>
                      ) : (
                        <>
                          <div className="text-white/70">{entry.aeBefore}AE / {entry.vpBefore}VP</div>
                          <div className="my-1 md:my-1.5 py-1 border-y border-dashed border-[#8c7f73]/30">
                            <div>[ <span className="text-[#e3d0b3] font-bold">{entry.format ? entry.format.substring(0,3).toUpperCase() : '???'}</span> ] <span className="text-white font-bold">{entry.material}</span></div>
                            <div className="text-[#f0b9a8] mt-0.5 md:mt-1">TOTAL DMG: {entry.dmgAe || 0}AE & {entry.dmgVp || 0}VP</div>
                          </div>
                          <div className="text-white/70">{entry.aeAfter}AE / {entry.vpAfter}VP</div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center text-[#8c7f73] m-auto italic flex flex-col items-center gap-4 text-xs md:text-sm">
                <svg className="w-6 h-6 md:w-8 md:h-8 animate-spin text-[#8c7f73]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Menyelaraskan energi pertarungan...
              </div>
            )}
          </div>

          <div className="bg-[#1c222e] border-t-2 border-[#e3d0b3] relative flex h-[180px] md:h-[180px] items-end">
            <div className={`absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 px-4 md:px-8 py-0.5 md:py-1 rounded-full border font-bold text-[8px] md:text-[10px] tracking-[0.2em] uppercase shadow-lg z-30 ${duelData.currentTurn === arenaData.myRole ? 'bg-[#e3d0b3] text-[#1c222e] border-white animate-pulse' : 'bg-[#12161f] text-[#85200c] border-[#85200c]'}`}>
                {duelData.currentTurn === arenaData.myRole ? 'GILIRANMU' : 'MENUNGGU LAWAN...'}
            </div>

            <div className="w-[100px] md:w-[220px] shrink-0 border-r border-[#8c7f73] p-1.5 md:p-3 flex flex-col justify-between h-full bg-[#12161f] z-10">
               <div className="flex items-center gap-1 md:gap-2">
                  <img src={arenaData.license.photoUrl} alt="Me" className="w-6 h-6 md:w-10 md:h-10 rounded-full border border-[#e3d0b3] object-cover bg-[#1c222e]" crossOrigin="anonymous"/>
                  <div className="overflow-hidden">
                    <h3 className="text-[#e3d0b3] font-bold text-[8px] md:text-xs leading-tight truncate">{arenaData.license.name}</h3>
                    <span className="text-[#8c7f73] text-[6px] md:text-[8px] uppercase tracking-widest">{arenaData.license.tier}</span>
                  </div>
               </div>
               <div className="space-y-1 md:space-y-1.5 mt-1 md:mt-2">
                 <div>
                    <div className="flex justify-between text-[7px] md:text-[9px] text-[#8c7f73]"><span>VP</span><span className="font-bold text-white">{duelData[arenaData.myRole === 'A' ? 'a' : 'b'].vp}</span></div>
                    <div className="bg-[#1c222e] h-1 md:h-1.5 border border-[#8c7f73]"><div className="h-full bg-[#85200c]" style={{ width: `${(duelData[arenaData.myRole === 'A' ? 'a' : 'b'].vp / arenaData.license.vp) * 100}%` }}></div></div>
                 </div>
                 <div>
                    <div className="flex justify-between text-[7px] md:text-[9px] text-[#8c7f73]"><span>AE</span><span className="font-bold text-[#e3d0b3]">{duelData[arenaData.myRole === 'A' ? 'a' : 'b'].ae}</span></div>
                    <div className="bg-[#1c222e] h-1 md:h-1.5 border border-[#8c7f73]"><div className="h-full bg-[#e3d0b3]" style={{ width: `${(duelData[arenaData.myRole === 'A' ? 'a' : 'b'].ae / arenaData.license.ae) * 100}%` }}></div></div>
                 </div>
               </div>
               <div className="hidden md:block mt-2 text-center bg-[#1c222e] border border-[#8c7f73] rounded p-1.5">
                  <div className="text-[8px] text-[#8c7f73] uppercase tracking-widest mb-1 border-b border-[#8c7f73]/30 pb-1">Estimasi Reward</div>
                  <div className="flex justify-center gap-3 text-[10px]"><div><span className="text-[#8c7f73]">EXP:</span> <span className="text-[#e3d0b3] font-bold">{estExp}</span></div><div><span className="text-[#8c7f73]">CP:</span> <span className="text-[#e3d0b3] font-bold">{estCp}</span></div></div>
               </div>
            </div>

            <div className="flex-1 flex flex-col relative h-full z-10 bg-[#1c222e] overflow-hidden">
               
               <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] text-[#8c7f73] uppercase tracking-widest z-20 pointer-events-none">
                 Deck ({myDeckNames.length > 0 ? activeDuelCardIndex + 1 : 0}/{myDeckNames.length})
               </div>

               <div 
                 className="flex-1 relative flex justify-center items-center mt-2"
                 style={{ perspective: '1000px' }}
               >
                 <button 
                   onClick={() => { if (activeDuelCardIndex > 0) setActiveDuelCardIndex(activeDuelCardIndex - 1); }}
                   disabled={activeDuelCardIndex === 0}
                   className="absolute left-1 md:left-2 z-50 bg-[#1C2330] border border-[#998776] text-[#e3d0b3] w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-[#e3d0b3] hover:text-[#1C2330] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl"
                 >
                   <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                 </button>

                 {myDeckNames.map((matName, index) => {
                   const mat = materialsList.find(m => m.name === matName);
                   if (!mat) return null;

                   const offset = index - activeDuelCardIndex;
                   if (Math.abs(offset) > 2) return null;
                   
                   const isMyTurn = duelData.currentTurn === arenaData.myRole;
                   const myStats = duelData[arenaData.myRole === 'A' ? 'a' : 'b'];
                   const canAfford = myStats.ae >= mat.aeCost;
                   
                   const isRegen = mat.format.toLowerCase().includes('regen');
                   const regenTotalUsed = (myStats.uses && myStats.uses.regenTotal) || 0;
                   const isRegenLimitReached = isRegen && regenTotalUsed >= 2;

                   const isDisabled = !isMyTurn || !canAfford || isProcessingMove || isRegenLimitReached;
                   
                   let borderClr = 'border-[#8c7f73]';
                   if (mat.format.toLowerCase().includes('off')) borderClr = 'border-[#85200c]';
                   if (mat.format.toLowerCase().includes('def')) borderClr = 'border-[#e3d0b3]';
                   if (isRegen) borderClr = 'border-[#4a7c59]';

                   let translateX = '0%'; let rotateZ = '0deg'; let scale = '1'; let zIndex = '30'; let brightness = 'brightness-100';
                   if (offset === -1) { translateX = '-70%'; rotateZ = '-10deg'; scale = '0.85'; zIndex = '20'; brightness = 'brightness-50'; }
                   else if (offset === -2) { translateX = '-120%'; rotateZ = '-20deg'; scale = '0.7'; zIndex = '10'; brightness = 'brightness-[0.3]'; }
                   else if (offset === 1) { translateX = '70%'; rotateZ = '10deg'; scale = '0.85'; zIndex = '20'; brightness = 'brightness-50'; }
                   else if (offset === 2) { translateX = '120%'; rotateZ = '20deg'; scale = '0.7'; zIndex = '10'; brightness = 'brightness-[0.3]'; }

                   return (
                     <div 
                       key={index} 
                       onClick={() => {
                         if (offset !== 0) {
                           setActiveDuelCardIndex(index);
                         } else if (!isDisabled) {
                           setConfirmModal({ isOpen: true, materialName: mat.name, material: mat });
                         }
                       }} 
                       style={{ 
                         transform: `translateX(${translateX}) rotateZ(${rotateZ}) scale(${scale})`,
                         zIndex,
                         transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)'
                       }}
                       className={`absolute inset-0 m-auto w-[90px] md:w-[110px] h-[130px] md:h-[150px] flex flex-col rounded-md border-2 overflow-hidden ${borderClr} bg-[#12161f] ${isDisabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:shadow-[0_10px_20px_rgba(0,0,0,0.6)] cursor-pointer shadow-xl'} ${brightness}`}
                     >
                       {isProcessingMove && !isDisabled && offset === 0 && (
                         <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center">
                           <div className="w-4 h-4 md:w-6 md:h-6 border-2 border-[#e3d0b3] border-t-transparent rounded-full animate-spin"></div>
                         </div>
                       )}

                       <div className="absolute top-1 left-1 w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#1c222e] border border-[#8c7f73] flex items-center justify-center text-white font-bold text-[9px] md:text-[11px] z-20">{mat.aeCost}</div>
                       
                       <div className="relative z-10 p-1 flex flex-col h-full text-center justify-between">
                         <div className="text-[7px] md:text-[8px] font-bold uppercase tracking-widest text-[#8c7f73] mt-1">{mat.format}</div>
                         <div className="text-[#e3d0b3] font-bold text-[10px] md:text-[12px] leading-tight flex-1 flex items-center justify-center">{mat.name}</div>
                         
                         {isRegen && (
                           <div className={`text-[7px] md:text-[9px] font-bold border-t border-white/5 pt-1 ${isRegenLimitReached ? 'text-[#85200c]' : 'text-[#4a7c59]'}`}>
                             REG: {regenTotalUsed}/2
                           </div>
                         )}
                         {!isRegen && (
                           <div className="text-[7px] md:text-[9px] text-white/30 border-t border-white/5 pt-1">{mat.tier}</div>
                         )}
                       </div>
                     </div>
                   )
                 })}

                 <button 
                   onClick={() => { if (activeDuelCardIndex < myDeckNames.length - 1) setActiveDuelCardIndex(activeDuelCardIndex + 1); }}
                   disabled={activeDuelCardIndex === myDeckNames.length - 1 || myDeckNames.length === 0}
                   className="absolute right-1 md:right-2 z-50 bg-[#1C2330] border border-[#998776] text-[#e3d0b3] w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-[#e3d0b3] hover:text-[#1C2330] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl"
                 >
                   <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 4. HASIL AKHIR DUEL (POINT CALCULATION) ================= */}
      {view === 'result' && duelData && arenaData && duelData.resultDetail && (
        <div className="w-full flex flex-col items-center">
          
          <style>{`
            @keyframes winnerGlow { 0%, 100% { box-shadow: 0 0 15px 2px rgba(227, 208, 179, 0.4), inset 0 0 10px rgba(227, 208, 179, 0.2); border-color: #e3d0b3; } 50% { box-shadow: 0 0 30px 8px rgba(227, 208, 179, 0.8), inset 0 0 20px rgba(227, 208, 179, 0.5); border-color: #ffffff; } }
            @keyframes textShine { 0% { text-shadow: 0 0 5px rgba(227, 208, 179, 0.5); } 50% { text-shadow: 0 0 15px rgba(227, 208, 179, 1), 0 0 25px rgba(227, 208, 179, 0.8); } 100% { text-shadow: 0 0 5px rgba(227, 208, 179, 0.5); } }
            .winner-glow { animation: winnerGlow 2s ease-in-out infinite; }
            .winner-text { animation: textShine 2s ease-in-out infinite; color: #ffffff !important; }
          `}</style>

          <div className="w-full flex justify-center overflow-x-auto custom-scrollbar pb-4 mt-2 md:mt-6">
            <div className="relative w-[1250px] h-[300px] min-[390px]:h-[350px] sm:h-[600px] md:h-auto flex justify-center md:block">
              
              <div id="result-scale-wrapper" className="origin-top scale-[0.25] min-[390px]:scale-[0.3] sm:scale-[0.45] md:scale-100 shrink-0">
                <div ref={resultRef} className="relative w-[1250px] bg-[#1c222e] p-8 md:p-12 flex justify-center overflow-hidden">
                  
                  <div className="relative w-full bg-[#1c222e] border-[4px] border-[#e3d0b3] px-10 py-16 font-sans shadow-2xl">
                    
                    <div className="absolute top-0 left-0 w-24 h-12 border-r-[4px] border-b-[4px] border-[#1c222e] z-0 bg-[#e3d0b3] pointer-events-none"></div>
                    <div className="absolute top-0 right-0 w-12 h-24 border-l-[4px] border-b-[4px] border-[#1c222e] z-0 bg-[#e3d0b3] pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-24 border-r-[4px] border-t-[4px] border-[#1c222e] z-0 bg-[#e3d0b3] pointer-events-none"></div>
                    <div className="absolute bottom-0 right-0 w-24 h-12 border-l-[4px] border-t-[4px] border-[#1c222e] z-0 bg-[#e3d0b3] pointer-events-none"></div>

                    <h1 className="text-4xl font-bold text-center tracking-wider text-[#e3d0b3] -mt-1 mb-2">
                      Duel selesai — {duelData.winner === 'draw' ? 'SERI' : (duelData.winner === arenaData.myRole ? `${arenaData.license.name} MENANG!` : `${arenaData.opponent.name} MENANG!`)}
                    </h1>
                    
                    <div className="text-center text-[#cfc1a6] text-sm mb-10 pb-6 border-b border-[#8c7f73] border-dashed">
                      {duelData.resultDetail.reasonText}
                    </div>

                    <div className="flex justify-center items-center gap-10 md:gap-20 px-4 mb-8">
                      
                      <div className={`flex flex-col items-center w-[40%] max-w-[300px] transition-all duration-500 ${duelData.winner !== 'draw' && duelData.winner !== 'A' ? 'opacity-60 grayscale-[30%]' : 'opacity-100'}`}>
                        <div className="relative mb-4">
                          {duelData.winner !== 'draw' && (
                            <div className={`absolute top-2 -right-8 z-20 px-6 py-1 transform rotate-45 shadow-md text-xs font-bold tracking-widest ${duelData.winner === 'A' ? 'bg-[#e3d0b3] text-[#1c222e]' : 'bg-[#85200c] text-white'}`}>
                              {duelData.winner === 'A' ? 'MENANG' : 'KALAH'}
                            </div>
                          )}
                          <div className={`w-32 h-32 rounded-full border-4 p-1 relative z-10 bg-[#1c222e] overflow-hidden ${duelData.winner === 'A' ? 'border-[#e3d0b3] winner-glow' : duelData.winner === 'draw' ? 'border-[#8c7f73]' : 'border-[#85200c] shadow-[0_0_15px_rgba(133,32,12,0.4)]'}`}>
                            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#8c7f73]"><defs><pattern id="meander-res-a" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 5 h5 v-5 h5 v10 h-5 v-5 h-5 z" fill="none" stroke="currentColor" strokeWidth="1.5" /></pattern></defs><circle cx="50" cy="50" r="46" fill="url(#meander-res-a)" stroke="currentColor" strokeWidth="3" /></svg>
                            <img src={(arenaData.myRole === 'A' ? arenaData.license.photoUrl : arenaData.opponent.photoUrl) || BAKEMONO_IMG} alt="A" className="relative z-10 w-full h-full rounded-full object-cover bg-[#12161f]" crossOrigin="anonymous" />
                            {duelData.winner !== 'draw' && duelData.winner !== 'A' && (<div className="absolute inset-0 bg-[#85200c]/30 mix-blend-multiply z-20 pointer-events-none"></div>)}
                          </div>
                        </div>
                        <div className={`text-xl font-bold mb-1 text-center ${duelData.winner === 'A' ? 'text-[#e3d0b3] winner-text' : duelData.winner === 'draw' ? 'text-[#e3d0b3]' : 'text-[#f0b9a8]'}`}>{duelData.a.name}</div>
                        <div className="text-xs text-[#8c7f73] tracking-widest mb-4 text-center">ID: {duelData.a.id}</div>
                        
                        <div className="w-full px-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] text-[#8c7f73] w-6">VP</span>
                            <div className="flex-1 h-2.5 bg-[#12161f] border border-[#8c7f73]"><div className="h-full bg-[#e3d0b3]" style={{ width: `${(duelData.a.vp / (arenaData.myRole === 'A' ? arenaData.license.vp : arenaData.opponent.vp)) * 100}%` }}></div></div>
                            <span className="text-xs font-bold text-white w-6 text-right">{duelData.a.vp}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#8c7f73] w-6">AE</span>
                            <div className="flex-1 h-2.5 bg-[#12161f] border border-[#8c7f73]"><div className="h-full bg-[#85200c]" style={{ width: `${(duelData.a.ae / (arenaData.myRole === 'A' ? arenaData.license.ae : arenaData.opponent.ae)) * 100}%` }}></div></div>
                            <span className="text-xs font-bold text-white w-6 text-right">{duelData.a.ae}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-4xl font-bold text-[#85200c] italic text-center px-4 shrink-0">VS</div>

                      <div className={`flex flex-col items-center w-[40%] max-w-[300px] transition-all duration-500 ${duelData.winner !== 'draw' && duelData.winner !== 'B' ? 'opacity-60 grayscale-[30%]' : 'opacity-100'}`}>
                        <div className="relative mb-4">
                          {duelData.winner !== 'draw' && (
                            <div className={`absolute top-2 -right-8 z-20 px-8 py-1 transform rotate-45 shadow-md text-xs font-bold tracking-widest ${duelData.winner === 'B' ? 'bg-[#e3d0b3] text-[#1c222e]' : 'bg-[#85200c] text-white'}`}>
                              {duelData.winner === 'B' ? 'MENANG' : 'KALAH'}
                            </div>
                          )}
                          <div className={`w-32 h-32 rounded-full border-4 p-1 relative z-10 bg-[#1c222e] overflow-hidden ${duelData.winner === 'B' ? 'border-[#e3d0b3] winner-glow' : duelData.winner === 'draw' ? 'border-[#8c7f73]' : 'border-[#85200c] shadow-[0_0_15px_rgba(133,32,12,0.4)]'}`}>
                            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#8c7f73]"><defs><pattern id="meander-res-b" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 5 h5 v-5 h5 v10 h-5 v-5 h-5 z" fill="none" stroke="currentColor" strokeWidth="1.5" /></pattern></defs><circle cx="50" cy="50" r="46" fill="url(#meander-res-b)" stroke="currentColor" strokeWidth="3" /></svg>
                            <img src={(arenaData.myRole === 'B' ? arenaData.license.photoUrl : arenaData.opponent.photoUrl) || BAKEMONO_IMG} alt="B" className="relative z-10 w-full h-full rounded-full object-cover bg-[#12161f]" crossOrigin="anonymous" />
                            {duelData.winner !== 'draw' && duelData.winner !== 'B' && (<div className="absolute inset-0 bg-[#85200c]/30 mix-blend-multiply z-20 pointer-events-none"></div>)}
                          </div>
                        </div>
                        <div className={`text-xl font-bold mb-1 text-center ${duelData.winner === 'B' ? 'text-[#e3d0b3] winner-text' : duelData.winner === 'draw' ? 'text-[#e3d0b3]' : 'text-[#f0b9a8]'}`}>{duelData.b.name}</div>
                        <div className="text-xs text-[#8c7f73] tracking-widest mb-4 text-center">ID: {duelData.b.id}</div>
                        
                        <div className="w-full px-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] text-[#8c7f73] w-6">VP</span>
                            <div className="flex-1 h-2.5 bg-[#12161f] border border-[#8c7f73]"><div className="h-full bg-[#e3d0b3]" style={{ width: `${(duelData.b.vp / (arenaData.myRole === 'B' ? arenaData.license.vp : arenaData.opponent.vp)) * 100}%` }}></div></div>
                            <span className="text-xs font-bold text-white w-6 text-right">{duelData.b.vp}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#8c7f73] w-6">AE</span>
                            <div className="flex-1 h-2.5 bg-[#12161f] border border-[#8c7f73]"><div className="h-full bg-[#85200c]" style={{ width: `${(duelData.b.ae / (arenaData.myRole === 'B' ? arenaData.license.ae : arenaData.opponent.ae)) * 100}%` }}></div></div>
                            <span className="text-xs font-bold text-white w-6 text-right">{duelData.b.ae}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between gap-20 md:gap-25 px-15 mt-8 font-mono">
                      <div className="flex-1 border border-[#8c7f73] bg-[#12161f] p-5 relative flex flex-col">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#e3d0b3]"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#e3d0b3]"></div>
                        <div className="text-center text-sm text-[#cfc1a6] mb-3">
                          (EXP Material Unik {duelData.resultDetail.a.totalMaterialExp} + Turn {duelData.resultDetail.a.turnCount}) ÷ Divisor {duelData.resultDetail.a.divisor} = <span className="text-[#e3d0b3] font-bold">{duelData.resultDetail.a.finalExp} EXP</span>
                        </div>
                        <div className="text-center text-[13px] text-[#8c7f73] tracking-widest uppercase mb-3">EXP</div>
                        <div className="space-y-1 mb-4 flex-1">
                          {(duelData.resultDetail.a.materials || []).map((m, idx) => (
                            <div key={idx} className="flex justify-between text-sm text-[#cfc1a6] border-b border-[#8c7f73]/30 pb-1"><span>{m.name}</span><span>+{m.exp} EXP</span></div>
                          ))}
                          {duelData.resultDetail.a.materials.length === 0 && <div className="text-center text-[#8c7f73] text-sm">Tidak ada material</div>}
                        </div>
                        <div className="flex justify-between text-sm font-bold text-[#e3d0b3] border-t border-[#8c7f73] pt-3 mt-auto">
                          <span>EXP +{duelData.resultDetail.a.finalExp}</span><span>CP +{duelData.resultDetail.a.finalCp}</span><span>GT +{duelData.resultDetail.a.gt}</span>
                        </div>
                      </div>

                      <div className="flex-1 border border-[#8c7f73] bg-[#12161f] p-5 relative flex flex-col">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#e3d0b3]"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#e3d0b3]"></div>
                        <div className="text-center text-sm text-[#cfc1a6] mb-3">
                          (EXP Material Unik {duelData.resultDetail.b.totalMaterialExp} + Turn {duelData.resultDetail.b.turnCount}) ÷ Divisor {duelData.resultDetail.b.divisor} = <span className="text-[#e3d0b3] font-bold">{duelData.resultDetail.b.finalExp} EXP</span>
                        </div>
                        <div className="text-center text-[13px] text-[#8c7f73] tracking-widest uppercase mb-3">EXP</div>
                        <div className="space-y-1 mb-4 flex-1">
                          {(duelData.resultDetail.b.materials || []).map((m, idx) => (
                            <div key={idx} className="flex justify-between text-sm text-[#cfc1a6] border-b border-[#8c7f73]/30 pb-1"><span>{m.name}</span><span>+{m.exp} EXP</span></div>
                          ))}
                          {duelData.resultDetail.b.materials.length === 0 && <div className="text-center text-[#8c7f73] text-sm">Tidak ada material</div>}
                        </div>
                        <div className="flex justify-between text-sm font-bold text-[#e3d0b3] border-t border-[#8c7f73] pt-3 mt-auto">
                          <span>EXP +{duelData.resultDetail.b.finalExp}</span><span>CP +{duelData.resultDetail.b.finalCp}</span><span>GT +{duelData.resultDetail.b.gt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-center text-[13px] text-[#8c7f73] tracking-widest uppercase mt-10 border-t border-[#8c7f73] border-dashed pt-4">
                      DUEL SELESAI: {new Date(duelData.updatedAt || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(duelData.updatedAt || Date.now()).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} WIB
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-2 md:mt-6 mb-10 w-full max-w-[1250px]">
            <button onClick={downloadResultImage} disabled={isDownloadingResult} className="bg-[#1C2330] border border-[#e3d0b3] md:border-2 text-[#e3d0b3] px-4 py-2 md:px-6 md:py-2.5 text-[10px] md:text-xs font-bold tracking-widest uppercase hover:bg-[#e3d0b3] hover:text-[#1C2330] transition-all shadow-lg flex items-center gap-2">
              <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              {isDownloadingResult ? 'MENYIMPAN...' : 'SIMPAN HASIL'}
            </button>

            {canContinueDuel ? (
              <button onClick={() => handleFinalizeDuel('arena')} className="bg-[#e3d0b3] text-[#1c222e] px-4 py-2 md:px-6 md:py-2.5 text-[10px] md:text-xs font-bold tracking-widest uppercase hover:bg-white transition-all shadow-lg">LANJUT DUEL</button>
            ) : (
              <button disabled className="bg-[#e3d0b3]/50 text-[#1c222e]/50 px-4 py-2 md:px-6 md:py-2.5 text-[10px] md:text-xs font-bold tracking-widest uppercase cursor-not-allowed border border-transparent">BATAS HARIAN TERCAPAI</button>
            )}

            <button onClick={() => handleFinalizeDuel('dashboard')} className="bg-[#85200c] border border-[#85200c] md:border-2 text-white px-4 py-2 md:px-6 md:py-2.5 text-[10px] md:text-xs font-bold tracking-widest uppercase hover:bg-red-800 transition-all shadow-lg">SELESAIKAN DUEL</button>
          </div>

        </div>
      )}

      {/* ================= MODAL KONFIRMASI PAKAI MATERIAL ================= */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1c222e] border-2 border-[#8c7f73] p-6 md:p-8 max-w-md w-full shadow-2xl relative">
            
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#e3d0b3]"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#e3d0b3]"></div>
            
            <h3 className="text-[#e3d0b3] font-bold text-lg md:text-xl text-center mb-4 uppercase tracking-widest">
              Konfirmasi Aksi
            </h3>
            <p className="text-[#cfc1a6] text-center mb-8 text-sm md:text-base">
              Apakah kamu yakin ingin menggunakan material <br/>
              <strong className="text-white text-lg md:text-xl">[{confirmModal.material?.name}]</strong> <br/>
              untuk turn ini?
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setConfirmModal({ isOpen: false, materialName: '', material: null })}
                className="flex-1 bg-transparent border border-[#8c7f73] text-[#8c7f73] hover:bg-[#8c7f73] hover:text-[#1c222e] font-bold py-2 text-xs md:text-sm tracking-widest uppercase transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  handleUseMaterial(confirmModal.materialName);
                  setConfirmModal({ isOpen: false, materialName: '', material: null });
                }}
                className="flex-1 bg-[#e3d0b3] text-[#1c222e] font-bold py-2 text-xs md:text-sm tracking-widest uppercase hover:bg-white transition-colors"
              >
                Gunakan
              </button>
            </div>
          </div>
        </div>
      )}

            {/* ================= MODAL PRE-COMBAT (DATA MATCH) ================= */}
      {showMatchData && arenaData && duelData && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-sm overflow-hidden">
          
          {/* Modal Container */}
          <div className="bg-[#1c222e] border-2 border-[#8c7f73] w-full max-w-[1400px] h-auto max-h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden relative">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center p-3 md:p-4 border-b border-[#8c7f73] shrink-0 bg-[#12161f]">
              <h3 className="text-[#e3d0b3] font-bold tracking-widest uppercase text-xs md:text-sm">
                Pre-Combat Preview
              </h3>
              <button 
                onClick={() => setShowMatchData(false)} 
                className="bg-[#85200c] border border-[#e3d0b3] text-white px-3 py-1.5 md:px-4 md:py-2 rounded text-[10px] md:text-xs font-bold tracking-widest uppercase hover:bg-red-800 transition-colors shadow-lg flex items-center gap-1"
              >
                ✕ TUTUP
              </button>
            </div>

            {/* Body Modal (Scrollable) */}
            <div className="flex-1 overflow-auto p-2 md:p-4 custom-scrollbar bg-[#0f141c] flex justify-center items-start">
              
              {/* 
                WRAPPER SKALA DINAMIS
                - width & height dihitung berdasarkan skala agar tidak menyisakan ruang kosong
                - transform: scale() mengecilkan kartu 1500px agar pas di layar
              */}
              <div 
                className="relative flex justify-center shrink-0"
                style={{ 
                  width: `${1500 * previewScale}px`, 
                  height: `${1030 * previewScale}px`, // Perkiraan tinggi kartu
                  transition: 'width 0.2s, height 0.2s'
                }}
              >
                
                {/* ===== AREA KARTU ASLI (1500PX) ===== */}
                <div 
                  ref={matchDataRef} 
                  style={{ 
                    transform: `scale(${previewScale})`, 
                    transformOrigin: 'top left',
                    width: '1500px',
                    position: 'absolute',
                    top: 0,
                    left: 0
                  }}
                  className="relative bg-[#0f141c] py-10 pl-20 pr-10 flex justify-center overflow-hidden"
                >
                  
                  {/* Ornamen Batang Diagonal Kiri */}
                  <div className="absolute top-0 bottom-0 left-6 flex flex-col justify-around py-10 z-0">
                    {[1,2,3,4,5,6,7,8,9].map(i => (
                      <div key={i} className="w-8 h-8 bg-[#e3d0b3] rotate-45 shadow-sm" />
                    ))}
                  </div>

                  {/* ===== KARTU UTAMA ===== */}
                  <div className="relative w-full bg-[#1c222e] border-[6px] border-[#e3d0b3] p-10 z-10 shadow-2xl flex flex-col">
                    
                    {/* Ornamen Sudut */}
                    <div className="absolute top-0 left-0 w-24 h-12 border-r-[6px] border-b-[6px] border-[#1c222e] z-0 bg-[#e3d0b3]"></div>
                    <div className="absolute top-0 right-0 w-16 h-24 border-l-[6px] border-b-[6px] border-[#1c222e] z-0 bg-[#e3d0b3]"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-24 border-r-[6px] border-t-[6px] border-[#1c222e] z-0 bg-[#e3d0b3]"></div>
                    <div className="absolute bottom-0 right-0 w-24 h-12 border-l-[6px] border-t-[6px] border-[#1c222e] z-0 bg-[#e3d0b3]"></div>

                    {/* Ornamen Kanan Atas */}
                    <div className="absolute top-6 right-24 flex gap-1 z-20">
                      {[1,2,3,4,5,6,7].map(i => (
                        <div key={i} className="w-3 h-8 bg-[#8c7f73] transform -skew-x-[30deg]"></div>
                      ))}
                    </div>

                    {/* Logo & Title */}
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                      <img src={LOGO_MAHOUTOKORO} alt="Mahoutokoro" className="h-16 object-contain" crossOrigin="anonymous" />
                      <div className="flex flex-col">
                        <span className="text-[#8c7f73] font-bold text-[10px] tracking-[3px]">MAHOUTOKORO</span>
                        <span className="text-[#e3d0b3] font-bold text-3xl tracking-widest leading-none">COMBAT</span>
                      </div>
                    </div>

                    {/* Header bar: Personal Data + Tier */}
                    <div className="flex flex-wrap items-center gap-4 mb-2 relative z-10">
                      <div className="bg-[#e3d0b3] text-[#1c222e] font-bold text-sm px-4 py-2 uppercase tracking-wide">
                        Personal Data Section
                      </div>
                      <div className="flex-1 border-b border-[#e3d0b3] h-0"></div>
                      <div className="text-right">
                        <div className="text-[#e3d0b3] text-[10px] font-bold tracking-widest">POINT</div>
                        <div className="text-[#e3d0b3] text-[10px] font-bold tracking-widest">SECTION</div>
                      </div>
                      <div className="bg-[#12161f] border border-[#8c7f73] text-[#e3d0b3] font-bold px-4 py-2 text-sm">
                        {arenaData.license.exp} EXP
                      </div>
                      <div className="font-bold text-xl px-8 py-2 uppercase tracking-widest text-[#1c222e]" style={{ backgroundColor: '#c59968' }}>
                        {arenaData.license.tier}
                      </div>
                    </div>

                    {/* Progress bar EXP */}
                    <div className="mb-8 w-full relative z-10">
                      <div className="flex justify-between text-[10px] text-[#8c7f73] mb-1 px-1">
                        <span>{arenaData.license.tierProgress?.expToNext || 0} EXP LAGI KE {arenaData.license.tierProgress?.nextTier?.toUpperCase() || 'MAX'}</span>
                        <span>{arenaData.license.tierProgress?.pct || 100}%</span>
                      </div>
                      <div className="w-full h-2.5 border border-[#8c7f73] border-dashed bg-[#12161f] relative">
                        <div className="h-full bg-[#e3d0b3]" style={{ width: `${arenaData.license.tierProgress?.pct || 100}%` }}></div>
                        <div className="absolute inset-0 flex justify-between px-1">
                          {[...Array(40)].map((_, i) => <div key={i} className="w-px h-full bg-[#1c222e] opacity-20"></div>)}
                        </div>
                      </div>
                    </div>

                    {/* ===== GRID UTAMA (3 KOLOM) ===== */}
                    <div className="grid grid-cols-12 gap-6 relative z-10">
                      
                      {/* KOLOM 1 (KIRI) - col-span-3 */}
                      <div className="col-span-3 flex flex-col">
                        <div className="text-[#e3d0b3] font-bold text-[11px] mb-4 tracking-widest uppercase">Summon Section</div>
                        
                        <div className="relative w-full flex justify-center items-center mb-6 py-2">
                          <img src={BAKEMONO_IMG} alt="Bakemono" className="absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 object-contain z-20 opacity-90" crossOrigin="anonymous"/>
                          <div className="relative w-44 h-44 flex items-center justify-center">
                            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#e3d0b3]">
                              <defs>
                                <pattern id="meander" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                                  <path d="M0 5 h5 v-5 h5 v10 h-5 v-5 h-5 z" fill="none" stroke="currentColor" strokeWidth="1" />
                                </pattern>
                              </defs>
                              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="4 2" />
                              <circle cx="50" cy="50" r="43" fill="none" stroke="currentColor" strokeWidth="3" />
                              <circle cx="50" cy="50" r="40" fill="url(#meander)" stroke="currentColor" strokeWidth="2" />
                            </svg>
                            <img src={arenaData.license.photoUrl} alt="Foto" className="relative z-10 w-[72%] h-[72%] rounded-full object-cover bg-[#12161f]" crossOrigin="anonymous" />
                          </div>
                        </div>

                        <div className="w-full bg-[#e3d0b3] text-[#1c222e] p-4 relative mb-6" style={{ clipPath: 'polygon(20px 0, 100% 0, 100% 100%, 0 100%, 0 20px)' }}>
                          <div className="font-bold text-xl mb-1">{arenaData.license.name}</div>
                          <div className="font-bold text-sm opacity-70">{arenaData.license.id}</div>
                        </div>

                        <div className="text-[10px] text-[#e3d0b3] font-bold tracking-widest mb-2 uppercase">Enemy Section</div>
                        <div className="w-full border border-[#8c7f73] border-dashed p-3 relative mb-6">
                          <div className="flex items-center gap-3 mb-3">
                            <img src={arenaData.opponent.photoUrl} alt="Opponent" className="w-12 h-12 rounded-full border border-[#8c7f73] object-cover bg-[#12161f]" crossOrigin="anonymous" />
                            <div>
                              <div className="text-[#e3d0b3] font-bold text-sm">{arenaData.opponent.name}</div>
                              <div className="text-[#8c7f73] text-[10px]">ID: {arenaData.opponent.id}</div>
                              <div className="text-[#8c7f73] text-[10px] uppercase">TIER: {arenaData.opponent.tier}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="bg-[#12161f] border border-[#8c7f73] text-[#e3d0b3] text-[10px] font-bold px-2 py-1 flex-1 text-center">AE {arenaData.opponent.ae}</div>
                            <div className="bg-[#12161f] border border-[#8c7f73] text-[#e3d0b3] text-[10px] font-bold px-2 py-1 flex-1 text-center">VP {arenaData.opponent.vp}</div>
                          </div>
                        </div>

                        <div className="text-[10px] text-[#8c7f73] font-bold mb-2 uppercase tracking-wider">Combat Style Lawan</div>
                        <div className="flex flex-wrap gap-1 mb-6">
                          {['SPELLCRAFT', 'ARMAMENT', 'ALCHEMIA', 'RELICIUM', 'COMBINATION'].map((style) => {
                            const isActive = arenaData.opponent.combatStyle?.[style.toLowerCase()];
                            return (
                              <div key={style} className="border border-[#8c7f73] px-2 py-1 text-[8px] font-bold text-[#e3d0b3] flex items-center gap-1 rounded-sm">
                                {style} {isActive ? <span className="text-[#e3d0b3]">✓</span> : <span className="text-[#85200c]">✕</span>}
                              </div>
                            )
                          })}
                        </div>

                        <div className="text-[10px] text-[#8c7f73] font-bold mb-2">STATISTIK LAWAN - TOTAL {arenaData.opponent.totalDuel || 0} DUEL</div>
                        <div className="space-y-1.5 mb-8">
                          {['win', 'draw', 'lose'].map((label) => {
                            const val = arenaData.opponent.stats?.[label] || 0;
                            const color = label === 'win' ? '#e3d0b3' : label === 'lose' ? '#85200c' : '#8c7f73';
                            return (
                              <div key={label} className="flex items-center gap-2">
                                <span className="text-[9px] text-[#8c7f73] w-8 uppercase">{label}</span>
                                <div className="flex-1 h-1.5 bg-[#12161f] border border-[#8c7f73]">
                                  <div className="h-full" style={{ width: `${val}%`, backgroundColor: color }}></div>
                                </div>
                                <span className="text-[9px] text-[#e3d0b3] w-8 text-right">{val}%</span>
                              </div>
                            )
                          })}
                        </div>

                        <div className="mt-auto flex flex-col items-center w-full pt-6">
                          <svg className="w-[60%] h-6 mb-3 opacity-80" preserveAspectRatio="none" viewBox="0 0 100 20">
                            {[...Array(40)].map((_, i) => (
                              <rect key={i} x={i * 2.5} y="0" width={i % 3 === 0 ? "1.5" : "0.8"} height="20" fill="#e3d0b3" />
                            ))}
                          </svg>
                          <div className="flex items-center gap-2">
                            <img src={LOGO_MINISTRY} className="w-5 h-5 object-contain" alt="Seal" crossOrigin="anonymous" />
                            <div className="text-[7px] font-bold tracking-widest text-[#8c7f73] text-center leading-tight">
                              <div>JAPANESE MINISTRY OF MAGIC</div>
                              <div>COMBAT OFFICE ©2026</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* KOLOM 2 (TENGAH) - col-span-3 */}
                      <div className="col-span-3 flex flex-col pl-2">
                        <div className="flex gap-4 mb-8">
                          <div className="flex-1">
                            <div className="text-[#e3d0b3] font-bold text-[11px] mb-3 tracking-widest uppercase">Basic Energy</div>
                            <div className="flex flex-col gap-2">
                              <div className="flex border border-[#8c7f73] bg-[#12161f] h-12">
                                <div className="bg-[#e3d0b3] text-[#1c222e] w-10 flex items-center justify-center font-bold text-xs relative">
                                  <div className="absolute w-1.5 h-1.5 bg-[#85200c] rotate-45 mb-4"></div> AE
                                </div>
                                <div className="flex-1 flex items-center px-3 text-[#e3d0b3] text-lg font-bold">{arenaData.license.ae}</div>
                              </div>
                              <div className="flex border border-[#8c7f73] bg-[#12161f] h-12 justify-end">
                                <div className="flex-1 flex items-center px-3 text-[#e3d0b3] text-lg font-bold justify-end">{arenaData.license.vp}</div>
                                <div className="bg-[#e3d0b3] text-[#1c222e] w-10 flex items-center justify-center font-bold text-xs relative">
                                  <div className="absolute w-1.5 h-1.5 bg-[#85200c] rotate-45 mb-4"></div> VP
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-[#e3d0b3] font-bold text-[11px] mb-3 tracking-widest uppercase">Combat Style</div>
                            <div className="grid grid-cols-1 gap-1.5">
                              {['SPELLCRAFT', 'ARMAMENT', 'ALCHEMIA', 'RELICIUM', 'COMBINATION'].map((style) => {
                                const isActive = arenaData.license.combatStyle?.[style.toLowerCase()];
                                return (
                                  <div key={style} className="flex justify-between items-center border border-[#8c7f73] p-1.5 bg-[#1c222e]">
                                    <span className="text-[#e3d0b3] text-[9px] font-bold">{style}</span>
                                    <div className={`w-4 h-4 ${isActive ? 'bg-[#e3d0b3] text-[#1c222e]' : 'bg-[#85200c] text-[#e3d0b3]'} flex items-center justify-center text-[8px] font-bold rounded-sm`}>
                                      {isActive ? '✓' : (style === 'COMBINATION' ? '🔒' : '✕')}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="text-[#e3d0b3] font-bold text-[11px] mb-3 tracking-widest uppercase">Combat Statistics</div>
                        <div className="space-y-3 mb-6">
                          {['win', 'draw', 'lose'].map((label) => {
                            const val = arenaData.license.stats?.[label] || 0;
                            const color = label === 'win' ? '#e3d0b3' : label === 'lose' ? '#85200c' : '#8c7f73';
                            return (
                              <div key={label}>
                                <div className="flex justify-between text-[10px] text-[#8c7f73] font-bold mb-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></div>
                                    {label.toUpperCase()}
                                  </div>
                                  <span>{val}%</span>
                                </div>
                                <div className="w-full h-2 bg-[#12161f] border border-[#8c7f73] border-dashed">
                                  <div className="h-full" style={{ width: `${val}%`, backgroundColor: color }}></div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div className="text-center text-[9px] text-[#8c7f73] border-t border-[#8c7f73] border-dashed pt-2 mb-6">TOTAL: {arenaData.license.totalDuel} DUEL</div>

                        <div className="text-[#e3d0b3] font-bold text-[11px] mb-3 tracking-widest uppercase">Turn Section</div>
                        <div className="border border-[#8c7f73] bg-[#12161f] p-3 relative mt-auto">
                          <div className="absolute top-[24px] left-[15%] right-[15%] h-[1px] bg-[#8c7f73] z-0"></div>
                          <div className="flex justify-between items-start relative z-10">
                            {[1,2,3].map((num) => {
                              const isCurrent = duelData.duelNumber === num || num === 2;
                              const isDone = num < 2;
                              return (
                                <div key={num} className="flex flex-col items-center w-1/3">
                                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold mb-1 bg-[#12161f] ${isCurrent ? 'border-[#e3d0b3] text-[#e3d0b3]' : 'border-[#8c7f73] text-[#8c7f73]'}`}>
                                    {isDone ? '✓' : num}
                                  </div>
                                  <div className="text-[9px] text-[#e3d0b3] font-bold mb-0.5">DUEL {num}</div>
                                  <div className="text-[7px] text-[#8c7f73] text-center uppercase whitespace-nowrap">Lawan mulai</div>
                                  <div className={`text-[7px] mt-1 font-bold ${isCurrent ? 'text-[#e3d0b3]' : 'text-[#85200c]'}`}>
                                    {isDone ? 'SELESAI' : isCurrent ? 'BERJALAN' : 'BELUM MULAI'}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* KOLOM 3 (KANAN) - col-span-4 (Slot Deck) */}
                      <div className="col-span-4 flex flex-col pl-4 border-l border-[#8c7f73]/30">
                        <div className="w-full flex justify-center mb-5">
                          <div className="bg-[#f4e8d3] text-[#1c222e] text-center font-bold py-2 px-8 relative w-[90%]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 15px 100%, 0 calc(100% - 15px))' }}>
                            <span className="text-sm tracking-widest">
                              {arenaData.duel[arenaData.myRole.toLowerCase()].style?.toUpperCase() || 'SPELLCRAFT'}
                            </span>
                          </div>
                        </div>

                        <div className="text-[#8c7f73] text-[10px] font-bold text-center mb-3 tracking-widest">
                          {(duelData[arenaData.myRole.toLowerCase()].deck || []).length} / {TIER_DECK_LIMIT[arenaData.license.tier] || 5} MATERIAL (DECK TERKUNCI)
                        </div>

                        <div className="flex flex-col gap-1.5 w-full max-w-[320px] mx-auto">
                          {Array.from({ length: TIER_DECK_LIMIT[arenaData.license.tier] || 5 }).map((_, i) => {
                            const matName = (duelData[arenaData.myRole.toLowerCase()].deck || [])[i];
                            const mat = materialsList.find(m => m.name === matName);

                            if (mat) {
                              let tagClr = 'bg-[#85200c] text-[#e3d0b3]';
                              if (mat.format.toLowerCase().includes('def')) tagClr = 'bg-[#e3d0b3] text-[#1c222e]';
                              if (mat.format.toLowerCase().includes('regen')) tagClr = 'border border-[#8c7f73] text-[#e3d0b3] bg-transparent';

                              return (
                                <div key={i} className="flex justify-between items-center border border-[#8c7f73] bg-[#12161f] p-2 h-10">
                                  <span className="text-[#e3d0b3] text-[11px] font-bold flex-1 truncate">{mat.name}</span>
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm mr-2 ${tagClr}`}>
                                    {mat.format.substring(0,3).toUpperCase()}
                                  </span>
                                  <div className="w-5 h-5 bg-[#e3d0b3] flex items-center justify-center rounded-sm shrink-0">
                                    <svg className="w-3 h-3 text-[#1c222e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                  </div>
                                </div>
                              )
                            } else {
                              return (
                                <div key={`empty-${i}`} className="flex justify-between items-center border border-[#5a5650] bg-[#12161f] p-2 h-10 opacity-50">
                                  <span className="text-[#5a5650] text-[10px] font-bold italic">Slot Terkunci</span>
                                  <span className="text-[#5a5650] text-[10px] font-bold">🔒</span>
                                </div>
                              )
                            }
                          })}
                        </div>

                        <div className="text-center text-[9px] text-[#85200c] font-bold tracking-[0.3em] mt-6 flex items-center justify-center gap-2">
                          <span>◆</span> SIAP BERTARUNG <span>◆</span>
                        </div>
                      </div>

                    </div>

                    {/* Footer tanggal digenerate */}
                    <div className="mt-12 pt-4 border-t border-[#8c7f73] border-dashed flex justify-between text-[10px] text-[#8c7f73] tracking-widest relative z-10">
                      <span>DIPERBARUI: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} WIB (GMT+7)</span>
                    </div>

                  </div>
                </div>
              </div>

              {/* Tombol Download (Di luar area scroll agar selalu terlihat) */}
              <div className="mt-4 md:mt-6 mb-2 shrink-0">
                <button 
                  onClick={downloadMatchData} 
                  disabled={isDownloading} 
                  className="bg-[#1C2330] border-2 border-[#e3d0b3] text-[#e3d0b3] px-20 py-3 text-sm font-bold tracking-widest uppercase hover:bg-[#e3d0b3] hover:text-[#1C2330] transition-all shadow-lg flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  {isDownloading ? 'MENYIMPAN...' : 'SIMPAN PRE-COMBAT'}
                </button>
              </div>
              
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={modal.isOpen} onClose={() => setModal({ ...modal, isOpen: false })} message={modal.message} type={modal.type} />
    </div>
  )
}