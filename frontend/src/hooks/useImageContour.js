/* eslint-disable no-unused-vars */
import { useState, useRef } from "react";

const useImageContour = () => {
  const [resultImage, setResultImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const maskCanvasRef = useRef(null);
  const originalImageRef = useRef(null);

  const findContours = async (maskImageUrl, originalImageUrl) => {
    if (!maskImageUrl || !originalImageUrl) {
      setError("Original or mask image not available");
      return Promise.resolve(null);
    }

    setIsProcessing(true);
    setError(null);

    try {
      const maskImg = await loadImage(maskImageUrl);
      const origImg = await loadImage(originalImageUrl);

      originalImageRef.current = origImg;

      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      tempCanvas.width = maskImg.width;
      tempCanvas.height = maskImg.height;
      tempCtx.drawImage(maskImg, 0, 0);

      maskCanvasRef.current = tempCanvas;

      const imageData = tempCtx.getImageData(
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      );
      const data = imageData.data;

      // Tạo canvas kết quả
      const resultCanvas = document.createElement("canvas");
      const resultCtx = resultCanvas.getContext("2d");
      resultCanvas.width = maskImg.width;
      resultCanvas.height = maskImg.height;

      // Vẽ ảnh gốc lên canvas kết quả
      resultCtx.drawImage(
        origImg,
        0,
        0,
        resultCanvas.width,
        resultCanvas.height
      );

      const processedCanvas = document.createElement("canvas");
      const processedCtx = processedCanvas.getContext("2d");
      processedCanvas.width = maskImg.width;
      processedCanvas.height = maskImg.height;

      // Vẽ ảnh gốc
      processedCtx.drawImage(
        origImg,
        0,
        0,
        processedCanvas.width,
        processedCanvas.height
      );

      processedCtx.globalCompositeOperation = "destination-out";
      for (let y = 0; y < tempCanvas.height; y++) {
        for (let x = 0; x < tempCanvas.width; x++) {
          const index = (y * tempCanvas.width + x) * 4;

          if (
            data[index] > 200 &&
            data[index + 1] > 200 &&
            data[index + 2] > 200
          ) {
            processedCtx.fillRect(x, y, 1, 1);
          }
        }
      }

      processedCtx.globalCompositeOperation = "source-over";

      resultCtx.strokeStyle = "red";
      resultCtx.lineWidth = 2;

      for (let y = 1; y < tempCanvas.height - 1; y++) {
        for (let x = 1; x < tempCanvas.width - 1; x++) {
          const index = (y * tempCanvas.width + x) * 4;

          if (
            data[index] > 200 &&
            data[index + 1] > 200 &&
            data[index + 2] > 200
          ) {
            const neighbors = [
              (y - 1) * tempCanvas.width + (x - 1), // top-left
              (y - 1) * tempCanvas.width + x, // top
              (y - 1) * tempCanvas.width + (x + 1), // top-right
              y * tempCanvas.width + (x - 1), // left
              y * tempCanvas.width + (x + 1), // right
              (y + 1) * tempCanvas.width + (x - 1), // bottom-left
              (y + 1) * tempCanvas.width + x, // bottom
              (y + 1) * tempCanvas.width + (x + 1), // bottom-right
            ];

            for (const neighbor of neighbors) {
              const nIndex = neighbor * 4;
              if (
                data[nIndex] < 50 &&
                data[nIndex + 1] < 50 &&
                data[nIndex + 2] < 50
              ) {
                resultCtx.fillStyle = "red";
                resultCtx.fillRect(x, y, 1, 1);
                break;
              }
            }
          }
        }
      }

      const resultImageUrl = resultCanvas.toDataURL();
      setResultImage(resultImageUrl);
      const processedImageUrl = processedCanvas.toDataURL();
      setIsProcessing(false);

      return Promise.resolve({
        resultImageUrl,
        processedImageUrl,
      });
    } catch (error) {
      setError("Error processing image contours");
      setIsProcessing(false);
      return Promise.resolve(null);
    }
  };

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  };

  const clearResult = () => {
    setResultImage(null);
  };

  return {
    resultImage,
    isProcessing,
    error,
    findContours,
    clearResult,
  };
};

export default useImageContour;
