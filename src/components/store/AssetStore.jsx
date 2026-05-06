import React from 'react';
import DashboardLayout from '../layout/DashboardLayout';

export default function AssetStore() {
  return (
    <DashboardLayout currentTab="assetStore">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-h1 text-2xl text-on-surface mb-2 font-semibold">AI Asset Store</h1>
          <p className="font-body-md text-on-surface-variant">Discover premium effects, transitions, and audio tailored for your workflow.</p>
        </div>
        <div className="flex bg-surface-container-low p-1 rounded-lg border border-outline-variant w-fit">
          <button className="px-4 py-1.5 rounded-md bg-surface text-primary font-label-sm shadow-sm border border-outline-variant">Featured</button>
          <button className="px-4 py-1.5 rounded-md text-on-surface-variant font-label-sm hover:text-on-surface transition-colors">Trending</button>
          <button className="px-4 py-1.5 rounded-md text-on-surface-variant font-label-sm hover:text-on-surface transition-colors">New</button>
        </div>
      </header>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 hide-scrollbar">
        <button className="px-4 py-2 rounded-full bg-primary text-on-primary font-label-sm whitespace-nowrap flex items-center gap-1 shadow-sm">
          All Assets
        </button>
        <button className="px-4 py-2 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:text-on-surface font-label-sm whitespace-nowrap flex items-center gap-1 transition-colors">
          <span className="material-symbols-outlined text-[16px]">movie_edit</span> Transitions
        </button>
        <button className="px-4 py-2 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:text-on-surface font-label-sm whitespace-nowrap flex items-center gap-1 transition-colors">
          <span className="material-symbols-outlined text-[16px]">auto_fix_high</span> Effects
        </button>
        <button className="px-4 py-2 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:text-on-surface font-label-sm whitespace-nowrap flex items-center gap-1 transition-colors">
          <span className="material-symbols-outlined text-[16px]">music_note</span> Audio
        </button>
        <button className="px-4 py-2 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:text-on-surface font-label-sm whitespace-nowrap flex items-center gap-1 transition-colors">
          <span className="material-symbols-outlined text-[16px]">text_fields</span> Typography
        </button>
        <button className="px-4 py-2 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:text-on-surface font-label-sm whitespace-nowrap flex items-center gap-1 transition-colors">
          <span className="material-symbols-outlined text-[16px]">auto_awesome</span> AI Presets
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-12">
        
        {/* Card 1 */}
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden flex flex-col hover:shadow-default transition-all duration-200 group">
          <div className="relative h-40 bg-surface-container-low overflow-hidden">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHr9E3hRXXQvXwF27vR7D9H0l_9e5n426I_3y3xI_hT7q3XJ2bB5g_YFw-4B7P6t0X-zBtz0oB_TfT59B9pL2g68Pcw2_gLw1_Nq_y0J8hWp7zM_1x5N2kH8Yh93Uf9pT0Gv7I_b6W5Z2e_N0X5v9g4X0j3K5h7P2y8Q4T9j6Z5k3C9e_j9V7m1U_v5A" alt="Holographic Distortion" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute top-2 left-2 flex gap-1">
              <span className="bg-surface/80 backdrop-blur-sm border border-outline-variant/50 text-on-surface font-mono-label text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px] text-primary">auto_fix_high</span> Effect
              </span>
            </div>
          </div>
          <div className="p-3 flex flex-col flex-1">
            <h4 className="font-h2 text-[16px] font-semibold text-on-surface mb-1 truncate">Holographic Liquid</h4>
            <p className="font-body-md text-[13px] text-on-surface-variant mb-4 line-clamp-2">Adds a refractive, high-end liquid glass displacement map to any footage.</p>
            <div className="mt-auto flex gap-2">
              <button className="flex-1 py-1.5 rounded-lg border border-outline-variant text-on-surface font-label-sm hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[16px]">play_arrow</span> Preview
              </button>
              <button className="flex-1 py-1.5 rounded-lg bg-secondary-container text-on-secondary-container font-label-sm hover:bg-secondary transition-colors flex items-center justify-center gap-1">
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden flex flex-col hover:shadow-default transition-all duration-200 group">
          <div className="relative h-40 bg-surface-container-low overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#d8e2ff] to-[#f4f3f8] flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-primary/40">360</span>
            </div>
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjN1lcwBEHh98uKG3J3yDvWcimyZJAKhBGEt1__LCakBwfTdNU00RP2U5lVh-5TLj-uwgEeJ3dLGvtEmqISwv8_3J6Gogyzh_nWdJwg1fqeTE9pAAHDguFR77euGcpc1DWlxwQ6yIeaAHy_TUklqh4W-vqszMz-ZP6GXW86I-P0_I1-bPhroU0B_6cc_cArwncLkqEKpDRmN63n0QRO9_jLiSKpoySdFjxdTYT4Z5K5CyTJZBUDEMcghme9DGmCi15GYLYi8ivJNE" alt="Seamless Zoom" className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-500 mix-blend-overlay" />
            <div className="absolute top-2 left-2 flex gap-1">
              <span className="bg-surface/80 backdrop-blur-sm border border-outline-variant/50 text-on-surface font-mono-label text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px] text-primary">movie_edit</span> Transition
              </span>
            </div>
          </div>
          <div className="p-3 flex flex-col flex-1">
            <h4 className="font-h2 text-[16px] font-semibold text-on-surface mb-1 truncate">Seamless Optics Zoom</h4>
            <p className="font-body-md text-[13px] text-on-surface-variant mb-4 line-clamp-2">Camera-matched zoom transitions with authentic chromatic aberration.</p>
            <div className="mt-auto flex gap-2">
              <button className="flex-1 py-1.5 rounded-lg border border-outline-variant text-on-surface font-label-sm hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[16px]">play_arrow</span> Preview
              </button>
              <button className="flex-1 py-1.5 rounded-lg border border-primary text-primary font-label-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-1">
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden flex flex-col hover:shadow-default transition-all duration-200 group">
          <div className="relative h-40 bg-surface-container-low overflow-hidden">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCH6Up5hyaMn-n9Tut1_RrlX-LnFfxvlW9cCpgDRn4YRs_hU3WP091YHf95WLXMVYUZ5_lNvZ2VacUmQw54eOoVLbIvj1ApeqBPJk0jI30zVJzhEY6uZC29Y2TYE_MlCJn4z-myWrX2w_QTAI3egNhxgf1_UZyPB1UgjNfKtIh0nUk7uHzeO4AdYvWE-qc4JC0T-ik7OWdDfthQeNaDZkBcR_wh7j49jrA1exW4S0RIwo8khkDMDggJBjyGU1SslNAfJ-FF6JcWkhk" alt="Sky Replacer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute top-2 left-2 flex gap-1">
              <span className="bg-surface/80 backdrop-blur-sm border border-outline-variant/50 text-on-surface font-mono-label text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px] text-primary">auto_awesome</span> AI Tool
              </span>
            </div>
          </div>
          <div className="p-3 flex flex-col flex-1">
            <h4 className="font-h2 text-[16px] font-semibold text-on-surface mb-1 truncate">Dreamscape Sky Replacer</h4>
            <p className="font-body-md text-[13px] text-on-surface-variant mb-4 line-clamp-2">One-click AI sky extraction and replacement with relighting.</p>
            <div className="mt-auto flex gap-2">
              <button className="flex-1 py-1.5 rounded-lg border border-outline-variant text-on-surface font-label-sm hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[16px]">play_arrow</span> Preview
              </button>
              <button className="flex-1 py-1.5 rounded-lg border border-primary text-primary font-label-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-1 bg-gradient-to-r from-primary/10 to-secondary-container/10">
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden flex flex-col hover:shadow-default transition-all duration-200 group">
          <div className="relative h-40 bg-surface-container-lowest overflow-hidden flex items-center justify-center border-b border-surface-variant">
            <div className="flex items-end gap-1 h-12">
              <div className="w-2 bg-primary rounded-t-sm h-4"></div>
              <div className="w-2 bg-primary rounded-t-sm h-8"></div>
              <div className="w-2 bg-primary rounded-t-sm h-12"></div>
              <div className="w-2 bg-primary rounded-t-sm h-6"></div>
              <div className="w-2 bg-primary rounded-t-sm h-10"></div>
              <div className="w-2 bg-primary rounded-t-sm h-3"></div>
              <div className="w-2 bg-primary rounded-t-sm h-7"></div>
            </div>
            <div className="absolute top-2 left-2 flex gap-1">
              <span className="bg-surface/80 backdrop-blur-sm border border-outline-variant/50 text-on-surface font-mono-label text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px] text-primary">music_note</span> Audio
              </span>
            </div>
            <span className="absolute bottom-2 right-2 font-mono-label text-[10px] text-on-surface-variant bg-surface px-1.5 py-0.5 rounded border border-outline-variant">2:14</span>
          </div>
          <div className="p-3 flex flex-col flex-1">
            <h4 className="font-h2 text-[16px] font-semibold text-on-surface mb-1 truncate">Corporate Tech Pulse</h4>
            <p className="font-body-md text-[13px] text-on-surface-variant mb-4 line-clamp-2">Clean, minimal electronic background track ideal for product reveals.</p>
            <div className="mt-auto flex gap-2">
              <button className="flex-1 py-1.5 rounded-lg border border-outline-variant text-on-surface font-label-sm hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[16px]">play_arrow</span> Preview
              </button>
              <button className="flex-1 py-1.5 rounded-lg border border-primary text-primary font-label-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-1">
                Add
              </button>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
