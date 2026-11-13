'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import html2canvas from 'html2canvas-pro'
import Barcode from 'react-barcode'

const TIER_COLORS = {
  shodan: { bg: '#B88B64', text: '#1C2330' },
  nidan: { bg: '#b8bcc4', text: '#1C2330' },
  sandan: { bg: '#caa457', text: '#1C2330' },
  yondan: { bg: '#9fb8c9', text: '#1C2330' },
  godan: { bg: '#e3d0b3', text: '#1C2330' },
}

const LOGO_MAHOUTOKORO = "https://i.imgur.com/e2FcAoM.png"
const LOGO_MINISTRY = "https://raw.githubusercontent.com/avadaprada/combat-console-repository/refs/heads/main/Teks%20paragraf%20Anda%20(2).png"
const BAKEMONO_IMG = "https://raw.githubusercontent.com/avadaprada/combat-console-repository/refs/heads/main/BAKEMONO%20PNG-BROWN.png"

// ================= SVG COMPONENTS =================

const DiamondColumn = () => (
  <div className="absolute top-1/2 -translate-y-1/2 left-14 flex gap-5 z-20">
    <div className="flex flex-col gap-13">
      {[...Array(8)].map((_, i) => (
        <div key={`kiri-${i}`} className="w-8 h-8 bg-[#EDE2CF] rotate-45 shadow-sm" />
      ))}
    </div>
    <div className="flex flex-col gap-13 mt-13">
      {[...Array(7)].map((_, i) => (
        <div key={`kanan-${i}`} className="w-8 h-8 bg-[#EDE2CF] rotate-45 shadow-sm" />
      ))}
    </div>
  </div>
)

const RoundedDashedBracket = ({ pos = 'tl', className = '' }) => (
  <svg className={`absolute w-7 h-7 pointer-events-none ${pos === 'tl' ? '-top-3 -left-3' : '-bottom-3 -right-3'} ${pos === 'br' ? 'rotate-180' : ''} ${className}`} viewBox="0 0 32 32" fill="none">
    <path d="M 32 2 H 12 A 10 10 0 0 0 2 12 V 32" stroke="#EDE2CF" strokeWidth="1.5" strokeDasharray="4 3" />
  </svg>
)

