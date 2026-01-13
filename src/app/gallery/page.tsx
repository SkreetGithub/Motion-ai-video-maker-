"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function GalleryPage() {
  const [viewOption, setViewOption] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [showAllVideos, setShowAllVideos] = useState(false);

  // Load user name from localStorage
  useEffect(() => {
    const savedUserName = localStorage.getItem("videoMaker_userName");
    if (savedUserName) {
      setUserName(savedUserName);
    }
  }, []);

  // Fetch videos from API
  useEffect(() => {
    fetchVideos();
  }, [userName, showAllVideos]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      // Filter by user name if available and not showing all videos
      const userId = userName && !showAllVideos ? userName : null;
      const url = userId 
        ? `/api/videos?limit=50&userId=${encodeURIComponent(userId)}`
        : "/api/videos?limit=50";
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setVideos(data.videos || []);
      } else {
        setError(data.error || "Failed to load videos");
      }
    } catch (err: any) {
      console.error("Error fetching videos:", err);
      setError(err.message || "Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Format date to relative time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  // Mock data fallback - replace with actual API calls
  const mockVideos = [
    {
      id: "1",
      title: "Time Traveler",
      duration: "02:15",
      category: "Sci-Fi",
      rating: 5,
      createdAt: "3 hours ago",
      thumbnail: "🎞️",
      scenes: "18/20",
      cost: "$2.70",
    },
    {
      id: "2",
      title: "Robot Learns to Paint",
      duration: "00:45",
      category: "Sci-Fi",
      rating: 4,
      createdAt: "1 day ago",
      thumbnail: "🎬",
      scenes: "8/8",
      cost: "$1.20",
    },
    {
      id: "3",
      title: "Magic Forest Adventure",
      duration: "01:30",
      category: "Fantasy",
      rating: 5,
      createdAt: "2 days ago",
      thumbnail: "✨",
      scenes: "15/15",
      cost: "$1.80",
    },
    {
      id: "4",
      title: "Startup Pitch Video",
      duration: "01:00",
      category: "Business",
      rating: 4,
      createdAt: "3 days ago",
      thumbnail: "📊",
      scenes: "10/10",
      cost: "$0.90",
    },
  ];

  const viewOptions = [
    { value: "recent", label: "📅 Recently Created" },
    { value: "favorites", label: "⭐ Favorites" },
    { value: "projects", label: "📁 Projects" },
    { value: "tags", label: "🏷️ By Tag/Category" },
  ];

  const filteredVideos = (videos.length > 0 ? videos : mockVideos).map((video: any) => ({
    id: video.id,
    title: video.title || "Untitled Video",
    duration: video.total_duration ? formatDuration(video.total_duration) : "00:00",
    category: video.metadata?.contentType || "General",
    rating: 5,
    createdAt: video.created_at ? formatDate(video.created_at) : "Unknown",
    thumbnail: "🎞️",
    scenes: `${video.successful_scenes || 0}/${video.total_scenes || 0}`,
    cost: video.metadata?.cost ? `$${video.metadata.cost.toFixed(2)}` : "$0.00",
    status: video.status || "completed",
    userName: video.user_id || "Unknown",
  })).filter((video) =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              🎬 My Video Library
            </h1>
            {userName && (
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-4 py-2 rounded-lg">
                  <span className="text-white/80 text-sm">👤 </span>
                  <span className="text-white font-semibold">{userName}</span>
                </div>
                <button
                  onClick={() => {
                    setShowAllVideos(!showAllVideos);
                    fetchVideos();
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    showAllVideos
                      ? "bg-white/30 text-white"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {showAllVideos ? "👁️ Show My Videos" : "🌐 Show All Videos"}
                </button>
              </div>
            )}
          </div>

          {!userName && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 text-white mb-6">
              <p className="font-semibold">ℹ️ No user name set</p>
              <p className="text-sm text-white/80">
                Go to <Link href="/create" className="underline">Create Video</Link> and enter your name to save videos under your account.
              </p>
            </div>
          )}

          {/* View Options */}
          <div className="flex flex-wrap gap-2 mb-6">
            {viewOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setViewOption(option.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewOption === option.value
                    ? "bg-white text-purple-600"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="🔍 Search Videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-96 px-4 py-3 pl-10 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">
              🔍
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-spin">⚡</div>
            <p className="text-white/80 text-lg">Loading videos...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-white mb-6">
            <p className="font-semibold">❌ Error:</p>
            <p>{error}</p>
            <button
              onClick={fetchVideos}
              className="mt-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Video Grid */}
        {!loading && filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map((video) => (
              <Link
                key={video.id}
                href={`/video/${video.id}`}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all transform hover:scale-105 cursor-pointer"
              >
                <div className="text-6xl mb-4 text-center">{video.thumbnail}</div>
                <h3 className="text-xl font-bold text-white mb-2">{video.title}</h3>
                <div className="space-y-1 text-white/80 text-sm mb-4">
                  <div className="flex items-center justify-between">
                    <span>👤 Creator:</span>
                    <span className="font-semibold">{video.userName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Duration:</span>
                    <span className="font-semibold">{video.duration}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Category:</span>
                    <span className="font-semibold">{video.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Scenes:</span>
                    <span className="font-semibold">{video.scenes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cost:</span>
                    <span className="font-semibold">{video.cost}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={i < video.rating ? "text-yellow-400" : "text-white/30"}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                  <span className="text-white/60 text-xs">{video.createdAt}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      // Handle favorite
                    }}
                    className="flex-1 bg-white/20 text-white px-3 py-2 rounded-lg hover:bg-white/30 transition-colors text-sm"
                  >
                    ⭐ Favorite
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      // Handle download
                    }}
                    className="flex-1 bg-white/20 text-white px-3 py-2 rounded-lg hover:bg-white/30 transition-colors text-sm"
                  >
                    📥 Download
                  </button>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-3xl font-bold text-white mb-4">No videos yet</h2>
            <p className="text-white/80 text-lg mb-8">Create your first masterpiece!</p>
            <Link
              href="/create"
              className="bg-white text-purple-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/90 transition-all inline-block"
            >
              Create Your First Video
            </Link>
          </div>
        )}

        {/* Project Save Section */}
        <div className="mt-12 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">📁 Save As Project</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-white/80 mb-2">Project Name</label>
              <input
                type="text"
                placeholder="Enter project name..."
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <div>
              <label className="block text-white/80 mb-2">Folder Selection</label>
              <select className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/50">
                <option>📂 Personal Projects</option>
                <option>📂 Client Work</option>
                <option>📂 Portfolio Pieces</option>
                <option>➕ Create New Folder...</option>
              </select>
            </div>
            <div>
              <label className="block text-white/80 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/20 text-white rounded-lg text-sm">#scifi</span>
                <span className="px-3 py-1 bg-white/20 text-white rounded-lg text-sm">#time-travel</span>
                <span className="px-3 py-1 bg-white/20 text-white rounded-lg text-sm">#cinematic</span>
                <input
                  type="text"
                  placeholder="Add tag..."
                  className="px-3 py-1 bg-white/20 border border-white/30 text-white placeholder-white/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

