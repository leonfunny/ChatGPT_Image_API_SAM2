import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Info,
  Play,
  ImageIcon,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { uploadImageService } from "@/services/upload";
import { checkStatus, generateVideo } from "@/services/generate-video";
import { useSelector } from "react-redux";

const apiService = {
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = uploadImageService(formData);
    return response;
  },
};

const VideoPreview = ({ videoUrl }) => {
  if (!videoUrl) return null;

  return (
    <div className="rounded-lg overflow-hidden bg-black aspect-video">
      <video src={videoUrl} controls className="w-full h-full" autoPlay loop />
    </div>
  );
};

const ImagePreview = ({ imageUrl, imageFile }) => {
  const url = imageUrl || (imageFile ? URL.createObjectURL(imageFile) : null);

  if (!url) return null;

  return (
    <div className="rounded-lg overflow-hidden bg-gray-100 aspect-video">
      <img src={url} alt="Preview" className="w-full h-full object-contain" />
    </div>
  );
};

const ProcessStatus = ({ status }) => {
  const statusMap = {
    pending: {
      label: "Pending",
      color: "bg-yellow-500",
      icon: <RefreshCw className="animate-spin h-4 w-4 mr-2" />,
    },
    processing: {
      label: "Creating video",
      color: "bg-blue-500",
      icon: <RefreshCw className="animate-spin h-4 w-4 mr-2" />,
    },
    completed: {
      label: "Completed",
      color: "bg-green-500",
      icon: <CheckCircle className="h-4 w-4 mr-2" />,
    },
    failed: {
      label: "Failed",
      color: "bg-red-500",
      icon: <XCircle className="h-4 w-4 mr-2" />,
    },
  };

  const currentStatus = statusMap[status] || statusMap.pending;

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        {currentStatus.icon}
        <span className="text-sm font-medium">{currentStatus.label}</span>
      </div>
    </div>
  );
};

