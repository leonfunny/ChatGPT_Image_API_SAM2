import React, { useState, useRef, useEffect } from "react";
import { Upload, RefreshCw, X, Zap, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import useWebSocketConnection from "@/hooks/useWebSocketConnection";
import useImageContour from "@/hooks/useImageContour";
import axios from "axios";
import { useSelector } from "react-redux";
import LoadingSuspense from "@/components/loading";

import { HOST } from "@/services/host";

const BASE_WEBSOCKET = import.meta.env.VITE_BASE_WEBSOCKET;
const BASE_API_URL = import.meta.env.VITE_BASE_API_URL;
const ImageSegmentationApp = () => {
  const { access_token } = useSelector((state) => state["feature/user"]);

  const [originalImage, setOriginalImage] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [maskImage, setMaskImage] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [status, setStatus] = useState("idle"); // idle, uploading, deleting, ready, processing, success, error, disconnected
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [processedImage, setProcessedImage] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Thêm state mới cho các tính năng yêu cầu
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-image-1");
  const [imageSize, setImageSize] = useState("auto");

  const imageRef = useRef(null);

  const {
    resultImage,
    isProcessing,
    error: contourError,
    findContours,
    clearResult,
  } = useImageContour();

  useEffect(() => {
    setClientId(
      `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    );
  }, []);

  const { wsStatus, sendMessage, reconnect, setOnMessageHandler } =
    useWebSocketConnection(`ws://${BASE_WEBSOCKET}auto-segment`, clientId);

  useEffect(() => {
    if (setOnMessageHandler) {
      setOnMessageHandler(handleWebSocketResponse);
    }
  }, [setOnMessageHandler]);

  useEffect(() => {
    if (wsStatus === "connected") {
      setStatus("ready");
    } else if (wsStatus === "connecting") {
      setStatus("connecting");
    } else if (wsStatus === "disconnected") {
      setStatus("disconnected");
    } else if (wsStatus === "error") {
      setStatus("error");
    } else if (wsStatus === "processing") {
      setStatus("processing");
    }
  }, [wsStatus]);

  // Handle errors from contour processing
  useEffect(() => {
    if (contourError) {
      toast.error(contourError);
    }
  }, [contourError]);

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setStatus("uploading");
      clearResult();
      setMaskImage(null);
      setProcessedImage(null);

      // Upload to server first before creating local preview
      const formData = new FormData();
      formData.append("file", file);

      toast.info("Uploading image to Google Cloud Storage...");

      const response = await axios.post(
        `${BASE_API_URL}${HOST.upload}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      if (response.data && response.data.url) {
        const objectUrl = URL.createObjectURL(file);
        setOriginalImage(objectUrl);

        const fullImageUrl = response.data.url;

        setImageUrl(fullImageUrl);
        setStatus("ready");
        toast.success("Image uploaded successfully!");
      } else {
        throw new Error("Invalid response format: missing image URL");
      }
    } catch (error) {
      toast.error(error.message || "Error uploading image");
      setStatus("error");
    }
  };

  // Handle click on image to segment
  const handleImageClick = (event) => {
    if (!imageUrl) {
      toast.error("No image uploaded");
      return;
    }

    const rect = event.target.getBoundingClientRect();

    const img = event.target;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    const relativeX = (event.clientX - rect.left) / rect.width;
    const relativeY = (event.clientY - rect.top) / rect.height;

    const pixelX = Math.round(relativeX * naturalWidth);
    const pixelY = Math.round(relativeY * naturalHeight);

    setSelectedPoints((prevPoints) => [
      ...prevPoints,
      { x: pixelX, y: pixelY, label: 1 },
    ]);
  };

  const handleClearResult = () => {
    clearResult();
    setMaskImage(null);
    setSelectedPoints([]);
    setOriginalImage(null);
    setImageUrl("");
    setProcessedImage(null);
    setGeneratedImage(null);
  };

  // Handle delete image
  const handleDeleteImage = async () => {
    if (!imageUrl) return;

    try {
      setStatus("deleting");
      toast.info("Deleting image...");

      // Extract image path from the full URL
      const urlObj = new URL(imageUrl);
      const imagePath = urlObj.pathname.startsWith("/")
        ? urlObj.pathname.substring(1)
        : urlObj.pathname;

      await axios.delete("http://localhost:8000/api/v1/images", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        data: {
          image_url: imagePath,
        },
      });

      handleClearResult();

      setStatus("idle");
      toast.success("Image deleted successfully!");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error(error.message || "Error deleting image");
      setStatus("error");
    }
  };

  const clearSelectedPoints = () => {
    setSelectedPoints([]);
  };

  const processSelectedPoints = () => {
    if (!imageUrl || wsStatus !== "connected") {
      toast.error("WebSocket not connected or no image uploaded");
      return;
    }

    if (selectedPoints.length === 0) {
      toast.error("Please select at least one point on the image");
      return;
    }

    toast.info("Processing image segmentation...", {
      duration: 3000,
    });

    clearResult();
    setMaskImage(null);
    setStatus("processing");

    const message = {
      action: "process_image",
      image_url: imageUrl,
      prompts: selectedPoints,
    };

    const success = sendMessage(message);
    if (!success) {
      toast.error("Failed to send request. Please check connection.");
      setStatus("error");
    }
  };

  // Thêm hàm mới để generate image
  const generateImage = async () => {
    if (!originalImage || !maskImage) {
      toast.error("Both original and mask images are required");
      return;
    }

    if (!prompt) {
      toast.error("Please provide a text prompt");
      return;
    }

    try {
      setIsGenerating(true);
      toast.info("Generating new image...");
      setStatus("processing");

      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("model", model);
      formData.append("size", imageSize);
      formData.append("output_format", "png");

      formData.append("image_url", imageUrl);

      if (processedImage) {
        const response = await fetch(processedImage);
        const blob = await response.blob();

        const reader = new FileReader();

        const base64Data = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

        formData.append("mask_base64", base64Data);
      }

      const response = await axios.post(
        `${BASE_API_URL}${HOST.editURLImage}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      if (response.data && response.data.image_url) {
        setGeneratedImage(response.data.image_url);
        setStatus("success");
        toast.success("Image generated successfully!");
      } else {
        throw new Error("Invalid response format: missing generated image URL");
      }
    } catch (error) {
      toast.error(error.message || "Error generating image");
      setStatus("error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Xử lý phản hồi từ WebSocket
  const handleWebSocketResponse = (data) => {
    if (data.status === "success" && data.result) {
      const { image_url, original_image_url } = data.result;
      setMaskImage(image_url);

      const contourResult = findContours(image_url, original_image_url);

      if (contourResult && contourResult.then) {
        contourResult.then((result) => {
          if (result) {
            setProcessedImage(result.processedImageUrl);
          }
        });
      } else if (contourResult) {
        setProcessedImage(contourResult.processedImageUrl);
      }

      setStatus("success");
      toast.success("Segmentation completed successfully!");
    } else if (data.status === "processing") {
      setStatus("processing");
    } else if (data.status === "error") {
      toast.error(data.message || "Error processing image");
      setStatus("error");
    }
  };

  // Xử lý nút reconnect
  const handleReconnect = () => {
    reconnect();
  };

  // Render loading state
  const renderLoading = () => (
    <div className="flex flex-col justify-center items-center h-64 bg-slate-50 rounded-lg border border-slate-100">
      <LoadingSuspense />
      <span className="mt-4 text-sm text-slate-500">
        {status === "uploading"
          ? "Uploading image to Google Cloud Storage..."
          : status === "deleting"
          ? "Deleting image from Google Cloud Storage..."
          : "Processing segmentation..."}
      </span>
    </div>
  );

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex flex-col justify-center items-center h-64 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
      <p className="text-slate-500 mb-2">
        Upload an image and click points to segment
      </p>
      <p className="text-xs text-slate-400">Results will appear here</p>
    </div>
  );

  // Render result images
  const renderResultContent = () => {
    if (isProcessing) return renderLoading();
    if (!resultImage) return renderEmptyState();

    return (
      <Tabs defaultValue="overview" className="w-full">
        <TabsContent value="overview" className="mt-0">
          <div className="border rounded-lg overflow-hidden">
            <img
              src={resultImage}
              alt="Result with Contours"
              className="w-full h-auto"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="space-y-1">
              <Badge variant="outline" className="bg-slate-100">
                Mask
              </Badge>
              <div className="border rounded-lg overflow-hidden h-32">
                {maskImage ? (
                  <img
                    src={maskImage}
                    alt="Mask"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex justify-center items-center h-full bg-slate-50">
                    <p className="text-xs text-slate-400">No mask</p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Badge variant="outline" className="bg-slate-100">
                Processed
              </Badge>
              <div
                className="border rounded-lg overflow-hidden h-32"
                style={{ background: "rgba(0,0,0,0.05)" }}
              >
                {processedImage ? (
                  <img
                    src={processedImage}
                    alt="Processed"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-xs text-slate-400">No processed image</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mask" className="mt-0">
          <div
            className="border rounded-lg overflow-hidden"
            style={{ background: "rgba(0,0,0,0.05)" }}
          >
            {maskImage ? (
              <img src={maskImage} alt="Mask" className="w-full h-auto" />
            ) : (
              <div className="flex justify-center items-center h-64">
                <p className="text-slate-400">No mask available</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="processed" className="mt-0">
          <div
            className="border rounded-lg overflow-hidden"
            style={{ background: "rgba(0,0,0,0.05)" }}
          >
            {processedImage ? (
              <img
                src={processedImage}
                alt="Processed"
                className="w-full h-auto"
              />
            ) : (
              <div className="flex justify-center items-center h-64">
                <p className="text-slate-400">No processed image available</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  // Kiểm tra xem có nên hiển thị phần Image Generation hay không
  const shouldShowImageGeneration =
    maskImage !== null && processedImage !== null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold text-center">Image Segmentation</h1>
        <p className="text-slate-500 text-center">
          Select areas on your image to segment them
        </p>
      </div>

      {/* Status alerts */}
      {status === "disconnected" || status === "error" ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>
            {status === "disconnected" ? "Connection Lost" : "Error"}
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {status === "disconnected"
                ? "WebSocket disconnected. Please reconnect to continue."
                : "An error occurred processing your request."}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReconnect}
              className="ml-2"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reconnect
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        status === "success" &&
        !isProcessing && (
          <Alert className="mb-6 border-green-200 text-green-800 bg-green-50">
            <AlertTitle className="text-green-800">Success</AlertTitle>
            <AlertDescription>
              Segmentation completed successfully!
            </AlertDescription>
          </Alert>
        )
      )}

      {/* Lưới 2 cột cho phần chọn ảnh và kết quả phân đoạn */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Upload and point selection card */}
        <Card className="">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full inline-flex items-center justify-center mr-2 text-xs">
                1
              </span>
              Select Image and Points
            </CardTitle>
          </CardHeader>

          <CardContent>
            {/* Upload button */}
            {status === "deleting" ? (
              renderLoading()
            ) : !originalImage ? (
              <div className="flex flex-col justify-center items-center h-64 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                <label className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Upload size={24} />
                  </div>
                  <span className="text-sm font-medium">Upload Image</span>
                  <span className="text-xs text-slate-500">
                    Click to select a file
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={status === "uploading" || isProcessing}
                  />
                </label>
              </div>
            ) : status === "uploading" ? (
              renderLoading()
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden relative">
                  <div className="absolute top-2 right-2 z-10 flex gap-1">
                    <Badge variant="secondary" className="bg-white">
                      {selectedPoints.length} points
                    </Badge>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6 bg-white"
                      onClick={handleDeleteImage}
                      disabled={status === "deleting" || isProcessing}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                  <img
                    ref={imageRef}
                    src={originalImage}
                    alt="Original"
                    className="w-full h-auto cursor-crosshair"
                    onClick={handleImageClick}
                  />
                  {selectedPoints.map((point, index) => {
                    const img = imageRef.current;
                    if (!img) return null;

                    const pointX = (point.x / img.naturalWidth) * 100;
                    const pointY = (point.y / img.naturalHeight) * 100;

                    return (
                      <div
                        key={index}
                        className="absolute w-4 h-4 rounded-full bg-red-500 border-2 border-white transform -translate-x-1/2 -translate-y-1/2 shadow-md"
                        style={{
                          left: `${pointX}%`,
                          top: `${pointY}%`,
                          zIndex: 10,
                        }}
                      />
                    );
                  })}
                </div>

                <div className="text-xs text-slate-500">
                  Click on the image to select points for segmentation
                </div>
              </div>
            )}
          </CardContent>

          {originalImage && status !== "uploading" && (
            <CardFooter className="justify-between border-t p-4 bg-slate-50">
              <div className="text-sm text-slate-500">
                {selectedPoints.length}{" "}
                {selectedPoints.length === 1 ? "point" : "points"} selected
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelectedPoints}
                  disabled={selectedPoints.length === 0 || isProcessing}
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={processSelectedPoints}
                  disabled={selectedPoints.length === 0 || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader className="mr-1 h-3 w-3 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-1 h-3 w-3" />
                      Process
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Results card */}
        <Card className="">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full inline-flex items-center justify-center mr-2 text-xs">
                2
              </span>
              Segmentation
            </CardTitle>
          </CardHeader>

          <CardContent>
            {isProcessing ? (
              <div className="flex flex-col justify-center items-center h-64 bg-slate-50 rounded-lg border border-slate-100">
                <LoadingSuspense />
                <span className="mt-4 text-sm text-slate-500">
                  Processing segmentation...
                </span>
              </div>
            ) : (
              renderResultContent()
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image Generation Card ở hàng riêng biệt - Chỉ hiển thị khi có kết quả phân đoạn */}
      {shouldShowImageGeneration && (
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full inline-flex items-center justify-center mr-2 text-xs">
                3
              </span>
              Image Generation
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Text Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe what you want to generate (e.g., 'a red sports car in a futuristic city')"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="resize-none"
                />
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-image-1">gpt-image-1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size">Size</Label>
                  <Select value={imageSize} onValueChange={setImageSize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (default)</SelectItem>
                      <SelectItem value="1024x1024">
                        1024x1024 (square)
                      </SelectItem>
                      <SelectItem value="1536x1024">
                        1536x1024 (landscape)
                      </SelectItem>
                      <SelectItem value="1024x1536">
                        1024x1536 (portrait)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-col border-t p-4 bg-slate-50">
            <div className="flex justify-end w-full gap-2 mb-4">
              <Button variant="outline" onClick={handleClearResult}>
                Clear
              </Button>
              <Button
                onClick={generateImage}
                disabled={
                  !maskImage || !originalImage || isGenerating || generatedImage
                }
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Generate Image
                  </>
                )}
              </Button>
            </div>

            {/* Hiển thị hình ảnh đã tạo nếu có */}
            {generatedImage && (
              <div className="w-full flex flex-col items-center">
                <h3 className="font-medium mb-2">Generated Image</h3>
                <div className="border rounded-lg overflow-hidden w-">
                  <img
                    src={generatedImage}
                    alt="Generated Image"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default ImageSegmentationApp;
