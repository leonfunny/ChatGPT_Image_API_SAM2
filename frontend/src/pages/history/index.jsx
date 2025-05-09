import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { format } from "date-fns";
import { history } from "@/services/history";
import {
  Loader2,
  Calendar,
  ImageIcon,
  PlusCircle,
  Camera,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const History = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [fixedRightPanel, setFixedRightPanel] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["history", currentPage],
    queryFn: () => history(currentPage),
    keepPreviousData: true,
  });

  const historyData = data || {
    items: [],
    total: 0,
    page: 1,
    size: 10,
    pages: 0,
  };

  const getPaginationItems = () => {
    const totalPages = historyData.pages;
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5, "ellipsis", totalPages];
    }

    if (currentPage >= totalPages - 2) {
      return [
        1,
        "ellipsis",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      "ellipsis",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "ellipsis",
      totalPages,
    ];
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), "dd MMM yyyy, HH:mm");
  };

  const handleSelectImage = (image) => {
    setSelectedImage(image);
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to fetch history data. Please try again later.
          </AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel - Scrollable History */}
      <div className="w-2/3 border-r border-border">
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Generation History
          </h1>
          <Badge variant="secondary" className="px-2.5 py-0.5">
            {historyData.total} Images
          </Badge>
        </div>

        <Separator />

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : historyData.items.length === 0 ? (
          <div className="p-6">
            <Card className="flex flex-col items-center justify-center py-16 bg-muted/30">
              <ImageIcon className="h-16 w-16 text-muted-foreground mb-6" />
              <h3 className="text-xl font-medium">No images generated yet</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md text-center">
                Start creating images to see your generation history here
              </p>
              <Button className="mt-6">Create Your First Image</Button>
            </Card>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[calc(100vh-74px)]">
              <div className="p-6 space-y-6">
                {historyData.items.map((item) => (
                  <Card
                    key={item.id}
                    className={`overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer ${
                      selectedImage && selectedImage.id === item.id
                        ? "ring-2 ring-primary ring-offset-2"
                        : ""
                    }`}
                    onClick={() => handleSelectImage(item)}
                  >
                    <div className="flex">
                      <div className="w-1/3">
                        <div className="relative h-full">
                          <img
                            src={item.gcs_public_url}
                            alt={`Generated image for ${item.prompt}`}
                            className="h-full w-full object-cover aspect-square"
                          />
                          <div className="absolute bottom-2 left-2">
                            <Badge className="bg-background/80 backdrop-blur-sm text-foreground">
                              {item.format.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <CardContent className="w-2/3 p-5">
                        <div className="flex justify-between items-start mb-4">
                          <Badge variant="secondary" className="px-2.5 py-0.5">
                            {item.model}
                          </Badge>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(item.created_at)}
                          </div>
                        </div>

                        <div>
                          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            Prompt
                          </h2>
                          <p className="text-sm line-clamp-4 text-foreground mb-4">
                            {item.prompt}
                          </p>

                          {item.source_images &&
                            item.source_images.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <img
                                  src={item.source_images[0].gcs_public_url}
                                  alt="Source"
                                  className="h-10 w-10 rounded-sm object-cover"
                                />
                                <span className="text-xs text-muted-foreground">
                                  Source image
                                </span>
                              </div>
                            )}
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {/* Pagination */}
            {historyData.pages > 1 && (
              <div className="border-t border-border p-4 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>

                    {getPaginationItems().map((page, i) => (
                      <PaginationItem key={i}>
                        {page === "ellipsis" ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            isActive={currentPage === page}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, historyData.pages)
                          )
                        }
                        className={
                          currentPage === historyData.pages
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right Panel - Generation Interface */}
      <div className={`w-1/3 ${fixedRightPanel ? "sticky top-0" : ""}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            {selectedImage ? (
              <div className="text-center">
                <div className="relative mb-4 rounded-md overflow-hidden shadow-lg">
                  <img
                    src={selectedImage.gcs_public_url}
                    alt={selectedImage.prompt.substring(0, 30) + "..."}
                    className="w-full h-auto max-w-xs mx-auto"
                  />
                </div>
                <div className="max-w-xs mx-auto">
                  <Badge variant="outline" className="mb-3">
                    {selectedImage.model}
                  </Badge>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {selectedImage.prompt}
                  </p>

                  {selectedImage.source_images &&
                    selectedImage.source_images.length > 0 && (
                      <div className="flex items-center justify-center gap-3 bg-muted/30 p-3 rounded-md">
                        <div className="relative">
                          <img
                            src={selectedImage.source_images[0].gcs_public_url}
                            alt="Source"
                            className="h-12 w-12 rounded object-cover border border-border"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Source image
                        </span>
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-muted rounded-lg p-12 flex flex-col items-center justify-center max-w-xs w-full">
                <div className="bg-muted/30 p-4 rounded-full mb-4">
                  <PlusCircle className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-center">
                  Click vào ảnh bên trái để chọn
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button size="lg" className="gap-2 w-full">
                <Camera className="h-4 w-4" />
                Generate Picture
              </Button>
              <Button size="lg" variant="secondary" className="gap-2 w-full">
                <Video className="h-4 w-4" />
                Generate Video
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;
