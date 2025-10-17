import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  featuredImage: string;
  publishedAt: string;
}

export default function BlogPost() {
  const params = useParams();
  const slug = params.slug || params["*"];
  const [, setLocation] = useLocation();
  const [vinInput, setVinInput] = useState("");

  // Determine the endpoint based on URL pattern
  let endpoint = "";
  const pathParts = window.location.pathname.split("/").filter(Boolean);

  if (pathParts[0] === "blog") {
    endpoint = `/api/blog/${pathParts[1]}`;
  } else if (pathParts[0] === "sell-my-car") {
    endpoint = `/api/sell-my-car/${pathParts[1]}/${pathParts[2]}`;
  } else if (pathParts[0] === "junk-car-removal") {
    endpoint = `/api/junk-car-removal/${pathParts[1]}/${pathParts[2]}`;
  }

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Post not found");
      return response.json();
    },
    enabled: !!endpoint,
  });

  useEffect(() => {
    if (post) {
      document.title = post.metaTitle || post.title;

      // Update meta tags
      const metaDescription = document.querySelector(
        'meta[name="description"]',
      );
      if (metaDescription) {
        metaDescription.setAttribute(
          "content",
          post.metaDescription || post.excerpt || "",
        );
      }

      // Update OG tags
      const ogTitle =
        document.querySelector('meta[property="og:title"]') ||
        document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      ogTitle.setAttribute("content", post.ogTitle || post.title);
      if (!ogTitle.parentElement) document.head.appendChild(ogTitle);

      const ogDescription =
        document.querySelector('meta[property="og:description"]') ||
        document.createElement("meta");
      ogDescription.setAttribute("property", "og:description");
      ogDescription.setAttribute(
        "content",
        post.ogDescription || post.excerpt || "",
      );
      if (!ogDescription.parentElement)
        document.head.appendChild(ogDescription);

      if (post.ogImage) {
        const ogImage =
          document.querySelector('meta[property="og:image"]') ||
          document.createElement("meta");
        ogImage.setAttribute("property", "og:image");
        ogImage.setAttribute("content", post.ogImage);
        if (!ogImage.parentElement) document.head.appendChild(ogImage);
      }
    }
  }, [post]);

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!post) {
    return <div className="container mx-auto p-6">Post not found</div>;
  }

  const shareUrl = window.location.href;
  const shareText = post.title;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with Logo and VIN Input */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
            <a href="/" className="flex items-center gap-3">
              <img
                src="/trackwala-logo.png"
                alt="TrackWala"
                className="h-10 w-auto"
              />
            </a>
            <span
              className="text-lg font-semibold"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              TrackWala
            </span>
            <div className="flex items-center gap-3 w-full md:w-auto md:max-w-md">
              <Input
                value={vinInput}
                onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                placeholder="Enter VIN to get offer"
                className="h-10 flex-1"
                maxLength={17}
              />
              <Button
                onClick={() => {
                  if (vinInput.length === 17) {
                    setLocation(`/?vin=${vinInput}`);
                  } else {
                    setLocation("/");
                  }
                }}
                size="sm"
                className="whitespace-nowrap"
              >
                Get Offer
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-8">
            {post.featuredImage && (
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
            )}

            <h1 className="text-4xl font-bold mb-4">{post.title}</h1>

            {post.publishedAt && (
              <p className="text-sm text-muted-foreground mb-6">
                Published on {new Date(post.publishedAt).toLocaleDateString()}
              </p>
            )}

            <div
              className="prose max-w-none mb-8"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            <div className="flex gap-4 pt-6 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
                    "_blank",
                  )
                }
              >
                <i className="fab fa-twitter mr-2"></i>
                Share on Twitter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                    "_blank",
                  )
                }
              >
                <i className="fab fa-facebook mr-2"></i>
                Share on Facebook
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
                    "_blank",
                  )
                }
              >
                <i className="fab fa-linkedin mr-2"></i>
                Share on LinkedIn
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img
              src="/trackwala-logo.png"
              alt="TrackWala Brand Avatar"
              className="w-12 h-12 rounded-full"
            />
            <span
              className="text-lg font-semibold"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              TrackWala
            </span>
            <div className="flex items-center gap-3 w-full md:w-auto md:max-w-md">
              <Input
                value={vinInput}
                onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                placeholder="Enter VIN to get offer"
                className="h-10 flex-1"
                maxLength={17}
              />
              <Button
                onClick={() => {
                  if (vinInput.length === 17) {
                    setLocation(`/?vin=${vinInput}`);
                  } else {
                    setLocation("/");
                  }
                }}
                size="sm"
                className="whitespace-nowrap"
              >
                Get Offer
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-3">
            Fast, fair, and hassle-free vehicle buyouts
          </p>
          <div className="flex justify-center space-x-4 text-sm">
            <a
              href="/privacy-policy"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
