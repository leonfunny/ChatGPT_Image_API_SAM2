import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X } from "lucide-react";
import MarkEditor from "./mark-image";

const SingleImageUpload = ({
  mainImage,
  maskImage,
  activeTab,
  setActiveTab,
  onMainImageUpload,
  onRemoveMainImage,
  onMaskCreated,
  onImageCreated,
}) => {
  // Create ref for the file input
  const mainImageInputRef = useRef(null);

  // Function to trigger the file input
  const triggerMainImageUpload = () => {
    mainImageInputRef.current.click();
  };

  // Handle the file input change
  const handleMainImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onMainImageUpload({
        file,
        preview: URL.createObjectURL(file),
      });
    }
  };

  return (
    <>
      <Tabs
        defaultValue="upload"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="upload">Main Image</TabsTrigger>
          <TabsTrigger
            value="mask"
            disabled={!mainImage}
            className={!mainImage ? "opacity-50 cursor-not-allowed" : ""}
          >
            Create Mask
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-0">
          <Card className="border-dashed">
            <CardContent className="pt-6">
              {mainImage?.preview ? (
                <div className="relative rounded-md overflow-hidden bg-muted">
                  <img
                    src={mainImage.preview}
                    alt="Main image preview"
                    className="mx-auto max-h-64 object-contain"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={onRemoveMainImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/50 p-10 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={triggerMainImageUpload}
                >
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag and drop or click to upload main image
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              )}
              <input
                ref={mainImageInputRef}
                type="file"
                className="hidden"
                onChange={handleMainImageUpload}
                accept="image/*"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mask" className="mt-0">
          {mainImage && (
            <MarkEditor
              initialImage={mainImage.preview}
              onMaskCreated={onMaskCreated}
              onImageCreated={onImageCreated}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Mask Status Indicator */}
      {mainImage && maskImage && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-700 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            Mask created successfully. Inpainting will be applied to masked
            areas.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default SingleImageUpload;
