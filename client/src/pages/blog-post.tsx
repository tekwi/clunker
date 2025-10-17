
import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute("content", post.metaDescription || post.excerpt || "");
      }
      
      // Update OG tags
      const ogTitle = document.querySelector('meta[property="og:title"]') || document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      ogTitle.setAttribute("content", post.ogTitle || post.title);
      if (!ogTitle.parentElement) document.head.appendChild(ogTitle);
      
      const ogDescription = document.querySelector('meta[property="og:description"]') || document.createElement("meta");
      ogDescription.setAttribute("property", "og:description");
      ogDescription.setAttribute("content", post.ogDescription || post.excerpt || "");
      if (!ogDescription.parentElement) document.head.appendChild(ogDescription);
      
      if (post.ogImage) {
        const ogImage = document.querySelector('meta[property="og:image"]') || document.createElement("meta");
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
    <div className="container mx-auto p-6 max-w-4xl">
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
          
          <div className="prose max-w-none mb-8" dangerouslySetInnerHTML={{ __html: post.content }} />
          
          <div className="flex gap-4 pt-6 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank")}
            >
              <i className="fab fa-twitter mr-2"></i>
              Share on Twitter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank")}
            >
              <i className="fab fa-facebook mr-2"></i>
              Share on Facebook
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank")}
            >
              <i className="fab fa-linkedin mr-2"></i>
              Share on LinkedIn
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
