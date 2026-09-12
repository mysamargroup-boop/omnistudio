"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { 
  Share2, Send, Calendar, Sparkles, Layers, Image as ImageIcon, Video, 
  Clock, CheckCircle2, AlertCircle, RefreshCw, BarChart3, TrendingUp, Plus, Trash2, Copy, Check, ExternalLink, Zap, Users,
  Globe, Flame, Smartphone,
  Repeat, ShieldCheck, Download, Upload, FolderArchive, X, Play, Search, Key,
  Heart, MessageCircle, Bookmark, ThumbsUp, ThumbsDown, Repeat2, MoreHorizontal, Music
} from "lucide-react";
import { api, getMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import SocialIcon from "@/components/social/SocialIcons";
import Dropdown from "@/components/ui/Dropdown";
import ModernScheduleDatePicker from "@/components/social/ModernScheduleDatePicker";


// Platforms metadata with brands and colors
const PLATFORMS = [
  { id: "instagram", name: "Instagram", category: "Visual & Reels", color: "#E1306C", icon: "IG", aspect: "9:16 / 1:1", maxChars: 2200 },
  { id: "tiktok", name: "TikTok", category: "Short-form Video", color: "#FE2C55", icon: "TT", aspect: "9:16", maxChars: 4000 },
  { id: "youtube_shorts", name: "YouTube Shorts", category: "Shorts", color: "#FF0000", icon: "YS", aspect: "9:16", maxChars: 100 },
  { id: "youtube_videos", name: "YouTube Video", category: "Long-form", color: "#CC0000", icon: "YT", aspect: "16:9", maxChars: 5000 },
  { id: "twitter", name: "X (Twitter)", category: "Microblogging", color: "#1DA1F2", icon: "X", aspect: "16:9", maxChars: 280 },
  { id: "linkedin_personal", name: "LinkedIn Personal", category: "Thought Leader", color: "#0A66C2", icon: "LI", aspect: "1:1 / 4:5", maxChars: 3000 },
  { id: "linkedin_company", name: "LinkedIn Company", category: "Corporate", color: "#004182", icon: "LC", aspect: "1.91:1", maxChars: 3000 },
  { id: "facebook_pages", name: "Facebook Pages", category: "Social & Video", color: "#1877F2", icon: "FB", aspect: "16:9 / 1:1", maxChars: 5000 },
  { id: "facebook_groups", name: "Facebook Groups", category: "Community", color: "#0A7CFF", icon: "FG", aspect: "1:1", maxChars: 5000 },
  { id: "threads", name: "Threads", category: "Conversational", color: "#000000", icon: "TH", aspect: "1:1", maxChars: 500 },
  { id: "pinterest", name: "Pinterest", category: "Discovery Pin", color: "#BD081C", icon: "PIN", aspect: "2:3", maxChars: 500 },
  { id: "snapchat", name: "Snapchat Spotlight", category: "Vertical Mobile", color: "#E5C500", icon: "SC", aspect: "9:16", maxChars: 250 },
  { id: "telegram", name: "Telegram Channel", category: "Direct Broadcast", color: "#229ED9", icon: "TG", aspect: "16:9", maxChars: 4096 },
  { id: "whatsapp", name: "WhatsApp Channel", category: "Mobile Broadcast", color: "#25D366", icon: "WA", aspect: "1:1", maxChars: 1024 },
  { id: "google_business", name: "Google Business", category: "Local SEO & CTA", color: "#4285F4", icon: "GB", aspect: "4:3", maxChars: 1500 },
];

function PublishStudioContent() {
  const [activeTab, setActiveTab] = useState<"compose" | "calendar" | "ai_manager" | "creator_mode" | "repurpose" | "thumbnail" | "analytics" | "accounts">("compose");

  // Compose State
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "instagram", "tiktok", "youtube_shorts", "twitter", "linkedin_personal"
  ]);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [adaptedData, setAdaptedData] = useState<Record<string, any>>({});
  const [previewPlatform, setPreviewPlatform] = useState("instagram");
  const [scheduledDate, setScheduledDate] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccessMessage, setPublishSuccessMessage] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // Media Staging & Vault Picker State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [vaultTab, setVaultTab] = useState<"all" | "images" | "videos">("all");
  const [vaultAssets, setVaultAssets] = useState<Array<{ filename: string; url: string; size_mb?: number; media_type: "image" | "video" }>>([]);
  const [isLoadingVault, setIsLoadingVault] = useState(false);
  const [vaultSearch, setVaultSearch] = useState("");
  const [recentAssets, setRecentAssets] = useState<Array<{ filename: string; url: string; size_mb?: number; media_type: "image" | "video" }>>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Cron Scheduler State
  const [cronStatus, setCronStatus] = useState<any>(null);
  const [isTriggeringCron, setIsTriggeringCron] = useState(false);
  const [cronTriggerMessage, setCronTriggerMessage] = useState<string | null>(null);

  // Calendar & Posts State
  const [posts, setPosts] = useState<any[]>([]);
  const [calendarFilter, setCalendarFilter] = useState("all");
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  // AI Social Media Manager State
  const [campaignGoal, setCampaignGoal] = useState("Launch our new luxury jewelry line with high-conversion aesthetic content");
  const [targetAudience, setTargetAudience] = useState("Modern luxury consumers & fashion trendsetters");
  const [durationDays, setDurationDays] = useState(7);
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [campaignPlan, setCampaignPlan] = useState<any>(null);

  // 1-Click Creator Mode State
  const [creatorConcept, setCreatorConcept] = useState("Cyberpunk Luxury Sports Car Night Drive");
  const [isGeneratingCreatorKit, setIsGeneratingCreatorKit] = useState(false);
  const [creatorKit, setCreatorKit] = useState<any>(null);

  // Repurposing State
  const [repurposeSource, setRepurposeSource] = useState("");
  const [isRepurposing, setIsRepurposing] = useState(false);
  const [repurposeData, setRepurposeData] = useState<any>(null);

  // Thumbnail Studio State
  const [thumbTitle, setThumbTitle] = useState("NEXT-GEN AI PRODUCTION MASTERCLASS");
  const [thumbFormat, setThumbFormat] = useState("youtube_16_9");
  const [thumbBadge, setThumbBadge] = useState("AI MASTERCLASS");
  const [thumbColor, setThumbColor] = useState("#10B981");
  const [isGeneratingThumb, setIsGeneratingThumb] = useState(false);
  const [generatedThumbUrl, setGeneratedThumbUrl] = useState<string | null>(null);

  // Analytics & Recommendations State
  const [analytics, setAnalytics] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);

  // Connected Accounts State
  const [accounts, setAccounts] = useState<any[]>([]);
  const [connectModalPlatform, setConnectModalPlatform] = useState<string | null>(null);
  const [accountNameInput, setAccountNameInput] = useState("");
  const [accountHandleInput, setAccountHandleInput] = useState("");

  // Workspaces & Agency State
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<string>("default");
  const [showWorkspaceModal, setShowWorkspaceModal] = useState<boolean>(false);
  const [newWsName, setNewWsName] = useState<string>("");
  const [newWsClient, setNewWsClient] = useState<string>("");
  const [newWsApprovalReq, setNewWsApprovalReq] = useState<boolean>(true);

  // Publishing Templates State
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [templateNameInput, setTemplateNameInput] = useState<string>("");

  // Compose Workflow Mode
  const [composePublishMode, setComposePublishMode] = useState<"instant" | "schedule" | "review" | "draft">("instant");

  // Load initial data & poll cron
  useEffect(() => {
    fetchPosts();
    fetchAnalytics();
    fetchAccounts();
    fetchWorkspaces();
    fetchTemplates();
    fetchCronStatus();

    const interval = setInterval(() => {
      fetchCronStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCronStatus = async () => {
    try {
      const res = await api.getCronStatus();
      setCronStatus(res);
    } catch (e) {
      console.error("Cron status error:", e);
    }
  };

  const handleRunDuePosts = async () => {
    setIsTriggeringCron(true);
    setCronTriggerMessage(null);
    try {
      const res = await api.runDueScheduledPosts();
      if (res.success) {
        setCronTriggerMessage(res.message || `Scheduler executed: ${res.published_count} due post(s) published!`);
        await Promise.all([fetchPosts(), fetchCronStatus(), fetchAnalytics()]);
        setTimeout(() => setCronTriggerMessage(null), 6000);
      } else {
        setCronTriggerMessage(res.message || "No due posts were found to publish.");
        setTimeout(() => setCronTriggerMessage(null), 4000);
      }
    } catch (e: any) {
      console.error(e);
      setCronTriggerMessage("Error triggering cron run.");
      setTimeout(() => setCronTriggerMessage(null), 4000);
    } finally {
      setIsTriggeringCron(false);
    }
  };

  const uploadMediaFile = async (file: File) => {
    setUploadError(null);
    setIsUploadingMedia(true);
    try {
      const res = await api.uploadPublishMedia(file);
      if (res.success && res.url) {
        setMediaUrl(res.url);
        setMediaType(res.media_type === "video" ? "video" : "image");
        fetchRecentAssets();
      } else {
        setUploadError("Failed to upload media file.");
      }
    } catch (err: any) {
      console.error("Media upload error:", err);
      setUploadError(err?.message || "Failed to upload media");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleMediaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMediaFile(file);
  };

  const fetchRecentAssets = async () => {
    try {
      const [imgRes, vidRes] = await Promise.allSettled([
        api.getVaultImages(),
        api.getVaultVideos()
      ]);
      const imagesList = (imgRes.status === "fulfilled" && imgRes.value?.files) 
        ? imgRes.value.files.map((f: any) => ({ ...f, media_type: "image" as const })) 
        : [];
      const videosList = (vidRes.status === "fulfilled" && vidRes.value?.files) 
        ? vidRes.value.files.map((f: any) => ({ ...f, media_type: "video" as const })) 
        : [];
      setRecentAssets([...imagesList, ...videosList].slice(0, 8));
    } catch (e) {
      console.error("Failed to load recent assets:", e);
    }
  };

  const openVaultPicker = async () => {
    setIsVaultModalOpen(true);
    setIsLoadingVault(true);
    try {
      const [imgRes, vidRes] = await Promise.allSettled([
        api.getVaultImages(),
        api.getVaultVideos()
      ]);
      
      const imagesList = (imgRes.status === "fulfilled" && imgRes.value?.files) 
        ? imgRes.value.files.map((f: any) => ({ ...f, media_type: "image" as const })) 
        : [];
      const videosList = (vidRes.status === "fulfilled" && vidRes.value?.files) 
        ? vidRes.value.files.map((f: any) => ({ ...f, media_type: "video" as const })) 
        : [];

      setVaultAssets([...videosList, ...imagesList]);
    } catch (err) {
      console.error("Failed to load vault assets:", err);
    } finally {
      setIsLoadingVault(false);
    }
  };

  const handleSelectVaultAsset = (asset: { url: string; media_type: "image" | "video" }) => {
    setMediaUrl(asset.url);
    setMediaType(asset.media_type);
    setIsVaultModalOpen(false);
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await api.getPublishWorkspaces();
      setWorkspaces(res.workspaces || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.getPublishTemplates();
      setTemplates(res.templates || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPosts = async (wsId?: string) => {
    setIsLoadingPosts(true);
    try {
      const targetWs = wsId !== undefined ? wsId : currentWorkspace;
      const res = await api.getPublishPosts(targetWs && targetWs !== "all" ? { workspace_id: targetWs } : undefined);
      setPosts(res.posts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const [aRes, rRes] = await Promise.all([
        api.getPublishAnalytics(),
        api.getPublishRecommendations()
      ]);
      setAnalytics(aRes.analytics);
      setRecommendations(rRes.recommendations);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.getConnectedAccounts();
      setAccounts(res.accounts || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle platform selection
  const togglePlatform = (id: string) => {
    if (selectedPlatforms.includes(id)) {
      if (selectedPlatforms.length > 1) {
        const next = selectedPlatforms.filter(p => p !== id);
        setSelectedPlatforms(next);
        if (previewPlatform === id) {
          setPreviewPlatform(next[0] || "instagram");
        }
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, id]);
    }
  };

  const selectPlatformPreset = (preset: "all" | "shorts" | "b2b" | "broadcast") => {
    let next: string[] = [];
    if (preset === "all") {
      next = PLATFORMS.map(p => p.id);
    } else if (preset === "shorts") {
      next = ["instagram", "tiktok", "youtube_shorts", "snapchat"];
    } else if (preset === "b2b") {
      next = ["linkedin_personal", "linkedin_company", "twitter", "threads"];
    } else if (preset === "broadcast") {
      next = ["telegram", "whatsapp", "facebook_groups", "google_business"];
    }
    setSelectedPlatforms(next);
    if (next.length > 0 && !next.includes(previewPlatform)) {
      setPreviewPlatform(next[0] || "instagram");
    }
  };

  // Run AI Platform Adaptation
  const handleOptimize = async () => {
    if (!postContent.trim()) return;
    setIsOptimizing(true);
    try {
      const res = await api.aiOptimizePublishContent({
        title: postTitle,
        content: postContent,
        platforms: selectedPlatforms,
        media_type: mediaType
      });
      if (res.success && res.adapted_platforms) {
        setAdaptedData(res.adapted_platforms);
        if (!selectedPlatforms.includes(previewPlatform)) {
          setPreviewPlatform(selectedPlatforms[0] || "instagram");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Publish / Schedule / Review
  const handleCreatePost = async (actionOverride?: "publish_now" | "schedule" | "review" | "draft") => {
    if (!postContent.trim() && !postTitle.trim()) return;
    const mode = actionOverride || composePublishMode;

    if (mode === "schedule") {
      if (!scheduledDate || isNaN(new Date(scheduledDate).getTime())) {
        alert("Please select a valid scheduled date and time.");
        return;
      }
      if (new Date(scheduledDate).getTime() <= Date.now()) {
        alert("Scheduled time must be in the future.");
        return;
      }
    }

    const activeWsObj = workspaces.find(w => w.id === currentWorkspace);
    if (activeWsObj?.approval_required && mode === "publish_now") {
      const proceed = confirm(`Workspace "${activeWsObj.name}" requires client review signoff. Are you sure you want to publish live immediately?`);
      if (!proceed) return;
    }

    setIsPublishing(true);
    try {
      let status = "draft";
      let approvalStatus = "approved";

      if (mode === "publish_now") {
        status = "published";
        approvalStatus = "approved";
      } else if (mode === "schedule") {
        status = "scheduled";
        approvalStatus = "approved";
      } else if (mode === "review") {
        status = "pending_review";
        approvalStatus = "pending";
      } else if (mode === "draft") {
        status = "draft";
        approvalStatus = "draft";
      }

      const res = await api.createPublishPost({
        title: postTitle || "Studio Release",
        content: postContent,
        platforms: selectedPlatforms,
        media_urls: mediaUrl ? [mediaUrl] : [],
        media_type: mediaType,
        status: status,
        approval_status: approvalStatus,
        scheduled_at: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
        ai_adaptation: adaptedData,
        workspace_id: currentWorkspace !== "all" ? currentWorkspace : "default"
      });
      if (res.success) {
        setPublishSuccessMessage(
          mode === "publish_now" 
            ? `Successfully distributed across ${selectedPlatforms.length} platforms simultaneously!`
            : mode === "review"
            ? `Submitted for Client / Agency Approval review!`
            : mode === "schedule"
            ? `Post scheduled for ${scheduledDate || "later"}!`
            : `Draft saved in workspace!`
        );
        setTimeout(() => setPublishSuccessMessage(null), 5000);
        fetchPosts();
        fetchAnalytics();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPublishing(false);
    }
  };

  // Approval Actions for Posts
  const handleApprovePost = async (postId: string, approved: boolean) => {
    try {
      await api.approvePublishPost(postId, approved);
      setPublishSuccessMessage(approved ? "Post approved & scheduled for distribution!" : "Post rejected and returned to draft.");
      setTimeout(() => setPublishSuccessMessage(null), 4000);
      fetchPosts();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePublishNowPost = async (postId: string) => {
    try {
      await api.publishPostNow(postId);
      setPublishSuccessMessage("Post published live across all selected platforms!");
      setTimeout(() => setPublishSuccessMessage(null), 4000);
      fetchPosts();
      fetchAnalytics();
    } catch (e) {
      console.error(e);
    }
  };

  // Template Handlers
  const handleSaveTemplate = async () => {
    if (!templateNameInput.trim()) return;
    try {
      await api.savePublishTemplate({
        name: templateNameInput.trim(),
        platforms: selectedPlatforms,
        caption_template: postContent,
        hashtag_template: ""
      });
      setShowTemplateModal(false);
      setTemplateNameInput("");
      setPublishSuccessMessage("Publishing template saved successfully!");
      setTimeout(() => setPublishSuccessMessage(null), 4000);
      fetchTemplates();
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplyTemplate = (tmpl: any) => {
    if (tmpl.platforms && tmpl.platforms.length > 0) {
      setSelectedPlatforms(tmpl.platforms);
    }
    if (tmpl.caption_template) {
      setPostContent(tmpl.caption_template);
    }
    setPublishSuccessMessage(`Applied template: "${tmpl.name}"`);
    setTimeout(() => setPublishSuccessMessage(null), 3000);
  };

  // Workspace Creation
  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    try {
      const res = await api.createPublishWorkspace({
        name: newWsName.trim(),
        client_name: newWsClient.trim(),
        approval_required: newWsApprovalReq
      });
      if (res.success) {
        setShowWorkspaceModal(false);
        setNewWsName("");
        setNewWsClient("");
        setNewWsApprovalReq(true);
        await fetchWorkspaces();
        setCurrentWorkspace(res.workspace.id);
        fetchPosts(res.workspace.id);
        setPublishSuccessMessage(`Client Workspace "${res.workspace.name}" created!`);
        setTimeout(() => setPublishSuccessMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Auto Recycle Post
  const handleRecycle = async (postId: string) => {
    try {
      const res = await api.recyclePublishPost(postId);
      if (res.success) {
        setPublishSuccessMessage("Post recycled with fresh AI hooks and scheduled!");
        setTimeout(() => setPublishSuccessMessage(null), 4000);
        fetchPosts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Connect Account
  const handleConnectAccount = async () => {
    if (!connectModalPlatform || !accountNameInput.trim()) return;
    try {
      await api.connectAccount({
        platform: connectModalPlatform,
        account_name: accountNameInput.trim(),
        username: accountHandleInput.trim()
      });
      setConnectModalPlatform(null);
      setAccountNameInput("");
      setAccountHandleInput("");
      fetchAccounts();
    } catch (e) {
      console.error(e);
    }
  };

  // Disconnect Account
  const handleDisconnect = async (accId: string) => {
    try {
      await api.disconnectAccount(accId);
      fetchAccounts();
    } catch (e) {
      console.error(e);
    }
  };

  // AI Campaign Manager Planner
  const handleGenerateCampaign = async () => {
    setIsGeneratingCampaign(true);
    try {
      const res = await api.aiSocialMediaManagerPlan({
        campaign_goal: campaignGoal,
        target_audience: targetAudience,
        duration_days: durationDays
      });
      if (res.success) {
        setCampaignPlan(res.campaign);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingCampaign(false);
    }
  };

  // Run 1-Click Creator Mode
  const handleRunCreatorMode = async () => {
    setIsGeneratingCreatorKit(true);
    try {
      const res = await api.runCreatorMode({
        concept: creatorConcept,
        media_url: mediaUrl || undefined
      });
      if (res.success) {
        setCreatorKit(res.creator_kit);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingCreatorKit(false);
    }
  };

  // Repurpose Content
  const handleRepurpose = async () => {
    if (!repurposeSource.trim()) return;
    setIsRepurposing(true);
    try {
      const res = await api.repurposePublishContent({
        title: "OmniStudio Masterclass",
        content: repurposeSource
      });
      if (res.success) {
        setRepurposeData(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRepurposing(false);
    }
  };

  // Generate Thumbnail
  const handleGenerateThumbnail = async () => {
    setIsGeneratingThumb(true);
    try {
      const res = await api.generatePublishThumbnail({
        title: thumbTitle,
        platform_format: thumbFormat,
        category_badge: thumbBadge,
        accent_color: thumbColor
      });
      if (res.success) {
        setGeneratedThumbUrl(res.thumbnail_url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingThumb(false);
    }
  };

  const activeAdapted = adaptedData[previewPlatform] || {
    caption: postContent || "Your customized AI-adapted caption will render here with platform-specific formatting, emojis, and hashtags.",
    character_count: (postContent || "").length,
    max_chars: PLATFORMS.find(p => p.id === previewPlatform)?.maxChars || 2200,
    hashtags: ["#OmniStudio", "#AIGeneration", "#DigitalContent"],
    tone: "Standard Tone",
    growth_tip: "Post at peak audience activity to maximize early engagement."
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#07080a] text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Top Header Banner - Fixed / Sticky on Scroll with Unified Professional Icons */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-[#07080a]/95 backdrop-blur-xl sticky top-[56px] sm:top-[64px] z-30 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-row items-center justify-between gap-3 shadow-xs transition-all">
        {/* Single-line Brand + Badge + Status */}
        <div className="flex items-center gap-2 sm:gap-3 flex-nowrap overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-zinc-950 dark:text-white whitespace-nowrap">
              Publish Studio
            </h1>
          </div>

          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden xs:inline">15 Platforms Synced</span>
            <span className="xs:hidden">15 Synced</span>
          </span>
        </div>

        {/* Action Pills / Mode Navigation - Unified Professional Palette */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-zinc-100 dark:bg-zinc-900/90 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 shrink-0">
          <button
            onClick={() => setActiveTab("compose")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
              activeTab === "compose"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            )}
          >
            <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>1-Click Compose</span>
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
              activeTab === "calendar"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            )}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Calendar ({posts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("ai_manager")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
              activeTab === "ai_manager"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>AI Social Manager</span>
          </button>
          <button
            onClick={() => setActiveTab("creator_mode")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
              activeTab === "creator_mode"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            )}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Creator Mode</span>
          </button>
          <button
            onClick={() => setActiveTab("repurpose")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
              activeTab === "repurpose"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            )}
          >
            <Repeat className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Repurposer</span>
          </button>
          <button
            onClick={() => setActiveTab("thumbnail")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
              activeTab === "thumbnail"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            )}
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Thumbnails</span>
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
              activeTab === "analytics"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            )}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab("accounts")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
              activeTab === "accounts"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            )}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Channels ({accounts.length})</span>
          </button>
        </div>
      </header>

      {/* Client Workspaces & Agency Governance Bar */}
      <div className="bg-zinc-100/70 dark:bg-zinc-950/70 border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Users className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-500 dark:text-zinc-400">Client Workspace:</span>
          <Dropdown
            size="sm"
            value={currentWorkspace}
            onChange={(val) => {
              setCurrentWorkspace(val);
              fetchPosts(val);
            }}
            options={[
              { value: "all", label: "All Workspaces (Agency Master View)", badge: "MASTER" },
              ...workspaces.map((ws) => ({
                value: ws.id,
                label: ws.name,
                description: ws.client_name ? `Client: ${ws.client_name}` : undefined,
                badge: ws.approval_required ? "APPROVAL" : "DIRECT",
              })),
            ]}
            actionItem={{
              label: "+ Create New Client Workspace...",
              icon: <Plus className="w-3.5 h-3.5 text-emerald-500" />,
              onClick: () => setShowWorkspaceModal(true),
            }}
            triggerClassName="min-w-[220px] max-w-sm py-1 font-semibold"
            menuClassName="w-80"
          />
          <button
            type="button"
            onClick={() => setShowWorkspaceModal(true)}
            className="px-2.5 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
          >
            + New Client
          </button>
        </div>

        <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 text-[11px]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            {workspaces.find(w => w.id === currentWorkspace)?.approval_required
              ? "Strict Client Approval Required (Draft → Review → Approved → Scheduled)"
              : "Direct Publishing Mode (Auto-Approved)"}
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Shared Agency Content Hub</span>
        </div>
      </div>

      {/* Success Notification Alert */}
      {publishSuccessMessage && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-6 py-2.5 text-xs font-medium flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{publishSuccessMessage}</span>
          </div>
          <button onClick={() => setPublishSuccessMessage(null)} className="text-emerald-500 hover:underline cursor-pointer whitespace-nowrap shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tab Views */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {/* =================================================================== */}
        {/* TAB 1: 1-CLICK COMPOSE & DISTRIBUTE                                */}
        {/* =================================================================== */}
        {activeTab === "compose" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Creator Compose Form */}
            <div className="lg:col-span-7 space-y-6">
              {/* Step 1: Channel Selector */}
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                  <div>
                    <h2 className="text-sm font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-black text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                      <span>Target Distribution Channels</span>
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Selected {selectedPlatforms.length} of 15 connected channels
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs flex-wrap sm:flex-nowrap shrink-0">
                    <button 
                      onClick={() => selectPlatformPreset("all")} 
                      className="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-medium transition cursor-pointer text-[11px] whitespace-nowrap shrink-0"
                    >
                      All 15
                    </button>
                    <button 
                      onClick={() => selectPlatformPreset("shorts")} 
                      className="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-medium transition cursor-pointer text-[11px] whitespace-nowrap shrink-0"
                    >
                      Shorts/Reels
                    </button>
                    <button 
                      onClick={() => selectPlatformPreset("b2b")} 
                      className="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-medium transition cursor-pointer text-[11px] whitespace-nowrap shrink-0"
                    >
                      B2B / Pro
                    </button>
                    <button 
                      onClick={() => selectPlatformPreset("broadcast")} 
                      className="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-medium transition cursor-pointer text-[11px] whitespace-nowrap shrink-0"
                    >
                      Broadcast
                    </button>
                  </div>
                </div>

                {/* Platform Badge Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-2">
                  {PLATFORMS.map((plat) => {
                    const isSelected = selectedPlatforms.includes(plat.id);
                    return (
                      <button
                        key={plat.id}
                        type="button"
                        onClick={() => togglePlatform(plat.id)}
                        className={cn(
                          "group flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer relative whitespace-nowrap shrink-0",
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/10 text-zinc-900 dark:text-zinc-100 shadow-xs"
                            : "border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 text-zinc-500 opacity-60 hover:opacity-100"
                        )}
                      >
                        <div className={cn(
                          "absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 z-10",
                          isSelected
                            ? "bg-emerald-500 text-black dark:text-zinc-950 ring-2 ring-emerald-500/20 shadow-xs scale-100"
                            : "border border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-800/50 opacity-50 group-hover:opacity-100"
                        )}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3.5]" />}
                        </div>
                        <SocialIcon
                          platform={plat.id}
                          size={32}
                          monochrome={true}
                          className="w-8 h-8 rounded-lg mb-1.5 shadow-xs transition-transform group-hover:scale-105"
                        />
                        <span className="text-[11px] font-semibold truncate w-full">{plat.name}</span>
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500 truncate w-full">{plat.aspect}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Content Composer */}
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-black text-[10px] font-bold flex items-center justify-center">2</span>
                    Master Concept & Media
                  </h2>
                  <div className="flex items-center gap-2">
                    {templates.length > 0 && (
                      <Dropdown
                        size="sm"
                        value=""
                        placeholder="Load Template..."
                        onChange={(tmplId) => {
                          const tmpl = templates.find(t => t.id === tmplId);
                          if (tmpl) handleApplyTemplate(tmpl);
                        }}
                        options={templates.map(t => ({
                          value: t.id,
                          label: t.name,
                          description: t.platforms ? `${t.platforms.length} platforms` : undefined
                        }))}
                        triggerClassName="py-1 min-w-[140px]"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setShowTemplateModal(true)}
                      disabled={!postContent.trim()}
                      className="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Save Template</span>
                    </button>
                    <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
                    <button
                      type="button"
                      onClick={() => setMediaType("image")}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition whitespace-nowrap shrink-0",
                        mediaType === "image" ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold shadow-xs" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      Image
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaType("video")}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition whitespace-nowrap shrink-0",
                        mediaType === "video" ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold shadow-xs" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      Video
                    </button>
                  </div>
                </div>

                {/* Media Attachment & Staging Area (Prominent Top Section) */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) uploadMediaFile(file);
                  }}
                  className={cn(
                    "space-y-3 p-4 rounded-2xl border transition-all",
                    isDragOver 
                      ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30" 
                      : "bg-white/80 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800"
                  )}
                >
                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleMediaFileUpload}
                    accept="video/mp4,video/quicktime,video/webm,image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                  />

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        {mediaType === "video" ? <Video className="w-4 h-4 text-violet-500 shrink-0" /> : <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />}
                        <span>Broadcast Creative Asset</span>
                      </label>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Upload an image or video, or select directly from your OmniStudio Vault
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl text-xs border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
                      <button
                        type="button"
                        onClick={() => setMediaType("image")}
                        className={cn(
                          "px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0",
                          mediaType === "image" ? "bg-white dark:bg-zinc-950 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        )}
                      >
                        <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Image Post</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMediaType("video")}
                        className={cn(
                          "px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0",
                          mediaType === "video" ? "bg-white dark:bg-zinc-950 text-violet-600 dark:text-violet-400 shadow-xs" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        )}
                      >
                        <Video className="w-3.5 h-3.5 shrink-0" />
                        <span>Video / Reel</span>
                      </button>
                    </div>
                  </div>

                  {/* Uploading State */}
                  {isUploadingMedia && (
                    <div className="py-6 px-4 border border-dashed border-emerald-500/50 bg-emerald-500/5 rounded-xl text-center space-y-2">
                      <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin mx-auto" />
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Uploading & processing creative media...
                      </p>
                      <p className="text-[10px] text-zinc-400">Auto-optimizing for omnichannel distribution</p>
                    </div>
                  )}

                  {/* Upload Error Banner */}
                  {uploadError && !isUploadingMedia && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                      <button type="button" onClick={() => setUploadError(null)} className="cursor-pointer text-zinc-400 hover:text-zinc-600 shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Staged Media Card (When Media Is Selected) */}
                  {!isUploadingMedia && mediaUrl ? (
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2.5 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative group shadow-sm">
                          {mediaType === "video" ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-zinc-900">
                              <video
                                src={getMediaUrl(mediaUrl)}
                                className="w-full h-full object-cover"
                                preload="metadata"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Play className="w-5 h-5 text-white fill-white" />
                              </div>
                            </div>
                          ) : (
                            <img
                              src={getMediaUrl(mediaUrl)}
                              alt="Staged Media"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                              mediaType === "video" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            )}>
                              {mediaType === "video" ? "Video Creative" : "Image Creative"}
                            </span>
                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                              {mediaUrl.split("/").pop()}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1 truncate font-mono">
                            {mediaUrl}
                          </p>
                          <p className="text-[10px] text-emerald-500 font-medium mt-0.5 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Ready for cross-platform distribution
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setMediaUrl("")}
                          title="Remove media"
                          className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Action Buttons to Change */}
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-200/70 dark:border-zinc-800/80">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition border border-zinc-200 dark:border-zinc-700 shadow-xs whitespace-nowrap shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Replace Media File</span>
                        </button>
                        <button
                          type="button"
                          onClick={openVaultPicker}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition border border-zinc-200 dark:border-zinc-700 shadow-xs whitespace-nowrap shrink-0"
                        >
                          <FolderArchive className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Pick from Vault</span>
                        </button>
                      </div>
                    </div>
                  ) : !isUploadingMedia ? (
                    /* Empty State / Dropzone with Upload & Vault Options */
                    <div className="space-y-3">
                      <div 
                        className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 rounded-2xl p-4 sm:p-5 text-center transition-all bg-zinc-50/50 dark:bg-zinc-900/30 group cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                            <FolderArchive className="w-5 h-5" />
                          </div>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Upload Image / Video or Select from Vault
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-1 max-w-sm mx-auto">
                          Drag & drop image/video here, or click buttons below. Supports PNG, JPG, WebP, GIF, MP4, MOV, WebM.
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition shadow-md whitespace-nowrap shrink-0"
                          >
                            <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Upload Media File</span>
                          </button>
                          <button
                            type="button"
                            onClick={openVaultPicker}
                            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition shadow-xs whitespace-nowrap shrink-0"
                          >
                            <FolderArchive className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>Select from Vault</span>
                          </button>
                        </div>
                      </div>

                      {/* Quick-Pick from Recent Creations */}
                      {recentAssets.length > 0 && (
                        <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              Quick Select Recent Creations:
                            </span>
                            <button
                              type="button"
                              onClick={openVaultPicker}
                              className="text-[10px] text-emerald-500 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                            >
                              View All Vault ({vaultAssets.length || "Browse"}) &rarr;
                            </button>
                          </div>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {recentAssets.map((asset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setMediaUrl(asset.url);
                                  setMediaType(asset.media_type);
                                }}
                                title={`Click to attach ${asset.filename}`}
                                className="group relative w-14 h-14 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 transition-all cursor-pointer shadow-xs"
                              >
                                {asset.media_type === "video" ? (
                                  <div className="w-full h-full relative flex items-center justify-center bg-zinc-900">
                                    <video src={getMediaUrl(asset.url)} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-emerald-500/20 transition">
                                      <Play className="w-3.5 h-3.5 text-white fill-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={getMediaUrl(asset.url)}
                                    alt={asset.filename}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                )}
                                <span className={cn(
                                  "absolute bottom-0.5 right-0.5 text-[8px] font-bold px-1 rounded",
                                  asset.media_type === "video" ? "bg-violet-600 text-white" : "bg-emerald-600 text-white"
                                )}>
                                  {asset.media_type === "video" ? "VID" : "IMG"}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fallback Direct URL input */}
                      <div className="pt-1">
                        <input
                          type="text"
                          value={mediaUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMediaUrl(val);
                            if (val.match(/\.(mp4|mov|webm|mkv)$/i)) {
                              setMediaType("video");
                            } else if (val.match(/\.(png|jpg|jpeg|webp|gif)$/i)) {
                              setMediaType("image");
                            }
                          }}
                          placeholder="Or paste asset URL / path: /outputs/images/... or https://..."
                          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono text-zinc-600 dark:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Post Title / Headline
                  </label>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="e.g. Next-Gen AI Production: Redefining Commercial Cinema"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Master Creative Copy / Prompt
                    </label>
                    <span className="text-[11px] text-zinc-400">
                      Write once — AI adapts it for all 15 platforms
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Describe your visual concept, product details, key takeaways, and call to action..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* AI Optimization Trigger */}
                <button
                  type="button"
                  onClick={handleOptimize}
                  disabled={isOptimizing || !postContent.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {isOptimizing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-500 shrink-0" />
                      <span className="whitespace-nowrap">Optimizing Tone & Hashtags for {selectedPlatforms.length} Channels...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="whitespace-nowrap">Run AI Platform Adaptation Engine</span>
                    </>
                  )}
                </button>
              </div>

              {/* Step 3: Scheduling & Actions */}
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-black text-[10px] font-bold flex items-center justify-center">3</span>
                    Publish & Workflow Mode
                  </h2>
                  <span className="text-[11px] text-zinc-500">
                    Workspace: <strong className="text-zinc-800 dark:text-zinc-200">{workspaces.find(w => w.id === currentWorkspace)?.name || "OmniStudio Main"}</strong>
                  </span>
                </div>

                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setComposePublishMode("instant")}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition cursor-pointer whitespace-nowrap shrink-0",
                      composePublishMode === "instant"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <div className="text-xs flex items-center gap-1.5 font-bold whitespace-nowrap">
                      <Send className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Instant Publish</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5 whitespace-nowrap">Push live now</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComposePublishMode("schedule")}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition cursor-pointer whitespace-nowrap shrink-0",
                      composePublishMode === "schedule"
                        ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <div className="text-xs flex items-center gap-1.5 font-bold whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>Schedule</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5 whitespace-nowrap">Automated date</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComposePublishMode("review")}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition cursor-pointer whitespace-nowrap shrink-0",
                      composePublishMode === "review"
                        ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <div className="text-xs flex items-center gap-1.5 font-bold whitespace-nowrap">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Client Review</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5 whitespace-nowrap">Approval signoff</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComposePublishMode("draft")}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition cursor-pointer whitespace-nowrap shrink-0",
                      composePublishMode === "draft"
                        ? "border-zinc-500 bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 font-bold"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <div className="text-xs flex items-center gap-1.5 font-bold whitespace-nowrap">
                      <Layers className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>Draft Post</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5 whitespace-nowrap">Save in studio</div>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Schedule For Later</span>
                      </span>
                      {scheduledDate && (
                        <span className="text-[10px] font-mono text-emerald-500 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          Active Dispatch Time
                        </span>
                      )}
                    </label>
                    <ModernScheduleDatePicker
                      value={scheduledDate}
                      onChange={setScheduledDate}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                      Agency Approval Status
                    </label>
                    <div className="flex items-center gap-2 h-10 px-3 bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs text-zinc-600 dark:text-zinc-400">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate font-medium">
                        {workspaces.find(w => w.id === currentWorkspace)?.approval_required
                          ? "Requires Client Sign-off"
                          : "Direct Auto-Approval Policy"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCreatePost()}
                    disabled={isPublishing || (!postTitle && !postContent)}
                    className={cn(
                      "w-full sm:flex-1 py-3 px-4 rounded-xl text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm whitespace-nowrap shrink-0",
                      composePublishMode === "instant" ? "bg-emerald-600 hover:bg-emerald-500" :
                      composePublishMode === "schedule" ? "bg-blue-600 hover:bg-blue-500" :
                      composePublishMode === "review" ? "bg-amber-600 hover:bg-amber-500" :
                      "bg-zinc-700 hover:bg-zinc-600"
                    )}
                  >
                    {isPublishing ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    ) : composePublishMode === "instant" ? (
                      <Send className="w-4 h-4 shrink-0" />
                    ) : composePublishMode === "schedule" ? (
                      <Clock className="w-4 h-4 shrink-0" />
                    ) : composePublishMode === "review" ? (
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                    ) : (
                      <Layers className="w-4 h-4 shrink-0" />
                    )}
                    <span className="whitespace-nowrap">
                      {composePublishMode === "instant"
                        ? `Publish Everywhere Now (${selectedPlatforms.length} Channels)`
                        : composePublishMode === "schedule"
                        ? `Confirm Schedule (${selectedPlatforms.length} Channels)`
                        : composePublishMode === "review"
                        ? `Submit for Client Review (${selectedPlatforms.length} Channels)`
                        : "Save as Studio Draft"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCreatePost("publish_now")}
                    disabled={isPublishing || (!postTitle && !postContent)}
                    className="w-full sm:w-auto px-4 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span>Quick Publish</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Omnichannel Preview Mockup */}
            <div className="lg:col-span-5 space-y-4 sticky top-24">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Live Platform Simulator</h3>
                  </div>
                  {/* Platform selector pill */}
                  <Dropdown
                    size="sm"
                    value={previewPlatform}
                    onChange={(val) => setPreviewPlatform(val)}
                    options={selectedPlatforms.map(pid => {
                      const plat = PLATFORMS.find(p => p.id === pid);
                      return {
                        value: pid,
                        label: plat?.name || pid,
                        icon: <SocialIcon platform={pid} size={15} showBg={false} monochrome={true} />,
                        badge: plat?.aspect,
                      };
                    })}
                    triggerClassName="py-1 min-w-[140px]"
                    align="right"
                  />
                </div>

                {/* Quick 1-Click Platform Switcher Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2.5 pt-0.5">
                  {selectedPlatforms.slice(0, 6).map(pid => {
                    const isAct = previewPlatform === pid;
                    const plat = PLATFORMS.find(p => p.id === pid);
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => setPreviewPlatform(pid)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border whitespace-nowrap",
                          isAct
                            ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500/20"
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 bg-white dark:bg-zinc-900/80"
                        )}
                      >
                        <SocialIcon platform={pid} size={12} showBg={false} monochrome={true} />
                        <span className="whitespace-nowrap">{plat?.name || pid}</span>
                      </button>
                    );
                  })}
                </div>

                {/* ───────────────────────────────────────────────────────────── */}
                {/* 1. TIKTOK 9:16 VERTICAL SIMULATOR (COMPACT)                   */}
                {/* ───────────────────────────────────────────────────────────── */}
                {previewPlatform === "tiktok" && (
                  <div className="relative w-full max-w-[240px] aspect-[9/16] max-h-[420px] mx-auto rounded-2xl overflow-hidden bg-black text-white shadow-2xl border border-zinc-800 flex flex-col justify-between select-none">
                    {/* Background Media */}
                    {mediaUrl ? (
                      mediaType === "video" ? (
                        <video src={getMediaUrl(mediaUrl)} controls className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <img src={getMediaUrl(mediaUrl)} alt="TikTok" className="absolute inset-0 w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black flex flex-col items-center justify-center p-4 text-center text-zinc-500">
                        <SocialIcon platform="tiktok" size={28} monochrome={true} className="mb-2 text-zinc-400" />
                        <span className="text-[11px] font-bold text-zinc-300">TikTok 9:16 Stage</span>
                        <span className="text-[9px] text-zinc-500 mt-1">Select media in composer to preview</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

                    {/* TikTok Top Header */}
                    <div className="relative z-10 px-3 pt-2.5 flex items-center justify-between text-[11px] font-semibold drop-shadow-md">
                      <div className="flex items-center gap-2.5">
                        <span className="text-zinc-300 opacity-60">Following</span>
                        <span className="text-white font-bold border-b-2 border-white pb-0.5">For You</span>
                      </div>
                      <Search className="w-3.5 h-3.5 text-white drop-shadow" />
                    </div>

                    {/* TikTok Right Action Rail */}
                    <div className="absolute right-2 bottom-12 z-10 flex flex-col items-center gap-2 text-white drop-shadow-lg">
                      {/* Avatar with Follow Plus */}
                      <div className="relative">
                        <div className="w-7 h-7 rounded-full border-2 border-white bg-emerald-500 text-black font-bold flex items-center justify-center text-[9px] shadow-md">
                          OS
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[8px] font-bold shadow-xs">
                          +
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <Heart className="w-4 h-4 text-white hover:text-rose-500 transition cursor-pointer drop-shadow-md" />
                        <span className="text-[9px] font-bold mt-0.5">24.8K</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <MessageCircle className="w-4 h-4 text-white hover:text-emerald-400 transition cursor-pointer drop-shadow-md" />
                        <span className="text-[9px] font-bold mt-0.5">1.2K</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Bookmark className="w-4 h-4 text-white hover:text-amber-400 transition cursor-pointer drop-shadow-md" />
                        <span className="text-[9px] font-bold mt-0.5">4.5K</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Share2 className="w-4 h-4 text-white hover:text-blue-400 transition cursor-pointer drop-shadow-md" />
                        <span className="text-[9px] font-bold mt-0.5">890</span>
                      </div>
                      {/* Rotating Vinyl Record */}
                      <div className="w-6 h-6 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center animate-spin mt-0.5" style={{ animationDuration: "5s" }}>
                        <Music className="w-2.5 h-2.5 text-zinc-300" />
                      </div>
                    </div>

                    {/* TikTok Bottom Text Overlay */}
                    <div className="relative z-10 px-2.5 pb-2.5 space-y-1 drop-shadow-lg max-w-[76%]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[11px]">@omnistudio.ai</span>
                        <CheckCircle2 className="w-3 h-3 text-blue-400" />
                      </div>
                      <p className="text-[10px] text-zinc-100 leading-tight line-clamp-2">
                        {activeAdapted.caption}
                      </p>
                      <div className="flex items-center gap-1 text-[9px] text-zinc-300 pt-0.5">
                        <Music className="w-2.5 h-2.5 animate-pulse shrink-0" />
                        <span className="truncate">Original Sound - OmniStudio Engine</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* 2. YOUTUBE SHORTS 9:16 SIMULATOR (COMPACT)                    */}
                {/* ───────────────────────────────────────────────────────────── */}
                {previewPlatform === "youtube_shorts" && (
                  <div className="relative w-full max-w-[240px] aspect-[9/16] max-h-[420px] mx-auto rounded-2xl overflow-hidden bg-black text-white shadow-2xl border border-zinc-800 flex flex-col justify-between select-none">
                    {/* Media */}
                    {mediaUrl ? (
                      mediaType === "video" ? (
                        <video src={getMediaUrl(mediaUrl)} controls className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <img src={getMediaUrl(mediaUrl)} alt="Shorts" className="absolute inset-0 w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black flex flex-col items-center justify-center p-4 text-center text-zinc-500">
                        <SocialIcon platform="youtube_shorts" size={28} monochrome={true} className="mb-2 text-zinc-400" />
                        <span className="text-[11px] font-bold text-zinc-300">YouTube Shorts Stage</span>
                        <span className="text-[9px] text-zinc-500 mt-1">Upload keyframe to test Shorts view</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

                    {/* Top Header */}
                    <div className="relative z-10 px-3 pt-2.5 flex items-center justify-between text-[11px] font-semibold drop-shadow-md">
                      <span className="font-bold tracking-wider text-[10px]">SHORTS</span>
                      <div className="flex items-center gap-2.5">
                        <Search className="w-3.5 h-3.5 text-white" />
                        <MoreHorizontal className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>

                    {/* Right Rail */}
                    <div className="absolute right-2 bottom-12 z-10 flex flex-col items-center gap-2.5 text-white drop-shadow-lg">
                      <div className="flex flex-col items-center">
                        <ThumbsUp className="w-4 h-4 text-white hover:text-emerald-400 transition cursor-pointer drop-shadow" />
                        <span className="text-[9px] font-bold mt-0.5">38K</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <ThumbsDown className="w-4 h-4 text-white hover:text-rose-400 transition cursor-pointer drop-shadow" />
                        <span className="text-[8px] font-medium mt-0.5">Dislike</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <MessageCircle className="w-4 h-4 text-white hover:text-blue-400 transition cursor-pointer drop-shadow" />
                        <span className="text-[9px] font-bold mt-0.5">620</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Share2 className="w-4 h-4 text-white transition cursor-pointer drop-shadow" />
                        <span className="text-[8px] font-medium mt-0.5">Share</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Repeat2 className="w-4 h-4 text-white transition cursor-pointer drop-shadow" />
                        <span className="text-[8px] font-medium mt-0.5">Remix</span>
                      </div>
                    </div>

                    {/* Bottom Channel Info */}
                    <div className="relative z-10 px-2.5 pb-2.5 space-y-1 drop-shadow-lg max-w-[76%]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-black font-bold flex items-center justify-center text-[8px]">
                          OS
                        </div>
                        <span className="font-bold text-[10px] truncate">@OmniStudio</span>
                        <button type="button" className="px-1.5 py-0.5 rounded-full bg-white text-black text-[8px] font-bold hover:bg-zinc-200 transition whitespace-nowrap shrink-0">
                          Subscribe
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-100 leading-tight line-clamp-2">
                        {postTitle || activeAdapted.caption}
                      </p>
                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* 3. X / TWITTER POST SIMULATOR (COMPACT)                       */}
                {/* ───────────────────────────────────────────────────────────── */}
                {previewPlatform === "twitter" && (
                  <div className="w-full max-w-[320px] mx-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-3 text-xs shadow-xl space-y-2.5">
                    {/* Tweet Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-black font-bold flex items-center justify-center text-[10px] shrink-0">
                          OS
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 font-bold text-zinc-900 dark:text-white text-[11px]">
                            <span className="truncate">OmniStudio AI</span>
                            <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />
                          </div>
                          <div className="text-[9px] text-zinc-500 truncate">@OmniStudioAI • 8m</div>
                        </div>
                      </div>
                      <SocialIcon platform="twitter" size={14} monochrome={true} showBg={false} className="shrink-0" />
                    </div>

                    {/* Tweet Text */}
                    <div className="text-zinc-800 dark:text-zinc-200 text-[11px] leading-relaxed whitespace-pre-line line-clamp-4">
                      {activeAdapted.caption}
                    </div>

                    {/* Media Container */}
                    {mediaUrl && (
                      <div className="aspect-video max-h-[140px] w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 relative">
                        {mediaType === "video" ? (
                          <video src={getMediaUrl(mediaUrl)} controls className="w-full h-full object-cover" />
                        ) : (
                          <img src={getMediaUrl(mediaUrl)} alt="X preview" className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}

                    {/* Tweet Metrics Bar */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-zinc-100 dark:border-zinc-900 text-zinc-500 text-[10px]">
                      <span className="flex items-center gap-1 hover:text-blue-500 transition cursor-pointer whitespace-nowrap shrink-0">
                        <MessageCircle className="w-3 h-3" /> 142
                      </span>
                      <span className="flex items-center gap-1 hover:text-emerald-500 transition cursor-pointer whitespace-nowrap shrink-0">
                        <Repeat2 className="w-3 h-3" /> 489
                      </span>
                      <span className="flex items-center gap-1 hover:text-rose-500 transition cursor-pointer whitespace-nowrap shrink-0">
                        <Heart className="w-3 h-3" /> 3.8K
                      </span>
                      <span className="flex items-center gap-1 hover:text-blue-500 transition cursor-pointer whitespace-nowrap shrink-0">
                        <Bookmark className="w-3 h-3" /> 912
                      </span>
                      <span className="flex items-center gap-1 hover:text-zinc-400 transition cursor-pointer whitespace-nowrap shrink-0">
                        <Share2 className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* 4. LINKEDIN PROFESSIONAL FEED SIMULATOR (COMPACT)             */}
                {/* ───────────────────────────────────────────────────────────── */}
                {(previewPlatform === "linkedin_personal" || previewPlatform === "linkedin_company") && (
                  <div className="w-full max-w-[320px] mx-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 text-xs shadow-xl space-y-2.5">
                    {/* LinkedIn Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500 text-black font-bold flex items-center justify-center text-[10px] shrink-0">
                          OS
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 font-bold text-zinc-900 dark:text-white text-[11px]">
                            <span className="truncate">OmniStudio AI</span>
                            <span className="text-[9px] text-zinc-400 font-normal shrink-0">• 1st</span>
                          </div>
                          <div className="text-[9px] text-zinc-500 truncate">Autonomous Media Engine • Enterprise</div>
                          <div className="text-[8px] text-zinc-400">1h • Edited • 🌐</div>
                        </div>
                      </div>
                      <SocialIcon platform="linkedin" size={14} monochrome={true} showBg={false} className="shrink-0" />
                    </div>

                    {/* LinkedIn Text */}
                    <div className="text-zinc-800 dark:text-zinc-200 text-[11px] leading-relaxed whitespace-pre-line max-h-24 overflow-y-auto">
                      {activeAdapted.caption}
                    </div>

                    {/* Media */}
                    {mediaUrl && (
                      <div className="aspect-[16/9] max-h-[140px] w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 relative">
                        {mediaType === "video" ? (
                          <video src={getMediaUrl(mediaUrl)} controls className="w-full h-full object-cover" />
                        ) : (
                          <img src={getMediaUrl(mediaUrl)} alt="LinkedIn preview" className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}

                    {/* Reaction Summary */}
                    <div className="flex items-center justify-between pt-1 text-[9px] text-zinc-500 border-b border-zinc-100 dark:border-zinc-900 pb-1.5">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <span>👍 💡 ❤️</span>
                        <span>548</span>
                      </span>
                      <span className="whitespace-nowrap">42 comments • 18 reposts</span>
                    </div>

                    {/* LinkedIn Action Strip */}
                    <div className="grid grid-cols-4 gap-1 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 pt-0.5 text-center">
                      <button type="button" className="flex items-center justify-center gap-1 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition cursor-pointer whitespace-nowrap shrink-0">
                        <ThumbsUp className="w-3 h-3 shrink-0" /> <span>Like</span>
                      </button>
                      <button type="button" className="flex items-center justify-center gap-1 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition cursor-pointer whitespace-nowrap shrink-0">
                        <MessageCircle className="w-3 h-3 shrink-0" /> <span>Comment</span>
                      </button>
                      <button type="button" className="flex items-center justify-center gap-1 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition cursor-pointer whitespace-nowrap shrink-0">
                        <Repeat2 className="w-3 h-3 shrink-0" /> <span>Repost</span>
                      </button>
                      <button type="button" className="flex items-center justify-center gap-1 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition cursor-pointer whitespace-nowrap shrink-0">
                        <Send className="w-3 h-3 shrink-0" /> <span>Send</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* 5. INSTAGRAM & DEFAULT FEED CARD SIMULATOR (COMPACT)          */}
                {/* ───────────────────────────────────────────────────────────── */}
                {previewPlatform !== "tiktok" && previewPlatform !== "youtube_shorts" && previewPlatform !== "twitter" && previewPlatform !== "linkedin_personal" && previewPlatform !== "linkedin_company" && (
                  <div className="w-full max-w-[280px] mx-auto bg-white dark:bg-black rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-xl overflow-hidden text-xs">
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[1.5px] shrink-0">
                          <div className="w-full h-full rounded-full bg-white dark:bg-black flex items-center justify-center font-bold text-[8px]">
                            OS
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-[10px] leading-tight">omnistudio.ai</div>
                          <div className="text-[8px] text-zinc-400">Sponsored • Studio</div>
                        </div>
                      </div>
                      <SocialIcon platform={previewPlatform} size={14} monochrome={true} showBg={false} className="shrink-0" />
                    </div>

                    {/* Media Display */}
                    <div className="aspect-square max-h-[200px] bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden text-zinc-500 group">
                      {mediaUrl ? (
                        <>
                          {mediaType === "video" ? (
                            <video src={getMediaUrl(mediaUrl)} controls className="w-full h-full object-cover" />
                          ) : (
                            <img src={getMediaUrl(mediaUrl)} alt="Preview" className="w-full h-full object-cover" />
                          )}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-[9px] text-zinc-200 hover:text-white font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <Upload className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> Replace
                            </button>
                            <span className="text-zinc-600">|</span>
                            <button
                              type="button"
                              onClick={openVaultPicker}
                              className="text-[9px] text-zinc-200 hover:text-white font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <FolderArchive className="w-2.5 h-2.5 text-amber-400 shrink-0" /> Vault
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-3 flex flex-col items-center justify-center gap-1.5">
                          <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                            <ImageIcon className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold text-zinc-300">Visual Media Canvas</div>
                            <div className="text-[9px] text-zinc-500">Aspect: {PLATFORMS.find(p => p.id === previewPlatform)?.aspect}</div>
                          </div>
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shadow-xs whitespace-nowrap shrink-0"
                            >
                              <Upload className="w-3 h-3 shrink-0" /> <span>Upload</span>
                            </button>
                            <button
                              type="button"
                              onClick={openVaultPicker}
                              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
                            >
                              <FolderArchive className="w-3 h-3 text-amber-400 shrink-0" /> <span>Vault</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Instagram Action Strip */}
                    <div className="px-2.5 pt-2 flex items-center justify-between text-zinc-800 dark:text-zinc-200">
                      <div className="flex items-center gap-2.5">
                        <Heart className="w-4 h-4 hover:text-rose-500 transition cursor-pointer" />
                        <MessageCircle className="w-4 h-4 hover:text-blue-500 transition cursor-pointer" />
                        <Send className="w-4 h-4 hover:text-emerald-500 transition cursor-pointer" />
                      </div>
                      <Bookmark className="w-4 h-4 hover:text-amber-500 transition cursor-pointer" />
                    </div>

                    {/* Caption Body */}
                    <div className="p-2.5 pt-1.5 space-y-1 bg-white dark:bg-black">
                      <div className="font-bold text-[10px] text-zinc-900 dark:text-zinc-100">
                        Liked by creative_hub and 1,842 others
                      </div>
                      <div className="text-zinc-800 dark:text-zinc-200 text-[11px] leading-relaxed max-h-20 overflow-y-auto pr-1 whitespace-pre-line">
                        <span className="font-bold mr-1.5 text-zinc-900 dark:text-white">omnistudio.ai</span>
                        {activeAdapted.caption}
                      </div>
                      <div className="text-[9px] text-zinc-400 pt-0.5 cursor-pointer">
                        View all 48 comments
                      </div>
                    </div>
                  </div>
                )}

                {/* ───────────────────────────────────────────────────────────── */}
                {/* Simulator Footer Details & 1-Click Copy                       */}
                {/* ───────────────────────────────────────────────────────────── */}
                <div className="w-full max-w-[320px] mx-auto space-y-2 mt-3">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                      {activeAdapted.tone || "Algorithmic Adaptation"}
                    </span>
                    <span className={cn(
                      "font-mono text-[10px] whitespace-nowrap shrink-0",
                      activeAdapted.character_count > activeAdapted.max_chars ? "text-rose-500 font-bold" : "text-emerald-500"
                    )}>
                      {activeAdapted.character_count} / {activeAdapted.max_chars} chars
                    </span>
                  </div>

                  {activeAdapted.growth_tip && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                      <span><strong>Algorithm Tip:</strong> {activeAdapted.growth_tip}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activeAdapted.caption);
                      setCopiedCaption(true);
                      setTimeout(() => setCopiedCaption(false), 2000);
                    }}
                    className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                  >
                    {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                    <span className="whitespace-nowrap">{copiedCaption ? "Copied to Clipboard!" : "Copy Platform-Formatted Caption"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: CONTENT CALENDAR                                            */}
        {/* =================================================================== */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            {/* Auto-Scheduler & Cron Heartbeat Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="relative flex h-3.5 w-3.5 mt-0.5 sm:mt-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Auto-Scheduler Cron Engine Active
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-medium">
                      Interval: 30s
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    {cronStatus?.scheduled_pending ?? posts.filter(p => p.status === "scheduled").length} post(s) queued for scheduled dispatch
                    {cronStatus?.next_due_post && (
                      <span className="ml-1 text-zinc-800 dark:text-zinc-200 font-semibold">
                        • Next due: &quot;{cronStatus.next_due_post.title}&quot; ({new Date(cronStatus.next_due_post.scheduled_at).toLocaleTimeString()})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunDuePosts}
                  disabled={isTriggeringCron}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 shrink-0", isTriggeringCron && "animate-spin")} />
                  <span className="whitespace-nowrap">{isTriggeringCron ? "Running Due Posts Check..." : "Run Due Posts Now"}</span>
                </button>
              </div>
            </div>

            {/* Cron Trigger Feedback Message */}
            {cronTriggerMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{cronTriggerMessage}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Omnichannel Content Calendar</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Track and manage posts across drafts, scheduled broadcasts, and live published content
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setCalendarFilter("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition whitespace-nowrap shrink-0",
                    calendarFilter === "all" ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold shadow-xs" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  All ({posts.length})
                </button>
                <button
                  onClick={() => setCalendarFilter("published")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition whitespace-nowrap shrink-0",
                    calendarFilter === "published" ? "bg-emerald-600 text-white font-bold" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  Published ({posts.filter(p => p.status === "published").length})
                </button>
                <button
                  onClick={() => setCalendarFilter("scheduled")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition whitespace-nowrap shrink-0",
                    calendarFilter === "scheduled" ? "bg-blue-600 text-white font-bold" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  Scheduled ({posts.filter(p => p.status === "scheduled").length})
                </button>
                <button
                  onClick={() => setCalendarFilter("pending_review")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition whitespace-nowrap shrink-0",
                    calendarFilter === "pending_review" ? "bg-amber-600 text-white font-bold" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  Pending Review ({posts.filter(p => p.status === "pending_review" || p.approval_status === "pending").length})
                </button>
                <button
                  onClick={() => setCalendarFilter("approved")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition whitespace-nowrap shrink-0",
                    calendarFilter === "approved" ? "bg-emerald-600 text-white font-bold" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  Approved ({posts.filter(p => p.approval_status === "approved" && p.status !== "published").length})
                </button>
                <button
                  onClick={() => setCalendarFilter("draft")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition whitespace-nowrap shrink-0",
                    calendarFilter === "draft" ? "bg-zinc-700 text-white font-bold" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  Drafts ({posts.filter(p => p.status === "draft").length})
                </button>
              </div>
            </div>

            {/* Posts Grid */}
            {isLoadingPosts ? (
              <div className="py-20 text-center text-zinc-400 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                Loading distribution calendar...
              </div>
            ) : posts.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl">
                <Calendar className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold">No Scheduled Content Yet</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Use 1-Click Compose to create and schedule your first multi-platform broadcast!
                </p>
                <button
                  onClick={() => setActiveTab("compose")}
                  className="mt-4 px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-bold cursor-pointer shadow-sm transition whitespace-nowrap shrink-0"
                >
                  Create New Broadcast
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts
                  .filter(p => {
                    if (calendarFilter === "all") return true;
                    if (calendarFilter === "pending_review") return p.status === "pending_review" || p.approval_status === "pending";
                    if (calendarFilter === "approved") return p.approval_status === "approved" && p.status !== "published";
                    return p.status === calendarFilter;
                  })
                  .map(post => (
                    <div
                      key={post.id}
                      className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 flex flex-col justify-between space-y-3 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              post.status === "published" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                              post.status === "scheduled" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" :
                              post.status === "pending_review" || post.approval_status === "pending" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" :
                              "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20"
                            )}>
                              {post.status === "pending_review" || post.approval_status === "pending" ? "Pending Review" : post.status}
                            </span>
                            {post.approval_status === "approved" && post.status !== "published" && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Approved
                              </span>
                            )}
                            {post.approval_status === "rejected" && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                                Revision
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString() : new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                          {post.title || "Untitled Broadcast"}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                          {post.content}
                        </p>

                        {/* Targeted Platform Icons */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-3">
                          {(Array.isArray(post.platforms) ? post.platforms : []).map((pid: string) => {
                            const meta = PLATFORMS.find(p => p.id === pid);
                            return (
                              <div
                                key={pid}
                                title={meta?.name || pid}
                                className="hover:scale-110 transition-transform cursor-pointer"
                              >
                                <SocialIcon platform={pid} size={22} className="w-5.5 h-5.5 rounded-md shadow-xs" />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {/* Approval Actions */}
                          {(post.status === "pending_review" || post.approval_status === "pending" || post.status === "draft") && (
                            <button
                              type="button"
                              onClick={() => handleApprovePost(post.id, true)}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                              title="Approve post for publishing"
                            >
                              <Check className="w-3 h-3 shrink-0" /> <span>Approve</span>
                            </button>
                          )}
                          {(post.status === "pending_review" || post.approval_status === "pending") && (
                            <button
                              type="button"
                              onClick={() => handleApprovePost(post.id, false)}
                              className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold cursor-pointer whitespace-nowrap shrink-0"
                              title="Reject / Request Revision"
                            >
                              <span>Reject</span>
                            </button>
                          )}
                          {/* Publish Now if not yet published */}
                          {post.status !== "published" && (
                            <button
                              type="button"
                              onClick={() => handlePublishNowPost(post.id)}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                              title="Publish live to all channels now"
                            >
                              <Send className="w-2.5 h-2.5 shrink-0" /> <span>Publish</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRecycle(post.id)}
                            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                            title="Auto Content Recycling: Duplicates with fresh AI hooks"
                          >
                            <Repeat className="w-3 h-3 shrink-0" />
                            <span>Recycle</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await api.deletePublishPost(post.id);
                              fetchPosts();
                            }}
                            className="text-zinc-400 hover:text-rose-500 p-1 rounded transition cursor-pointer shrink-0"
                            title="Delete post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: AI SOCIAL MEDIA MANAGER                                     */}
        {/* =================================================================== */}
        {activeTab === "ai_manager" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Autonomous AI Social Media Manager</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Enter a high-level goal — the AI director crafts an entire multi-day campaign schedule with copy, hooks, and optimal posting times
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Campaign Goal
                  </label>
                  <input
                    type="text"
                    value={campaignGoal}
                    onChange={(e) => setCampaignGoal(e.target.value)}
                    placeholder="e.g. Promote my luxury handcrafted jewelry collection"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Gen-Z creators, luxury buyers, tech founders"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500 whitespace-nowrap">Campaign Length:</span>
                  {[7, 14].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setDurationDays(days)}
                      className={cn(
                        "px-3 py-1 rounded-lg font-semibold cursor-pointer transition whitespace-nowrap shrink-0",
                        durationDays === days ? "bg-amber-500 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleGenerateCampaign}
                  disabled={isGeneratingCampaign || !campaignGoal.trim()}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm whitespace-nowrap shrink-0"
                >
                  {isGeneratingCampaign ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                      <span className="whitespace-nowrap">Strategizing Multi-Channel Campaign...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">Generate AI Campaign Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Campaign Schedule Results */}
            {campaignPlan && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Generated {campaignPlan.total_posts}-Day Strategic Roadmap
                  </h3>
                  <button
                    type="button"
                    onClick={async () => {
                      for (const item of campaignPlan.schedule) {
                        const targetDate = new Date(Date.now() + (item.day_number || 1) * 86400000);
                        targetDate.setHours(10, 0, 0, 0);
                        await api.createPublishPost({
                          title: item.post_title,
                          content: item.caption,
                          platforms: [item.platform],
                          status: "scheduled",
                          scheduled_at: targetDate.toISOString(),
                          workspace_id: currentWorkspace !== "all" ? currentWorkspace : "default"
                        });
                      }
                      setPublishSuccessMessage("All campaign posts successfully queued into Calendar with scheduled dates!");
                      fetchPosts();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm whitespace-nowrap shrink-0"
                  >
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Batch Schedule All to Calendar</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {campaignPlan.schedule.map((item: any) => (
                    <div
                      key={item.day_number}
                      className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/80 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                            Day {item.day_number} • {item.day_name}
                          </span>
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {item.post_title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-zinc-400 font-mono text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            {item.recommended_time}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold flex items-center gap-1.5">
                            <SocialIcon platform={item.platform_name} size={14} className="w-3.5 h-3.5 rounded" />
                            {item.platform_name}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-line bg-white dark:bg-zinc-950 p-3 rounded-lg border border-zinc-100 dark:border-zinc-900">
                        {item.caption}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: CREATOR MODE (1-CLICK SUITE)                                 */}
        {/* =================================================================== */}
        {activeTab === "creator_mode" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">1-Click Full Creator Mode</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Instantly synthesizes Reel + Story + Short + Carousel + Feed Post + Captions + Hashtags + Thumbnails from 1 concept
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Creative Concept / Idea
                </label>
                <input
                  type="text"
                  value={creatorConcept}
                  onChange={(e) => setCreatorConcept(e.target.value)}
                  placeholder="e.g. Cyberpunk Luxury Sports Car Night Drive"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={handleRunCreatorMode}
                disabled={isGeneratingCreatorKit || !creatorConcept.trim()}
                className="w-full py-3 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 font-bold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isGeneratingCreatorKit ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-500 shrink-0" />
                    <span className="whitespace-nowrap">Synthesizing 8 Multi-Format Deliverables...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="whitespace-nowrap">Execute 1-Click Creator Mode</span>
                  </>
                )}
              </button>
            </div>

            {/* Creator Kit Results */}
            {creatorKit && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Complete 8-Asset Multi-Platform Deliverable Suite
                  </h3>
                  <button
                    type="button"
                    onClick={async () => {
                      const now = Date.now();
                      const reelTime = new Date(now + 2 * 3600 * 1000).toISOString();
                      const shortTime = new Date(now + 5 * 3600 * 1000).toISOString();
                      const carouselTime = new Date(now + 8 * 3600 * 1000).toISOString();

                      // Schedule Reel
                      await api.createPublishPost({
                        title: `${creatorConcept} [Reel]`,
                        content: creatorKit.reel.caption,
                        platforms: ["instagram", "tiktok"],
                        status: "scheduled",
                        scheduled_at: reelTime,
                        workspace_id: currentWorkspace !== "all" ? currentWorkspace : "default"
                      });
                      // Schedule Short
                      await api.createPublishPost({
                        title: `${creatorConcept} [Short]`,
                        content: creatorKit.short.caption,
                        platforms: ["youtube_shorts"],
                        status: "scheduled",
                        scheduled_at: shortTime,
                        workspace_id: currentWorkspace !== "all" ? currentWorkspace : "default"
                      });
                      // Schedule Carousel
                      await api.createPublishPost({
                        title: `${creatorConcept} [Carousel]`,
                        content: creatorKit.carousel.summary,
                        platforms: ["linkedin_personal", "linkedin_company"],
                        status: "scheduled",
                        scheduled_at: carouselTime,
                        workspace_id: currentWorkspace !== "all" ? currentWorkspace : "default"
                      });
                      setPublishSuccessMessage("Reel, Short, and Carousel successfully queued to Calendar with staggered release times!");
                      fetchPosts();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                  >
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Schedule All Kit Assets to Calendar</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Reel Card */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-500">
                      <span className="flex items-center gap-1.5">
                        <SocialIcon platform="instagram" size={16} className="w-4 h-4 rounded" />
                        <SocialIcon platform="tiktok" size={16} className="w-4 h-4 rounded" />
                        <span>Instagram / TikTok Reel</span>
                      </span>
                      <span className="text-[10px] text-zinc-400">9:16</span>
                    </div>
                    <div className="text-xs font-semibold">{creatorKit.reel.hook}</div>
                    <p className="text-[11px] text-zinc-500 line-clamp-3">{creatorKit.reel.caption}</p>
                  </div>

                  {/* Short Card */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-red-500">
                      <span className="flex items-center gap-1.5">
                        <SocialIcon platform="youtube_shorts" size={16} className="w-4 h-4 rounded" />
                        <span>YouTube Short</span>
                      </span>
                      <span className="text-[10px] text-zinc-400">9:16</span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-3">{creatorKit.short.caption}</p>
                  </div>

                  {/* Carousel Card */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-500">
                      <span className="flex items-center gap-1.5">
                        <SocialIcon platform="linkedin_personal" size={16} className="w-4 h-4 rounded" />
                        <span>LinkedIn Document Carousel</span>
                      </span>
                      <span className="text-[10px] text-zinc-400">5 Slides</span>
                    </div>
                    <div className="text-xs font-semibold">{creatorKit.carousel.summary}</div>
                  </div>

                  {/* Thumbnails Card */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-500">
                      <span className="flex items-center gap-1.5">
                        <SocialIcon platform="youtube_videos" size={16} className="w-4 h-4 rounded" />
                        <SocialIcon platform="pinterest" size={16} className="w-4 h-4 rounded" />
                        <span>Multi-Format Thumbnails</span>
                      </span>
                      <span className="text-[10px] text-zinc-400">16:9 & 2:3</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {creatorKit.thumbnails.youtube_16_9 && (
                        <img src={getMediaUrl(creatorKit.thumbnails.youtube_16_9)} alt="YT" className="h-14 rounded border" />
                      )}
                      {creatorKit.thumbnails.pinterest_2_3 && (
                        <img src={getMediaUrl(creatorKit.thumbnails.pinterest_2_3)} alt="PIN" className="h-14 rounded border" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: CONTENT REPURPOSER                                           */}
        {/* =================================================================== */}
        {activeTab === "repurpose" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Content Repurposing Engine</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Convert 1 long video or article into 3 Viral Short Clips + 5-Part Twitter Thread + 5-Slide Carousel + Pinterest Pin
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Source Script, Transcript, or Article
                </label>
                <textarea
                  rows={4}
                  value={repurposeSource}
                  onChange={(e) => setRepurposeSource(e.target.value)}
                  placeholder="Paste your video transcript, lecture notes, or product story here..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              <button
                type="button"
                onClick={handleRepurpose}
                disabled={isRepurposing || !repurposeSource.trim()}
                className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm whitespace-nowrap shrink-0"
              >
                {isRepurposing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span className="whitespace-nowrap">Extracting Hooks & Formatting Derivatives...</span>
                  </>
                ) : (
                  <>
                    <Repeat className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">Repurpose into 5 Multi-Platform Formats</span>
                  </>
                )}
              </button>
            </div>

            {/* Repurposing Breakdown Results */}
            {repurposeData && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                    Repurposed Derivatives Ready for Distribution
                  </h3>
                  <button
                    type="button"
                    onClick={async () => {
                      const now = Date.now();
                      let clipIdx = 1;
                      // Schedule Short Clips
                      for (const clip of repurposeData.short_clips) {
                        const targetDate = new Date(now + clipIdx * 4 * 3600 * 1000).toISOString();
                        await api.createPublishPost({
                          title: clip.title,
                          content: clip.script,
                          platforms: ["instagram", "tiktok", "youtube_shorts"],
                          status: "scheduled",
                          scheduled_at: targetDate,
                          workspace_id: currentWorkspace !== "all" ? currentWorkspace : "default"
                        });
                        clipIdx++;
                      }
                      // Schedule Thread
                      const threadDate = new Date(now + (clipIdx + 1) * 4 * 3600 * 1000).toISOString();
                      await api.createPublishPost({
                        title: "Repurposed Masterclass Thread",
                        content: repurposeData.tweet_thread.join("\n\n---\n\n"),
                        platforms: ["twitter", "threads"],
                        status: "scheduled",
                        scheduled_at: threadDate,
                        workspace_id: currentWorkspace !== "all" ? currentWorkspace : "default"
                      });
                      setPublishSuccessMessage("All 5 repurposed formats queued into Calendar with staggered distribution times!");
                      fetchPosts();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                  >
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Schedule All Repurposed Assets</span>
                  </button>
                </div>

                {/* 3 Short Clips */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
                    3x Viral Short Clips (Reels / TikTok / Shorts)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {repurposeData.short_clips.map((clip: any) => (
                      <div key={clip.id} className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                        <div className="text-[10px] font-bold text-cyan-500">{clip.timestamp}</div>
                        <div className="text-xs font-bold">{clip.title}</div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{clip.script}</p>
                        <div className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
                          {clip.overlay_text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5-part Tweet Thread */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
                    5-Part X / Twitter Thread
                  </h3>
                  <div className="space-y-2">
                    {repurposeData.tweet_thread.map((tweet: string, idx: number) => (
                      <div key={idx} className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800/80 text-xs flex items-start gap-2">
                        <span className="text-[10px] font-bold text-sky-500 shrink-0">#{idx + 1}</span>
                        <p className="whitespace-pre-line">{tweet}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 6: THUMBNAIL STUDIO                                            */}
        {/* =================================================================== */}
        {activeTab === "thumbnail" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto">
            <div className="lg:col-span-6 bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-rose-500" />
                AI Thumbnail Generator
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                High-CTR platform covers with bold typography, dark gradients, and category pills
              </p>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Headline Text
                </label>
                <input
                  type="text"
                  value={thumbTitle}
                  onChange={(e) => setThumbTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Platform Format
                  </label>
                  <Dropdown
                    size="sm"
                    value={thumbFormat}
                    onChange={(val) => setThumbFormat(val)}
                    options={[
                      { value: "youtube_16_9", label: "YouTube (16:9 - 1280x720)", badge: "16:9" },
                      { value: "pinterest_2_3", label: "Pinterest (2:3 - 1000x1500)", badge: "2:3" },
                      { value: "linkedin_banner", label: "LinkedIn (1.91:1 - 1200x628)", badge: "1.91:1" },
                      { value: "instagram_square", label: "Instagram (1:1 - 1080x1080)", badge: "1:1" },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Category Badge
                  </label>
                  <input
                    type="text"
                    value={thumbBadge}
                    onChange={(e) => setThumbBadge(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {["#6366F1", "#EF4444", "#EC4899", "#10B981", "#F59E0B"].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setThumbColor(color)}
                      className={cn(
                        "w-7 h-7 rounded-full transition cursor-pointer border-2",
                        thumbColor === color ? "border-white scale-110 shadow-sm" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateThumbnail}
                disabled={isGeneratingThumb || !thumbTitle.trim()}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm whitespace-nowrap shrink-0"
              >
                {isGeneratingThumb ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span className="whitespace-nowrap">Rendering High-Res Cover...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">Render Platform Cover</span>
                  </>
                )}
              </button>
            </div>

            {/* Thumbnail Preview */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 flex flex-col items-center justify-center min-h-[340px]">
                {generatedThumbUrl ? (
                  <div className="space-y-4 w-full text-center">
                    <img
                      src={getMediaUrl(generatedThumbUrl)}
                      alt="Thumbnail Preview"
                      className="rounded-xl shadow-xl max-h-[300px] mx-auto object-contain"
                    />
                    <a
                      href={getMediaUrl(generatedThumbUrl)}
                      download="thumbnail.png"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold hover:opacity-90 whitespace-nowrap shrink-0"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span className="whitespace-nowrap">Download High-Res PNG</span>
                    </a>
                  </div>
                ) : (
                  <div className="text-center text-zinc-400">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <div className="text-xs font-semibold">Ready to generate cover art</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 7: CROSS-PLATFORM ANALYTICS & HEATMAP                           */}
        {/* =================================================================== */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Views</span>
                <div className="text-2xl font-black mt-1 text-zinc-900 dark:text-zinc-100">
                  {analytics?.views ? analytics.views.toLocaleString() : "18,450"}
                </div>
                <span className="text-[10px] text-emerald-500 font-medium">↑ +24% this week</span>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Avg Engagement</span>
                <div className="text-2xl font-black mt-1 text-emerald-500">
                  {analytics?.engagement_rate ? `${analytics.engagement_rate}%` : "7.84%"}
                </div>
                <span className="text-[10px] text-emerald-500 font-medium">↑ 2.2x industry avg</span>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Followers Growth</span>
                <div className="text-2xl font-black mt-1 text-zinc-900 dark:text-white">
                  +{analytics?.followers_growth || 385}
                </div>
                <span className="text-[10px] text-zinc-400">Across 15 channels</span>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Watch Time</span>
                <div className="text-2xl font-black mt-1 text-emerald-500">
                  {analytics?.watch_time_sec ? `${Math.round(analytics.watch_time_sec / 60)}m` : "803m"}
                </div>
                <span className="text-[10px] text-emerald-500 font-medium">↑ 88% retention</span>
              </div>
            </div>

            {/* Smart Posting Heatmap & Viral Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Heatmap Recommendations */}
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  AI Smart Posting Times (Highest Algorithmic Traffic)
                </h3>
                <div className="space-y-2.5">
                  {recommendations?.best_posting_times?.map((t: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold">{t.day} • {t.time}</div>
                        <div className="text-[11px] text-zinc-400">{t.platform}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">
                        {t.expected_engagement} Reach
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Viral Opportunities */}
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Trending Viral Opportunities
                </h3>
                <div className="space-y-2.5">
                  {recommendations?.viral_opportunities?.map((v: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800/80 space-y-1 text-xs">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{v.topic}</div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{v.format}</div>
                      <p className="text-[11px] text-zinc-400">{v.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 8: CONNECTED ACCOUNTS & CHANNELS                                */}
        {/* =================================================================== */}
        {activeTab === "accounts" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">15 Multi-Platform Channels & Accounts</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Connect and manage publishing credentials across all supported video, social, and messaging channels
                </p>
              </div>
            </div>

            {/* Social API Keys BYOK Direct Link Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-zinc-900/60 to-cyan-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>Direct BYOK Social Media API Keys</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 font-semibold uppercase">BYOK Config</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Configure Meta Graph (Instagram & Facebook), X/Twitter API v2, YouTube Data API, LinkedIn, TikTok, Pinterest, and Telegram bot credentials in Settings.
                  </p>
                </div>
              </div>
              <a
                href="/settings?tab=social_media"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-heading transition shrink-0 cursor-pointer shadow-sm"
              >
                <span>Open Social Media Settings</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PLATFORMS.map(plat => {
                const connectedAcc = accounts.find(a => a.platform === plat.id);
                return (
                  <div
                    key={plat.id}
                    className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <SocialIcon
                        platform={plat.id}
                        size={40}
                        className="w-10 h-10 rounded-xl shadow-xs"
                      />
                      <div>
                        <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{plat.name}</div>
                        <div className="text-[11px] text-zinc-400">
                          {connectedAcc ? connectedAcc.username || connectedAcc.account_name : "Ready to Connect"}
                        </div>
                      </div>
                    </div>

                    {connectedAcc ? (
                      <button
                        type="button"
                        onClick={() => handleDisconnect(connectedAcc.id)}
                        className="px-2.5 py-1 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <span>Disconnect</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConnectModalPlatform(plat.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-bold cursor-pointer shadow-xs transition whitespace-nowrap shrink-0"
                      >
                        <span>Connect</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Global Studio Modals (Accessible from Any Tab) ─── */}

        {/* Connect Account Modal */}
        {connectModalPlatform && (
          <div 
            onClick={() => setConnectModalPlatform(null)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0c0d14] p-6 rounded-2xl max-w-md w-full border border-black/[0.08] dark:border-white/[0.08] space-y-4 shadow-2xl cursor-default font-jakarta"
            >
              <div className="flex items-center gap-2.5 text-zinc-900 dark:text-zinc-100">
                {connectModalPlatform && (
                  <SocialIcon platform={connectModalPlatform} size={28} className="w-7 h-7 rounded-lg shadow-xs" />
                )}
                <h3 className="text-sm font-bold">
                  Connect {PLATFORMS.find(p => p.id === connectModalPlatform)?.name} Channel
                </h3>
              </div>
              <p className="text-xs text-zinc-500">
                Authorize direct posting and webhook telemetry for this channel.
              </p>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Account / Channel Name
                </label>
                <input
                  type="text"
                  value={accountNameInput}
                  onChange={(e) => setAccountNameInput(e.target.value)}
                  placeholder="e.g. Samar Studio Official"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Handle / Username
                </label>
                <input
                  type="text"
                  value={accountHandleInput}
                  onChange={(e) => setAccountHandleInput(e.target.value)}
                  placeholder="e.g. @samar_studio"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setConnectModalPlatform(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 whitespace-nowrap shrink-0"
                >
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={handleConnectAccount}
                  disabled={!accountNameInput.trim()}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-bold cursor-pointer disabled:opacity-50 transition shadow-sm whitespace-nowrap shrink-0"
                >
                  <span>Save Channel</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Client Workspace Modal */}
        {showWorkspaceModal && (
          <div 
            onClick={() => setShowWorkspaceModal(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0c0d14] p-6 rounded-2xl max-w-md w-full border border-black/[0.08] dark:border-white/[0.08] space-y-4 shadow-2xl cursor-default font-jakarta"
            >
              <div className="flex items-center gap-2 text-emerald-500">
                <Users className="w-5 h-5" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Create New Client / Team Workspace
                </h3>
              </div>
              <p className="text-xs text-zinc-500">
                Isolate multi-channel publishing, approval sign-offs, and analytics for specific agency clients.
              </p>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="e.g. Acme Global Fashion"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Client Organization / Contact Name
                </label>
                <input
                  type="text"
                  value={newWsClient}
                  onChange={(e) => setNewWsClient(e.target.value)}
                  placeholder="e.g. Acme Corp Enterprise B2B"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="wsApproval"
                  checked={newWsApprovalReq}
                  onChange={(e) => setNewWsApprovalReq(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="wsApproval" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  Require Client Sign-Off before Scheduled Distribution
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowWorkspaceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 whitespace-nowrap shrink-0"
                >
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateWorkspace}
                  disabled={!newWsName.trim()}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-bold cursor-pointer disabled:opacity-50 transition shadow-sm whitespace-nowrap shrink-0"
                >
                  <span>Create Workspace</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Template Modal */}
        {showTemplateModal && (
          <div 
            onClick={() => setShowTemplateModal(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0c0d14] p-6 rounded-2xl max-w-md w-full border border-black/[0.08] dark:border-white/[0.08] space-y-4 shadow-2xl cursor-default font-jakarta"
            >
              <div className="flex items-center gap-2 text-emerald-500">
                <Copy className="w-5 h-5" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Save Publishing Template
                </h3>
              </div>
              <p className="text-xs text-zinc-500">
                Save current channel selection ({selectedPlatforms.length} platforms) and copy structure as a reusable one-click template.
              </p>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  placeholder="e.g. Weekly Product Drop (Omnichannel)"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 whitespace-nowrap shrink-0"
                >
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={!templateNameInput.trim()}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-bold cursor-pointer disabled:opacity-50 transition shadow-sm whitespace-nowrap shrink-0"
                >
                  <span>Save Template</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vault Media Picker Modal */}
        {isVaultModalOpen && (
          <div 
            onClick={() => setIsVaultModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0c0d14] rounded-2xl max-w-4xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl cursor-default font-jakarta flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <FolderArchive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                      OmniStudio Vault Media Picker
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Select any previously rendered image or video from your Vault storage to publish
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVaultModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="p-3 sm:px-5 sm:py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={vaultSearch}
                    onChange={(e) => setVaultSearch(e.target.value)}
                    placeholder="Search by file name..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Tab Pills */}
                <div className="flex items-center gap-1 bg-zinc-200/70 dark:bg-zinc-800/70 p-0.5 rounded-xl text-xs self-start sm:self-auto overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setVaultTab("all")}
                    className={cn(
                      "px-3 py-1 rounded-lg font-medium transition cursor-pointer text-xs whitespace-nowrap shrink-0",
                      vaultTab === "all" ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs" : "text-zinc-500"
                    )}
                  >
                    All ({vaultAssets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVaultTab("videos")}
                    className={cn(
                      "px-3 py-1 rounded-lg font-medium transition cursor-pointer text-xs flex items-center gap-1 whitespace-nowrap shrink-0",
                      vaultTab === "videos" ? "bg-white dark:bg-zinc-950 text-violet-600 dark:text-violet-400 font-bold shadow-xs" : "text-zinc-500"
                    )}
                  >
                    <Video className="w-3 h-3 shrink-0" />
                    <span>Videos ({vaultAssets.filter(a => a.media_type === "video").length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVaultTab("images")}
                    className={cn(
                      "px-3 py-1 rounded-lg font-medium transition cursor-pointer text-xs flex items-center gap-1 whitespace-nowrap shrink-0",
                      vaultTab === "images" ? "bg-white dark:bg-zinc-950 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs" : "text-zinc-500"
                    )}
                  >
                    <ImageIcon className="w-3 h-3 shrink-0" />
                    <span>Images ({vaultAssets.filter(a => a.media_type === "image").length})</span>
                  </button>
                </div>
              </div>

              {/* Assets Grid */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-[300px]">
                {isLoadingVault ? (
                  <div className="h-64 flex flex-col items-center justify-center text-zinc-400 gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                    <span className="text-xs">Loading assets from Vault storage...</span>
                  </div>
                ) : (
                  (() => {
                    const filtered = vaultAssets.filter(item => {
                      if (vaultTab === "videos" && item.media_type !== "video") return false;
                      if (vaultTab === "images" && item.media_type !== "image") return false;
                      if (vaultSearch.trim() && !item.filename.toLowerCase().includes(vaultSearch.toLowerCase())) {
                        return false;
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                          <FolderArchive className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-2" />
                          <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No media found</h4>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {vaultSearch ? "No assets matched your search term" : "Render some images or videos in the Image/Video Studio first!"}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                        {filtered.map((asset, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSelectVaultAsset(asset)}
                            className="group relative border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-900/60 transition cursor-pointer flex flex-col"
                          >
                            {/* Media Preview Box */}
                            <div className="aspect-square w-full bg-black relative overflow-hidden flex items-center justify-center">
                              {asset.media_type === "video" ? (
                                <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
                                  <video
                                    src={getMediaUrl(asset.url)}
                                    className="w-full h-full object-cover"
                                    preload="metadata"
                                  />
                                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition flex items-center justify-center">
                                    <Play className="w-6 h-6 text-white fill-white drop-shadow-md" />
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={getMediaUrl(asset.url)}
                                  alt={asset.filename}
                                  loading="lazy"
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              )}

                              {/* Badge */}
                              <span className={cn(
                                "absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider backdrop-blur-xs",
                                asset.media_type === "video" 
                                  ? "bg-violet-600/90 text-white" 
                                  : "bg-emerald-600/90 text-white"
                              )}>
                                {asset.media_type === "video" ? "Video" : "Image"}
                              </span>
                            </div>

                            {/* Info */}
                            <div className="p-2.5 flex-1 flex flex-col justify-between">
                              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate" title={asset.filename}>
                                {asset.filename}
                              </p>
                              <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-400">
                                <span>{asset.size_mb ? `${asset.size_mb} MB` : "Ready"}</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold group-hover:underline">
                                  Select →
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 sm:px-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950">
                <span>Showing {vaultAssets.length} assets from OmniStudio Vault</span>
                <button
                  type="button"
                  onClick={() => setIsVaultModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer text-zinc-700 dark:text-zinc-300 whitespace-nowrap shrink-0"
                >
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PublishPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-400">Loading Publish Studio...</div>}>
      <PublishStudioContent />
    </Suspense>
  );
}
