
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useRef } from 'react';

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
  const [postToArchive, setPostToArchive] = useState<BlogPost | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const quillRef = useRef<ReactQuill>(null);
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

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/posts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify({ status: "archived" }),
      });
      if (!response.ok) throw new Error("Failed to archive post");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      toast({ 
        title: "Post Archived", 
        description: "The post has been archived and is no longer published." 
      });
      setPostToArchive(null);
    },
  });

  // Auto-generate SEO fields from content
  const autoFillSeoFields = () => {
    const updates: Partial<BlogPost> = {};
    
    // Generate meta title from title
    if (formData.title && !formData.metaTitle) {
      updates.metaTitle = `${formData.title} | TrackWala`;
    }
    
    // Generate meta description from excerpt or content
    if (!formData.metaDescription) {
      if (formData.excerpt) {
        updates.metaDescription = formData.excerpt.substring(0, 160);
      } else if (formData.content) {
        // Strip HTML tags and get first 160 chars
        const textContent = formData.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        updates.metaDescription = textContent.substring(0, 160);
      }
    }
    
    // Generate OG title from title
    if (formData.title && !formData.ogTitle) {
      updates.ogTitle = formData.title;
    }
    
    // Generate OG description from excerpt or content
    if (!formData.ogDescription) {
      if (formData.excerpt) {
        updates.ogDescription = formData.excerpt.substring(0, 200);
      } else if (formData.content) {
        const textContent = formData.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        updates.ogDescription = textContent.substring(0, 200);
      }
    }
    
    // Use featured image for OG image if available
    if (formData.featuredImage && !formData.ogImage) {
      updates.ogImage = formData.featuredImage;
    }
    
    if (Object.keys(updates).length > 0) {
      setFormData({ ...formData, ...updates });
    }
  };

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

  const handleImageUpload = async () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setIsUploadingImage(true);
      try {
        // Get upload URL from server
        const response = await fetch('/api/objects/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contentType: file.type || 'image/jpeg'
          })
        });

        if (!response.ok) {
          throw new Error('Failed to get upload URL');
        }

        const { uploadURL, photoUrl } = await response.json();

        // Upload file to S3
        const uploadResponse = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type || 'image/jpeg'
          }
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file');
        }

        // Insert image into editor
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection(true);
          if (range) {
            quill.insertEmbed(range.index, 'image', photoUrl);
            quill.setSelection(range.index + 1);
          } else {
            // If no selection, insert at the end
            const length = quill.getLength();
            quill.insertEmbed(length - 1, 'image', photoUrl);
            quill.setSelection(length);
          }
        }

        // Auto-set as featured image if none is set
        if (!formData.featuredImage) {
          setFormData({ ...formData, featuredImage: photoUrl });
          toast({ 
            title: "Image uploaded successfully", 
            description: "Set as featured image" 
          });
        } else {
          toast({ title: "Image uploaded successfully" });
        }
      } catch (error) {
        console.error('Image upload error:', error);
        toast({ 
          title: "Image upload failed", 
          description: "Please try again",
          variant: "destructive" 
        });
      } finally {
        setIsUploadingImage(false);
      }
    };
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
                    {isUploadingImage && (
                      <div className="mb-2 p-2 bg-blue-50 text-blue-700 text-sm rounded">
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Uploading image...
                      </div>
                    )}
                    <ReactQuill
                      ref={quillRef}
                      theme="snow"
                      value={formData.content || ""}
                      onChange={(value) => setFormData({ ...formData, content: value })}
                      modules={{
                        toolbar: {
                          container: [
                            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            [{ 'align': [] }],
                            ['link', 'image'],
                            ['clean']
                          ],
                          handlers: {
                            image: handleImageUpload
                          }
                        },
                      }}
                      className="bg-white"
                      style={{ minHeight: '300px' }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="featuredImage">Featured Image URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="featuredImage"
                        value={formData.featuredImage || ""}
                        onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                        placeholder="Enter URL or upload image"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          const input = document.createElement('input');
                          input.setAttribute('type', 'file');
                          input.setAttribute('accept', 'image/*');
                          input.click();

                          input.onchange = async () => {
                            const file = input.files?.[0];
                            if (!file) return;

                            setIsUploadingImage(true);
                            try {
                              const response = await fetch('/api/objects/upload', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ contentType: file.type || 'image/jpeg' })
                              });

                              if (!response.ok) throw new Error('Failed to get upload URL');

                              const { uploadURL, photoUrl } = await response.json();

                              const uploadResponse = await fetch(uploadURL, {
                                method: 'PUT',
                                body: file,
                                headers: { 'Content-Type': file.type || 'image/jpeg' }
                              });

                              if (!uploadResponse.ok) throw new Error('Failed to upload file');

                              setFormData({ ...formData, featuredImage: photoUrl });
                              toast({ title: "Featured image uploaded successfully" });
                            } catch (error) {
                              console.error('Upload error:', error);
                              toast({ 
                                title: "Upload failed", 
                                description: "Please try again",
                                variant: "destructive" 
                              });
                            } finally {
                              setIsUploadingImage(false);
                            }
                          };
                        }}
                        disabled={isUploadingImage}
                      >
                        {isUploadingImage ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                    {formData.featuredImage && (
                      <img 
                        src={formData.featuredImage} 
                        alt="Featured preview" 
                        className="mt-2 max-w-xs rounded border"
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-muted-foreground">
                      Fill in SEO fields manually or auto-generate from content
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={autoFillSeoFields}
                    >
                      Auto-Fill SEO Fields
                    </Button>
                  </div>

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
          {posts.map((post) => {
            // Generate URL based on post type
            let postUrl = "";
            if (post.postType === "blog") {
              postUrl = `/blog/${post.slug}`;
            } else if (post.postType === "sell-my-car") {
              postUrl = `/sell-my-car/${post.vehicleMake}/${post.vehicleModel}`;
            } else if (post.postType === "junk-car-removal") {
              postUrl = `/junk-car-removal/${post.stateName}/${post.cityName}`;
            }

            return (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle>{post.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Type: {post.postType} | Status: {post.status}
                      </p>
                      {postUrl && post.status === "published" && (
                        <a
                          href={postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline mt-1 inline-block"
                        >
                          View Page →
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleEdit(post)}>Edit</Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => setPostToArchive(post)}
                        disabled={post.status === "archived"}
                      >
                        {post.status === "archived" ? "Archived" : "Archive"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!postToArchive} onOpenChange={(open) => !open && setPostToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive This Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the post "{postToArchive?.title}" and remove it from public view. 
              The post will not be deleted and can be republished later by editing it and changing the status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => postToArchive && archiveMutation.mutate(postToArchive.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
