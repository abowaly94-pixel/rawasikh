import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Newspaper, Eye, EyeOff, Tag, Palette, AlignRight, AlignCenter, AlignLeft, FileDown } from "lucide-react";
import HostingerImageUpload from "@/components/HostingerImageUpload";
import ArticleBlocksEditor from "@/components/dashboard/ArticleBlocksEditor";
import {
  blocksToHtml,
  convertHtmlToArticleBlocks,
  hasArticleBlockContent,
  parseArticleBlocks,
  type ArticleBlock,
} from "@/lib/articleBlocks";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  category: string | null;
  category_id: string | null;
  read_time: string | null;
  image_url: string | null;
  is_published: boolean;
  article_blocks: unknown;
  table_data: ArticleTableData | null;
  is_table_visible: boolean;
  author_name: string | null;
  author_bio: string | null;
  author_avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  color: string | null;
  order_index: number | null;
  is_active: boolean;
  show_in_menu?: boolean;
  created_at: string;
}

type ArticleTableData = {
  headers: string[];
  rows: string[][];
};

// The table editor starts with a 3×3 grid (matching the common article-table
// layout) and both dimensions can grow or shrink from there.
const DEFAULT_TABLE_COLUMNS = 3;
const DEFAULT_TABLE_ROWS = 3;

const createTableDraft = (data?: ArticleTableData | null) => {
  const storedHeaders = Array.isArray(data?.headers) ? data.headers : [];
  const headers = storedHeaders.length
    ? storedHeaders.map((header) => String(header ?? ""))
    : Array.from({ length: DEFAULT_TABLE_COLUMNS }, () => "");

  const storedRows = Array.isArray(data?.rows) ? data.rows : [];
  const rows = storedRows.length
    ? storedRows.map((row) => headers.map((_, col) => String(row?.[col] ?? "")))
    : Array.from({ length: DEFAULT_TABLE_ROWS }, () => headers.map(() => ""));

  return { headers, rows };
};

const createEmptyForm = () => {
  const table = createTableDraft(null);
  return {
    title: "",
    excerpt: "",
    content: "",
    category: "",
    category_id: "",
    read_time: "",
    image_url: "",
    is_published: false,
    author_name: "",
    author_bio: "",
    author_avatar_url: "",
    is_table_visible: false,
    table_headers: table.headers,
    table_rows: table.rows,
    article_blocks: [] as ArticleBlock[],
  };
};

const emptyCategoryForm = {
  name: "",
  slug: "",
  description: "",
  color: "#3B82F6",
  order_index: 0,
  is_active: true,
  show_in_menu: true,
};

const CATEGORY_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

