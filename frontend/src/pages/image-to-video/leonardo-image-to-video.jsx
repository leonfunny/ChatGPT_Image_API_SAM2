import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadImageToLeonardo } from "@/services/upload";
import {
  checkLeonardoStatus,
  generateImageToVideo,
} from "@/services/generate-video";

const LeonardoImageToVideo = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [generationId, setGenerationId] = useState(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);

      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);

      setUploadResult(null);
      setError(null);
      setGenerationId(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file || !prompt.trim()) {
      setError("Please provide both an image and a prompt");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Step 1: Upload image to Leonardo
      const formData = new FormData();
      formData.append("image", file);

      const uploadResponse = await uploadImageToLeonardo(formData);

      const imageId = uploadResponse.uploadInitImage?.id;

      if (!imageId) {
        throw new Error("Failed to get image ID from upload response");
      }

      setIsProcessing(true);
      const generationResponse = await generateImageToVideo(
        JSON.stringify({
          image_type: "UPLOADED",
          image_id: imageId,
          prompt: prompt,
          frame_interpolation: true,
          prompt_enhance: true,
        })
      );

      if (!generationResponse.ok) {
        const errorData = await generationResponse.json();
        throw new Error(errorData.detail || "Video generation failed");
      }

      const generationData = await generationResponse.json();
      const newGenerationId = generationData.generation_id;

      if (!newGenerationId) {
        throw new Error("Failed to get generation ID");
      }

      setGenerationId(newGenerationId);

      // Start polling for status
      startStatusChecking(newGenerationId);
    } catch (err) {
      setError(err.message || "An error occurred during process");
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const startStatusChecking = (id) => {
    // Clear any existing interval
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }

    // Set new interval for status checking
    const interval = setInterval(async () => {
      try {
        const statusResponse = await checkLeonardoStatus(id);

        if (!statusResponse.ok) {
          throw new Error("Failed to check status");
        }

        const statusData = await statusResponse.json();

        // If complete, update the result and stop checking
        if (statusData.status === "COMPLETE" && statusData.video_url) {
          setUploadResult({
            id: id,
            video_url: statusData.video_url,
          });
          setIsUploading(false);
          setIsProcessing(false);
          clearInterval(interval);
          setStatusCheckInterval(null);
        } else if (statusData.status === "FAILED") {
          throw new Error("Video generation failed");
        }
        // Otherwise continue polling
      } catch (err) {
        setError(err.message || "Error checking generation status");
        setIsUploading(false);
        setIsProcessing(false);
        clearInterval(interval);
        setStatusCheckInterval(null);
      }
    }, 5000); // Check every 5 seconds

    setStatusCheckInterval(interval);
  };

  // Clean up interval on component unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  const clearUpload = () => {
    setFile(null);
    setPreview(null);
    setUploadResult(null);
    setError(null);
    setPrompt("");
    setGenerationId(null);

    // Clear any active status checking
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }

    // Revoke the object URL to avoid memory leaks
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Image to Video - Leonardo Model
      </h1>

      <div className="mb-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input {...getInputProps()} />

          {!preview ? (
            <div className="space-y-3">
              <Camera className="mx-auto h-12 w-12 text-gray-400" />
              <p className="text-lg">
                {isDragActive
                  ? "Drop the image here..."
                  : "Drag & drop an image here, or click to select"}
              </p>
              <p className="text-sm text-gray-500">
                Supported formats: JPEG, PNG, GIF, WebP
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <img
                src={preview}
                alt="Preview"
                className="max-h-64 mx-auto object-contain"
              />
              <p className="text-sm text-gray-500">
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Prompt input field */}
      <div className="mb-6">
        <label
          htmlFor="prompt"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Video Generation Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe how you want the image to be animated..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          disabled={isUploading || isProcessing}
        ></textarea>
        <p className="mt-1 text-sm text-gray-500">
          Be descriptive about the motion and style you want in your video
        </p>
      </div>

      {file && (
        <div className="flex space-x-4 mb-6">
          <Button
            onClick={handleUpload}
            disabled={isUploading || isProcessing || !prompt.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading
              ? "Uploading..."
              : isProcessing
              ? "Processing..."
              : "Generate Video"}
          </Button>

          <Button
            onClick={clearUpload}
            disabled={isUploading || isProcessing}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </Button>
        </div>
      )}

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {isProcessing && generationId && !uploadResult && (
        <div className="p-4 mb-6 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-lg font-medium text-blue-800 mb-2">
            Processing Your Video
          </h3>
          <p className="text-blue-600">
            Please wait while Leonardo AI creates your video. This may take a
            few minutes.
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">Generation ID:</span> {generationId}
          </p>
          <div className="mt-4 w-full h-2 bg-blue-100 overflow-hidden rounded-full">
            <div className="h-full bg-blue-500 animate-pulse"></div>
          </div>
        </div>
      )}

      {uploadResult && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="text-lg font-medium text-green-800 mb-2">
            Video Generated Successfully!
          </h3>

          {uploadResult.video_url && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Preview:</h4>
              <video
                controls
                className="w-full max-h-96 rounded-md"
                src={uploadResult.video_url}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {uploadResult.id && (
            <p className="mt-2 text-sm">
              <span className="font-medium">Video ID:</span> {uploadResult.id}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default LeonardoImageToVideo;
