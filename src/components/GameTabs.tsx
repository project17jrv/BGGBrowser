"use client";

import { useState } from "react";
import { Database, Tag, BookOpen } from "lucide-react";

interface GameTabsProps {
  ludotecaContent: React.ReactNode;
  preciosContent: React.ReactNode;
  aprendeContent: React.ReactNode;
}

export default function GameTabs({ ludotecaContent, preciosContent, aprendeContent }: GameTabsProps) {
  const [activeTab, setActiveTab] = useState<"ludoteca" | "precios" | "aprende">("ludoteca");

  const tabs = [
    {
      id: "ludoteca" as const,
      label: "Gestión Ludoteca",
      icon: Database,
      color: "text-indigo-500",
      activeBg: "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5",
    },
    {
      id: "precios" as const,
      label: "Precios y Mercado",
      icon: Tag,
      color: "text-emerald-500",
      activeBg: "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5",
    },
    {
      id: "aprende" as const,
      label: "Aprende a Jugar",
      icon: BookOpen,
      color: "text-amber-500",
      activeBg: "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5",
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full mt-6">
      {/* Tabs Navigation */}
      <div className="border-b flex flex-wrap gap-1 pb-0 bg-muted/20 p-1.5 rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 rounded-lg transition-all duration-200 focus:outline-none ${
                isActive
                  ? `${tab.activeBg} shadow-sm`
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <Icon size={15} className={isActive ? "" : tab.color} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs Content */}
      <div className="w-full">
        {activeTab === "ludoteca" && (
          <div className="animate-fade-in">{ludotecaContent}</div>
        )}
        {activeTab === "precios" && (
          <div className="animate-fade-in">{preciosContent}</div>
        )}
        {activeTab === "aprende" && (
          <div className="animate-fade-in">{aprendeContent}</div>
        )}
      </div>
    </div>
  );
}
