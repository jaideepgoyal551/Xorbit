import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Code2, 
  Users, 
  Trophy,
  BookOpen,
  Zap,
  PlusCircle,
  FileCode2,
  UserPen,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Swords,
  Building2,
  GraduationCap,
  Compass,
  Home
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/common/Logo';

const sections = [
  {
    id: 'workspace',
    label: 'WORKSPACE',
    icon: Home,
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
      { to: '/platforms', icon: Code2, label: 'Platforms' },
    ]
  },
  {
    id: 'learn',
    label: 'LEARN',
    icon: GraduationCap,
    items: [
      { to: '/sheets', icon: BookOpen, label: 'DSA Sheets' },
      { to: '/dsa-guide', icon: BookOpen, label: 'DSA Pattern Guide' },
      { to: '/daily-challenge', icon: Zap, label: 'Daily Challenge' },
      { to: '/problem-set', icon: FileCode2, label: 'Problem Set' },
    ]
  },
  {
    id: 'compete',
    label: 'COMPETE',
    icon: Swords,
    items: [
      { to: '/contests', icon: Swords, label: 'Contests' },
      { to: '/contests/battle', icon: Zap, label: 'Battle Arena' },
      { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
      { to: '/contests/admin', icon: PlusCircle, label: 'Host Contest' },
    ]
  },
  {
    id: 'community',
    label: 'COMMUNITY',
    icon: Users,
    items: [
      { to: '/societies', icon: Building2, label: 'Societies' },
      { to: '/rooms', icon: Users, label: 'Rooms' },
    ]
  }
];

const Sidebar = ({ isOpen, onClose, onToggle }) => {
  const [expandedSections, setExpandedSections] = useState({
    workspace: true,
    learn: true,
    compete: false,
    community: false
  });
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    const activeSection = sections.find(section =>
      section.items.some(item =>
        item.to === location.pathname ||
        (item.to !== '/dashboard' && location.pathname.startsWith(`${item.to}/`))
      )
    );
    if (activeSection) {
      setExpandedSections(prev => prev[activeSection.id] ? prev : { ...prev, [activeSection.id]: true });
    }
  }, [location.pathname]);

  const NavItem = ({ item }) => (
    <NavLink
      to={item.to}
      end={item.to === '/contests'} // Only match exact path for /contests to avoid conflict with /contests/admin
      onClick={() => window.innerWidth < 1024 && onClose()}
      className={({ isActive }) => `
        flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200
        ${isActive 
          ? 'sidebar-link-active'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a2e] hover:text-gray-900 dark:hover:text-gray-200'
        }
      `}
    >
      <item.icon className="sidebar-nav-icon w-[17px] h-[17px] flex-shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );

  const SectionHeader = ({ section }) => (
    <button
      onClick={() => toggleSection(section.id)}
      aria-expanded={expandedSections[section.id]}
      className={`sidebar-section-heading sidebar-section-${section.id} flex items-center justify-between w-full px-3 py-2 text-[10px] font-bold tracking-[0.13em] text-gray-500 dark:text-gray-500 uppercase hover:text-gray-700 dark:hover:text-gray-300 transition-colors`}
    >
      <span className="flex items-center gap-2"><section.icon className="sidebar-section-icon h-3.5 w-3.5" />{section.label}</span>
      <span className="sidebar-section-chevron">
        {expandedSections[section.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </span>
    </button>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          dashboard-sidebar
          fixed top-0 left-0 h-full z-50 bg-white dark:bg-[#111118]
          transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden
          ${isOpen ? 'w-60 translate-x-0 border-r border-gray-200 dark:border-gray-800/50' : 'w-60 -translate-x-full border-r-0'}
          lg:relative lg:translate-x-0
          ${isOpen ? 'lg:w-60 lg:border-r lg:border-gray-200 lg:dark:border-gray-800/50' : 'lg:w-0 lg:border-r-0'}
        `}
      >
        <div className="flex flex-col h-full w-60">
          {/* Logo */}
          <div className="sidebar-brand-row flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800/50 transition-colors">
            <NavLink to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
              <Logo className="w-full h-full drop-shadow-md" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight whitespace-nowrap">
                Xorbits
              </span>
            </NavLink>
            <button
              onClick={onToggle}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-[#1a1a2e]"
              title="Close sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Sections */}
          <div className="sidebar-workspace-caption">
            <Compass className="h-3.5 w-3.5" />
            <span>CODING WORKSPACE</span>
          </div>
          <nav aria-label="Workspace navigation" className="flex-1 px-2 py-3 space-y-1 overflow-y-auto scrollbar-hide">
            {sections.map((section) => (
              <div key={section.id} className={`sidebar-nav-section sidebar-section-${section.id} mb-1`}>
                <SectionHeader section={section} />
                {expandedSections[section.id] && (
                  <div className="sidebar-nav-items space-y-0.5 ml-1">
                    {section.items.map(item => (
                      <NavItem key={item.to} item={item} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-gray-200 dark:border-gray-800/50 p-3 space-y-2 transition-colors">
            {/* Edit Profile & Logout */}
            <div className="flex gap-2">
              <NavLink
                to="/settings"
                onClick={() => window.innerWidth < 1024 && onClose()}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a2e] transition-all"
              >
                <UserPen className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </NavLink>
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
