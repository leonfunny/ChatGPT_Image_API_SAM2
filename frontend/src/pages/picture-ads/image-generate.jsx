/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import { Download, Loader2, Copy, Check, ImageUpscale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  upscaleImage,
  upscaleVariation,
  promptGenerating,
} from "@/services/picture-ads";
import {
  SiInstagram,
  SiFacebook,
  SiTiktok,
} from "@icons-pack/react-simple-icons";

const ImageGenerateResult = ({ generatedBanners, promptInput, language }) => {
  const [upscalingImages, setUpscalingImages] = useState({});
  const [upscaledResults, setUpscaledResults] = useState({});
  const [socialMediaContent, setSocialMediaContent] = useState({});
  const [loadingSocialMedia, setLoadingSocialMedia] = useState({});
  const [copiedStatus, setCopiedStatus] = useState({});
  const statusCheckTimers = useRef({});

  const upscaleParams = {
    ultra_upscale_style: "ARTISTIC",
    creativity_strength: 6,
    detail_contrast: 6,
    similarity: 4,
    upscale_multiplier: 2.0,
  };

  useEffect(() => {
    return () => {
      Object.values(statusCheckTimers.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  const handleUpscale = async (banner) => {
    try {
      setUpscalingImages((prev) => ({ ...prev, [banner.id]: true }));

      const upscaleResponse = await upscaleImage({
        gcs_url: banner.imageUrl,
        ...upscaleParams,
      });

      const responseData = upscaleResponse.data || upscaleResponse;
      const variation_id = responseData.variation_id;

      if (!variation_id) {
        throw new Error(
          "No variation_id found in response: " + JSON.stringify(responseData)
        );
      }

      checkUpscaleStatus(variation_id, banner.id);
    } catch (error) {
      error && toast.error("Something went wrong with the upscale process");
      setUpscalingImages((prev) => ({ ...prev, [banner.id]: false }));
    }
  };

  const checkUpscaleStatus = async (variationId, bannerId) => {
    try {
      const statusResponse = await upscaleVariation(variationId);
      const responseData = statusResponse;

      if (!responseData) {
        throw new Error("No data received from API");
      }

      const { status, generated_images, error } = responseData;

      if (error) {
        throw new Error(error);
      }

      if (status === "COMPLETE") {
        if (statusCheckTimers.current[bannerId]) {
          clearTimeout(statusCheckTimers.current[bannerId]);
          statusCheckTimers.current[bannerId] = null;
        }

        if (generated_images) {
          setUpscaledResults((prev) => ({
            ...prev,
            [bannerId]: generated_images,
          }));
          toast.success("Your image has been successfully upscaled");
        }
        setUpscalingImages((prev) => ({ ...prev, [bannerId]: false }));
      } else if (status === "PENDING" || status === "IN_PROGRESS") {
        if (statusCheckTimers.current[bannerId]) {
          clearTimeout(statusCheckTimers.current[bannerId]);
        }

        statusCheckTimers.current[bannerId] = setTimeout(() => {
          checkUpscaleStatus(variationId, bannerId);
        }, 2000);
      } else {
        throw new Error(`Unexpected status: ${status}`);
      }
    } catch (error) {
      error && toast.error("Failed to retrieve upscale status");
      setUpscalingImages((prev) => ({ ...prev, [bannerId]: false }));

      if (statusCheckTimers.current[bannerId]) {
        clearTimeout(statusCheckTimers.current[bannerId]);
        statusCheckTimers.current[bannerId] = null;
      }
    }
  };

  const getImageToDisplay = (banner) => {
    return upscaledResults[banner.id] || banner.imageUrl;
  };

  const generateFacebookContent = async (banner) => {
    try {
      const bannerId = banner.id;
      setLoadingSocialMedia((prev) => ({
        ...prev,
        [bannerId + "-facebook"]: true,
      }));

      const templateFacebookString = `You are a social media expert with many years of experience, please write caption, headline, description in ${language} for facebook ads with the above photo and this product description: "${promptInput}" Note to write caption maximum 100-200 words, try to write carefully the first 3 lines because it is extremely important → need strong hook (question, problem, benefit) Use emoji to create highlights If the caption is long, divide it into short paragraphs, avoid writing 1 long block return in json format with caption headlines description:
      { "caption": "....................", 
         "headlines": "....................", 
         "description": "....................." 
      }`;

      const prompt = templateFacebookString;
      const formData = new FormData();
      formData.append("prompt", prompt);
      const responseData = await promptGenerating(formData);

      if (responseData && responseData.content) {
        let jsonContent;
        try {
          const jsonMatch = responseData.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonContent = JSON.parse(jsonMatch[0]);
          } else {
            jsonContent = JSON.parse(responseData.content);
          }
        } catch (e) {
          jsonContent = { rawContent: responseData.content };
        }

        setSocialMediaContent((prev) => ({
          ...prev,
          [bannerId + "-facebook"]: jsonContent,
        }));
        toast.success("Facebook content generated successfully");
      } else {
        throw new Error("Invalid response format from API");
      }
    } catch (error) {
      toast.error(
        "Failed to generate Facebook content: " +
          (error.message || "Unknown error")
      );
    } finally {
      setLoadingSocialMedia((prev) => ({
        ...prev,
        [banner.id + "-facebook"]: false,
      }));
    }
  };

  const generateInstagramContent = async (banner) => {
    try {
      const bannerId = banner.id;
      setLoadingSocialMedia((prev) => ({
        ...prev,
        [bannerId + "-instagram"]: true,
      }));

      const templateInstagramString = `You are a social media expert with many years of experience, please write caption in ${language} for instagram with the above photo and this product description: "${promptInput}" Note to write caption maximum 100-150 words, Caption should have: Strong first hook (question, compelling statement). Specific information or emotion (why is the product worth caring about?). Hashtags – help increase reach Use 5–15 relevant hashtags (don't spam 30). Incorporate: Brand hashtag: Product hashtag: Market hashtag: return in json format with caption headlines description { "caption": "...................." }`;
      const prompt = templateInstagramString;
      const formData = new FormData();
      formData.append("prompt", prompt);
      const responseData = await promptGenerating(formData);
      if (responseData && responseData.content) {
        let jsonContent;
        try {
          const jsonMatch = responseData.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonContent = JSON.parse(jsonMatch[0]);
          } else {
            jsonContent = JSON.parse(responseData.content);
          }
        } catch (e) {
          jsonContent = { rawContent: responseData.content };
        }

        setSocialMediaContent((prev) => ({
          ...prev,
          [bannerId + "-instagram"]: jsonContent,
        }));

        toast.success("Instagram content generated successfully");
      } else {
        throw new Error("Invalid response format from API");
      }
    } catch (error) {
      toast.error(
        "Failed to generate Instagram content: " +
          (error.message || "Unknown error")
      );
    } finally {
      setLoadingSocialMedia((prev) => ({
        ...prev,
        [banner.id + "-instagram"]: false,
      }));
    }
  };

  const handleCopyToClipboard = (bannerId, platform, field) => {
    const content = socialMediaContent[bannerId + "-" + platform];
    let textToCopy = "";

    if (field) {
      textToCopy = content[field] || "";
    } else {
      textToCopy = JSON.stringify(content, null, 2);
    }

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        const copyId = `${bannerId}-${platform}${field ? `-${field}` : ""}`;
        setCopiedStatus((prev) => ({ ...prev, [copyId]: true }));

        setTimeout(() => {
          setCopiedStatus((prev) => ({ ...prev, [copyId]: false }));
        }, 2000);

        toast.success("Copied to clipboard!");
      })
      .catch((err) => {
        toast.error("Failed to copy: " + err);
      });
  };

  const renderSocialMediaContent = (banner, platform) => {
    const content = socialMediaContent[banner.id + "-" + platform];
    const isLoading = loadingSocialMedia[banner.id + "-" + platform];

    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span>Generating content...</span>
        </div>
      );
    }

    if (!content) return null;

    if (platform === "facebook") {
      return (
        <div className="mt-4 p-4 border rounded-md bg-white">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-sm">Facebook Ad Content</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyToClipboard(banner.id, "facebook")}
              className="h-7 px-2"
            >
              {copiedStatus[`${banner.id}-facebook`] ? (
                <Check className="h-3.5 w-3.5 mr-1" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1" />
              )}
              Copy All
            </Button>
          </div>

          {/* Headlines */}
          <div className="mb-3 border-b pb-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-700">
                Headlines
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleCopyToClipboard(banner.id, "facebook", "headlines")
                }
                className="h-5 px-1.5"
              >
                {copiedStatus[`${banner.id}-facebook-headlines`] ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <p className="text-sm">{content.headlines}</p>
          </div>

          {/* Caption */}
          <div className="mb-3 border-b pb-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-700">Caption</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleCopyToClipboard(banner.id, "facebook", "caption")
                }
                className="h-5 px-1.5"
              >
                {copiedStatus[`${banner.id}-facebook-caption`] ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <p className="text-sm whitespace-pre-line">{content.caption}</p>
          </div>

          {/* Description */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-700">
                Description
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleCopyToClipboard(banner.id, "facebook", "description")
                }
                className="h-5 px-1.5"
              >
                {copiedStatus[`${banner.id}-facebook-description`] ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <p className="text-sm">{content.description}</p>
          </div>
        </div>
      );
    } else if (platform === "instagram" || platform === "tiktok") {
      return (
        <div className="mt-4 p-4 border rounded-md bg-white">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-sm">
              {platform === "instagram" ? "Instagram" : "TikTok"} Caption
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                handleCopyToClipboard(banner.id, platform, "caption")
              }
              className="h-7 px-2"
            >
              {copiedStatus[`${banner.id}-${platform}-caption`] ? (
                <Check className="h-3.5 w-3.5 mr-1" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1" />
              )}
              Copy
            </Button>
          </div>
          <p className="text-sm whitespace-pre-line">{content.caption}</p>
        </div>
      );
    }

    return null;
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

        <div className="grid grid-cols-1 gap-6">
          {generatedBanners.map((banner) => (
            <Card
              key={banner.id}
              className="overflow-hidden hover:shadow-md transition-all"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                <div className="aspect-video w-full overflow-hidden rounded-md">
                  <img
                    src={getImageToDisplay(banner)}
                    alt={`Banner for ${banner.idea}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium truncate">{banner.idea}</h4>
                    {upscaledResults[banner.id] && (
                      <Badge variant="secondary" className="text-xs">
                        Upscaled
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    {new Date(banner.timestamp).toLocaleString()}
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium">
                        Social Media Options
                      </h4>
                      <p className="text-xs text-gray-500 mb-2">
                        (If there is no data, please generate again.)
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={
                            socialMediaContent[banner.id + "-facebook"]
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className={`flex items-center gap-1.5 ${
                            socialMediaContent[banner.id + "-facebook"]
                              ? "bg-blue-600 hover:bg-blue-700"
                              : ""
                          }`}
                          onClick={() => generateFacebookContent(banner)}
                          disabled={loadingSocialMedia[banner.id + "-facebook"]}
                        >
                          {loadingSocialMedia[banner.id + "-facebook"] ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <SiFacebook size={16} />
                          )}
                          Facebook
                        </Button>
                        <Button
                          variant={
                            socialMediaContent[banner.id + "-instagram"]
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className={`flex items-center gap-1.5 ${
                            socialMediaContent[banner.id + "-instagram"]
                              ? "bg-[#E1306C] hover:bg-[#E1306C]"
                              : ""
                          }`}
                          onClick={() => generateInstagramContent(banner)}
                          disabled={
                            loadingSocialMedia[banner.id + "-instagram"]
                          }
                        >
                          {loadingSocialMedia[banner.id + "-instagram"] ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <SiInstagram size={16} />
                          )}
                          Instagram
                        </Button>
                        <Button
                          variant={
                            socialMediaContent[banner.id + "-tiktok"]
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className={`flex items-center gap-1.5 ${
                            socialMediaContent[banner.id + "-tiktok"]
                              ? "bg-black hover:bg-gray-800"
                              : ""
                          }`}
                          disabled={true}
                        >
                          {loadingSocialMedia[banner.id + "-tiktok"] ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <SiTiktok size={16} />
                          )}
                          TikTok
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleUpscale(banner)}
                          disabled={upscalingImages[banner.id]}
                        >
                          <ImageUpscale />
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
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          window.open(getImageToDisplay(banner), "_blank")
                        }
                      >
                        <Download className="h-4 w-4 mr-1" /> Download
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media Content Display */}
              <div className="p-4 bg-gray-50 border-t">
                {socialMediaContent[banner.id + "-facebook"] &&
                  renderSocialMediaContent(banner, "facebook")}
                {socialMediaContent[banner.id + "-instagram"] &&
                  renderSocialMediaContent(banner, "instagram")}
                {socialMediaContent[banner.id + "-tiktok"] &&
                  renderSocialMediaContent(banner, "tiktok")}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerateResult;
