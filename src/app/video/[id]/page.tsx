"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function VideoPage() {
  const params = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVideo();
  }, [params.id]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/videos/${params.id}`);
      const data = await response.json();
      
      if (data.success && data.video) {
        setVideo(data.video);
      } else {
        setError(data.error || "Video not found");
      }
    } catch (err: any) {
      console.error("Error fetching video:", err);
      setError(err.message || "Failed to load video");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚡</div>
          <p className="text-white/80 text-lg">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/gallery" className="text-white/80 hover:text-white mb-6 inline-block">
            ← Back to Gallery
          </Link>
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-8 text-white text-center">
            <p className="font-semibold text-xl mb-2">❌ Error</p>
            <p>{error || "Video not found"}</p>
            <Link
              href="/gallery"
              className="mt-4 inline-block bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-white/90"
            >
              Back to Gallery
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const scenes = video.scenes_data || [];
  const isGenerating = video.status === "generating" || video.status === "pending";

  if (isGenerating) {
    const progress = video.successful_scenes && video.total_scenes 
      ? Math.round((video.successful_scenes / video.total_scenes) * 100) 
      : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-6">⚡ Generating Your Movie...</h2>
            
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-white mb-2">
                <span>Progress: {progress}% Complete</span>
                <span>{video.successful_scenes || 0}/{video.total_scenes || 0} scenes</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-4">
                <div
                  className="bg-white h-4 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Scene Status */}
            {scenes.length > 0 && (
              <div className="space-y-3 mb-6">
                <h3 className="text-white font-semibold text-lg">Scene Status:</h3>
                {scenes.map((scene: any, index: number) => (
                  <div
                    key={scene.scene || index}
                    className="bg-white/10 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">✅</span>
                      <div>
                        <div className="text-white font-medium">
                          Scene {scene.scene || index + 1}
                        </div>
                        <div className="text-white/60 text-sm">
                          {scene.duration}s • {scene.model || "Unknown"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <Link href="/gallery" className="text-white/80 hover:text-white mb-6 inline-block">
          ← Back to Gallery
        </Link>

        {/* Video Player */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6">
          {scenes.length > 0 && scenes[0].video_url ? (
            <div className="aspect-video bg-black rounded-lg mb-4 overflow-hidden">
              <video
                controls
                className="w-full h-full"
                src={scenes[0].video_url}
                poster={scenes[0].video_url}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <div className="aspect-video bg-black/30 rounded-lg mb-4 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🎥</div>
                <p className="text-white/80">Video not available</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30">
              ⏯️ Play
            </button>
            <button className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30">
              📥 Download
            </button>
          </div>
        </div>

        {/* Video Details */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">📊 Video Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-white/80">
            <div>
              <div className="text-white/60 text-sm">👤 Creator</div>
              <div className="text-white font-semibold">{video.user_id || "Unknown"}</div>
            </div>
            <div>
              <div className="text-white/60 text-sm">Duration</div>
              <div className="text-white font-semibold">{formatDuration(video.total_duration || 0)}</div>
            </div>
            <div>
              <div className="text-white/60 text-sm">Resolution</div>
              <div className="text-white font-semibold">4K</div>
            </div>
            <div>
              <div className="text-white/60 text-sm">Scenes</div>
              <div className="text-white font-semibold">
                {video.successful_scenes || 0}/{video.total_scenes || 0} successful
              </div>
            </div>
            <div>
              <div className="text-white/60 text-sm">Cost</div>
              <div className="text-white font-semibold">
                ${video.metadata?.cost?.toFixed(2) || "0.00"}
              </div>
            </div>
            <div>
              <div className="text-white/60 text-sm">Generated</div>
              <div className="text-white font-semibold">
                {formatDate(video.created_at)}
              </div>
            </div>
            <div>
              <div className="text-white/60 text-sm">Status</div>
              <div className="text-white font-semibold capitalize">{video.status || "completed"}</div>
            </div>
          </div>
        </div>

        {/* Scene Editor */}
        {scenes.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">✏️ Scene Editor</h2>
            <div className="space-y-4">
              {scenes.slice(0, 5).map((scene: any, index: number) => (
                <div
                  key={scene.scene || index}
                  className="bg-white/10 rounded-lg p-4 border border-white/20"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold text-lg">
                        Scene {scene.scene || index + 1}
                      </h3>
                      <div className="text-white/60 text-sm mt-1">
                        Status: ✅ Generated • Duration: {scene.duration}s • Model: {scene.model || "Unknown"}
                      </div>
                    </div>
                    {scene.video_url && (
                      <div className="w-24 h-16 bg-black/30 rounded flex items-center justify-center text-2xl">
                        🎬
                      </div>
                    )}
                  </div>
                  {scene.video_url && (
                    <div className="mb-3">
                      <video
                        controls
                        className="w-full rounded"
                        src={scene.video_url}
                        style={{ maxHeight: "200px" }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 text-sm">
                      ✏️ Edit Prompt
                    </button>
                    <button className="px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 text-sm">
                      🔄 Regenerate
                    </button>
                    <button className="px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 text-sm">
                      📥 Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completion Actions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">
            🎉 Your Movie Is Ready!
          </h2>
          <p className="text-white/80 mb-6">
            "{video.title}" • {formatDuration(video.total_duration || 0)} • {video.successful_scenes || 0} Scenes
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/gallery"
              className="px-6 py-4 bg-white text-purple-600 rounded-lg font-bold hover:bg-white/90 transition-colors text-center"
            >
              💾 Back to Gallery
            </Link>
            <Link
              href="/create"
              className="px-6 py-4 bg-white/20 text-white rounded-lg font-bold hover:bg-white/30 transition-colors border border-white/30 text-center"
            >
              🎬 Create Another
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
