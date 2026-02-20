import React from 'react'
import {
    DownloadIcon,
    PlayIcon,
    PauseIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    ClockIcon,
    ListIcon,
    BanIcon,
    SettingsIcon,
    HelpIcon
} from './icons'

interface SidebarProps {
    activePage: string
    activeFilter: string
    setActivePage: (page: any) => void
    setActiveFilter: (filter: any) => void
    isCollapsed: boolean
    toggleCollapse: () => void
    counts: {
        active: number
        queued: number
        paused: number
        completed: number
        error: number
        cancelled: number
    }
}

const SidebarItem: React.FC<{
    icon: React.ReactNode
    label: string
    isActive: boolean
    onClick: () => void
    count?: number
    collapsed?: boolean
    color?: string
}> = ({ icon, label, isActive, onClick, count, collapsed, color }) => (
    <div
        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg mx-2 mb-1 cursor-pointer transition-all duration-200
      ${isActive
                ? 'bg-neon-blue/10 text-white shadow-[0_0_15px_rgba(0,243,255,0.1)]'
                : 'text-text-dim hover:bg-white/5 hover:text-white'
            }
      ${collapsed ? 'justify-center' : ''}
    `}
        onClick={onClick}
        title={collapsed ? label : undefined}
    >
        <div className={`transition-colors duration-200 ${isActive ? 'text-neon-blue' : (color || 'text-current')}`}>
            {icon}
        </div>

        <span
            className={`whitespace-nowrap font-medium text-sm transition-all duration-300 ease-in-out overflow-hidden
        ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 flex-1'}
      `}
        >
            {label}
        </span>

        {/* Count Badge */}
        {!collapsed && count !== undefined && count > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono transition-colors
        ${isActive ? 'bg-neon-blue text-black font-bold' : 'bg-white/10 text-text-dim group-hover:bg-white/20'}
      `}>
                {count}
            </span>
        )}

        {/* Collapsed Dot Indicator */}
        {collapsed && count !== undefined && count > 0 && (
            <div className="absolute top-2 right-2 w-2 h-2 bg-neon-blue rounded-full ring-2 ring-bg-surface"></div>
        )}

        {/* Active Indicator Bar (Left) */}
        {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-neon-blue rounded-r-full shadow-[0_0_10px_rgba(0,243,255,0.5)]"></div>
        )}
    </div>
)

const Sidebar: React.FC<SidebarProps> = ({
    activePage,
    activeFilter,
    setActivePage,
    setActiveFilter,
    isCollapsed,
    toggleCollapse,
    counts
}) => {
    return (
        <div
            className={`sidebar relative flex flex-col border-r border-white/5 bg-bg-surface/50 backdrop-blur-xl transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)]
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
        >
            {/* Toggle Button */}
            <div className={`flex items-center p-3 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <DownloadIcon className="w-6 h-6 text-neon-blue" />
                        <span className="text-sm font-bold text-text-main tracking-wide">NEBULA</span>
                    </div>
                )}
                <button
                    onClick={toggleCollapse}
                    className="p-1.5 rounded-lg text-text-dim hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <ListIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
                {/* Section: Downloads */}
                <div className={`px-4 mb-2 text-[10px] font-bold text-text-dim uppercase tracking-wider transition-opacity duration-200 ${isCollapsed ? 'text-center opacity-50' : 'opacity-100'}`}>
                    {isCollapsed ? 'ALL' : 'Downloads'}
                </div>

                <SidebarItem
                    icon={<DownloadIcon className="w-5 h-5" />}
                    label="All Downloads"
                    isActive={activePage === 'Downloads' && activeFilter === 'All'}
                    onClick={() => { setActivePage('Downloads'); setActiveFilter('All'); }}
                    collapsed={isCollapsed}
                />
                <SidebarItem
                    icon={<PlayIcon className="w-5 h-5" />}
                    label="Downloading"
                    color="text-neon-blue"
                    isActive={activePage === 'Downloads' && activeFilter === 'Downloading'}
                    onClick={() => { setActivePage('Downloads'); setActiveFilter('Downloading'); }}
                    count={counts.active}
                    collapsed={isCollapsed}
                />
                <SidebarItem
                    icon={<ListIcon className="w-5 h-5" />}
                    label="Queued"
                    isActive={activePage === 'Downloads' && activeFilter === 'Queued'}
                    onClick={() => { setActivePage('Downloads'); setActiveFilter('Queued'); }}
                    count={counts.queued}
                    collapsed={isCollapsed}
                />
                <SidebarItem
                    icon={<PauseIcon className="w-5 h-5" />}
                    label="Paused"
                    color="text-yellow-400"
                    isActive={activePage === 'Downloads' && activeFilter === 'Paused'}
                    onClick={() => { setActivePage('Downloads'); setActiveFilter('Paused'); }}
                    count={counts.paused}
                    collapsed={isCollapsed}
                />
                <SidebarItem
                    icon={<CheckCircleIcon className="w-5 h-5" />}
                    label="Completed"
                    color="text-neon-green"
                    isActive={activePage === 'Downloads' && activeFilter === 'Completed'}
                    onClick={() => { setActivePage('Downloads'); setActiveFilter('Completed'); }}
                    count={counts.completed}
                    collapsed={isCollapsed}
                />
                <SidebarItem
                    icon={<AlertCircleIcon className="w-5 h-5" />}
                    label="Errors"
                    color="text-neon-red"
                    isActive={activePage === 'Downloads' && activeFilter === 'Error'}
                    onClick={() => { setActivePage('Downloads'); setActiveFilter('Error'); }}
                    count={counts.error}
                    collapsed={isCollapsed}
                />
                <SidebarItem
                    icon={<BanIcon className="w-5 h-5" />}
                    label="Cancelled"
                    isActive={activePage === 'Downloads' && activeFilter === 'Cancelled'}
                    onClick={() => { setActivePage('Downloads'); setActiveFilter('Cancelled'); }}
                    count={counts.cancelled}
                    collapsed={isCollapsed}
                />

                <div className="my-4 border-t border-white/5 mx-4"></div>

                {/* Section: Organization */}
                <div className={`px-4 mb-2 text-[10px] font-bold text-text-dim uppercase tracking-wider transition-opacity duration-200 ${isCollapsed ? 'text-center opacity-50' : 'opacity-100'}`}>
                    {isCollapsed ? 'APP' : 'Application'}
                </div>

                <SidebarItem
                    icon={<ClockIcon className="w-5 h-5" />}
                    label="History"
                    isActive={activePage === 'History'}
                    onClick={() => setActivePage('History')}
                    collapsed={isCollapsed}
                />
                <SidebarItem
                    icon={<SettingsIcon className="w-5 h-5" />}
                    label="Settings"
                    isActive={activePage === 'Settings'}
                    onClick={() => setActivePage('Settings')}
                    collapsed={isCollapsed}
                />
                <SidebarItem
                    icon={<HelpIcon className="w-5 h-5" />}
                    label="Support"
                    isActive={activePage === 'Help'}
                    onClick={() => setActivePage('Help')}
                    collapsed={isCollapsed}
                />
            </div>

            {/* Footer / Version if expanded */}
            {!isCollapsed && (
                <div className="p-4 border-t border-white/5 text-center">
                    <div className="text-[10px] text-text-dim/50 font-mono">v1.4.0</div>
                </div>
            )}
        </div>
    )
}

export default Sidebar
