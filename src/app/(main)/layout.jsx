import Navbar from '@/components/Navbar'

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen text-[#e3d0b3] relative flex flex-col font-sans">
      
      {/* ================= BACKGROUND IMAGE & OVERLAY ================= */}
      <div 
        className="fixed inset-0 z-[-1] bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ 
          backgroundImage: "url('https://raw.githubusercontent.com/avadaprada/combat-console-repository/refs/heads/main/181eb6e774cb5bac2471182f57fb03a2.jpg')" 
        }}
      >
        {/* Overlay gelap agar konten tetap terbaca jelas */}
        <div className="absolute inset-0 bg-[#1c222e]/90 backdrop-blur-[2px]"></div>
      </div>

      {/* ================= NAVBAR ================= */}
      <Navbar />
      
      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 relative z-10">
        {children}
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="w-full mt-auto border-t border-[#8c7f73]/40 bg-[#12161f]/80 backdrop-blur-md pt-10 pb-6 px-4 relative z-10">
        <div className="max-w-[1250px] mx-auto flex flex-col items-center">
          
          <div className="w-full flex flex-col md:flex-row justify-between items-center md:items-start gap-8 mb-10">
            
            {/* Brand Kiri */}
            <div className="flex flex-col">
              <span className="text-[#e3d0b3] font-bold tracking-widest text-lg">COMBAT OFFICE</span>
              <span className="text-[#8c7f73] text-xs tracking-widest mt-1">そよ風の茶会</span>
            </div>

            {/* Credit Tengah */}
            <div className="flex-1 text-center md:text-left md:border-l md:border-[#8c7f73]/50 md:pl-8 text-[#8c7f73] text-xs leading-relaxed max-w-lg">
              <p>The Combat System conceived by <strong className="text-[#e3d0b3] font-bold">Ryoumen Shō</strong> and brought to life by <strong className="text-[#e3d0b3] font-bold">Dōmoto Reiken</strong>.</p>
              <p className="mt-1">The Interface forged by <strong className="text-[#e3d0b3] font-bold">Dōmoto Reiken</strong> and developed by <strong className="text-[#e3d0b3] font-bold">Kisaragi Ritsu</strong>.</p>
              <p className="mt-3 text-[#a89a89] italic">戦闘事務所 — Strength Through Unity, Mastery Through Challenge.</p>
            </div>

            {/* Tautan Kanan */}
            <div className="flex flex-col items-center md:items-end text-xs font-bold tracking-widest text-[#e3d0b3] gap-2">
              <a href="https://twitter.com/CombatOffice" target="_blank" rel="noopener" className="hover:text-white transition-colors">@COMBATOFFICE</a>
              <a href="https://japanesemgov.wixsite.com/combatoffice" target="_blank" rel="noopener" className="hover:text-white transition-colors">COMBATOFFICE.WIX</a>
            </div>
          </div>

          {/* Copyright Bawah */}
          <div className="w-full pt-6 border-t border-[#8c7f73]/20 text-center">
            <span className="text-[#5a5650] text-[10px] tracking-[3px] uppercase font-bold">
              COMBAT OFFICE SYSTEM V2.0 · ©2026
            </span>
          </div>

        </div>
      </footer>

    </div>
  )
}