import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Video, Loader2, Trash2, Play, Clock, AlertCircle } from "lucide-react";
import { useGeneratedVideos, useGenerateVideo, useDeleteVideo } from "@/hooks/useGeneratedVideos";
import { PlatformTarget } from "@/types/database";
import { Badge } from "@/components/ui/badge";

interface VideoGeneratorProps {
  projectId: string;
  platforms: PlatformTarget[];
}

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok",
  instagram_reels: "Instagram Reels",
  facebook_reels: "Facebook Reels",
  youtube_shorts: "YouTube Shorts",
};

const DURATION_OPTIONS = [
  { value: 5, label: "5 seconds" },
  { value: 10, label: "10 seconds" },
  { value: 15, label: "15 seconds" },
];

export default function VideoGenerator({ projectId, platforms }: VideoGeneratorProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>(platforms[0] || "tiktok");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);

  const { data: videos, isLoading: loadingVideos } = useGeneratedVideos(projectId);
  const generateVideo = useGenerateVideo();
  const deleteVideo = useDeleteVideo();

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    
    generateVideo.mutate({
      projectId,
      platform: selectedPlatform,
      prompt: prompt.trim(),
      durationSeconds: duration,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case "generating":
      case "processing":
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Processing</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Generate Video with Veo 3
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {PLATFORM_LABELS[platform] || platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Video Prompt</Label>
            <Textarea
              placeholder="Describe the video you want to generate... e.g., 'A cinematic shot of premium nuts and dried fruits arranged elegantly on a marble surface with soft natural lighting'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={generateVideo.isPending || !prompt.trim()}
            className="w-full"
          >
            {generateVideo.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Video className="h-4 w-4 mr-2" />
                Generate Video
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Videos List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Generated Videos</h3>
        
        {loadingVideos ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : videos && videos.length > 0 ? (
          <div className="grid gap-4">
            {videos.map((video) => (
              <Card key={video.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">
                          {PLATFORM_LABELS[video.platform] || video.platform}
                        </Badge>
                        {getStatusBadge(video.status)}
                        {video.duration_seconds && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {video.duration_seconds}s
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {video.prompt}
                      </p>

                      {video.status === "completed" && video.video_url && (
                        <div className="mt-3">
                          <video 
                            src={video.video_url} 
                            controls 
                            className="w-full max-w-md rounded-lg"
                            poster=""
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      )}

                      {video.status === "processing" && (
                        <div className="flex items-center gap-2 text-sm text-yellow-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Video is being processed. This may take a few minutes.
                        </div>
                      )}

                      {video.status === "failed" && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          Generation failed. Please try again.
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteVideo.mutate(video.id)}
                      disabled={deleteVideo.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No videos generated yet.</p>
              <p className="text-sm">Use the form above to generate your first video.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
