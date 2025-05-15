import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Play,
  Download,
  ClipboardCopy,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  checkLeonardoStatus,
  generateTextToVideo,
} from "@/services/generate-video";
import {
  dimensionOptions,
  vibeOptions,
  lightingOptions,
  shotTypeOptions,
  colorThemeOptions,
} from "@/utils/constants";

const LeonardoTextToVideo = () => {
  const [dimensions, setDimensions] = useState({ width: 832, height: 480 });
  const [prompt, setPrompt] = useState("");
  const [frameInterpolation, setFrameInterpolation] = useState(true);
  const [promptEnhance, setPromptEnhance] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState("");
  const [selectedLighting, setSelectedLighting] = useState("");
  const [selectedShotType, setSelectedShotType] = useState("");
  const [selectedColorTheme, setSelectedColorTheme] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [generationId, setGenerationId] = useState("");
  const [error, setError] = useState("");
  const [pollingInterval, setPollingInterval] = useState(null);

  const handleDimensionChange = (value) => {
    const selected = dimensionOptions.find((option) => option.name === value);
    if (selected) {
      setDimensions({ width: selected.width, height: selected.height });
    }
  };

  const generatePayload = () => {
    const styleIds = [];
    if (selectedVibe && selectedVibe !== "none") styleIds.push(selectedVibe);
    if (selectedLighting && selectedLighting !== "none")
      styleIds.push(selectedLighting);
    if (selectedShotType && selectedShotType !== "none")
      styleIds.push(selectedShotType);
    if (selectedColorTheme && selectedColorTheme !== "none")
      styleIds.push(selectedColorTheme);

    // Create request payload
    return {
      width: dimensions.width,
      height: dimensions.height,
      prompt,
      frame_interpolation: frameInterpolation,
      is_public: isPublic,
      prompt_enhance: promptEnhance,
      style_ids: styleIds.length > 0 ? styleIds : undefined,
    };
  };

  // Clean up polling on component unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Function to check generation status
  const checkGenerationStatus = async (id) => {
    try {
      const response = await checkLeonardoStatus(id);
      const data = await response.json();

      if (response.ok) {
        if (data.status === "COMPLETE") {
          setIsGenerating(false);
          setGeneratedVideoUrl(data.video_url);
          clearInterval(pollingInterval);
          setPollingInterval(null);
        } else if (data.status === "FAILED") {
          setIsGenerating(false);
          setError("Video generation failed. Please try again.");
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      } else {
        setIsGenerating(false);
        setError(`Error checking status: ${data.detail || "Unknown error"}`);
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    } catch (err) {
      setIsGenerating(false);
      setError(`Error checking status: ${err.message}`);
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  // Handle generate click
  const handleGenerate = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    setGeneratedVideoUrl("");
    setError("");
    setGenerationId("");

    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    try {
      const payload = generatePayload();

      const response = await generateTextToVideo(JSON.stringify(payload));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate video");
      }

      setGenerationId(data.generation_id);

      const interval = setInterval(() => {
        checkGenerationStatus(data.generation_id);
      }, 5000);

      setPollingInterval(interval);

      checkGenerationStatus(data.generation_id);
    } catch (err) {
      setIsGenerating(false);
      setError(`Error: ${err.message}`);
    }
  };

  // Copy API request to clipboard
  const copyApiRequest = () => {
    const payload = generatePayload();
    const jsonString = JSON.stringify(payload, null, 2);

    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Format payload as pretty JSON
  const formatPayload = () => {
    const payload = generatePayload();
    return JSON.stringify(payload, null, 2);
  };

  // Download video function
  const downloadVideo = async () => {
    if (!generatedVideoUrl) return;

    try {
      const response = await fetch(generatedVideoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `leonardo-video-${generationId}.mp4`;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(`Error downloading video: ${err.message}`);
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* Left panel - Options (1/3 width) */}
      <div className="w-1/3 p-4 border-r border-gray-200 dark:border-gray-800 overflow-auto">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Leonardo.ai Settings</CardTitle>
            <CardDescription>
              Configure your video generation options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="dimensions">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
                <TabsTrigger value="style">Style</TabsTrigger>
              </TabsList>

              {/* Dimensions Tab */}
              <TabsContent value="dimensions" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="dimensions">Video Dimensions</Label>
                  <Select
                    onValueChange={handleDimensionChange}
                    defaultValue={dimensionOptions[0].name}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select dimensions" />
                    </SelectTrigger>
                    <SelectContent>
                      {dimensionOptions.map((option) => (
                        <SelectItem key={option.name} value={option.name}>
                          {option.name} ({option.width}x{option.height})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="frameInterpolation"
                    checked={frameInterpolation}
                    onCheckedChange={setFrameInterpolation}
                  />
                  <Label htmlFor="frameInterpolation">Smooth Video</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="promptEnhance"
                    checked={promptEnhance}
                    onCheckedChange={setPromptEnhance}
                  />
                  <Label htmlFor="promptEnhance">Enhance Prompt</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPublic"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                  <Label htmlFor="isPublic">Make Public</Label>
                </div>

                <Alert className="mt-4">
                  <AlertDescription>
                    <span className="text-sm">
                      The video will be 5 seconds in length with these
                      dimensions.
                    </span>
                  </AlertDescription>
                </Alert>
              </TabsContent>

              {/* Style Tab */}
              <TabsContent value="style" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="vibe">Vibe</Label>
                  <Select onValueChange={setSelectedVibe} value={selectedVibe}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vibe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {vibeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lighting">Lighting</Label>
                  <Select
                    onValueChange={setSelectedLighting}
                    value={selectedLighting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lighting" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {lightingOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shotType">Shot Type</Label>
                  <Select
                    onValueChange={setSelectedShotType}
                    value={selectedShotType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select shot type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {shotTypeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colorTheme">Color Theme</Label>
                  <Select
                    onValueChange={setSelectedColorTheme}
                    value={selectedColorTheme}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select color theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {colorThemeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Alert className="mt-4">
                  <AlertDescription>
                    <span className="text-sm">
                      Choose only one option from each category for best
                      results.
                    </span>
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right panel - Prompt and Results (2/3 width) */}
      <div className="w-2/3 p-4 overflow-auto">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Text-to-Video Generation</CardTitle>
            <CardDescription>
              Enter your prompt to generate a video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="A dog walking on the beach..."
                className="h-32"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={!prompt || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Generate Video
                </>
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isGenerating && generationId && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <AlertDescription>
                  Video generation in progress (ID: {generationId})
                </AlertDescription>
              </Alert>
            )}

            {!generatedVideoUrl && (
              <div className="space-y-4">
                <Label>Generated Video</Label>
                <div className="rounded-lg overflow-hidden bg-black">
                  <div className="relative pt-[56.25%]">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <video
                        src={generatedVideoUrl}
                        controls
                        className="w-full h-full"
                        autoPlay
                        loop
                      />
                      {/* <a
                        href={generatedVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-white/20 p-3 cursor-pointer hover:bg-white/30 transition-colors"
                      >
                        <Play className="h-8 w-8 text-white" />
                      </a> */}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">API Request</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={copyApiRequest}
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <ClipboardCopy className="h-3.5 w-3.5 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="text-xs bg-gray-200 dark:bg-gray-900 p-3 rounded overflow-x-auto">
                    {formatPayload()}
                  </pre>
                </div>

                <div className="flex justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    <p>Video duration: 5 seconds</p>
                    <p>Generation ID: {generationId}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={downloadVideo}
                  >
                    <Download className="h-4 w-4" />
                    Download Video
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeonardoTextToVideo;
