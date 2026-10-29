import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PLATFORM_CONFIG, { PlatformIcon, getPlatformColor, getCodeforcesMaxRank } from '../utils/platformConfig';
import { 
  Code, 
  MapPin,
  Building,
  RefreshCw,
  ChevronRight,
  BookOpen,
  Users,
  MessageCircle,
  ArrowUpRight,
  Zap,
  Trophy
} from 'lucide-react';
const RatingChart = lazy(() => import('../components/dashboard/RatingChart'));
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ContributionCalendar from '../components/ContributionCalendar';



// Circular Progress Component
const CircularProgress = ({ value, max, size = 120, strokeWidth = 10, color = '#f59e0b' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = max > 0 ? (value / max) * 100 : 0;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-gray-200 dark:stroke-[#2a2a3e]"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user: authUser } = useAuth();
  const isOwnProfile = !userId || userId === authUser?._id;
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [platformStats, setPlatformStats] = useState({});
  const [ratingHistory, setRatingHistory] = useState([]);
  const [allRatingHistory, setAllRatingHistory] = useState({ chartData: [], platforms: [] });
  const [cooldownRemaining, setCooldownRemaining] = useState(0); // seconds remaining
  const [selectedRatingPlatform, setSelectedRatingPlatform] = useState('all'); // 'all' or specific platform
  const [topicAnalysis, setTopicAnalysis] = useState([]);
  const [badges, setBadges] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [contributionCalendar, setContributionCalendar] = useState(null);

  const displayUser = userData?.user || authUser;

  const SYNC_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes in ms
  const AUTO_REFRESH_MS = 5 * 60 * 1000; // Auto-refresh dashboard data every 5 minutes (reduced from 15)

  // Platform colors for rating graph
  const platformRatingColors = {
    leetcode: '#FFA116',  // Orange
    codeforces: '#1F8ACB', // Blue
    codechef: '#5B4638',   // Brown
    codingninjas: '#F96D00' // Orange-red
  };

  // ── Cooldown timer (persisted in localStorage per user) ──
  const getSyncKey = () => `xorbits_lastSync_${authUser?._id || authUser?.id || 'default'}`;
  const getLastSync = () => {
    const key = getSyncKey();
    const stored = localStorage.getItem(key);
    if (stored) return stored;

    const legacyKey = `codeverse_lastSync_${authUser?._id || authUser?.id || 'default'}`;
    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue) localStorage.setItem(key, legacyValue);
    return legacyValue;
  };

  useEffect(() => {
    // On mount / user change: check remaining cooldown
    const stored = getLastSync();
    if (stored) {
      const elapsed = Date.now() - Number(stored);
      const remaining = Math.max(0, Math.ceil((SYNC_COOLDOWN_MS - elapsed) / 1000));
      setCooldownRemaining(remaining);
    } else {
      setCooldownRemaining(0);
    }
  }, [authUser?._id, authUser?.id]);

  useEffect(() => {
    // Tick the cooldown every second
    if (cooldownRemaining <= 0) return;
    const id = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
  return () => clearInterval(id);
  }, [cooldownRemaining]);

  const formatCooldown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // On first load: fetch dashboard data. If user has never synced (no stored data), auto-sync.
    const loadData = async () => {
      await fetchDashboardData();
      // Auto-sync on first visit if there's no cooldown stored (never synced before)
      const stored = getLastSync();
      if (!stored) {
        handleAutoSync();
      }
    };
    loadData();
  }, [authUser?._id, authUser?.id, userId]);

  // ── Auto-refresh: silently re-fetch dashboard data every 15 minutes ──
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchDashboardData(true); // silent refresh, no loading spinner
    }, AUTO_REFRESH_MS);
  return () => clearInterval(intervalId);
  }, [authUser?._id, authUser?.id, userId]);

  const handleAutoSync = async () => {
    try {
      setSyncing(true);
      await api.syncPlatforms();
      // Re-fetch but don't show full-page loading spinner
      await fetchDashboardData(true);
      const now = Date.now();
      localStorage.setItem(getSyncKey(), String(now));
      setCooldownRemaining(Math.ceil(SYNC_COOLDOWN_MS / 1000));
    } catch (error) {
      console.error('Auto-sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const fetchDashboardData = async (skipLoadingSpinner = false) => {
    try {
      if (!skipLoadingSpinner) setLoading(true);
      
      // Use the combined endpoint for much faster loading (1 call instead of 8)
      const dashboardData = await api.getCombinedDashboardData(userId);

      setUserData(dashboardData);
      setPlatformStats(dashboardData.platforms || {});
      setRatingHistory(dashboardData.ratingHistory || []);
      setTopicAnalysis(dashboardData.topics || []);
      setBadges(dashboardData.badges || []);
      setAchievements(dashboardData.achievements || []);
      setContributionCalendar(dashboardData.contributionCalendar || null);

      // Fetch proper per-platform rating history from dedicated endpoint
      // (combined endpoint only has averaged rating, not per-platform data)
      try {
        const allRatingsData = await api.getAllRatingHistory(90, userId);
        if (allRatingsData?.chartData?.length > 0) {
          setAllRatingHistory(allRatingsData);
        } else {
          setAllRatingHistory({ chartData: [], byPlatform: {}, platforms: [] });
        }
      } catch (e) {
        setAllRatingHistory({ chartData: [], byPlatform: {}, platforms: [] });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Fallback to individual API calls if combined endpoint fails
      try {
        const [summaryData, allStats, ratingsData, allRatingsData, topicsData, badgesData, achievementsData, calendarData] = await Promise.all([
          api.getStats().catch(() => null),
          api.getAllPlatformStats().catch(() => ({})),
          api.getRatingGrowth().catch(() => []),
          api.getAllRatingHistory(90, userId).catch(() => ({ chartData: [], platforms: [] })),
          api.getTopicAnalysis().catch(() => []),
          api.getBadges().catch(() => []),
          api.getAchievements().catch(() => []),
          api.getContributionCalendar().catch(() => null)
        ]);

        setUserData(summaryData);
        setPlatformStats(allStats || {});
        setRatingHistory(ratingsData || []);
        setAllRatingHistory(allRatingsData || { chartData: [], platforms: [] });
        setTopicAnalysis(topicsData || []);
        setBadges(badgesData || []);
        setAchievements(achievementsData || []);
        setContributionCalendar(calendarData);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      if (!skipLoadingSpinner) setLoading(false);
    }
  };

  const handleSync = async () => {
    if (cooldownRemaining > 0) return; // block if cooldown active
    try {
      setSyncing(true);
      
      // 1. Put the sync job in the queue
      const response = await api.syncPlatforms();
      
      // 2. Poll backend until sync is complete or cached (only for queued background jobs)
      if (response && response.data?.status === 'queued') {
        let isSyncingBackend = true;
        let attempts = 0;
        while (isSyncingBackend && attempts < 60) {
           await new Promise(r => setTimeout(r, 3000));
           const status = await api.getSyncStatus();
           if (status && (status.syncStatus === 'completed' || status.syncStatus === 'failed')) {
              isSyncingBackend = false;
           }
           attempts++;
        }
      }

      // 3. Re-fetch all dashboard data (now reflects the fresh sync, no full-page spinner)
      await fetchDashboardData(true);
      
      // 4. Start cooldown timer
      const now = Date.now();
      localStorage.setItem(getSyncKey(), String(now));
      setCooldownRemaining(Math.ceil(SYNC_COOLDOWN_MS / 1000));
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Calculate totals — use summary which has actual unique problems solved
  const getTotalProblems = () => {
    // Primary: use the summary endpoint's totals (most accurate, unique problems per platform)
    if (userData?.totals?.problems !== undefined) {
      return userData.totals.problems;
    }
    // Fallback: sum from individual platform stats
    let total = 0;
    Object.values(platformStats).forEach(stats => {
      total += stats?.totalSolved || stats?.problemsSolved || 0;
    });
    return total;
  };

  const getTotalContests = () => {
    let total = 0;
    Object.values(platformStats).forEach(stats => {
      total += stats?.contestsParticipated || 0;
    });
    return total;
  };

  const getContestsByPlatform = () => {
    const contests = [];
    if (platformStats.leetcode?.contestsParticipated) {
      contests.push({ platform: 'leetcode', name: 'LeetCode', count: platformStats.leetcode.contestsParticipated });
    }
    if (platformStats.codechef?.contestsParticipated) {
      contests.push({ platform: 'codechef', name: 'CodeChef', count: platformStats.codechef.contestsParticipated });
    }
    if (platformStats.codeforces?.contestsParticipated) {
      contests.push({ platform: 'codeforces', name: 'Codeforces', count: platformStats.codeforces.contestsParticipated });
    }
    return contests;
  };

  const getConnectedPlatforms = () => {
    const connected = [];
    const userPlatforms = displayUser?.platforms || {};
    
    Object.entries(userPlatforms).forEach(([platform, username]) => {
      if (username && PLATFORM_CONFIG[platform]) {
        const cfg = PLATFORM_CONFIG[platform];
        connected.push({
          key: platform,
          name: cfg.name,
          color: cfg.color,
          username,
          stats: platformStats[platform] || {}
        });
      }
    });
    return connected;
  };

  // Problems breakdown — combine ALL DSA platforms into Easy/Medium/Hard
  const getDSAProblems = () => {
    const lc = platformStats.leetcode || {};
    const gfg = platformStats.geeksforgeeks || {};
    const hr = platformStats.hackerrank || {};
    const cn = platformStats.codingninjas || {};

    // Per-platform difficulty data
    const lcEasy = lc.easySolved || lc.easy || 0;
    const lcMed = lc.mediumSolved || lc.medium || 0;
    const lcHard = lc.hardSolved || lc.hard || 0;

    const gfgEasy = gfg.easySolved || 0;
    const gfgMed = gfg.mediumSolved || 0;
    const gfgHard = gfg.hardSolved || 0;
    const gfgFromDifficulty = gfgEasy + gfgMed + gfgHard;
    const gfgTotal = gfg.problemsSolved || gfg.totalSolved || 0;

    const cnEasy = cn.easy || 0;
    const cnMod = cn.moderate || 0;
    const cnHard = cn.hard || 0;
    const cnFromDifficulty = cnEasy + cnMod + cnHard;
    const cnTotal = cn.problemsSolved || cn.totalSolved || 0;

    const hrTotal = hr.problemsSolved || hr.totalSolved || 0;

    // Sum known difficulty counts
    let easy = lcEasy + gfgEasy + cnEasy;
    let medium = lcMed + gfgMed + cnMod;
    let hard = lcHard + gfgHard + cnHard;
    const knownTotal = easy + medium + hard;

    // Unclassified = platforms without per-difficulty data
    const gfgUnclassified = gfgFromDifficulty > 0 ? 0 : gfgTotal;
    const cnUnclassified = cnFromDifficulty > 0 ? 0 : cnTotal;
    const unclassified = gfgUnclassified + cnUnclassified + hrTotal;

    // Distribute unclassified proportionally into Easy/Medium/Hard
    if (unclassified > 0 && knownTotal > 0) {
      const easyRatio = easy / knownTotal;
      const medRatio = medium / knownTotal;
      // hard gets the remainder to avoid rounding errors
      const extraEasy = Math.round(unclassified * easyRatio);
      const extraMed = Math.round(unclassified * medRatio);
      const extraHard = unclassified - extraEasy - extraMed;
      easy += extraEasy;
      medium += extraMed;
      hard += extraHard;
    } else if (unclassified > 0) {
      // No known distribution — put all in easy as fallback
      easy += unclassified;
    }

    const total = easy + medium + hard;

    return { easy, medium, hard, total };
  };

  const getCPProblems = () => {
    const cf = platformStats.codeforces || {};
    const cc = platformStats.codechef || {};
    return {
      codechef: cc.problemsSolved || 0,
      codeforces: cf.problemsSolved || 0,
      total: (cc.problemsSolved || 0) + (cf.problemsSolved || 0)
    };
  };

  // Compute activity count for a platform: prefer submissions, fall back to problemsSolved/totalSolved
  function getPlatformActivityCount(key, stats = {}) {
    if (!stats) return 0;
    const v = stats.submissions || stats.totalSubmissions || stats.totalSolved || stats.problemsSolved || stats.submitted || 0;
    if (key === 'github') {
      return stats.contributions || stats.totalContributions || stats.contribs || stats.activeContributions || v || 0;
    }
    return v;
  }

  // Combined submissions + contributions across all platforms
  function getCombinedSubmissionsContributions() {
    let total = 0;
    Object.entries(platformStats || {}).forEach(([key, stats]) => {
      total += Number(getPlatformActivityCount(key, stats) || 0);
    });
    return total;
  }

  const connectedPlatforms = getConnectedPlatforms();
  const dsaProblems = getDSAProblems();
  const cpProblems = getCPProblems();
  const totalProblems = getTotalProblems();
  const totalContests = getTotalContests();
  const contestsByPlatform = getContestsByPlatform();

  // Helper to generate demo rating data
  const generateDemoRatingData = () => {
    const data = [];
    let rating = 1500;
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      rating += Math.floor(Math.random() * 100) - 30;
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short' }),
        rating: Math.max(rating, 1200)
      });
    }
    return data;
  };

  if (loading) {
  return (
      <div className="flex min-h-full items-center justify-center bg-[#05070a] transition-colors">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1c2b22] border-t-[#4ade80]"></div>
      </div>
    );
  }

  // Empty state for new users
  if (!connectedPlatforms.length) {
  return (
      <div className="dashboard-page min-h-full text-white transition-colors">
        <div className="cv-connect-prompt">
          <div className="w-14 h-14 mx-auto mb-4 bg-cyan-400/10 rounded-full flex items-center justify-center">
            <Code className="w-12 h-12 text-[#4ade80]" />
          </div>
          <h2>Connect your coding platforms</h2>
          <p>
            Bring your stats into Xorbits to track progress and compare your coding journey.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="cv-connect-button"
          >
            Connect platforms
          </button>
        </div>
        <CommunitySection />
      </div>
    );
  }

  return (
    <div className="dashboard-page min-h-full text-gray-900 dark:text-white transition-colors">
      <div className="dashboard-content">
          {isOwnProfile && <CommunitySection />}
          <div className="dashboard-shell">
            <aside className="dashboard-profile-column">
              <ProfileSection
                displayUser={displayUser}
                connectedPlatforms={connectedPlatforms}
                codeforcesStats={platformStats.codeforces}
                totalProblems={totalProblems}
                isOwnProfile={isOwnProfile}
                navigate={navigate}
                getPlatformUrl={getPlatformUrl}
              />
              <SyncButtonSection isOwnProfile={isOwnProfile} syncing={syncing} cooldownRemaining={cooldownRemaining} handleSync={handleSync} formatCooldown={formatCooldown} SYNC_COOLDOWN_MS={SYNC_COOLDOWN_MS} getLastSync={getLastSync} />
              <QuickLinksSection navigate={navigate} />
            </aside>

            <main className="dashboard-main-column">
              <div className="dashboard-overview">
                <StatsRow
                  totalProblems={totalProblems}
                  activeDays={contributionCalendar?.stats?.activeDays || userData?.totals?.activeDays || 0}
                />
                <div className="dashboard-card dashboard-heatmap-card">
                  <ContributionCalendar calendarData={contributionCalendar} connectedPlatforms={connectedPlatforms} />
                </div>
              </div>

              <div className="dashboard-secondary-grid">
                <ContestsSection totalContests={totalContests} contestsByPlatform={contestsByPlatform} PlatformIcon={PlatformIcon} getPlatformColor={getPlatformColor} />
                <ProblemsBreakdown platformStats={platformStats} dsaProblems={dsaProblems} cpProblems={cpProblems} PLATFORM_CONFIG={PLATFORM_CONFIG} PlatformIcon={PlatformIcon} />
              </div>

              <Suspense fallback={<div className="dashboard-card flex h-64 items-center justify-center text-gray-500">Loading chart...</div>}>
                <RatingChart
                  ratingHistory={ratingHistory}
                  allRatingHistory={allRatingHistory}
                  selectedRatingPlatform={selectedRatingPlatform}
                  setSelectedRatingPlatform={setSelectedRatingPlatform}
                  platformStats={platformStats}
                  platformRatingColors={platformRatingColors}
                />
              </Suspense>

              <div 
                onClick={() => navigate('/sheets')}
                className="dashboard-promo-card cursor-pointer transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFA116] text-[#171717]">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white">DSA Sheets</h3>
                    <p className="text-sm text-gray-400">Keep your progress moving with a structured problem roadmap.</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#FFA116]" />
                </div>
              </div>

              <TopicAnalysisSection topicAnalysis={topicAnalysis} navigate={navigate} PLATFORM_CONFIG={PLATFORM_CONFIG} PlatformIcon={PlatformIcon} />
            </main>
          </div>
      </div>
    </div>
  );
};

// ============== Extracted Dashboard Sub-Components ==============

const CommunitySection = () => (
  <section className="mb-4 flex flex-col gap-4 rounded-2xl border border-indigo-400/20 bg-gradient-to-r from-indigo-950/80 via-[#17152b] to-[#10121b] p-5 shadow-lg shadow-indigo-950/20 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#5865F2]/15 text-[#8b95ff]">
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-white">Join the Xorbits community</h2>
        <p className="mt-1 text-sm text-gray-400">
          Meet fellow coders, share your progress, and stay up to date with Xorbits.
        </p>
      </div>
    </div>
    <a
      href="https://discord.gg/WXNTQdJuY"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4752c4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b95ff]"
    >
      Join Discord
      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
    </a>
  </section>
);

const ProfileSection = React.memo(({ displayUser, connectedPlatforms, codeforcesStats, totalProblems, isOwnProfile, navigate, getPlatformUrl }) => {
  const codeforcesRank = getCodeforcesMaxRank(codeforcesStats);

  return (
    <section className="dashboard-profile-card">
      <div className="dashboard-profile-sidebar-summary">
        <div className="dashboard-avatar">
          {displayUser?.avatar ? (
            <img src={displayUser.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{displayUser?.fullName?.[0] || displayUser?.username?.[0] || 'U'}</span>
          )}
        </div>
        <div className="dashboard-profile-name">
          <h2>{displayUser?.fullName || 'Coder'}</h2>
          <p>@{displayUser?.username || 'coder'}</p>
          <span className="dashboard-profile-total" title="Total questions solved across connected platforms">
            <strong>{Number(totalProblems).toLocaleString()}</strong>
            <span>questions solved</span>
          </span>
        </div>
        {codeforcesRank && (
          <span className="dashboard-rank-badge" title="Codeforces highest rank">
            Codeforces · {codeforcesRank}
          </span>
        )}
        <div className="dashboard-profile-meta">
          {displayUser?.location && <span><MapPin className="h-3.5 w-3.5" />{displayUser.location}</span>}
          {displayUser?.institution && <span><Building className="h-3.5 w-3.5" />{displayUser.institution}</span>}
        </div>
        {displayUser?.bio && <p className="dashboard-profile-bio">{displayUser.bio}</p>}
        {isOwnProfile && (
          <button onClick={() => navigate('/settings')} className="dashboard-outline-button">
            Edit Profile
          </button>
        )}
      </div>

      <div className="dashboard-sidebar-platforms">
        <div className="dashboard-sidebar-section-heading">
          <h3>Connected platforms</h3>
          <span>{connectedPlatforms.length}</span>
        </div>
        {connectedPlatforms.length > 0 ? connectedPlatforms.map(platform => {
          const stats = platform.stats || {};
          const isGithub = platform.key === 'github';
          const count = Number(isGithub
            ? (stats.totalContributions || stats.allTimeContributions || stats.contributions || 0)
            : (stats.totalSolved || stats.problemsSolved || 0));
          const rating = Number(stats.rating || stats.currentRating || 0);
          const maxRating = Number(stats.maxRating || rating || 0);
          const rank = platform.key === 'codeforces' ? getCodeforcesMaxRank(stats) : null;
          return (
            <a
              key={platform.key}
              href={getPlatformUrl(platform.key, platform.username)}
              target="_blank"
              rel="noopener noreferrer"
              className="dashboard-sidebar-platform"
            >
              <div className="dashboard-platform-icon">
                <PlatformIcon platform={platform.key} className="h-5 w-5" color={platform.color} />
              </div>
              <div className="dashboard-sidebar-platform-info">
                <div className="dashboard-sidebar-platform-name">
                  <span>{platform.name}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
                <span className="dashboard-sidebar-platform-username">@{platform.username}</span>
                {rating > 0 ? (
                  <div className="dashboard-sidebar-platform-rating">
                    <span>Rating <strong>{rating.toLocaleString()}</strong></span>
                    <span>Max <strong>{maxRating.toLocaleString()}</strong></span>
                  </div>
                ) : (
                  <span className="dashboard-sidebar-platform-solved">
                    {count.toLocaleString()} {isGithub ? 'contributions' : 'solved'}
                  </span>
                )}
                {rank && <span className="dashboard-platform-rank">{rank}</span>}
              </div>
              {rating > 0 && <span className="dashboard-sidebar-platform-count">{count.toLocaleString()}</span>}
            </a>
          );
        }) : (
          <button onClick={() => navigate('/settings')} className="dashboard-add-platform">
            + Connect your first coding platform
          </button>
        )}
      </div>
    </section>
  );
});

const StatsRow = React.memo(({ totalProblems, activeDays }) => (
  <div className="dashboard-summary-stats">
    <div className="dashboard-card dashboard-stat-card dashboard-stat-card-primary">
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Questions Solved</p>
      <p className="dashboard-stat-value">{Number(totalProblems).toLocaleString()}</p>
      <span className="dashboard-stat-note"><span className="dashboard-live-dot" /> Across connected platforms</span>
    </div>
    <div className="dashboard-card dashboard-stat-card">
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Active Days</p>
      <p className="dashboard-stat-value">{Number(activeDays).toLocaleString()}</p>
      <span className="dashboard-stat-note"><span className="dashboard-live-dot" /> Keep your streak alive</span>
    </div>
  </div>
));

const ContestsSection = React.memo(({ totalContests, contestsByPlatform, PlatformIcon, getPlatformColor }) => (
  <div className="dashboard-card dashboard-contests-card">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500">Contests entered</p>
        <p className="mt-2 text-3xl font-bold text-white">{Number(totalContests).toLocaleString()}</p>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#22c55e]/10 text-[#4ade80]">
        <Trophy className="h-5 w-5" />
      </div>
    </div>
    <div className="mt-4 space-y-2 border-t border-white/5 pt-3">
        {contestsByPlatform.length > 0 ? (
          contestsByPlatform.map(item => (
            <div key={item.platform} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={item.platform} className="w-4 h-4" color={getPlatformColor(item.platform)} />
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.count}</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-500">Participate to see platform breakdown</p>
        )}
    </div>
  </div>
));

const TopicAnalysisSection = React.memo(({ topicAnalysis, navigate, PLATFORM_CONFIG, PlatformIcon }) => (
  topicAnalysis.length > 0 ? (
    <div className="dashboard-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Code className="w-5 h-5 text-amber-500" /> DSA Topic Analysis
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{topicAnalysis.length} topics</span>
        </div>
      </div>
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar-thin">
        {topicAnalysis.slice(0, 15).map((topic, idx) => {
          const maxCount = topicAnalysis[0]?.total || 1;
          const percentage = (topic.total / maxCount) * 100;
          const barColors = ['#4ade80', '#22c55e', '#86efac', '#a3e635', '#34d399'];
          const barColor = barColors[idx % barColors.length];
          return (
            <div key={idx} className="group">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {idx < 3 && <span className="mr-1">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>}
                  {topic.name}
                </span>
                <span className="text-sm font-semibold" style={{ color: barColor }}>{topic.total}</span>
              </div>
              <div className="h-2.5 bg-gray-200 dark:bg-[#1a1a2e] rounded-full overflow-hidden transition-colors">
                <div className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${percentage}%`, backgroundColor: barColor, boxShadow: `0 0 8px ${barColor}40` }}
                />
              </div>
              {Object.keys(topic.platforms || {}).length > 0 && (
                <div className="flex gap-3 mt-1 items-center">
                  {Object.entries(topic.platforms || {}).map(([p, v]) => (
                    <span key={p} className="text-xs flex items-center gap-1" style={{ color: PLATFORM_CONFIG[p]?.color || '#999' }}>
                      <PlatformIcon platform={p} className="w-3 h-3" color={PLATFORM_CONFIG[p]?.color} /> {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  ) : (
    <div className="dashboard-card p-5">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <Code className="w-5 h-5 text-amber-500" /> DSA Topic Analysis
      </h3>
      <div className="text-center py-6">
        <div className="flex justify-center mb-3"><BookOpen className="w-10 h-10 text-gray-400 dark:text-gray-600" /></div>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">No topic data available</p>
        <p className="text-gray-500 text-xs">Connect LeetCode or Codeforces and sync to see your topic-wise progress</p>
      </div>
    </div>
  )
));

const ProblemsBreakdown = React.memo(({ platformStats, dsaProblems, cpProblems, PLATFORM_CONFIG, PlatformIcon }) => (
  <div className="dashboard-card p-5">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Problems Solved</h3>
    <div className="mb-6">
      <p className="text-sm text-gray-400 mb-3">Fundamentals</p>
      <div className="flex items-center gap-4">
        <CircularProgress value={platformStats.hackerrank?.problemsSolved || 0} max={100} size={80} strokeWidth={8} color="#00EA64" />
        <div>
          <div className="flex items-center gap-2">
            <PlatformIcon platform="hackerrank" className="w-5 h-5 text-green-500" color={PLATFORM_CONFIG['hackerrank']?.color} />
            <span className="text-sm text-gray-300">HackerRank</span>
            <span className="text-sm font-semibold text-white">{platformStats.hackerrank?.problemsSolved || 0}</span>
          </div>
        </div>
      </div>
    </div>
    <div className="mb-6">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">DSA</p>
      <div className="flex items-center gap-4">
        <CircularProgress value={dsaProblems.total} max={Math.max(dsaProblems.total + 50, 500)} size={80} strokeWidth={8} color="#22c55e" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-green-500">Easy</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{dsaProblems.easy}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-amber-500">Medium</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{dsaProblems.medium}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-red-500">Hard</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{dsaProblems.hard}</span>
          </div>
        </div>
      </div>
    </div>
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Competitive Programming</p>
      <div className="flex items-center gap-4">
        <CircularProgress value={cpProblems.total} max={500} size={80} strokeWidth={8} color="#22c55e" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <PlatformIcon platform="codechef" className="w-5 h-5" color={PLATFORM_CONFIG['codechef']?.color} />
            <span className="text-sm text-gray-600 dark:text-gray-300">Codechef</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{cpProblems.codechef}</span>
          </div>
          <div className="flex items-center gap-2">
            <PlatformIcon platform="codeforces" className="w-5 h-5" color={PLATFORM_CONFIG['codeforces']?.color} />
            <span className="text-sm text-gray-600 dark:text-gray-300">Codeforces</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{cpProblems.codeforces}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
));

const SyncButtonSection = React.memo(({ isOwnProfile, syncing, cooldownRemaining, handleSync, formatCooldown, SYNC_COOLDOWN_MS, getLastSync }) => (
  isOwnProfile && (
    <div className="space-y-2">
      <button
        onClick={handleSync}
        disabled={syncing || cooldownRemaining > 0}
        className={`w-full font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
          cooldownRemaining > 0
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-[#FFA116] hover:bg-[#ffb84d] disabled:bg-[#FFA116]/50 text-[#171717]'
        }`}
      >
        <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
        {syncing
          ? 'Syncing all platforms...'
          : cooldownRemaining > 0
            ? `Sync available in ${formatCooldown(cooldownRemaining)}`
            : 'Sync All Platforms'}
      </button>
      {cooldownRemaining > 0 && (
        <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-[#FFA116]/60 rounded-full transition-all duration-1000"
            style={{ width: `${((SYNC_COOLDOWN_MS / 1000 - cooldownRemaining) / (SYNC_COOLDOWN_MS / 1000)) * 100}%` }}
          />
        </div>
      )}
      {(() => {
        const stored = getLastSync();
        if (!stored) return <p className="text-xs text-gray-500 text-center">Never synced — syncing automatically...</p>;
        const mins = Math.floor((Date.now() - Number(stored)) / 60000);
        const label = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
        return <p className="text-xs text-gray-500 text-center">Last synced: {label}</p>;
      })()}
      <p className="text-[10px] text-gray-600 text-center">Refreshes problem counts, ratings, and contest data from all platforms</p>
    </div>
  )
));

const QuickLinksSection = React.memo(({ navigate }) => (
  <div className="dashboard-card p-5">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
    <div className="space-y-2">
      <button onClick={() => navigate('/platforms')} className="w-full text-left p-3 bg-gray-100 dark:bg-[#1a1a2e] rounded-lg hover:bg-gray-200 dark:hover:bg-[#252538] transition-colors flex items-center justify-between">
        <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"><Code className="w-4 h-4" /> Platforms</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </button>
      <button onClick={() => navigate('/societies')} className="w-full text-left p-3 bg-gray-100 dark:bg-[#1a1a2e] rounded-lg hover:bg-gray-200 dark:hover:bg-[#252538] transition-colors flex items-center justify-between">
        <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"><Users className="w-4 h-4" /> Societies</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </button>
      <button onClick={() => navigate('/daily-challenge')} className="w-full text-left p-3 bg-gray-100 dark:bg-[#1a1a2e] rounded-lg hover:bg-gray-200 dark:hover:bg-[#252538] transition-colors flex items-center justify-between">
        <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"><Zap className="w-4 h-4" /> Daily Challenge</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  </div>
));

// Helper function to get platform URLs
const getPlatformUrl = (platform, username) => {
  const cfg = PLATFORM_CONFIG[platform];
  if (cfg?.url) return cfg.url(username);
  return '#';
};

export default Dashboard;
