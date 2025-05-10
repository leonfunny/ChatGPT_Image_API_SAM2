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
import useWebSocketConnection from "@/hooks/useWebSocketConnection";
import useImageContour from "@/hooks/useImageContour";
import axios from "axios";
import { useSelector } from "react-redux";
import LoadingSuspense from "@/components/loading";

const ImageSegmentationApp = () => {
  const { access_token } = useSelector((state) => state["feature/user"]);

  const [originalImage, setOriginalImage] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [maskImage, setMaskImage] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [processedImage, setProcessedImage] = useState(null);

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
    useWebSocketConnection("ws://localhost:8000/api/v1/auto-segment", clientId);

  // Đăng ký callback để xử lý tin nhắn WebSocket
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
      // Critical error - keep toast
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

      // Create a URL for the selected image
      const objectUrl = URL.createObjectURL(file);
      setOriginalImage(objectUrl);

      // Upload to server
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        "http://localhost:8000/api/v1/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      // Kiểm tra xem response.data có chứa url không
      if (response.data && response.data.url) {
        const fullImageUrl = response.data.url.startsWith("http")
          ? response.data.url
          : `http://localhost:8000${response.data.url}`;

        setImageUrl(fullImageUrl);
        setStatus("ready");
      } else {
        throw new Error("Invalid response format: missing image URL");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
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

  // Xử lý phản hồi từ WebSocket
  const handleWebSocketResponse = (data) => {
    if (data.status === "success" && data.result) {
      const { image_url, original_image_url } = data.result;
      setMaskImage(image_url);

      // Gọi findContours và lấy cả hai kết quả trả về
      const contourResult = findContours(image_url, original_image_url);

      if (contourResult && contourResult.then) {
        // Nếu findContours trả về Promise
        contourResult.then((result) => {
          if (result) {
            // Lưu URL của ảnh đã xử lý (vùng đã chọn bị xóa)
            setProcessedImage(result.processedImageUrl);
          }
        });
      } else if (contourResult) {
        // Nếu findContours không trả về Promise
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
          ? "Uploading image..."
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            {!originalImage ? (
              <div className="flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-8 bg-slate-50">
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
                      onClick={() => {
                        clearResult();
                        setMaskImage(null);
                        setSelectedPoints([]);
                        setOriginalImage(null);
                        setImageUrl("");
                      }}
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
              Segmentation Results
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
    </div>
  );
};

export default ImageSegmentationApp;
