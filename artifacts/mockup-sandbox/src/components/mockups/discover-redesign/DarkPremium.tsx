import React, { useState } from "react";
import { 
  MapPin, 
  Clock, 
  Star, 
  ChevronDown,
  Search,
  MessageCircle,
  Home,
  PlusCircle,
  User,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data
const SPORTS = [
  { id: 'football', name: 'Football · Soccer', color: '#0B63CE', lightColor: '#4A9EFF' },
  { id: 'afl', name: 'AFL', color: '#E31837', lightColor: '#FF4D6D' },
  { id: 'rugby', name: 'Rugby League', color: '#005A3C', lightColor: '#34D399' },
  { id: 'basketball', name: 'Basketball', color: '#F26522', lightColor: '#FB923C' }
];

const FILTERS = ['All', 'Players Wanted', 'Looking', 'Near Me', 'Trials'];

const ADVERTS = [
  {
    id: 1,
    sportId: 'football',
    type: 'Players Wanted',
    title: 'Senior Men\'s First Team GK',
    club: 'Northern Suburbs FC',
    location: 'Sydney NSW',
    daysRemaining: 2,
    isPremium: true,
  },
  {
    id: 2,
    sportId: 'basketball',
    type: 'Player Looking',
    title: 'Point Guard seeking D1 Team',
    club: 'James W.',
    location: 'Melbourne VIC',
    daysRemaining: 5,
    isPremium: false,
  },
  {
    id: 3,
    sportId: 'afl',
    type: 'Club Trials',
    title: 'U18 Boys Pre-season Trials',
    club: 'Western Bulldogs Academy',
    location: 'Brisbane QLD',
    daysRemaining: 1,
    isPremium: true,
  },
  {
    id: 4,
    sportId: 'rugby',
    type: 'Coach Wanted',
    title: 'Assistant Coach for Reserves',
    club: 'Souths Logan Magpies',
    location: 'Brisbane QLD',
    daysRemaining: 12,
    isPremium: false,
  },
  {
    id: 5,
    sportId: 'football',
    type: 'Players Wanted',
    title: 'Women\'s Premier League Strikers',
    club: 'Manly United FC',
    location: 'Sydney NSW',
    daysRemaining: 3,
    isPremium: true,
  }
];

export function DarkPremium() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeSport, setActiveSport] = useState(SPORTS[0]);

  return (
    <div 
      className="relative flex flex-col h-[844px] w-[390px] overflow-hidden font-sans mx-auto shadow-2xl ring-1 ring-white/10"
      style={{ backgroundColor: '#0F1117', color: 'white' }}
    >
      {/* Header */}
      <header className="px-5 pt-12 pb-4 shrink-0 border-b border-white/5 sticky top-0 z-10" style={{ backgroundColor: 'rgba(15, 17, 23, 0.95)', backdropFilter: 'blur(10px)' }}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-baseline gap-1">
            <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeSport.color }} />
          </div>
          <button className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <Search size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Sport Selector Pill */}
        <button 
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors w-fit"
          style={{ backgroundColor: activeSport.color, color: 'white' }}
        >
          {activeSport.name}
          <ChevronDown size={14} className="opacity-70" />
        </button>
      </header>

      {/* Filters (Scrollable horizontally) */}
      <div className="px-5 py-4 shrink-0 border-b border-white/5 overflow-x-auto no-scrollbar flex gap-2">
        {FILTERS.map(filter => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                isActive 
                  ? "text-white" 
                  : "text-gray-400 hover:text-gray-300"
              )}
              style={{
                backgroundColor: isActive ? activeSport.color : '#1C1F2A'
              }}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-24 flex flex-col gap-4 no-scrollbar">
        {ADVERTS.map(ad => {
          const sport = SPORTS.find(s => s.id === ad.sportId) || SPORTS[0];
          
          return (
            <div 
              key={ad.id}
              className="relative rounded-[14px] p-4 flex flex-col gap-3 group"
              style={{ 
                backgroundColor: '#1C1F2A',
                boxShadow: '0 4px 20px -2px rgba(0,0,0,0.5)',
              }}
            >
              {/* Top highlight line */}
              <div 
                className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[14px] opacity-80"
                style={{ backgroundColor: sport.color }}
              />

              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span 
                    className="text-xs font-semibold tracking-wide uppercase"
                    style={{ color: sport.lightColor }}
                  >
                    {ad.type}
                  </span>
                  <h3 className="text-[17px] font-semibold leading-tight pr-4">
                    {ad.title}
                  </h3>
                </div>
                
                {ad.isPremium && (
                  <div className="p-1.5 rounded-full bg-[#2A2200] border border-[#FCD34D]/20 shrink-0">
                    <Star size={12} className="text-[#FCD34D] fill-[#FCD34D]" />
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex items-center gap-2 text-[13px] text-[#8B95A1]">
                  <User size={14} className="opacity-70" />
                  <span className="font-medium">{ad.club}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[#8B95A1]">
                  <MapPin size={14} className="opacity-70" />
                  <span>{ad.location}</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/5">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#2A2200] text-[#FCD34D]">
                  <Clock size={12} />
                  <span className="text-xs font-semibold">{ad.daysRemaining}d remaining</span>
                </div>
                <button 
                  className="px-4 py-1.5 rounded-full text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: sport.color, color: 'white' }}
                >
                  View
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Tab Bar */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-20 border-t border-white/5 px-6 pb-6 pt-3 flex justify-between items-center z-10"
        style={{ backgroundColor: '#0F1117' }}
      >
        <div className="flex flex-col items-center gap-1 cursor-pointer" style={{ color: activeSport.lightColor }}>
          <Home size={24} className="stroke-[2.5px]" />
          <span className="text-[10px] font-medium">Discover</span>
        </div>
        <div className="flex flex-col items-center gap-1 cursor-pointer text-[#6B7280] hover:text-gray-400">
          <Search size={24} className="stroke-[2px]" />
          <span className="text-[10px] font-medium">Search</span>
        </div>
        <div className="flex flex-col items-center justify-center -mt-8 cursor-pointer relative group">
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-105"
            style={{ backgroundColor: activeSport.color }}
          >
            <PlusCircle size={28} className="text-white stroke-[2px]" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 cursor-pointer text-[#6B7280] hover:text-gray-400">
          <MessageCircle size={24} className="stroke-[2px]" />
          <span className="text-[10px] font-medium">Messages</span>
        </div>
        <div className="flex flex-col items-center gap-1 cursor-pointer text-[#6B7280] hover:text-gray-400">
          <User size={24} className="stroke-[2px]" />
          <span className="text-[10px] font-medium">Profile</span>
        </div>
      </div>
    </div>
  );
}
