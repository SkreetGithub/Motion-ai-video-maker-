"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    userName: "",
    storyPrompt: "",
    contentType: "",
    characterIds: [] as string[],
    customDuration: 120, // Custom duration in seconds (30s to 7200s / 2 hours)
    sceneDuration: 6,
    modelPreference: "google/veo-3.1-fast",
    qualityPriority: "quality" as "speed" | "quality",
    enableParallel: true,
    budget: 0,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [characters, setCharacters] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPreset, setIsGeneratingPreset] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [isAborting, setIsAborting] = useState(false);

  // Load user name from localStorage on mount
  useEffect(() => {
    const savedUserName = localStorage.getItem("videoMaker_userName");
    if (savedUserName) {
      setFormData((prev) => ({ ...prev, userName: savedUserName }));
    }
  }, []);

  // Fetch characters from API
  useEffect(() => {
    fetch("/api/characters")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCharacters(data.characters);
        }
      })
      .catch((err) => {
        console.error("Error fetching characters:", err);
        // Fallback to default characters
        setCharacters([
          { id: "char-1", name: "🧑‍🔬 Dr. Aris Thorne", personality: "Sci-Fi Explorer" },
          { id: "char-2", name: "🦸‍♂️ Captain Vector", personality: "Space Hero" },
          { id: "char-3", name: "🧙‍♀️ Lyra Moonwhisper", personality: "Fantasy Mage" },
          { id: "char-4", name: "🕵️‍♂️ Detective Kairo", personality: "Noir Detective" },
          { id: "char-5", name: "👨‍🚀 Nova Pilot", personality: "Astronaut" },
        ]);
      });
  }, []);

  const contentTypes = [
    { value: "short-film", label: "🎭 Short Film / Narrative" },
    { value: "educational", label: "📚 Educational / Explainer" },
    { value: "game-cinematic", label: "🎮 Game Cinematic / Trailer" },
    { value: "social-media", label: "📱 Social Media Content" },
    { value: "corporate", label: "🏢 Corporate / Training" },
    { value: "artistic", label: "🎨 Artistic / Experimental" },
    { value: "custom", label: "✨ Custom / Other" },
  ];

  // AI Story Presets
  const storyPresets = [
    {
      name: "Sci-Fi Adventure",
      prompt: "A thrilling sci-fi adventure where a team of explorers discovers an ancient alien civilization on a distant planet. The story follows their journey through mysterious ruins, encountering advanced technology and facing moral dilemmas about first contact. Focus on discovery, wonder, and the tension between scientific curiosity and ethical responsibility.",
      contentType: "short-film",
      duration: 120,
    },
    {
      name: "Time Travel Mystery",
      prompt: "A time-traveling historian discovers a conspiracy that spans multiple eras. The story weaves between 1920s Paris, ancient Rome, and a dystopian future, revealing how one person's actions in the past could change everything. Focus on mystery, suspense, and the butterfly effect of time travel.",
      contentType: "short-film",
      duration: 180,
    },
    {
      name: "Fantasy Quest",
      prompt: "A young mage embarks on a quest to save their kingdom from an ancient darkness. Along the way, they discover hidden powers, form unlikely alliances, and learn that true magic comes from within. Focus on character growth, epic battles, and the power of friendship.",
      contentType: "short-film",
      duration: 150,
    },
    {
      name: "Noir Detective",
      prompt: "A hard-boiled detective investigates a series of mysterious disappearances in a rain-soaked city. The case leads through dark alleys, smoky jazz clubs, and corrupt institutions. Focus on atmosphere, moral ambiguity, and the detective's personal demons.",
      contentType: "short-film",
      duration: 120,
    },
    {
      name: "Space Opera",
      prompt: "In a galaxy torn by war, a rogue pilot and their crew must deliver a mysterious cargo that could change the fate of the universe. Pursued by ruthless bounty hunters and corrupt officials, they navigate through asteroid fields, space stations, and alien worlds. Focus on action, adventure, and found family.",
      contentType: "short-film",
      duration: 200,
    },
    {
      name: "Corporate Training",
      prompt: "An engaging corporate training video explaining the importance of workplace safety and teamwork. The story follows employees in various scenarios, demonstrating best practices through realistic situations. Focus on clarity, engagement, and practical application.",
      contentType: "corporate",
      duration: 300,
    },
  ];

  const models = [
    { value: "google/veo-3.1-fast", label: "🏆 Premium Quality ($0.015/sec)", cost: 0.015 },
    { value: "luma/dream-machine", label: "🎬 Balanced Professional ($0.01/sec)", cost: 0.01 },
    { value: "stability-ai/svd", label: "💰 Budget Friendly ($0.008/sec)", cost: 0.008 },
    { value: "anotherjesse/zeroscope-v2-xl", label: "⚡ Ultra Budget ($0.007/sec)", cost: 0.007 },
  ];


  const calculateCost = () => {
    const totalScenes = Math.ceil(formData.customDuration / formData.sceneDuration);
    const model = models.find(m => m.value === formData.modelPreference);
    if (!model) return 0;
    return totalScenes * formData.sceneDuration * model.cost;
  };

  const estimatedTime = () => {
    const totalScenes = Math.ceil(formData.customDuration / formData.sceneDuration);
    return Math.ceil(totalScenes * 0.4); // ~24 seconds per scene average
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const handleGeneratePreset = (preset: typeof storyPresets[0]) => {
    setIsGeneratingPreset(true);
    setTimeout(() => {
      setFormData({
        ...formData,
        storyPrompt: preset.prompt,
        contentType: preset.contentType,
        customDuration: preset.duration,
      });
      setIsGeneratingPreset(false);
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setProgress(null);

    try {
      // Validate user name
      if (!formData.userName || formData.userName.trim().length < 2) {
        throw new Error("Please enter your name (at least 2 characters)");
      }

      // Validate duration (30 seconds to 2 hours / 7200 seconds)
      if (formData.customDuration < 30 || formData.customDuration > 7200) {
        throw new Error("Duration must be between 30 seconds and 2 hours (7200 seconds)");
      }

      // Save user name to localStorage
      localStorage.setItem("videoMaker_userName", formData.userName.trim());

      // For 30 seconds, use 10s scenes to get exactly 3 scenes
      let sceneDuration = formData.sceneDuration;
      if (formData.customDuration === 30) {
        sceneDuration = 10; // 30 seconds / 3 scenes = 10 seconds per scene
      }

      const response = await fetch("/api/create-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: formData.userName.trim(),
          baseStoryPrompt: formData.storyPrompt,
          characterIds: formData.characterIds,
          totalDurationSeconds: formData.customDuration,
          sceneDuration: sceneDuration,
          modelChain: formData.modelPreference ? [formData.modelPreference] : null,
          projectName: formData.contentType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create video");
      }

      // Store jobId for abort functionality
      if (data.jobId) {
        setCurrentJobId(data.jobId);
      }

      // Handle aborted generation
      if (data.aborted) {
        setIsSubmitting(false);
        setIsAborting(false);
        setCurrentJobId(null);
        setError("Generation was aborted. Partial progress has been saved.");
        if (data.movie?.dbRecord?.id) {
          router.push(`/video/${data.movie.dbRecord.id}`);
        }
        return;
      }

      // Redirect to video page or gallery
      if (data.movie?.dbRecord?.id) {
        router.push(`/video/${data.movie.dbRecord.id}`);
      } else if (data.movie?.movieId) {
        router.push(`/video/${data.movie.movieId}`);
      } else {
        router.push(`/gallery?created=true`);
      }
    } catch (err: any) {
      console.error("Error creating video:", err);
      setError(err.message || "Failed to create video. Please try again.");
      setIsSubmitting(false);
      setCurrentJobId(null);
    }
  };

  const handleAbort = async () => {
    if (!currentJobId) return;

    setIsAborting(true);
    try {
      const response = await fetch("/api/abort-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId: currentJobId }),
      });

      const data = await response.json();
      if (data.success) {
        setError("Generation aborted. Stopping current operations...");
        // Wait a moment for the abort to process
        setTimeout(() => {
          setIsSubmitting(false);
          setIsAborting(false);
          setCurrentJobId(null);
        }, 2000);
      } else {
        setError(data.error || "Failed to abort generation");
        setIsAborting(false);
      }
    } catch (err: any) {
      console.error("Error aborting video:", err);
      setError("Failed to abort generation. Please try again.");
      setIsAborting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Create Your Movie
          </h1>
          <p className="text-white/80 text-lg">
            Tell us your vision and we'll bring it to life
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Name Input */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <label className="block text-white font-semibold mb-3 text-lg">
              👤 Your Name
            </label>
            <p className="text-white/70 text-sm mb-4">
              Enter your name to save videos under your account. This will be saved for future use.
            </p>
            <input
              type="text"
              value={formData.userName}
              onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
              placeholder="Enter your name (e.g., John Doe)"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              required
              minLength={2}
            />
          </div>

          {/* AI Generator Button */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <label className="block text-white font-semibold mb-3 text-lg">
              🤖 AI Story Generator
            </label>
            <p className="text-white/70 text-sm mb-4">
              Click a preset below to auto-fill a complete story, or write your own below.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {storyPresets.map((preset, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleGeneratePreset(preset)}
                  disabled={isGeneratingPreset}
                  className="p-4 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-left transition-all hover:scale-105 disabled:opacity-50"
                >
                  <div className="font-semibold text-white mb-1">{preset.name}</div>
                  <div className="text-white/60 text-xs">
                    {formatDuration(preset.duration)} • {preset.contentType}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Story Input */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <label className="block text-white font-semibold mb-3 text-lg">
              Tell Us Your Story Vision
            </label>
            <textarea
              value={formData.storyPrompt}
              onChange={(e) => setFormData({ ...formData, storyPrompt: e.target.value })}
              placeholder="Describe your video concept in detail. Be specific about:
• Main plot or message
• Setting and atmosphere
• Character interactions
• Key visual moments
• Desired emotional tone

Example: 'A sci-fi adventure where a time-traveling historian discovers ancient technology in 1920s Paris, blending steampunk aesthetics with futuristic elements. Focus on mystery, discovery, and the ethical dilemmas of changing history.'"
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
              rows={8}
              required
            />
          </div>

          {/* Content Type */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <label className="block text-white font-semibold mb-3 text-lg">
              What Are You Creating Today?
            </label>
            <select
              value={formData.contentType}
              onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
              required
            >
              <option value="">Select content type...</option>
              {contentTypes.map((type) => (
                <option key={type.value} value={type.value} className="bg-purple-600">
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Character Selection */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <label className="block text-white font-semibold mb-3 text-lg">
              Select Your Characters
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {characters.map((char) => (
                <label
                  key={char.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    formData.characterIds.includes(char.id)
                      ? "bg-white/30 border-2 border-white"
                      : "bg-white/10 border border-white/20 hover:bg-white/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.characterIds.includes(char.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          characterIds: [...formData.characterIds, char.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          characterIds: formData.characterIds.filter((id) => id !== char.id),
                        });
                      }
                    }}
                    className="w-5 h-5"
                  />
                  <div>
                    <div className="text-white font-medium">{char.name}</div>
                    <div className="text-white/60 text-sm">{char.personality || char.type}</div>
                  </div>
                </label>
              ))}
            </div>
            <button
              type="button"
              className="text-white/80 hover:text-white text-sm underline"
            >
              ➕ Create New Character...
            </button>
          </div>

          {/* Duration & Settings */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <label className="block text-white font-semibold mb-3 text-lg">
              Video Length & Settings
            </label>
            
            {/* Custom Duration Input */}
            <div className="mb-4">
              <label className="block text-white/80 mb-2">
                Total Duration: {formatDuration(formData.customDuration)} (30s - 2 hours)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  min="30"
                  max="7200"
                  value={formData.customDuration}
                  onChange={(e) => {
                    const value = Math.max(30, Math.min(7200, parseInt(e.target.value) || 30));
                    setFormData({ ...formData, customDuration: value });
                  }}
                  className="flex-1 px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                  required
                />
                <div className="text-white/60 text-sm whitespace-nowrap">
                  {formData.customDuration < 60 && `${formData.customDuration}s`}
                  {formData.customDuration >= 60 && formData.customDuration < 3600 && `${Math.floor(formData.customDuration / 60)}m ${formData.customDuration % 60}s`}
                  {formData.customDuration >= 3600 && `${Math.floor(formData.customDuration / 3600)}h ${Math.floor((formData.customDuration % 3600) / 60)}m`}
                </div>
              </div>
              {/* Scene Count Display */}
              <div className="mt-2 text-white/70 text-sm">
                {(() => {
                  const totalScenes = Math.ceil(formData.customDuration / formData.sceneDuration);
                  const adjustedScenes = formData.customDuration === 30 ? 3 : totalScenes;
                  const adjustedDuration = formData.customDuration === 30 ? 10 : formData.sceneDuration;
                  return `Will create ${adjustedScenes} scene${adjustedScenes !== 1 ? 's' : ''} (${adjustedDuration}s each)`;
                })()}
              </div>
              <div className="mt-2">
                <input
                  type="range"
                  min="30"
                  max="7200"
                  step="30"
                  value={formData.customDuration}
                  onChange={(e) => setFormData({ ...formData, customDuration: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-white/60 text-xs mt-1">
                  <span>30s</span>
                  <span className="font-semibold">Quick Presets:</span>
                  <span>2h</span>
                </div>
                <div className="flex justify-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, customDuration: 30 })}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-xs"
                  >
                    30s
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, customDuration: 120 })}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-xs"
                  >
                    2m
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, customDuration: 600 })}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-xs"
                  >
                    10m
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, customDuration: 3600 })}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-xs"
                  >
                    1h
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, customDuration: 7200 })}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-xs"
                  >
                    2h
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-white/80 mb-2">
                Scene Duration: {formData.sceneDuration}s
              </label>
              <input
                type="range"
                min="4"
                max="30"
                value={formData.sceneDuration}
                onChange={(e) => setFormData({ ...formData, sceneDuration: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-white/60 text-xs mt-1">
                <span>4s</span>
                <span className="font-semibold">Recommended: 6-8s</span>
                <span>30s</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/80">Quality Priority:</span>
              <div className="flex items-center space-x-4">
                <span className={`text-sm ${formData.qualityPriority === "speed" ? "text-white font-bold" : "text-white/60"}`}>
                  ⚡ Speed
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      qualityPriority: formData.qualityPriority === "speed" ? "quality" : "speed",
                    })
                  }
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    formData.qualityPriority === "quality" ? "bg-purple-500" : "bg-white/30"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      formData.qualityPriority === "quality" ? "translate-x-7" : ""
                    }`}
                  />
                </button>
                <span className={`text-sm ${formData.qualityPriority === "quality" ? "text-white font-bold" : "text-white/60"}`}>
                  🏆 Quality
                </span>
              </div>
            </div>
          </div>

          {/* Model Selection */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <label className="block text-white font-semibold mb-3 text-lg">
              Select Your Budget & Quality Preference
            </label>
            <select
              value={formData.modelPreference}
              onChange={(e) => setFormData({ ...formData, modelPreference: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {models.map((model) => (
                <option key={model.value} value={model.value} className="bg-purple-600">
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cost Estimate */}
          {formData.customDuration >= 30 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-white font-semibold mb-4 text-lg">💰 Cost Estimate</h3>
              <div className="space-y-2 text-white/80">
                <div className="flex justify-between">
                  <span>Total Duration:</span>
                  <span className="text-white font-semibold">
                    {formatDuration(formData.customDuration)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Scene Duration:</span>
                  <span className="text-white font-semibold">{formData.sceneDuration}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Model:</span>
                  <span className="text-white font-semibold">
                    {models.find((m) => m.value === formData.modelPreference)?.label.split("(")[0].trim()}
                  </span>
                </div>
                <div className="flex justify-between text-lg pt-2 border-t border-white/20">
                  <span className="text-white font-semibold">Estimated Cost:</span>
                  <span className="text-white font-bold text-xl">${calculateCost().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Time:</span>
                  <span className="text-white font-semibold">~{estimatedTime()} minutes</span>
                </div>
              </div>
              <p className="text-white/60 text-sm mt-4">
                💡 Tip: Longer scenes reduce total API calls, potentially lowering costs!
              </p>
            </div>
          )}

          {/* Advanced Options */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-white font-semibold text-lg"
            >
              <span>⚙️ Advanced Settings (Optional)</span>
              <span>{showAdvanced ? "▲" : "▼"}</span>
            </button>
            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-white/80 mb-2">Enable Parallel Processing</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, enableParallel: !formData.enableParallel })}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      formData.enableParallel ? "bg-purple-500" : "bg-white/30"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        formData.enableParallel ? "translate-x-7" : ""
                      }`}
                    />
                  </button>
                </div>
                <div>
                  <label className="block text-white/80 mb-2">Set Maximum Budget</label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-white/60 text-xs mt-1">
                    <span>$0</span>
                    <span className="font-semibold">${formData.budget}</span>
                    <span>$50</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-white">
              <p className="font-semibold">❌ Error:</p>
              <p>{error}</p>
            </div>
          )}

          {/* Progress Display */}
          {(progress || isSubmitting) && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">⚡ Generation Progress</h3>
                {currentJobId && (
                  <button
                    type="button"
                    onClick={handleAbort}
                    disabled={isAborting}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAborting ? "Aborting..." : "🛑 Abort Generation"}
                  </button>
                )}
              </div>
              {progress && (
                <div className="mb-2">
                  <div className="flex justify-between text-white mb-2">
                    <span>Progress: {progress.percentage || 0}%</span>
                    <span>{progress.status || "Starting..."}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-4">
                    <div
                      className="bg-white h-4 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage || 0}%` }}
                    />
                  </div>
                </div>
              )}
              {currentJobId && (
                <p className="text-white/60 text-sm mt-4">
                  💰 Click "Abort Generation" to stop and save money. Partial progress will be saved.
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !formData.storyPrompt || !formData.contentType || formData.characterIds.length === 0 || formData.customDuration < 30 || formData.customDuration > 7200}
            className="w-full bg-white text-purple-600 font-bold py-4 px-6 rounded-lg hover:bg-white/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creating Your Movie...
              </span>
            ) : (
              "🎬 Create My Movie"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

