import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import {
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  Info,
  Play,
} from "lucide-react";
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
      <img src={url} alt="Xem trước" className="w-full h-full object-contain" />
    </div>
  );
};

const ProcessStatus = ({ status }) => {
  const statusMap = {
    pending: {
      label: "Đang chờ xử lý",
      color: "bg-yellow-500",
      icon: <RefreshCw className="animate-spin h-4 w-4 mr-2" />,
    },
    processing: {
      label: "Đang tạo video",
      color: "bg-blue-500",
      icon: <RefreshCw className="animate-spin h-4 w-4 mr-2" />,
    },
    completed: {
      label: "Hoàn thành",
      color: "bg-green-500",
      icon: <CheckCircle className="h-4 w-4 mr-2" />,
    },
    failed: {
      label: "Thất bại",
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

  const [activeTab, setActiveTab] = useState("upload");
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
    }
  };

  const handleUpload = async () => {
    if (imageFile) {
      setIsUploading(true);
      setUploadError(null);

      try {
        const data = await apiService.uploadImage(imageFile);
        setImageUrl(data.url);
        setActiveTab("configure");
      } catch (error) {
        setUploadError(error.message || "Lỗi khi tải ảnh lên");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const data = await generateVideo({
        ...formData,
        image_url: imageUrl,
      });

      setRequestId(data.request_id);
      setActiveTab("status");
      completedRef.current = false;
    } catch (error) {
      setGenerateError(error.message || "Lỗi khi tạo video");
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
    setActiveTab("upload");
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Chuyển Đổi Ảnh Thành Video</h1>
        <p className="text-gray-500">
          Sử dụng API Kling 2.0 Master để tạo video từ ảnh với AI
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Tải ảnh lên</TabsTrigger>
          <TabsTrigger value="configure" disabled={!imageUrl && !imageFile}>
            Cấu hình
          </TabsTrigger>
          <TabsTrigger value="status" disabled={!requestId}>
            Trạng thái
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Tải ảnh lên</CardTitle>
              <CardDescription>
                Chọn ảnh để chuyển đổi thành video
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="image">Tải ảnh lên</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <Button
                      onClick={handleUpload}
                      disabled={!imageFile || isUploading}
                    >
                      {isUploading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Tải lên
                    </Button>
                  </div>
                </div>

                {uploadError && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Lỗi tải lên</AlertTitle>
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}

                {(imageFile || imageUrl) && (
                  <div className="mt-4">
                    <ImagePreview imageUrl={imageUrl} imageFile={imageFile} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configure">
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình video</CardTitle>
              <CardDescription>
                Cài đặt các tham số để tạo video
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6">
                  <div>
                    <Label htmlFor="prompt" className="mb-2 block">
                      Mô tả (Prompt)
                    </Label>
                    <Textarea
                      id="prompt"
                      placeholder="Mô tả chi tiết cho video của bạn"
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
                      Mô tả tiêu cực (Negative Prompt)
                    </Label>
                    <Textarea
                      id="negative_prompt"
                      placeholder="Những điều bạn không muốn xuất hiện trong video"
                      value={formData.negative_prompt}
                      onChange={(e) =>
                        handleInputChange("negative_prompt", e.target.value)
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="duration" className="mb-2 block">
                        Thời lượng
                      </Label>
                      <Select
                        value={formData.duration}
                        onValueChange={(value) =>
                          handleInputChange("duration", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn thời lượng" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 giây</SelectItem>
                          <SelectItem value="10">10 giây</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="aspect_ratio" className="mb-2 block">
                        Tỷ lệ khung hình
                      </Label>
                      <Select
                        value={formData.aspect_ratio}
                        onValueChange={(value) =>
                          handleInputChange("aspect_ratio", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn tỷ lệ khung hình" />
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
                              Mức độ model tuân theo prompt của bạn. Giá trị cao
                              hơn khiến model tuân thủ chặt chẽ hơn.
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

                  <div className="mt-4">
                    <Label>Xem trước ảnh</Label>
                    <ImagePreview imageUrl={imageUrl} imageFile={imageFile} />
                  </div>
                </div>

                {generateError && (
                  <Alert variant="destructive" className="mt-4">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Lỗi tạo video</AlertTitle>
                    <AlertDescription>{generateError}</AlertDescription>
                  </Alert>
                )}

                <div className="mt-6 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleReset}>
                    Làm mới
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
                    Tạo video
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Trạng thái xử lý</CardTitle>
              <CardDescription>Theo dõi quá trình tạo video</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {statusData?.status === "failed" && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Lỗi xử lý</AlertTitle>
                    <AlertDescription>
                      {statusData?.error ||
                        "Đã xảy ra lỗi trong quá trình tạo video. Vui lòng thử lại."}
                    </AlertDescription>
                  </Alert>
                )}

                <ProcessStatus status={statusData?.status || "pending"} />

                {statusData?.status === "completed" &&
                  statusData?.video_url && (
                    <div className="mt-6">
                      <Label className="mb-2 block">Video đã tạo</Label>
                      <VideoPreview videoUrl={statusData.video_url} />
                    </div>
                  )}
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex justify-between w-full">
                <Button variant="outline" onClick={handleReset}>
                  Tạo video mới
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImageToVideoApp;