const ImageToVideoApp = () => {
  const { access_token } = useSelector((state) => state["feature/user"]);

  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [formData, setFormData] = useState({
    prompt: "",
    negative_prompt: "blur, distort, and low quality",
    duration: "5",
    aspect_ratio: "16:9",
    cfg_scale: 0.5,
  });
  const [requestId, setRequestId] = useState("");
  const completedRef = useRef(false);

  const [statusData, setStatusData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const statusIntervalRef = useRef(null);

  useEffect(() => {
    if (requestId && !completedRef.current) {
      const checkVideoStatus = async () => {
        try {
          const data = await checkStatus(requestId);
          setStatusData(data);

          if (data?.status === "completed" || data?.status === "failed") {
            completedRef.current = true;

            if (statusIntervalRef.current) {
              clearInterval(statusIntervalRef.current);
              statusIntervalRef.current = null;
            }
          }
        } catch (error) {
          console.error("Error checking status:", error);
        }
      };

      checkVideoStatus();
      statusIntervalRef.current = setInterval(checkVideoStatus, 3000);

      return () => {
        if (statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current);
          statusIntervalRef.current = null;
        }
      };
    }
  }, [requestId, access_token]);

  // Auto upload when file is selected
  useEffect(() => {
    if (imageFile && !imageUrl && !isUploading) {
      handleUpload();
    }
  }, [imageFile, imageUrl, isUploading]);

  const handleUpload = async () => {
    if (imageFile) {
      setIsUploading(true);
      setUploadError(null);

      try {
        const data = await apiService.uploadImage(imageFile);
        setImageUrl(data.url);
      } catch (error) {
        setUploadError(error.message || "Error uploading image");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setImageFile(acceptedFiles[0]);
      setImageUrl(""); // Reset imageUrl to trigger auto-upload
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageUrl) {
      setUploadError("Please upload an image first");
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const data = await generateVideo({
        ...formData,
        image_url: imageUrl,
      });

      setRequestId(data.request_id);
      completedRef.current = false;
    } catch (error) {
      setGenerateError(error.message || "Error creating video");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }

    setImageFile(null);
    setImageUrl("");
    setFormData({
      prompt: "",
      negative_prompt: "blur, distort, and low quality",
      duration: "5",
      aspect_ratio: "16:9",
      cfg_scale: 0.5,
    });
    setRequestId("");
    setStatusData(null);
    completedRef.current = false;
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Image to Video Converter</h1>
        <p className="text-gray-500">
          Use Kling 2.0 Master API to create videos from images with AI
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Image to Video Conversion</CardTitle>
          <CardDescription>
            Upload an image and configure settings to create a video
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8">
            {/* Upload Section */}
            <div className="grid gap-4">
              <div>
                <h3 className="text-lg font-medium mb-2">1. Upload Image</h3>

                {/* Dedicated Drag and Drop Zone with Auto Upload */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center gap-3">
                    {isUploading ? (
                      <RefreshCw className="h-12 w-12 text-blue-500 animate-spin" />
                    ) : (
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                    )}

                    {isUploading ? (
                      <p className="text-blue-600 font-medium">
                        Uploading image...
                      </p>
                    ) : isDragActive ? (
                      <p className="text-blue-600 font-medium">
                        Drop the image here ...
                      </p>
                    ) : imageUrl ? (
                      <p className="text-green-600 font-medium">
                        Image uploaded successfully
                      </p>
                    ) : (
                      <p className="font-medium">Drag and drop an image here</p>
                    )}

                    {!isUploading && !imageUrl && (
                      <p className="text-sm text-gray-500">
                        Supports: JPG, PNG, GIF, etc.
                      </p>
                    )}
                  </div>
                </div>

                {uploadError && (
                  <Alert variant="destructive" className="mt-2">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Upload Error</AlertTitle>
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}

                {(imageFile || imageUrl) && (
                  <div className="mt-4">
                    <Label className="mb-2 block">Image Preview</Label>
                    <ImagePreview imageUrl={imageUrl} imageFile={imageFile} />
                  </div>
                )}
              </div>
            </div>

            {/* Configuration Section */}
            <div>
              <h3 className="text-lg font-medium mb-2">2. Configure Video</h3>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="prompt" className="mb-2 block">
                      Prompt
                    </Label>
                    <Textarea
                      id="prompt"
                      placeholder="Detailed description for your video"
                      value={formData.prompt}
                      onChange={(e) =>
                        handleInputChange("prompt", e.target.value)
                      }
                      className="min-h-24"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="negative_prompt" className="mb-2 block">
                      Negative Prompt
                    </Label>
                    <Textarea
                      id="negative_prompt"
                      placeholder="Things you don't want to appear in the video"
                      value={formData.negative_prompt}
                      onChange={(e) =>
                        handleInputChange("negative_prompt", e.target.value)
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="duration" className="mb-2 block">
                        Duration
                      </Label>
                      <Select
                        value={formData.duration}
                        onValueChange={(value) =>
                          handleInputChange("duration", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 seconds</SelectItem>
                          <SelectItem value="10">10 seconds</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="aspect_ratio" className="mb-2 block">
                        Aspect Ratio
                      </Label>
                      <Select
                        value={formData.aspect_ratio}
                        onValueChange={(value) =>
                          handleInputChange("aspect_ratio", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select aspect ratio" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                          <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                          <SelectItem value="1:1">1:1 (Square)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label htmlFor="cfg_scale">
                        CFG Scale: {formData.cfg_scale}
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              How closely the model follows your prompt. Higher
                              values make the model adhere more strictly.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Slider
                      id="cfg_scale"
                      min={0}
                      max={1}
                      step={0.1}
                      value={[formData.cfg_scale]}
                      onValueChange={(values) =>
                        handleInputChange("cfg_scale", values[0])
                      }
                    />
                  </div>

                  {generateError && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Generation Error</AlertTitle>
                      <AlertDescription>{generateError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                    >
                      Reset
                    </Button>
                    <Button
                      type="submit"
                      disabled={!formData.prompt || !imageUrl || isGenerating}
                    >
                      {isGenerating ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Generate Video
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            {/* Status Section */}
            {requestId && (
              <div>
                <h3 className="text-lg font-medium mb-2">
                  3. Processing Status
                </h3>
                <div className="space-y-4">
                  {statusData?.status === "failed" && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Processing Error</AlertTitle>
                      <AlertDescription>
                        {statusData?.error ||
                          "An error occurred during video creation. Please try again."}
                      </AlertDescription>
                    </Alert>
                  )}

                  <ProcessStatus status={statusData?.status || "pending"} />

                  {statusData?.status === "completed" &&
                    statusData?.video_url && (
                      <div className="mt-4">
                        <Label className="mb-2 block">Generated Video</Label>
                        <VideoPreview videoUrl={statusData.video_url} />
                      </div>
                    )}

                  <div className="mt-4">
                    <Button variant="outline" onClick={handleReset}>
                      Create New Video
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageToVideoApp;
