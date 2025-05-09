import { useState, useEffect, useRef } from "react";

export const usePhotoEditor = ({
  file,
  defaultZoom = 1,
  defaultLineColor = "#FFFFFF",
  defaultLineWidth = 30,
  defaultMode = "pan",
}) => {
  // Ref to the canvas element where the image will be drawn.
  const canvasRef = useRef(null);

  // Create the image object using a ref
  const imgRef = useRef(new Image());

  // State to hold the source of the image.
  const [imageSrc, setImageSrc] = useState("");

  const [zoom, setZoom] = useState(defaultZoom);

  const [mode, setMode] = useState(defaultMode);
  const [drawStart, setDrawStart] = useState(null);

  // State variables for drawing on the canvas.
  const [lineColor, setLineColor] = useState(defaultLineColor);
  const [lineWidth, setLineWidth] = useState(defaultLineWidth);

  // Thêm state mới để lưu thông tin về độ phân giải thực của ảnh
  const [imageResolution, setImageResolution] = useState(null);

  // State để theo dõi tỷ lệ giữa kích thước thực và kích thước hiển thị
  const [scaleFactor, setScaleFactor] = useState(1);

  const drawingPathsRef = useRef([]);

  // Effect to update the image source when the file changes.
  useEffect(() => {
    if (file) {
      const fileSrc = URL.createObjectURL(file);
      setImageSrc(fileSrc);

      // Clean up the object URL when the component unmounts or file changes.
      return () => {
        URL.revokeObjectURL(fileSrc);
      };
    }
  }, [file]);

  // Effect to apply transformations and filters whenever relevant state changes.
  useEffect(() => {
    applyFilter();
  }, [file, imageSrc]);

  // Effect để tính toán tỷ lệ khi canvas hoặc image resolution thay đổi
  useEffect(() => {
    if (canvasRef.current && imageResolution) {
      const canvas = canvasRef.current;
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      const originalWidth = imageResolution.width;
      const originalHeight = imageResolution.height;

      // Tính toán tỷ lệ giữa kích thước hiển thị và kích thước thật của ảnh
      const widthRatio = originalWidth / displayWidth;
      const heightRatio = originalHeight / displayHeight;

      // Lưu tỷ lệ lớn hơn để đảm bảo brush size không quá nhỏ
      const factor = Math.max(widthRatio, heightRatio);
      setScaleFactor(factor);

      // Điều chỉnh lineWidth ban đầu dựa trên độ phân giải
      // Nếu ảnh có độ phân giải cao, tăng lineWidth để đảm bảo brush không quá nhỏ
      if (factor > 1 && mode === "draw") {
        // Sử dụng một giá trị cơ bản và điều chỉnh theo tỷ lệ
        const baseWidth = 10; // Giá trị cơ sở cho lineWidth trên màn hình
        const adjustedWidth = Math.max(2, Math.round(baseWidth * factor));
        setLineWidth(adjustedWidth);
      }
    }
  }, [imageResolution, canvasRef.current]);

  const redrawDrawingPaths = (context) => {
    drawingPathsRef.current.forEach(({ path, color, width }) => {
      context.beginPath();
      context.strokeStyle = color;
      context.lineWidth = width;
      context.lineCap = "round";
      context.lineJoin = "round";

      path.forEach((point, index) => {
        if (index === 0) {
          context.moveTo(point.x, point.y);
        } else {
          context.lineTo(point.x, point.y);
        }
      });
      context.stroke();
    });
  };

  /**
   * Applies the selected filters and transformations to the image on the canvas.
   */
  const applyFilter = () => {
    if (!imageSrc) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    const imgElement = imgRef.current;
    imgRef.current.src = imageSrc;
    imgRef.current.onload = () => {
      if (canvas && context) {
        const zoomedWidth = imgElement.width * zoom;
        const zoomedHeight = imgElement.height * zoom;
        const translateX = (imgElement.width - zoomedWidth) / 2;
        const translateY = (imgElement.height - zoomedHeight) / 2;

        canvas.width = imgElement.width;
        canvas.height = imgElement.height;

        // Lưu thông tin về độ phân giải thực của ảnh
        setImageResolution({
          width: imgElement.width,
          height: imgElement.height,
        });

        context.clearRect(0, 0, canvas.width, canvas.height);

        // Apply filters and transformations.
        context.save();

        context.translate(translateX, translateY);
        context.scale(zoom, zoom);
        context.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

        context.restore();

        context.filter = "none";
        redrawDrawingPaths(context);
      }
    };
  };

  /**
   * Generates a file from the canvas content.
   * @returns {Promise<File | null>} A promise that resolves with the edited file or null if the canvas is not available.
   */
  const generateEditedFile = () => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas || !file) {
        resolve(null);
        return;
      }

      const fileExtension = (file.name.split(".").pop() || "").toLowerCase();
      let mimeType;
      switch (fileExtension) {
        case "jpg":
        case "jpeg":
          mimeType = "image/jpeg";
          break;
        case "png":
          mimeType = "image/png";
          break;
        default:
          mimeType = "image/png";
      }

      canvas.toBlob((blob) => {
        if (blob) {
          const newFile = new File([blob], file.name, { type: blob.type });
          resolve(newFile);
        } else {
          resolve(null);
        }
      }, mimeType);
    });
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (canvas && file) {
      const link = document.createElement("a");
      link.download = file.name;
      link.href = canvas.toDataURL(file?.type);
      link.click();
    }
  };

  const handlePointerDown = (event) => {
    if (mode === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      setDrawStart({ x, y });

      drawingPathsRef.current.push({
        path: [{ x, y }],
        color: lineColor,
        width: lineWidth,
      });
    }
  };

  /**
   * Handles the pointer move event for updating the drawing path only.
   */
  const handlePointerMove = (event) => {
    if (mode === "draw" && drawStart) {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      const rect = canvas?.getBoundingClientRect();

      if (!canvas || !context || !rect) return;

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      const currentPath =
        drawingPathsRef.current[drawingPathsRef.current.length - 1].path;

      context.strokeStyle = lineColor;
      context.lineWidth = lineWidth;
      context.lineCap = "round";
      context.lineJoin = "round";

      context.beginPath();
      context.moveTo(drawStart.x, drawStart.y);
      context.lineTo(x, y);
      context.stroke();

      setDrawStart({ x, y });
      currentPath.push({ x, y });
    }
  };

  /**
   * Handles the pointer up event for ending the drawing action.
   */
  const handlePointerUp = () => {
    setDrawStart(null);
  };

  /**
   * Resets the filters and styles to its original state with the default settings.
   */
  const resetFilters = () => {
    setZoom(defaultZoom);
    setLineColor(defaultLineColor);

    // Điều chỉnh lineWidth dựa trên độ phân giải nếu cần
    if (scaleFactor > 1) {
      const baseWidth = 10;
      const adjustedWidth = Math.max(2, Math.round(baseWidth * scaleFactor));
      setLineWidth(adjustedWidth);
    } else {
      setLineWidth(defaultLineWidth);
    }

    drawingPathsRef.current = [];
    setMode(defaultMode);
    applyFilter();
  };

  // Expose the necessary state and handlers for external use.
  return {
    canvasRef,
    imageSrc,
    zoom,
    mode,
    lineColor,
    lineWidth,
    imageResolution,
    scaleFactor,
    handlePointerDown,
    handlePointerUp,
    handlePointerMove,
    downloadImage,
    generateEditedFile,
    resetFilters,
    applyFilter,
    setMode,
    setLineWidth,
  };
};
