import React from "react";
import { Shield, User, Award, MapPin, Clock, Search, Bell, Menu } from "lucide-react";

interface Advert {
  id: string;
  type: string;
  sport: string;
  title: string;
  club: string;
  location: string;
  state: string;
  daysRemaining: number;
  icon: React.ElementType;
}

const mockAdverts: Advert[] = [
  {
    id: "1",
    type: "Players Wanted",
    sport: "Football",
    title: "U16 Girls Goalkeeper Wanted",
    club: "Northside FC",
    location: "Sydney",
    state: "NSW",
    daysRemaining: 12,
    icon: Shield,
  },
  {
    id: "2",
    type: "Player Looking",
    sport: "Basketball",
    title: "Experienced Point Guard looking for D1 Team",
    club: "Independent",
    location: "Melbourne",
    state: "VIC",
    daysRemaining: 5,
    icon: User,
  },
  {
    id: "3",
    type: "Club Trials",
    sport: "AFL",
    title: "Senior Men's Pre-season Trials",
    club: "Western Bulldogs Amateur",
    location: "Brisbane",
    state: "QLD",
    daysRemaining: 20,
    icon: Shield,
  },
  {
    id: "4",
    type: "Coach Wanted",
    sport: "Rugby League",
    title: "Head Coach for U18 Boys",
    club: "Souths Juniors",
    location: "Sydney",
    state: "NSW",
    daysRemaining: 8,
    icon: Award,
  },
  {
    id: "5",
    type: "Players Wanted",
    sport: "Football",
    title: "Striker Needed for Men's All Age Division 1",
    club: "Eastside United",
    location: "Melbourne",
    state: "VIC",
    daysRemaining: 3,
    icon: Shield,
  },
];

export function BoldSporty() {
  return (
    <div className="flex flex-col h-[844px] w-[390px] bg-slate-100 font-sans overflow-hidden border border-slate-300 mx-auto relative">
      {/* Header */}
      <header className="bg-[#0A1628] pt-14 pb-4 px-4 sticky top-0 z-10 shadow-md flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <Menu className="text-white w-6 h-6" />
          <h1 className="text-white text-2xl font-black uppercase tracking-wider">Discover</h1>
          <div className="flex gap-4">
            <Search className="text-white w-6 h-6" />
            <Bell className="text-white w-6 h-6" />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          <button className="bg-[#0B63CE] text-white px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap shadow-[0_2px_10px_rgba(11,99,206,0.5)] transition-transform active:scale-95">
            All Sports
          </button>
          <button className="bg-transparent border border-white/30 text-white/90 px-5 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-transform active:scale-95">
            Players Wanted
          </button>
          <button className="bg-transparent border border-white/30 text-white/90 px-5 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-transform active:scale-95">
            Looking
          </button>
          <button className="bg-transparent border border-white/30 text-white/90 px-5 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-transform active:scale-95">
            Near Me
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {mockAdverts.map((ad) => {
          const Icon = ad.icon;
          return (
            <div
              key={ad.id}
              className="bg-white rounded-lg overflow-hidden shadow-sm flex relative active:bg-slate-50 transition-colors"
            >
              {/* Left Accent Bar */}
              <div className="w-1.5 bg-[#0B63CE] shrink-0" />
              
              <div className="p-4 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-flex items-center gap-1.5 bg-[#0B63CE]/10 text-[#0B63CE] px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide">
                    {ad.sport}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide bg-slate-100 px-2.5 py-1 rounded">
                    {ad.type}
                  </span>
                </div>
                
                <h2 className="text-xl font-black text-slate-900 leading-tight mb-3">
                  {ad.title}
                </h2>
                
                <div className="space-y-2">
                  <div className="flex items-center text-slate-700 font-semibold text-sm">
                    <Icon className="w-4 h-4 mr-2 text-slate-400" />
                    {ad.club}
                  </div>
                  <div className="flex items-center text-slate-600 text-sm font-medium">
                    <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                    {ad.location}, {ad.state}
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center text-[#0B63CE] font-bold text-sm">
                    <Clock className="w-4 h-4 mr-1.5" />
                    {ad.daysRemaining} days remaining
                  </div>
                  <button className="bg-[#0B63CE] text-white px-4 py-1.5 rounded font-bold text-sm uppercase tracking-wide shadow-sm">
                    View
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <div className="h-6" /> {/* Bottom padding */}
      </main>
    </div>
  );
}
