import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadImageToLeonardo } from "@/services/upload";

const LeonardoImageToVideo = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);

      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);

      setUploadResult(null);
      setError(null);
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
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await uploadImageToLeonardo(formData);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const result = await response.json();
      setUploadResult(result);
    } catch (err) {
      setError(err.message || "An error occurred during upload");
    } finally {
      setIsUploading(false);
    }
  };

  const clearUpload = () => {
    setFile(null);
    setPreview(null);
    setUploadResult(null);
    setError(null);

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

      {file && (
        <div className="flex space-x-4 mb-6">
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? "Uploading..." : "Generate Video"}
          </Button>

          <Button
            onClick={clearUpload}
            disabled={isUploading}
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

          {/* Add any other result fields you want to display */}
        </div>
      )}
    </div>
  );
};

export default LeonardoImageToVideo;
