
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  postType: "blog" | "sell-my-car" | "junk-car-removal";
  vehicleMake: string;
  vehicleModel: string;
  stateName: string;
  cityName: string;
  featuredImage: string;
  status: "draft" | "published" | "archived";
  publishedAt: string;
  createdAt: string;
}

export default function BlogManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<BlogPost>>({
    postType: "blog",
    status: "draft",
  });

  const sessionId = localStorage.getItem("adminSessionId");

  const { data: posts = [] } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/posts"],
    queryFn: async () => {
      const response = await fetch("/api/admin/posts", {
        headers: { Authorization: `Bearer ${sessionId}` },
      });
      if (!response.ok) throw new Error("Failed to fetch posts");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<BlogPost>) => {
      const response = await fetch("/api/admin/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create post");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      toast({ title: "Post created successfully" });
      setIsCreating(false);
      setFormData({ postType: "blog", status: "draft" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BlogPost> }) => {
      const response = await fetch(`/api/admin/posts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update post");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      toast({ title: "Post updated successfully" });
      setSelectedPost(null);
      setFormData({ postType: "blog", status: "draft" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/posts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionId}` },
      });
      if (!response.ok) throw new Error("Failed to delete post");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      toast({ title: "Post deleted successfully" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPost) {
      updateMutation.mutate({ id: selectedPost.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (post: BlogPost) => {
    setSelectedPost(post);
    setFormData(post);
    setIsCreating(true);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Blog Management</h1>
        <Button onClick={() => { setIsCreating(true); setSelectedPost(null); setFormData({ postType: "blog", status: "draft" }); }}>
          Create New Post
        </Button>
      </div>

      {isCreating ? (
        <Card>
          <CardHeader>
            <CardTitle>{selectedPost ? "Edit Post" : "Create New Post"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="seo">SEO</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title || ""}
                      onChange={(e) => {
                        const title = e.target.value;
                        setFormData({ ...formData, title, slug: generateSlug(title) });
                      }}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">Slug (URL)</Label>
                    <Input
                      id="slug"
                      value={formData.slug || ""}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea
                      id="excerpt"
                      value={formData.excerpt || ""}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={formData.content || ""}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={12}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="featuredImage">Featured Image URL</Label>
                    <Input
                      id="featuredImage"
                      value={formData.featuredImage || ""}
                      onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-4">
                  <div>
                    <Label htmlFor="metaTitle">Meta Title</Label>
                    <Input
                      id="metaTitle"
                      value={formData.metaTitle || ""}
                      onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="metaDescription">Meta Description</Label>
                    <Textarea
                      id="metaDescription"
                      value={formData.metaDescription || ""}
                      onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ogTitle">Open Graph Title</Label>
                    <Input
                      id="ogTitle"
                      value={formData.ogTitle || ""}
                      onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ogDescription">Open Graph Description</Label>
                    <Textarea
                      id="ogDescription"
                      value={formData.ogDescription || ""}
                      onChange={(e) => setFormData({ ...formData, ogDescription: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ogImage">Open Graph Image URL</Label>
                    <Input
                      id="ogImage"
                      value={formData.ogImage || ""}
                      onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div>
                    <Label htmlFor="postType">Post Type</Label>
                    <Select
                      value={formData.postType}
                      onValueChange={(value: any) => setFormData({ ...formData, postType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blog">Blog</SelectItem>
                        <SelectItem value="sell-my-car">Sell My Car</SelectItem>
                        <SelectItem value="junk-car-removal">Junk Car Removal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.postType === "sell-my-car" && (
                    <>
                      <div>
                        <Label htmlFor="vehicleMake">Vehicle Make</Label>
                        <Input
                          id="vehicleMake"
                          value={formData.vehicleMake || ""}
                          onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="vehicleModel">Vehicle Model</Label>
                        <Input
                          id="vehicleModel"
                          value={formData.vehicleModel || ""}
                          onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {formData.postType === "junk-car-removal" && (
                    <>
                      <div>
                        <Label htmlFor="stateName">State</Label>
                        <Input
                          id="stateName"
                          value={formData.stateName || ""}
                          onChange={(e) => setFormData({ ...formData, stateName: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cityName">City</Label>
                        <Input
                          id="cityName"
                          value={formData.cityName || ""}
                          onChange={(e) => setFormData({ ...formData, cityName: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-4">
                <Button type="submit">{selectedPost ? "Update" : "Create"} Post</Button>
                <Button type="button" variant="outline" onClick={() => { setIsCreating(false); setFormData({ postType: "blog", status: "draft" }); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{post.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Type: {post.postType} | Status: {post.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEdit(post)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(post.id)}>Delete</Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