const ManageBlogPostsPage = () => {
  const { user, userRole, profile, loading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [formData, setFormData] = useState(createEmptyForm);
  const [categoryFormData, setCategoryFormData] = useState(emptyCategoryForm);
  const [activeTab, setActiveTab] = useState("posts");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const applyAlign = (align: "right" | "center" | "left") => {
    const ta = contentRef.current;
    if (!ta) return;
    const text = formData.content || "";
    const selStart = ta.selectionStart ?? 0;
    const selEnd = ta.selectionEnd ?? 0;
    // Expand selection to full lines
    const lineStart = text.lastIndexOf("\n", selStart - 1) + 1;
    const lineEndIdx = text.indexOf("\n", selEnd);
    const lineEnd = lineEndIdx === -1 ? text.length : lineEndIdx;
    const before = text.slice(0, lineStart);
    const selected = text.slice(lineStart, lineEnd);
    const after = text.slice(lineEnd);
    if (!selected.trim()) {
      toast({ title: "حدد النص أولاً لتحديد محاذاته", variant: "destructive" });
      return;
    }
    // Strip existing wrapping div if present
    const stripped = selected.replace(/^<div style="text-align:(right|center|left)">([\s\S]*)<\/div>$/, "$2");
    const wrapped = `<div style="text-align:${align}">${stripped}</div>`;
    const next = before + wrapped + after;
    setFormData({ ...formData, content: next });
    // Restore focus
    setTimeout(() => {
      ta.focus();
      const pos = before.length + wrapped.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !(userRole === "admin" || hasPermission("blog_posts"))) navigate("/dashboard");
  }, [user, loading, userRole, hasPermission, navigate]);

  useEffect(() => {
    if (user && (userRole === "admin" || hasPermission("blog_posts"))) {
      fetchPosts();
      fetchCategories();
    }
  }, [user, userRole, hasPermission]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPosts((data || []) as unknown as BlogPost[]);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const getCategoryName = (post: BlogPost) => {
    if (post.category_id) {
      const cat = categories.find(c => c.id === post.category_id);
      return cat ? cat.name : post.category || "-";
    }
    return post.category || "-";
  };

  const getCategoryColor = (post: BlogPost) => {
    if (post.category_id) {
      const cat = categories.find(c => c.id === post.category_id);
      return cat?.color || "#3B82F6";
    }
    return "#3B82F6";
  };

  // Post CRUD
  const openCreate = () => {
    setEditingPost(null);
    setFormData(createEmptyForm());
    setDialogOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    const table = createTableDraft(post.table_data);
    setEditingPost(post);
    setFormData({
      title: post.title,
      excerpt: post.excerpt || "",
      content: post.content || "",
      category: post.category || "",
      category_id: post.category_id || "",
      read_time: post.read_time || "",
      image_url: post.image_url || "",
      is_published: post.is_published,
      author_name: post.author_name || "",
      author_bio: post.author_bio || "",
      author_avatar_url: post.author_avatar_url || "",
      is_table_visible: post.is_table_visible ?? false,
      table_headers: table.headers,
      table_rows: table.rows,
      article_blocks: parseArticleBlocks(post.article_blocks),
    });
    setDialogOpen(true);
  };

  const handleImportLegacyContent = () => {
    const converted = convertHtmlToArticleBlocks(formData.content || "");
    if (!converted.length) {
      toast({
        title: "لا يوجد محتوى قابل للتحويل",
        description: "اكتب المحتوى القديم أولًا أو أضف العناصر يدويًا.",
        variant: "destructive",
      });
      return;
    }
    if (
      formData.article_blocks.length > 0 &&
      !confirm("سيتم استبدال العناصر الحالية بالمحتوى القديم. هل تريد المتابعة؟")
    ) {
      return;
    }
    setFormData((prev) => ({ ...prev, article_blocks: converted }));
    toast({
      title: "تم تحويل المحتوى إلى عناصر",
      description: "راجع العناصر ثم أعد ترتيبها أو عدّلها قبل الحفظ.",
    });
  };

  // --- Article table editor -------------------------------------------------
  const updateTableHeader = (col: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      table_headers: prev.table_headers.map((header, index) =>
        index === col ? value : header,
      ),
    }));
  };

  const updateTableCell = (row: number, col: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      table_rows: prev.table_rows.map((cells, rowIndex) =>
        rowIndex === row
          ? cells.map((cell, colIndex) => (colIndex === col ? value : cell))
          : cells,
      ),
    }));
  };

  const addTableRow = () => {
    setFormData((prev) => ({
      ...prev,
      table_rows: [...prev.table_rows, prev.table_headers.map(() => "")],
    }));
  };

  const addTableColumn = () => {
    setFormData((prev) => ({
      ...prev,
      table_headers: [...prev.table_headers, ""],
      table_rows: prev.table_rows.map((cells) => [...cells, ""]),
    }));
  };

  const removeTableRow = () => {
    setFormData((prev) =>
      prev.table_rows.length <= 1
        ? prev
        : { ...prev, table_rows: prev.table_rows.slice(0, -1) },
    );
  };

  const removeTableColumn = () => {
    setFormData((prev) =>
      prev.table_headers.length <= 1
        ? prev
        : {
            ...prev,
            table_headers: prev.table_headers.slice(0, -1),
            table_rows: prev.table_rows.map((cells) => cells.slice(0, -1)),
          },
    );
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({ title: "يرجى إدخال عنوان المقال", variant: "destructive" });
      return;
    }

    const usesBlocks = formData.article_blocks.length > 0;
    if (usesBlocks && !hasArticleBlockContent(formData.article_blocks)) {
      toast({
        title: "عناصر المقال فارغة",
        description: "أضف نصًا أو عنوانًا داخل العناصر، أو احذف العناصر الفارغة قبل الحفظ.",
        variant: "destructive",
      });
      return;
    }

    // Trim every cell and only persist the table when it actually has content.
    const tableHeaders = formData.table_headers.map((header) => header.trim());
    const tableRows = formData.table_rows.map((row) => row.map((cell) => cell.trim()));
    const hasTableContent =
      tableHeaders.some(Boolean) || tableRows.some((row) => row.some(Boolean));

    if (formData.is_table_visible && !hasTableContent) {
      toast({
        title: "الجدول مفعّل لكنه فارغ",
        description: "املأ خلايا الجدول أو أوقف عرضه قبل الحفظ.",
        variant: "destructive",
      });
      return;
    }

    const selectedCategory = categories.find(c => c.id === formData.category_id);

    // Only touch `article_blocks` when the payload actually needs it. This
    // keeps classic posts saveable on databases where the block migration has
    // not been applied yet, and still clears the column when every block is
    // removed from a post that used to have them.
    const hadStructuredBlocks = editingPost
      ? parseArticleBlocks(editingPost.article_blocks).length > 0
      : false;
    const blocksPayload =
      usesBlocks || hadStructuredBlocks
        ? {
            article_blocks: usesBlocks
              ? (formData.article_blocks as unknown as Json)
              : null,
          }
        : {};

    try {
      const payload = {
        title: formData.title,
        excerpt: formData.excerpt || null,
        // Keep the legacy/translated HTML in sync with the structured blocks.
        content: usesBlocks ? blocksToHtml(formData.article_blocks) : formData.content || null,
        ...blocksPayload,
        category: selectedCategory?.name || formData.category || null,
        category_id: formData.category_id || null,
        read_time: formData.read_time || null,
        image_url: formData.image_url || null,
        is_published: formData.is_published,
        author_name: formData.author_name || null,
        author_bio: formData.author_bio || null,
        author_avatar_url: formData.author_avatar_url || null,
        table_data: hasTableContent ? { headers: tableHeaders, rows: tableRows } : null,
        is_table_visible: formData.is_table_visible,
      };

      if (editingPost) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", editingPost.id);
        if (error) throw error;
        toast({ title: "تم تعديل المقال بنجاح" });
      } else {
        const { error } = await supabase.from("blog_posts").insert({ ...payload, author_id: user?.id });
        if (error) throw error;
        toast({ title: "تم إضافة المقال بنجاح" });
      }
      setDialogOpen(false);
      fetchPosts();
    } catch (error) {
      console.error("Error saving post:", error);
      const message =
        error instanceof Error
          ? error.message
          : typeof (error as { message?: unknown })?.message === "string"
            ? String((error as { message: string }).message)
            : "";
      if (/article_blocks/i.test(message)) {
        toast({
          title: "قاعدة البيانات تحتاج تحديثًا",
          description:
            "طبّق ملف الهجرة supabase/migrations/20261118000000_blog_post_article_blocks.sql ثم أعد المحاولة.",
          variant: "destructive",
        });
      } else {
        toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المقال؟")) return;
    try {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "تم حذف المقال" });
      fetchPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({ title: "حدث خطأ أثناء الحذف", variant: "destructive" });
    }
  };

  const togglePublish = async (post: BlogPost) => {
    try {
      const { error } = await supabase
        .from("blog_posts")
        .update({ is_published: !post.is_published })
        .eq("id", post.id);
      if (error) throw error;
      toast({ title: post.is_published ? "تم إلغاء النشر" : "تم نشر المقال" });
      fetchPosts();
    } catch (error) {
      console.error("Error toggling publish:", error);
    }
  };

  // Category CRUD
  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryFormData(emptyCategoryForm);
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: BlogCategory) => {
    setEditingCategory(cat);
    setCategoryFormData({
      name: cat.name,
      slug: cat.slug || "",
      description: cat.description || "",
      color: cat.color || "#3B82F6",
      order_index: cat.order_index || 0,
      is_active: cat.is_active,
      show_in_menu: cat.show_in_menu ?? true,
    });
    setCategoryDialogOpen(true);
  };

  const handleCategorySubmit = async () => {
    if (!categoryFormData.name.trim()) {
      toast({ title: "يرجى إدخال اسم التصنيف", variant: "destructive" });
      return;
    }

    const slug = categoryFormData.slug || categoryFormData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]/g, "");

    try {
      const payload = {
        name: categoryFormData.name,
        slug,
        description: categoryFormData.description || null,
        color: categoryFormData.color,
        order_index: categoryFormData.order_index,
        is_active: categoryFormData.is_active,
        show_in_menu: categoryFormData.show_in_menu,
      };

      if (editingCategory) {
        const { error } = await supabase.from("blog_categories").update(payload).eq("id", editingCategory.id);
        if (error) throw error;
        toast({ title: "تم تعديل التصنيف بنجاح" });
      } else {
        const { error } = await supabase.from("blog_categories").insert(payload);
        if (error) throw error;
        toast({ title: "تم إضافة التصنيف بنجاح" });
      }
      setCategoryDialogOpen(false);
      fetchCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التصنيف؟")) return;
    try {
      const { error } = await supabase.from("blog_categories").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "تم حذف التصنيف" });
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({ title: "حدث خطأ أثناء الحذف", variant: "destructive" });
    }
  };

  if (loading || isLoading) {
    return (
      <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير النظام"}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مدير النظام"}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Newspaper className="h-8 w-8" />
            إدارة المقالات
          </h1>
          <p className="text-muted-foreground">إضافة وتعديل مقالات المدونة وتصنيفاتها</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="posts" className="gap-2">
              <Newspaper className="h-4 w-4" />
              المقالات
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Tag className="h-4 w-4" />
              التصنيفات
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                مقال جديد
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {posts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد مقالات بعد</p>
                  </div>
                ) : (
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">العنوان</TableHead>
                        <TableHead className="text-right">التصنيف</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {posts.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell className="text-right font-medium max-w-[250px] truncate">
                            {post.title}
                          </TableCell>
                          <TableCell className="text-right">
                            {getCategoryName(post) !== "-" ? (
                              <Badge
                                variant="secondary"
                                style={{ borderColor: getCategoryColor(post), borderWidth: 1, borderStyle: "solid" }}
                              >
                                <span className="w-2 h-2 rounded-full inline-block mr-1.5" style={{ backgroundColor: getCategoryColor(post) }} />
                                {getCategoryName(post)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={post.is_published ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => togglePublish(post)}
                            >
                              {post.is_published ? (
                                <><Eye className="h-3 w-3 ml-1" /> منشور</>
                              ) : (
                                <><EyeOff className="h-3 w-3 ml-1" /> مسودة</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap" dir="ltr">
                            {new Date(post.created_at).toLocaleDateString("en-GB")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(post)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openCreateCategory} className="gap-2">
                <Plus className="h-4 w-4" />
                تصنيف جديد
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد تصنيفات بعد</p>
                </div>
              ) : (
                categories.map((cat) => (
                  <Card key={cat.id} className="group hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color || "#3B82F6" }} />
                          <h3 className="font-bold text-foreground">{cat.name}</h3>
                        </div>
                        <Badge variant={cat.is_active ? "default" : "outline"} className="text-xs">
                          {cat.is_active ? "مفعّل" : "معطّل"}
                        </Badge>
                      </div>
                      {cat.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{cat.description}</p>
                      )}
                      {cat.slug && (
                        <p className="text-xs text-muted-foreground mb-3" dir="ltr">/{cat.slug}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditCategory(cat)}>
                          <Pencil className="h-3.5 w-3.5 ml-1" />
                          تعديل
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(cat.id)} className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5 ml-1" />
                          حذف
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Post Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPost ? "تعديل المقال" : "إضافة مقال جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>العنوان *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="عنوان المقال"
                />
              </div>
              <div>
                <Label>المقتطف</Label>
                <Textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="وصف مختصر للمقال"
                  rows={2}
                />
              </div>
              <ArticleBlocksEditor
                value={formData.article_blocks}
                onChange={(article_blocks) =>
                  setFormData((prev) => ({ ...prev, article_blocks }))
                }
              />

              <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      المحتوى القديم / HTML (اختياري)
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {formData.article_blocks.length > 0
                        ? "المحرر يستخدم العناصر أعلاه، وسيُولَّد HTML جديد تلقائيًا عند الحفظ."
                        : "يُستخدم هذا المحتوى عندما لا توجد عناصر في المحرر."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={handleImportLegacyContent}
                    disabled={
                      !formData.content.trim() || formData.article_blocks.length > 0
                    }
                    title={
                      formData.article_blocks.length > 0
                        ? "احذف العناصر أولًا إن أردت التحويل من جديد"
                        : "تحويل المحتوى الحالي إلى عناصر قابلة لإعادة الترتيب"
                    }
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    تحويل المحتوى إلى عناصر
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1">
                  <span className="text-xs text-muted-foreground ml-1">
                    محاذاة السطر المحدد:
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => applyAlign("right")}
                    disabled={formData.article_blocks.length > 0}
                    title="يمين"
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => applyAlign("center")}
                    disabled={formData.article_blocks.length > 0}
                    title="وسط"
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => applyAlign("left")}
                    disabled={formData.article_blocks.length > 0}
                    title="يسار"
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                </div>

                <Textarea
                  ref={contentRef}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="محتوى المقال القديم…"
                  rows={6}
                  disabled={formData.article_blocks.length > 0}
                />
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      جدول إضافي قديم (اختياري)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      يظهر أسفل المقال فقط عند عدم استخدام محرر العناصر. لإضافة جدول داخل
                      المحتوى استخدم عنصر «جدول» في المحرر أعلاه.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_table_visible}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_table_visible: checked })
                      }
                    />
                    <Label>{formData.is_table_visible ? "الجدول ظاهر" : "الجدول مخفي"}</Label>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] table-fixed border-collapse">
                      <thead>
                        <tr>
                          {formData.table_headers.map((header, col) => (
                            <th key={col} className="border border-border bg-muted p-1.5 align-top">
                              <Input
                                value={header}
                                onChange={(e) => updateTableHeader(col, e.target.value)}
                                placeholder={`عنوان العمود ${col + 1}`}
                                className="h-8 bg-background text-xs font-bold"
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {formData.table_rows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, col) => (
                              <td key={col} className="border border-border p-1.5 align-top">
                                <Textarea
                                  value={cell}
                                  onChange={(e) => updateTableCell(rowIndex, col, e.target.value)}
                                  placeholder="نص الخلية"
                                  rows={2}
                                  className="min-h-[58px] resize-y bg-background text-xs"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={addTableRow}>
                      <Plus className="h-3.5 w-3.5" />
                      إضافة صف
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={addTableColumn}>
                      <Plus className="h-3.5 w-3.5" />
                      إضافة عمود
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={removeTableRow}
                      disabled={formData.table_rows.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف آخر صف
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={removeTableColumn}
                      disabled={formData.table_headers.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف آخر عمود
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>التصنيف</Label>
                  <Select
                    value={formData.category_id || "none"}
                    onValueChange={(val) => setFormData({ ...formData, category_id: val === "none" ? "" : val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر تصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون تصنيف</SelectItem>
                      {categories.filter(c => c.is_active).map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || "#3B82F6" }} />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>وقت القراءة</Label>
                  <Input
                    value={formData.read_time}
                    onChange={(e) => setFormData({ ...formData, read_time: e.target.value })}
                    placeholder="مثال: 5 دقائق"
                  />
                </div>
              </div>
              <div>
                <Label>رابط الصورة</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                    dir="ltr"
                    className="flex-1"
                  />
                  <HostingerImageUpload
                    folder="blog"
                    onUploaded={(url) => setFormData({ ...formData, image_url: url })}
                  />
                </div>
                {formData.image_url && (
                  <img src={formData.image_url} alt="معاينة" className="mt-2 max-h-40 rounded border object-contain" />
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-bold text-foreground">معلومات الكاتب (اختياري)</p>
                <div>
                  <Label>اسم الكاتب</Label>
                  <Input
                    value={formData.author_name}
                    onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                    placeholder="مثال: د. محمد أحمد"
                  />
                </div>
                <div>
                  <Label>نبذة عن الكاتب</Label>
                  <Textarea
                    value={formData.author_bio}
                    onChange={(e) => setFormData({ ...formData, author_bio: e.target.value })}
                    placeholder="نبذة قصيرة عن خبرات الكاتب وتخصصه..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>رابط صورة الكاتب</Label>
                  <Input
                    value={formData.author_avatar_url}
                    onChange={(e) => setFormData({ ...formData, author_avatar_url: e.target.value })}
                    placeholder="https://..."
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
                <Label>نشر المقال</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleSubmit}>
                {editingPost ? "حفظ التعديلات" : "إضافة المقال"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Category Dialog */}
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>اسم التصنيف *</Label>
                <Input
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="مثال: التعليم"
                />
              </div>
              <div>
                <Label>الرابط (Slug)</Label>
                <Input
                  value={categoryFormData.slug}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, slug: e.target.value })}
                  placeholder="يتم إنشاؤه تلقائياً"
                  dir="ltr"
                />
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  placeholder="وصف مختصر للتصنيف"
                  rows={2}
                />
              </div>
              <div>
                <Label className="flex items-center gap-1 mb-2">
                  <Palette className="h-4 w-4" />
                  اللون
                </Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCategoryFormData({ ...categoryFormData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${categoryFormData.color === color ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label>الترتيب</Label>
                <Input
                  type="number"
                  value={categoryFormData.order_index}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, order_index: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={categoryFormData.is_active}
                  onCheckedChange={(checked) => setCategoryFormData({ ...categoryFormData, is_active: checked })}
                />
                <Label>تصنيف مفعّل</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={categoryFormData.show_in_menu}
                  onCheckedChange={(checked) => setCategoryFormData({ ...categoryFormData, show_in_menu: checked })}
                />
                <Label>إظهار في قائمة المقالات بالهيدر</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleCategorySubmit}>
                {editingCategory ? "حفظ التعديلات" : "إضافة التصنيف"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ManageBlogPostsPage;
