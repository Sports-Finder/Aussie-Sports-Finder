import React, { useState } from "react";
import { Search, MapPin, Clock, Filter, ChevronDown, User, Star, MoreHorizontal, MessageCircle, Share2, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const SPORTS = {
  "Football": { color: "bg-green-500", label: "Football (Soccer)" },
  "AFL": { color: "bg-red-500", label: "AFL" },
  "Rugby League": { color: "bg-blue-600", label: "Rugby League" },
  "Basketball": { color: "bg-orange-500", label: "Basketball" },
};

type SportType = keyof typeof SPORTS;

interface Advert {
  id: string;
  sport: SportType;
  type: string;
  typeColor: string;
  title: string;
  club: string;
  avatar: string;
  location: string;
  daysRemaining: number;
  maxDays: number;
  postedAt: string;
  content: string;
}

const mockAdverts: Advert[] = [
  {
    id: "1",
    sport: "Football",
    type: "Players Wanted",
    typeColor: "bg-blue-100 text-blue-800",
    title: "U16 Girls Goalkeeper Wanted for NPL",
    club: "Northern Suburbs FC",
    avatar: "N",
    location: "Sydney NSW",
    daysRemaining: 12,
    maxDays: 30,
    postedAt: "2 hours ago",
    content: "Looking for an experienced goalkeeper to join our U16 NPL squad. High-level coaching provided, clear pathway to first grade. Training 3 nights a week.",
  },
  {
    id: "2",
    sport: "AFL",
    type: "Player Looking",
    typeColor: "bg-green-100 text-green-800",
    title: "Midfielder looking for Div 1/2 club",
    club: "James M.",
    avatar: "J",
    location: "Melbourne VIC",
    daysRemaining: 5,
    maxDays: 14,
    postedAt: "1 day ago",
    content: "Recently relocated from WA. Played WAAFL Div 1 for 4 years. Strong inside mid, good tank. Looking for a competitive but social club close to the CBD.",
  },
  {
    id: "3",
    sport: "Basketball",
    type: "Club Trials",
    typeColor: "bg-purple-100 text-purple-800",
    title: "Senior Men's Representative Trials",
    club: "Brisbane Spartans",
    avatar: "B",
    location: "Brisbane QLD",
    daysRemaining: 2,
    maxDays: 7,
    postedAt: "3 days ago",
    content: "Open trials for our Senior Men's QSL team. Registration required prior to attendance. Bring reversible jersey and water.",
  },
  {
    id: "4",
    sport: "Rugby League",
    type: "Coach Wanted",
    typeColor: "bg-orange-100 text-orange-800",
    title: "Head Coach - U18s Division 1",
    club: "Penrith Panthers Junior League",
    avatar: "P",
    location: "Western Sydney NSW",
    daysRemaining: 20,
    maxDays: 30,
    postedAt: "5 days ago",
    content: "Seeking Level 2 accredited coach for our premier U18s side. Fantastic facilities and strong junior base. Honorarium available for the right candidate.",
  },
  {
    id: "5",
    sport: "Football",
    type: "Players Wanted",
    typeColor: "bg-blue-100 text-blue-800",
    title: "Men's All Age Div 4 - Need 2 Defenders",
    club: "Marrickville Red Devils",
    avatar: "M",
    location: "Inner West Sydney",
    daysRemaining: 8,
    maxDays: 14,
    postedAt: "1 week ago",
    content: "Social but competitive team looking for a center back and full back. We train once a week on Wednesdays. Great social scene after games.",
  }
];

const filters = ["All", "Players Wanted", "Looking", "Near Me", "Trials", "Coaching"];

export function CleanMarketplace() {
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <div className="flex flex-col h-[844px] w-[390px] bg-[#F8F9FA] overflow-hidden relative shadow-2xl border border-gray-200 rounded-[40px] mx-auto my-8">
      {/* Header */}
      <header className="bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] z-10 pt-12 pb-3 px-5 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E] tracking-tight">Discover</h1>
            <p className="text-sm text-gray-500 font-medium">Find your next club or player</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[#1A1A2E]">
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Chips */}
        <ScrollArea className="w-full whitespace-nowrap -mx-5 px-5">
          <div className="flex space-x-2 pb-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === filter
                    ? "bg-[#0B63CE] text-white shadow-sm"
                    : "bg-white text-gray-600 border border-[#E2E8F0] hover:bg-gray-50"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </header>

      {/* List */}
      <ScrollArea className="flex-1 px-4 pt-4 pb-20">
        <div className="space-y-4 pb-10">
          {mockAdverts.map((advert) => (
            <AdvertCard key={advert.id} advert={advert} />
          ))}
        </div>
      </ScrollArea>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe pt-2 px-6 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
        <NavItem icon={<Search className="w-6 h-6" />} label="Discover" active />
        <NavItem icon={<MapPin className="w-6 h-6" />} label="Map" />
        <div className="w-12 h-12 bg-[#0B63CE] rounded-full flex items-center justify-center -mt-6 shadow-lg text-white">
          <span className="text-2xl leading-none font-light mb-1">+</span>
        </div>
        <NavItem icon={<MessageCircle className="w-6 h-6" />} label="Messages" />
        <NavItem icon={<User className="w-6 h-6" />} label="Profile" />
      </nav>
    </div>
  );
}

function AdvertCard({ advert }: { advert: Advert }) {
  const progressPercent = Math.max(0, Math.min(100, (advert.daysRemaining / advert.maxDays) * 100));
  
  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-transform">
      {/* Top Row: Sport + Type */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${SPORTS[advert.sport].color}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {SPORTS[advert.sport].label}
          </span>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${advert.typeColor}`}>
          {advert.type}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-[17px] font-semibold text-[#1A1A2E] leading-snug mb-3 line-clamp-2">
        {advert.title}
      </h3>

      {/* Poster / Location */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6 border border-gray-100">
            <AvatarFallback className="text-[10px] bg-gray-50 text-gray-600 font-medium">{advert.avatar}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-gray-700 truncate">{advert.club}</span>
        </div>
        
        <div className="flex items-center gap-1.5 text-gray-500">
          <MapPin className="w-3.5 h-3.5" />
          <span className="text-[13px]">{advert.location}</span>
          <span className="text-gray-300 mx-1">•</span>
          <span className="text-[13px]">{advert.postedAt}</span>
        </div>
      </div>

      {/* Content Snippet */}
      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-4">
        {advert.content}
      </p>

      {/* Footer: Expiry */}
      <div className="pt-3 border-t border-gray-50">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Closes in {advert.daysRemaining} days
          </span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${
              progressPercent < 20 ? 'bg-red-500' : 
              progressPercent < 50 ? 'bg-orange-500' : 
              'bg-[#0B63CE]'
            }`} 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`flex flex-col items-center justify-center w-14 h-12 gap-1 ${active ? 'text-[#0B63CE]' : 'text-gray-400 hover:text-gray-600'}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