const SolidCornerAccent = ({ pos = 'tl' }) => (
  <svg className={`absolute w-4 h-4 pointer-events-none ${pos === 'tl' ? '-top-[1px] -left-[1px]' : '-bottom-[1px] -right-[1px]'} ${pos === 'br' ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="none">
    <path d="M 16 2 H 2 V 16" stroke="#EDE2CF" strokeWidth="2" />
  </svg>
)

const IdentityNotch = () => (
  <svg className="absolute top-0 left-0 w-4 h-4 pointer-events-none" viewBox="0 0 16 16" fill="none">
    <path d="M 0 0 L 16 0 L 0 16 Z" fill="#998776" />
  </svg>
)

// ================= MAIN COMPONENT =================
export default function DashboardPage() {
  const [profile, setProfile] = useState(null)
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  
  // State Filter Material Library
  const [activeStyleFilter, setActiveStyleFilter] = useState('spellcraft')
  const [tierFilter, setTierFilter] = useState('')
  
  // State Carousel
  const [activeCardIndex, setActiveCardIndex] = useState(0)
  
  const supabase = createClient()
  const cardRef = useRef(null)
  const materialLibRef = useRef(null)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const combatId = user.email.split('@')[0].trim().toUpperCase()

      try {
        const res = await fetch(`/api/profile?id=${combatId}`)
        const result = await res.json()
        
        if (result.success) {
          setProfile(result.data)
          
          const matRes = await fetch('/api/materials')
          const matData = await matRes.json()
          if (matData.success) {
            setMaterials(matData.data)
            
            // Set default style ke style pertama yang terbuka
            if (result.data.combatStyle?.spellcraft === true) setActiveStyleFilter('spellcraft')
            else if (result.data.combatStyle?.armament === true) setActiveStyleFilter('armament')
            else if (result.data.combatStyle?.alchemia === true) setActiveStyleFilter('alchemia')
            else if (result.data.combatStyle?.relicium === true) setActiveStyleFilter('relicium')
          }
        } else {
          setErrorMsg(result.message || 'Gagal memuat data dari Google Sheets.')
        }
      } catch (err) {
        setErrorMsg('Terjadi kesalahan koneksi.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const downloadImage = async () => {
    if (!cardRef.current) return
    setIsDownloading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#1C2330',
        useCORS: true,
        logging: false
      })
      const link = document.createElement('a')
      link.download = `lisensi-${profile.id}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      alert('Gagal mengunduh gambar: ' + err.message)
    } finally {
      setIsDownloading(false)
    }
  }

  // Fungsi saat Combat Style di Lisensi di-klik
  const handleStyleClick = (styleKey, isUnlocked) => {
    if (!isUnlocked) return;
    setActiveStyleFilter(styleKey);
    setTierFilter('');
    setActiveCardIndex(0);
    // Scroll halus ke bagian Material Library
    if (materialLibRef.current) {
      materialLibRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return <div className="text-[#EDE2CF] flex items-center justify-center font-bold tracking-widest py-20 min-h-screen">MENYELARASKAN DATA...</div>
  }

  const renderStyleBadge = (styleKey, state) => {
    const isUnlocked = state === true
    const isClosed = state === 'closed'
    const bgColor = isUnlocked ? '#EDE2CF' : '#A52D17'
    const textColor = isUnlocked ? '#1C2330' : '#EDE2CF'
    const icon = isUnlocked ? '✓' : (isClosed ? '✕' : '🔒')
    
    return (
      <div 
        onClick={() => handleStyleClick(styleKey, isUnlocked)}
        className={`relative flex justify-between items-center border border-[#998776] p-2 bg-[#1C2330] ${isUnlocked ? 'cursor-pointer hover:border-[#EDE2CF] hover:bg-[#1C2330]/80 transition-all group' : 'opacity-80'}`}
      >
        <div className="absolute inset-[2px] border border-[#998776] border-dashed opacity-30 pointer-events-none"></div>
        <span className={`text-[#EDE2CF] text-[10px] font-bold tracking-wider font-sans uppercase pl-1 z-10 ${isUnlocked ? 'group-hover:text-white transition-colors' : ''}`}>
          {styleKey.toUpperCase()}
        </span>
        <div className="w-5 h-5 flex items-center justify-center text-[10px] font-bold font-sans z-10" style={{ backgroundColor: bgColor, color: textColor }}>
          {icon}
        </div>
      </div>
    )
  }

  const tierBg = TIER_COLORS[profile?.tier?.toLowerCase()]?.bg || '#B88B64'
  const tierText = TIER_COLORS[profile?.tier?.toLowerCase()]?.text || '#1C2330'
  const roundedPct = Math.round(profile?.tierProgress?.pct || 100)

  // ================= LOGIKA FILTER MATERIAL =================
  const filteredMaterials = materials.filter(m => {
    let matchStyle = false;
    const typeKey = (m.type || '').toLowerCase();
    
    if (activeStyleFilter === 'combination') {
      // Jika combination, tampilkan semua material yang house/tier-nya terbuka
      const unlocked = Object.keys(profile.combatStyle || {}).filter(k => profile.combatStyle[k] === true && k !== 'combination');
      matchStyle = unlocked.includes(typeKey);
    } else {
      matchStyle = typeKey === activeStyleFilter;
    }

    const matchTier = tierFilter ? m.tier === tierFilter : true;
    return matchStyle && matchTier;
  });

  return (
    <div className="max-w-full mx-auto p-4 md:py-8 flex flex-col items-center">
      
      {errorMsg && (
        <div className="w-full max-w-[1500px] bg-[#A52D17]/50 border border-[#A52D17] text-[#EDE2CF] p-4 mb-6 font-sans">
          {errorMsg}
        </div>
      )}

      {profile && (
        <>
          <div className="w-full flex flex-col items-center">
            
            <div className="w-full overflow-x-auto pb-4 flex justify-start md:justify-center custom-scrollbar">
              
              <div className="relative w-[1500px]">
                
                {/* AREA LISENSI */}
                <div ref={cardRef} className="relative w-full bg-[#1C2330] p-20 pl-32 flex justify-center overflow-hidden">
                  
                  <DiamondColumn />

                  {/* Bingkai Utama */}
                  <div className="relative w-full bg-[#1C2330] border-[4px] border-[#EDE2CF] p-10 z-10 flex flex-col font-sans">
                    
                    {/* Ornamen Sudut */}
                    <div className="absolute top-0 left-0 w-12 h-[4px] bg-[#EDE2CF] pointer-events-none"></div>
                    <div className="absolute top-0 left-0 w-[4px] h-12 bg-[#EDE2CF] pointer-events-none"></div>
                    <div className="absolute top-[16px] left-[16px] w-4 h-[1px] bg-[#EDE2CF] pointer-events-none"></div>
                    <div className="absolute top-[16px] left-[16px] w-[1px] h-4 bg-[#EDE2CF] pointer-events-none"></div>

                    <div className="absolute top-0 right-0 w-18 h-[15px] bg-[#EDE2CF] pointer-events-none"></div>
                    <div className="absolute top-[25px] right-0 w-8 h-[1px] bg-[#EDE2CF] pointer-events-none"></div>

                    <div className="absolute bottom-0 left-0 w-[16px] h-18 bg-[#EDE2CF] pointer-events-none"></div>
                    <div className="absolute bottom-[25px] left-0 w-15 h-[1px] bg-[#EDE2CF] pointer-events-none"></div>

                    <div className="absolute bottom-0 right-0 w-18 h-[17px] bg-[#EDE2CF] pointer-events-none"></div>
                    <div className="absolute bottom-0 right-0 w-[15px] h-18 bg-[#EDE2CF] pointer-events-none"></div>

                    {/* Ornamen Diagonal */}
                    <div className="absolute top-8 right-40 flex gap-1.5 z-20">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="w-2.5 h-8 bg-[#998776] transform -skew-x-[30deg]"></div>
                      ))}
                    </div>

                    {/* Header & Logo */}
                    <div className="flex items-center gap-4 mb-6 relative z-10 pl-6">
                      <img src={LOGO_MAHOUTOKORO} alt="Mahoutokoro" className="h-16 object-contain" crossOrigin="anonymous" />
                      <div className="flex flex-col">
                        <span className="text-[#998776] font-bold text-[11px] tracking-[3px] uppercase">MAHOUTOKORO</span>
                        <span className="text-[#EDE2CF] font-bold text-5xl tracking-widest leading-none font-serif mt-1">COMBAT</span>
                      </div>
                    </div>

                    {/* Topline (Personal Data, EXP, Tier) */}
                    <div className="flex flex-wrap items-center gap-4 mb-2 relative z-10 px-6">
                      <div className="bg-[#EDE2CF] text-[#1C2330] font-bold text-sm px-5 py-2 uppercase tracking-wide">
                        Personal Data Section
                      </div>
                      <div className="flex-1 border-b-2 border-[#EDE2CF] h-0"></div>
                      <div className="text-right">
                        <div className="text-[#EDE2CF] text-[10px] font-bold tracking-widest">POINT</div>
                        <div className="text-[#EDE2CF] text-[10px] font-bold tracking-widest">SECTION</div>
                      </div>
                      <div className="relative bg-[#1C2330] border border-[#998776] text-[#EDE2CF] font-bold px-5 py-2 text-sm">
                        {profile.exp} EXP
                      </div>
                      <div className="relative font-bold text-2xl px-10 py-2 uppercase tracking-widest border-2 border-[#B88B64]" style={{ backgroundColor: tierBg, color: tierText }}>
                        {profile.tier}
                      </div>
                    </div>

                    {/* EXP Progress Bar */}
                    <div className="mb-8 w-full relative z-10 px-6 mt-4">
                      <div className="flex justify-between text-[10px] text-[#998776] mb-1 px-1 font-bold tracking-widest">
                        <span>{profile.tierProgress?.expToNext || 0} EXP LAGI KE {profile.tierProgress?.nextTier?.toUpperCase() || 'MAX'}</span>
                        <span>{roundedPct}%</span>
                      </div>
                      <div className="relative">
                        <RoundedDashedBracket pos="tl" className="-top-8 -left-3" />
                        <RoundedDashedBracket pos="br" className="-bottom-4 -right-3" />
                        <div className="w-full h-3 border-2 border-[#998776] bg-[#1C2330] relative">
                          <div className="h-full bg-[#EDE2CF]" style={{ width: `${roundedPct}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* MAIN CONTENT 3 COLUMNS */}
                    <div className="flex flex-row gap-10 relative z-10 px-6 items-stretch">
                      
                      {/* KOLOM KIRI */}
                      <div className="w-[35%] flex flex-col items-center">
                        <div className="w-full text-left text-[#EDE2CF] font-bold text-xl mb-3 tracking-widest uppercase">Summon Section</div>
                        
                        <div className="relative w-full flex justify-center items-center mb-4 py-2">
                          <img src={BAKEMONO_IMG} alt="Bakemono" className="absolute -left-4 w-18 h-18 object-contain z-20 opacity-90" crossOrigin="anonymous"/>
                          <div className="relative w-62 h-62 flex items-center justify-center translate-x-8">
                            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#EDE2CF]">
                                <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray="2 2" />
                            </svg>
                            {profile.photoUrl ? (
                              <img src={profile.photoUrl} alt="Foto" className="relative z-10 w-[80%] h-[80%] rounded-full object-cover bg-[#1C2330]" crossOrigin="anonymous" />
                            ) : (
                              <div className="relative z-10 w-[80%] h-[80%] rounded-full bg-[#1C2330] flex items-center justify-center text-[#998776]">?</div>
                            )}
                          </div>
                        </div>

                        <div className="relative w-full mb-4 mt-2">
                          <RoundedDashedBracket pos="tl" className="-top-4 -left-4" />
                          <RoundedDashedBracket pos="br" className="-bottom-4 -right-4" />
                          <div className="w-full bg-[#EDE2CF] text-[#1C2330] py-3 px-5 shadow-sm relative" style={{ clipPath: 'polygon(16px 0, 100% 0, 100% 100%, 0 100%, 0 16px)' }}>
                            <IdentityNotch />
                            <div className="font-bold text-2xl mb-1 leading-none">{profile.name}</div>
                            <div className="font-bold text-base opacity-70 tracking-widest">{profile.id}</div>
                          </div>
                        </div>

                        <div className="w-full flex gap-4 mt-2">
                          <div className="flex-1 border-2 border-[#998776] py-2 px-3 text-center relative bg-[#1C2330]">
                            <SolidCornerAccent pos="tl" />
                            <SolidCornerAccent pos="br" />
                            <div className="text-[9px] text-[#998776] tracking-widest mb-1 uppercase">Combat Point</div>
                            <div className="text-[#EDE2CF] font-bold text-xl">{profile.cp}</div>
                          </div>
                          <div className="flex-1 border-2 border-[#998776] py-2 px-3 text-center relative bg-[#1C2330]">
                            <SolidCornerAccent pos="tl" />
                            <SolidCornerAccent pos="br" />
                            <div className="text-[9px] text-[#998776] tracking-widest mb-1 uppercase">Gatcha Token</div>
                            <div className="text-[#EDE2CF] font-bold text-xl">{profile.gatchaToken}</div>
                          </div>
                        </div>
                      </div>

                      {/* KOLOM TENGAH */}
                      <div className="w-[30%] flex flex-col">
                        <div className="text-[#EDE2CF] font-bold text-xl mb-5 tracking-widest uppercase">Basic Energy</div>
                        
                        <div className="flex flex-col gap-6 mb-6 mt-1">
                          <div className="relative">
                            <RoundedDashedBracket pos="tl" className="-top-4 -left-4" />
                            <RoundedDashedBracket pos="br" className="-bottom-4 -right-4" />
                            <div className="flex border-2 border-[#998776] bg-[#1C2330] h-16 relative">
                              <div className="bg-[#EDE2CF] text-[#1C2330] w-16 flex flex-col items-center justify-center font-bold relative py-1">
                                <span className="text-[#A52D17] text-[10px] mb-0.5">◆</span>
                                <span className="text-xl leading-none tracking-widest">AE</span>
                              </div>
                              <div className="flex-1 flex items-center px-6 text-[#EDE2CF] text-4xl font-bold">{profile.ae}</div>
                            </div>
                          </div>
                          
                          <div className="relative">
                            <RoundedDashedBracket pos="tl" className="-top-4 -left-4" />
                            <RoundedDashedBracket pos="br" className="-bottom-4 -right-4" />
                            <div className="flex border-2 border-[#998776] bg-[#1C2330] h-16 justify-end relative">
                              <div className="flex-1 flex items-center px-6 text-[#EDE2CF] text-4xl font-bold justify-end">{profile.vp}</div>
                              <div className="bg-[#EDE2CF] text-[#1C2330] w-16 flex flex-col items-center justify-center font-bold relative py-1">
                                <span className="text-[#A52D17] text-[10px] mb-0.5">◆</span>
                                <span className="text-xl leading-none tracking-widest">VP</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto">
                          <div className="text-[#EDE2CF] font-bold text-xl mb-5 tracking-widest uppercase">Combat Statistics</div>
                          <div className="relative mb-2 mt-2">
                            <RoundedDashedBracket pos="tl" className="-top-3 -left-3" />
                            <div className="space-y-4 mb-3">
                              {['win', 'draw', 'lose'].map((label) => {
                                const val = profile.stats?.[label] || 0;
                                const color = label === 'win' ? '#EDE2CF' : label === 'lose' ? '#A52D17' : '#998776';
                                return (
                                  <div key={label}>
                                    <div className="flex justify-between text-xs text-[#998776] font-bold mb-1.5 uppercase tracking-wider">
                                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>{label}</div>
                                      <span>{val}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-[#1C2330] border-2 border-[#998776]">
                                      <div className="h-full" style={{ width: `${val}%`, backgroundColor: color }}></div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            
                            <div className="relative pt-3">
                              <div className="border-t-2 border-[#998776] border-dashed mb-2"></div>
                              <div className="text-center text-xs text-[#998776] tracking-widest uppercase">Total: {profile.totalDuel} Duel</div>
                              <RoundedDashedBracket pos="br" className="-bottom-3 -right-3" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* KOLOM KANAN */}
                      <div className="w-[35%] flex flex-col">
                        <div className="text-[#EDE2CF] font-bold text-xl mb-1 tracking-widest uppercase">Combat Style</div>
                        <div className="text-[15px] text-[#998776] mb-3">Klik gaya combat untuk melihat material</div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {renderStyleBadge('spellcraft', profile.combatStyle?.spellcraft)}
                          {renderStyleBadge('armament', profile.combatStyle?.armament)}
                          {renderStyleBadge('alchemia', profile.combatStyle?.alchemia)}
                          {renderStyleBadge('relicium', profile.combatStyle?.relicium)}
                          <div className="col-span-2">
                            {renderStyleBadge('combination', profile.combatStyle?.combination)}
                          </div>
                        </div>

                        <div className="mt-10 flex flex-col items-center">
                          <div className="bg-transparent w-full flex justify-center mb-5">
                            <Barcode 
                              value={profile.id} 
                              width={3}
                              height={50}
                              displayValue={false}
                              background="transparent"
                              lineColor="#EDE2CF"
                              margin={0}
                            />
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <img src={LOGO_MINISTRY} className="w-10 h-10 object-contain" alt="Seal" crossOrigin="anonymous" />
                            <div className="text-[12px] font-bold tracking-widest text-[#998776] text-left uppercase">
                              <div>Japanese Ministry of Magic</div>
                              <div>Combat Office ©2026</div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Footer */}
                    <div className="mt-8 pt-4 border-t-2 border-[#998776] border-dashed flex justify-between text-[15px] text-[#998776] tracking-widest relative z-10 px-6 uppercase">
                      <span>Diperbarui: 12 Nov 2026 21.17 WIB (GMT+7)</span>
                    </div>
                  </div>
                </div>

                {/* TOMBOL DOWNLOAD */}
                <div className="absolute bottom-10 right-20 z-30">
                  <button 
                    onClick={downloadImage} 
                    disabled={isDownloading} 
                    className="bg-[#1C2330] border-2 border-[#EDE2CF] text-[#EDE2CF] px-4 py-2.5 text-xs font-bold tracking-wider hover:bg-[#EDE2CF] hover:text-[#1C2330] transition-all shadow-lg flex items-center gap-2 font-sans"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    {isDownloading ? 'MENYIMPAN...' : 'SIMPAN SEBAGAI GAMBAR'}
                  </button>
                </div>

              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== MATERIAL LIBRARY DENGAN FILTER ===== */}
      <div ref={materialLibRef} className="w-full max-w-[1500px] mt-16 mb-20 px-4 flex flex-col items-center scroll-mt-24">
        
        {/* Header & Filter Bar */}
        <div className="w-full mb-8">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-[#EDE2CF] text-sm font-bold tracking-[3px] uppercase whitespace-nowrap font-sans">Material Library</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-[#998776] to-transparent"></div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* TABS: Combat Style Filter */}
            <div className="flex flex-wrap gap-2">
              {['spellcraft', 'armament', 'alchemia', 'relicium', 'combination'].map((style) => {
                const isUnlocked = profile?.combatStyle?.[style] === true;
                const isActive = activeStyleFilter === style;
                
                return (
                  <button
                    key={style}
                    disabled={!isUnlocked}
                    onClick={() => { setActiveStyleFilter(style); setActiveCardIndex(0); }}
                    className={`px-5 py-2.5 text-[11px] font-bold tracking-widest uppercase border-2 transition-all flex items-center gap-2
                      ${isActive ? 'bg-[#EDE2CF] text-[#1C2330] border-[#EDE2CF]' 
                      : isUnlocked ? 'bg-[#1C2330] text-[#EDE2CF] border-[#998776] hover:border-[#EDE2CF]' 
                      : 'bg-[#1C2330]/50 text-[#998776] border-[#998776]/50 cursor-not-allowed'}`}
                  >
                    {style}
                    {!isUnlocked && <span className="text-[10px]">🔒</span>}
                  </button>
                )
              })}
            </div>

            {/* Dropdown: Tier Filter */}
            <div className="w-full md:w-auto">
              <select 
                value={tierFilter}
                onChange={(e) => { setTierFilter(e.target.value); setActiveCardIndex(0); }}
                className="w-full md:w-[200px] bg-[#1C2330] border-2 border-[#998776] text-[#EDE2CF] text-xs font-bold tracking-wider p-2.5 outline-none focus:border-[#EDE2CF] transition-colors appearance-none"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23EDE2CF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px top 50%', backgroundSize: '10px auto' }}
              >
                <option value="">All Tier</option>
                <option value="Shodan">Shodan</option>
                <option value="Nidan">Nidan</option>
                <option value="Sandan">Sandan</option>
                <option value="Yondan">Yondan</option>
                <option value="Godan">Godan</option>
              </select>
            </div>
          </div>
          
          {/* Text Count */}
          <div className="text-[#998776] text-[11px] font-bold tracking-widest uppercase mt-6">
            {filteredMaterials.length} MATERIAL DITEMUKAN — {activeStyleFilter}
          </div>
        </div>

        {/* 3D Carousel Container */}
        <div className="relative w-full h-[500px] flex justify-center items-center perspective-[1200px] overflow-hidden">
          
          <button 
            onClick={() => { if (activeCardIndex > 0) setActiveCardIndex(activeCardIndex - 1); }}
            disabled={activeCardIndex === 0}
            className="absolute left-4 md:left-20 z-50 bg-[#1C2330] border-2 border-[#998776] text-[#EDE2CF] w-12 h-12 flex items-center justify-center rounded-full hover:bg-[#EDE2CF] hover:text-[#1C2330] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>

          {filteredMaterials.map((mat, index) => {
            const offset = index - activeCardIndex;
            if (Math.abs(offset) > 2) return null;

            const formatStr = (mat.format || '').toLowerCase();
            let formatLabel = 'REG';
            let tagBg = 'transparent';
            let tagColor = '#EDE2CF';
            let tagBorder = '1px solid #998776';

            if (formatStr.includes('off')) {
              formatLabel = 'OFF'; tagBg = '#A52D17'; tagColor = '#EDE2CF'; tagBorder = 'none';
            } else if (formatStr.includes('def')) {
              formatLabel = 'DEF'; tagBg = '#EDE2CF'; tagColor = '#1C2330'; tagBorder = 'none';
            }

            let translateX = '0%';
            let rotateZ = '0deg';
            let scale = '1';
            let zIndex = '30';
            let brightness = 'brightness-100';

            if (offset === -1) { translateX = '-70%'; rotateZ = '-12deg'; scale = '0.85'; zIndex = '20'; brightness = 'brightness-50'; }
            else if (offset === -2) { translateX = '-120%'; rotateZ = '-24deg'; scale = '0.7'; zIndex = '10'; brightness = 'brightness-[0.3]'; }
            else if (offset === 1) { translateX = '70%'; rotateZ = '12deg'; scale = '0.85'; zIndex = '20'; brightness = 'brightness-50'; }
            else if (offset === 2) { translateX = '120%'; rotateZ = '24deg'; scale = '0.7'; zIndex = '10'; brightness = 'brightness-[0.3]'; }

            return (
              <div 
                key={index} 
                onClick={() => setActiveCardIndex(index)}
                style={{ 
                  transform: `translateX(${translateX}) rotateZ(${rotateZ}) scale(${scale})`,
                  zIndex,
                  transition: 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
                }}
                className={`absolute w-[300px] aspect-[3/4] border-[3px] ${offset === 0 ? 'border-[#EDE2CF]' : 'border-[#998776]'} bg-[#1C2330] flex flex-col cursor-pointer group shadow-2xl ${brightness}`}
              >
                <div className="relative w-full h-full overflow-hidden bg-[#1C2330]">
                  {mat.photoUrl ? (
                    <img src={mat.photoUrl} alt={mat.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#998776]">No Image</div>
                  )}
                  
                  <div className="absolute top-3 left-3 px-2 py-1 text-[10px] font-bold uppercase tracking-wider z-10 font-sans shadow-md"
                       style={{ backgroundColor: tagBg, color: tagColor, border: tagBorder }}>
                    {formatLabel}
                  </div>

                  <div className={`absolute inset-0 bg-gradient-to-t from-[#0f141c] via-[#0f141c]/80 to-transparent flex flex-col justify-end p-5 transition-opacity duration-500 ${offset === 0 ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-[#EDE2CF] font-bold text-xl leading-tight drop-shadow-md">{mat.name}</h3>
                      <span className="text-[#998776] text-xs whitespace-nowrap ml-2 border border-[#998776] px-1.5 py-0.5 rounded-sm bg-black/50">{mat.tier}</span>
                    </div>
                    <div className="text-[#998776] text-[10px] uppercase tracking-wider mb-2">
                      {mat.type} {mat.element ? `• ${mat.element}` : ''}
                    </div>
                    <div className="text-[#EDE2CF] text-xs mb-4 line-clamp-3 opacity-80">
                      {mat.description}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[#EDE2CF] text-xs font-bold bg-black/60 border border-[#998776] px-2 py-1 flex-1 text-center">AE: {mat.aeCost}</span>
                      <span className="text-[#EDE2CF] text-xs font-bold bg-black/60 border border-[#998776] px-2 py-1 flex-1 text-center">VP: {mat.vpCost}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {filteredMaterials.length === 0 && (
            <div className="text-center text-[#998776] font-sans absolute">Tidak ada material untuk filter ini.</div>
          )}

          <button 
            onClick={() => { if (activeCardIndex < filteredMaterials.length - 1) setActiveCardIndex(activeCardIndex + 1); }}
            disabled={activeCardIndex === filteredMaterials.length - 1 || filteredMaterials.length === 0}
            className="absolute right-4 md:right-20 z-50 bg-[#1C2330] border-2 border-[#998776] text-[#EDE2CF] w-12 h-12 flex items-center justify-center rounded-full hover:bg-[#EDE2CF] hover:text-[#1C2330] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>

        {/* Indikator Jumlah Kartu */}
        {filteredMaterials.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-[600px]">
            {filteredMaterials.map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all cursor-pointer ${i === activeCardIndex ? 'bg-[#EDE2CF] w-6' : 'bg-[#998776] w-2 opacity-50 hover:opacity-100'}`} onClick={() => setActiveCardIndex(i)} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}