import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { upscaleImage, upscaleVariation } from "@/services/picture-ads";
const ImageGenerateResult = ({ generatedBanners }) => {
  const [upscalingImages, setUpscalingImages] = useState({});
  const [upscaledResults, setUpscaledResults] = useState({});

  const upscaleParams = {
    ultra_upscale_style: "enhance",
    creativity_strength: 0,
    detail_contrast: 30,
    similarity: 75,
    upscale_multiplier: 2.0,
  };

  const handleUpscale = async (banner) => {
    try {
      setUpscalingImages((prev) => ({ ...prev, [banner.id]: true }));

      const upscaleResponse = await upscaleImage({
        gcs_url: banner.imageUrl,
        ...upscaleParams,
      });

      const { variation_id } = upscaleResponse.data;

      await checkUpscaleStatus(variation_id, banner.id);
    } catch (error) {
      error && toast.error("Something went wrong with the upscale process");
      setUpscalingImages((prev) => ({ ...prev, [banner.id]: false }));
    }
  };

  const checkUpscaleStatus = async (variationId, bannerId) => {
    try {
      const statusResponse = await upscaleVariation(variationId);
      const { status, generated_images, error } = statusResponse.data;

      if (error) {
        throw new Error(error);
      }

      if (status === "COMPLETE") {
        if (generated_images && generated_images.length > 0) {
          setUpscaledResults((prev) => ({
            ...prev,
            [bannerId]: generated_images[0].url,
          }));
          toast({
            title: "Upscale complete",
            description: "Your image has been successfully upscaled",
          });
        }
        setUpscalingImages((prev) => ({ ...prev, [bannerId]: false }));
      } else if (status === "PENDING" || status === "IN_PROGRESS") {
        setTimeout(() => checkUpscaleStatus(variationId, bannerId), 2000);
      } else {
        throw new Error(`Unexpected status: ${status}`);
      }
    } catch (error) {
      error && toast.error("Failed to retrieve upscale status");
      setUpscalingImages((prev) => ({ ...prev, [bannerId]: false }));
    }
  };

  const getImageToDisplay = (banner) => {
    return upscaledResults[banner.id] || banner.imageUrl;
  };

  return (
    <div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-medium">Generated Banners</h3>
          <Badge variant="outline" className="text-sm">
            {generatedBanners.length} banner
            {generatedBanners.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {generatedBanners.map((banner) => (
            <Card
              key={banner.id}
              className="overflow-hidden hover:shadow-md transition-all"
            >
              <div className="aspect-video w-full overflow-hidden">
                <img
                  src={getImageToDisplay(banner)}
                  alt={`Banner for ${banner.idea}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium truncate">{banner.idea}</h4>
                  {upscaledResults[banner.id] && (
                    <Badge variant="secondary" className="text-xs">
                      Upscaled
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(banner.timestamp).toLocaleString()}
                </p>
                <div className="flex justify-end mt-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleUpscale(banner)}
                    disabled={upscalingImages[banner.id]}
                  >
                    {upscalingImages[banner.id] ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Upscaling...
                      </>
                    ) : upscaledResults[banner.id] ? (
                      "Re-upscale"
                    ) : (
                      "Upscale"
                    )}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs"
                    onClick={() =>
                      window.open(getImageToDisplay(banner), "_blank")
                    }
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerateResult;
