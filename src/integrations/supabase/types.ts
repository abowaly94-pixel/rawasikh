export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          school_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          school_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          school_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          joined_at: string | null
          lesson_id: string | null
          notes: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date?: string
          id?: string
          joined_at?: string | null
          lesson_id?: string | null
          notes?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          joined_at?: string | null
          lesson_id?: string | null
          notes?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attendance_class_id"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attendance_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          show_in_menu: boolean
          slug: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          show_in_menu?: boolean
          slug?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          show_in_menu?: boolean
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_approved: boolean
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_translations: {
        Row: {
          author_bio: string | null
          author_name: string | null
          category_name: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          id: string
          language: string
          post_id: string
          source_updated_at: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          author_bio?: string | null
          author_name?: string | null
          category_name?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          language: string
          post_id: string
          source_updated_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_bio?: string | null
          author_name?: string | null
          category_name?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          language?: string
          post_id?: string
          source_updated_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_translations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_avatar_url: string | null
          author_bio: string | null
          author_id: string | null
          author_name: string | null
          category: string | null
          category_id: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          is_published: boolean
          read_time: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_avatar_url?: string | null
          author_bio?: string | null
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          read_time?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_avatar_url?: string | null
          author_bio?: string | null
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          read_time?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          course_id: string
          course_title: string
          honorific: string | null
          id: string
          issued_at: string
          student_id: string
          student_name: string
        }
        Insert: {
          certificate_number: string
          course_id: string
          course_title: string
          honorific?: string | null
          id?: string
          issued_at?: string
          student_id: string
          student_name: string
        }
        Update: {
          certificate_number?: string
          course_id?: string
          course_title?: string
          honorific?: string | null
          id?: string
          issued_at?: string
          student_id?: string
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          description: string | null
          grade_level: string | null
          grade_level_id: string | null
          id: string
          name: string
          school_id: string | null
          stage_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          grade_level?: string | null
          grade_level_id?: string | null
          id?: string
          name: string
          school_id?: string | null
          stage_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          grade_level?: string | null
          grade_level_id?: string | null
          id?: string
          name?: string
          school_id?: string | null
          stage_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_grade_level_id_fkey"
            columns: ["grade_level_id"]
            isOneToOne: false
            referencedRelation: "grade_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_classes_teacher_id"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_classes_teacher_id"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "public_teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      course_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          show_in_menu: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          show_in_menu?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          show_in_menu?: boolean
        }
        Relationships: []
      }
      course_lessons: {
        Row: {
          captions: Json
          captions_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_free: boolean
          order_index: number
          pdf_url: string | null
          section_id: string
          title: string
          video_url: string | null
        }
        Insert: {
          captions?: Json
          captions_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean
          order_index?: number
          pdf_url?: string | null
          section_id: string
          title: string
          video_url?: string | null
        }
        Update: {
          captions?: Json
          captions_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean
          order_index?: number
          pdf_url?: string | null
          section_id?: string
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      course_level_assessments: {
        Row: {
          course_id: string
          id: string
          recommended_level_id: string | null
          score: number | null
          taken_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          recommended_level_id?: string | null
          score?: number | null
          taken_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          recommended_level_id?: string | null
          score?: number | null
          taken_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_level_purchases: {
        Row: {
          amount_paid: number
          course_id: string
          id: string
          level_id: string
          payment_method: string | null
          payment_receipt_url: string | null
          payment_status: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          course_id: string
          id?: string
          level_id: string
          payment_method?: string | null
          payment_receipt_url?: string | null
          payment_status?: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          course_id?: string
          id?: string
          level_id?: string
          payment_method?: string | null
          payment_receipt_url?: string | null
          payment_status?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_level_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_level_purchases_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "course_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      course_levels: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_score: number | null
          min_score: number | null
          name: string
          order_index: number
          price: number
          price_label: string | null
          prices: Json
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_score?: number | null
          min_score?: number | null
          name: string
          order_index?: number
          price?: number
          price_label?: string | null
          prices?: Json
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_score?: number | null
          min_score?: number | null
          name?: string
          order_index?: number
          price?: number
          price_label?: string | null
          prices?: Json
          updated_at?: string
        }
        Relationships: []
      }
      course_payment_plans: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          id: string
          last_reminder_sent_date: string | null
          next_due_date: string | null
          notes: string | null
          student_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_reminder_sent_date?: string | null
          next_due_date?: string | null
          notes?: string | null
          student_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_reminder_sent_date?: string | null
          next_due_date?: string | null
          notes?: string | null
          student_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_payment_plans_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_payments: {
        Row: {
          amount: number
          channel: string
          created_at: string
          id: string
          notes: string | null
          paid_at: string
          plan_id: string
          recorded_by: string | null
          reference: string | null
          source: string
        }
        Insert: {
          amount: number
          channel?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          plan_id: string
          recorded_by?: string | null
          reference?: string | null
          source?: string
        }
        Update: {
          amount?: number
          channel?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          plan_id?: string
          recorded_by?: string | null
          reference?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "course_payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      course_purchases: {
        Row: {
          amount_paid: number
          course_id: string
          id: string
          payment_method: string | null
          payment_receipt_url: string | null
          payment_status: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          course_id: string
          id?: string
          payment_method?: string | null
          payment_receipt_url?: string | null
          payment_status?: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          course_id?: string
          id?: string
          payment_method?: string | null
          payment_receipt_url?: string | null
          payment_status?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      course_quiz_assignments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          lesson_id: string | null
          order_index: number | null
          quiz_id: string
          quiz_type: string
          section_id: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          order_index?: number | null
          quiz_id: string
          quiz_type?: string
          section_id?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          order_index?: number | null
          quiz_id?: string
          quiz_type?: string
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_quiz_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_quiz_assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_quiz_assignments_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "course_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_quiz_assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      course_quizzes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          passing_score: number | null
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          passing_score?: number | null
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          passing_score?: number | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_review_screenshots: {
        Row: {
          caption: string | null
          course_id: string
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          image_url: string
        }
        Insert: {
          caption?: string | null
          course_id: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          image_url: string
        }
        Update: {
          caption?: string | null
          course_id?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_review_screenshots_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          course_id: string
          created_at: string
          id: string
          rating: number
          review: string | null
          reviewer_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          reviewer_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          reviewer_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sections: {
        Row: {
          course_id: string
          created_at: string
          id: string
          level_id: string | null
          order_index: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          level_id?: string | null
          order_index?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          level_id?: string | null
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_tasks: {
        Row: {
          course_id: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          is_required: boolean
          lesson_id: string | null
          submission_type: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_required?: boolean
          lesson_id?: string | null
          submission_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_required?: boolean
          lesson_id?: string | null
          submission_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_tasks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_tasks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_translations: {
        Row: {
          course_id: string
          created_at: string
          description: string
          id: string
          language: string
          source_updated_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string
          id?: string
          language: string
          source_updated_at?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string
          id?: string
          language?: string
          source_updated_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_translations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          captions: Json
          captions_url: string | null
          category_id: string | null
          created_at: string
          description: string | null
          display_order: number
          has_levels: boolean
          id: string
          instructor_id: string | null
          instructor_name: string | null
          is_featured: boolean
          is_published: boolean
          level_assessment_id: string | null
          preview_video_url: string | null
          price: number
          price_label: string | null
          prices: Json
          requires_level_assessment: boolean
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          captions?: Json
          captions_url?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          has_levels?: boolean
          id?: string
          instructor_id?: string | null
          instructor_name?: string | null
          is_featured?: boolean
          is_published?: boolean
          level_assessment_id?: string | null
          preview_video_url?: string | null
          price?: number
          price_label?: string | null
          prices?: Json
          requires_level_assessment?: boolean
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          captions?: Json
          captions_url?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          has_levels?: boolean
          id?: string
          instructor_id?: string | null
          instructor_name?: string | null
          is_featured?: boolean
          is_published?: boolean
          level_assessment_id?: string | null
          preview_video_url?: string | null
          price?: number
          price_label?: string | null
          prices?: Json
          requires_level_assessment?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "public_teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          applies_to: Database["public"]["Enums"]["discount_scope"]
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number
          updated_at: string
          uses_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applies_to?: Database["public"]["Enums"]["discount_scope"]
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number
          updated_at?: string
          uses_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applies_to?: Database["public"]["Enums"]["discount_scope"]
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number
          updated_at?: string
          uses_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      educational_stages: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number | null
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number | null
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "educational_stages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_answers: {
        Row: {
          answer_text: string | null
          attempt_id: string
          graded_at: string | null
          graded_by: string | null
          id: string
          is_correct: boolean | null
          manual_score: number | null
          question_id: string
          selected_option_id: string | null
        }
        Insert: {
          answer_text?: string | null
          attempt_id: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          manual_score?: number | null
          question_id: string
          selected_option_id?: string | null
        }
        Update: {
          answer_text?: string | null
          attempt_id?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          manual_score?: number | null
          question_id?: string
          selected_option_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "exam_question_options"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          completed_at: string | null
          created_at: string
          exam_id: string
          id: string
          max_score: number | null
          passed: boolean | null
          percentage: number | null
          score: number | null
          started_at: string
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          exam_id: string
          id?: string
          max_score?: number | null
          passed?: boolean | null
          percentage?: number | null
          score?: number | null
          started_at?: string
          student_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          exam_id?: string
          id?: string
          max_score?: number | null
          passed?: boolean | null
          percentage?: number | null
          score?: number | null
          started_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      exam_question_options: {
        Row: {
          id: string
          is_correct: boolean | null
          match_text: string | null
          option_text: string
          order_index: number | null
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean | null
          match_text?: string | null
          option_text: string
          order_index?: number | null
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean | null
          match_text?: string | null
          option_text?: string
          order_index?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          correct_answer: string | null
          created_at: string
          exam_id: string
          id: string
          image_url: string | null
          order_index: number | null
          points: number | null
          question_text: string
          question_type: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          exam_id: string
          id?: string
          image_url?: string | null
          order_index?: number | null
          points?: number | null
          question_text: string
          question_type?: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          exam_id?: string
          id?: string
          image_url?: string | null
          order_index?: number | null
          points?: number | null
          question_text?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          category_id: string | null
          class_id: string
          created_at: string
          created_by: string | null
          description: string | null
          exam_date: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          id: string
          is_public: boolean | null
          lesson_id: string | null
          max_score: number
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          class_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          exam_date?: string
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          is_public?: boolean | null
          lesson_id?: string | null
          max_score?: number
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          class_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          exam_date?: string
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          is_public?: boolean | null
          lesson_id?: string | null
          max_score?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exam_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_exams_class_id"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string
          field_type: string
          form_id: string
          id: string
          is_required: boolean
          label: string
          options: Json
          order_index: number
          rating_max: number
        }
        Insert: {
          created_at?: string
          field_type: string
          form_id: string
          id?: string
          is_required?: boolean
          label: string
          options?: Json
          order_index?: number
          rating_max?: number
        }
        Update: {
          created_at?: string
          field_type?: string
          form_id?: string
          id?: string
          is_required?: boolean
          label?: string
          options?: Json
          order_index?: number
          rating_max?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_response_answers: {
        Row: {
          answer_number: number | null
          answer_options: Json | null
          answer_text: string | null
          created_at: string
          field_id: string
          id: string
          response_id: string
        }
        Insert: {
          answer_number?: number | null
          answer_options?: Json | null
          answer_text?: string | null
          created_at?: string
          field_id: string
          id?: string
          response_id: string
        }
        Update: {
          answer_number?: number | null
          answer_options?: Json | null
          answer_text?: string | null
          created_at?: string
          field_id?: string
          id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_response_answers_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_response_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "form_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          created_at: string
          form_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      global_stages: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number | null
        }
        Relationships: []
      }
      grade_levels: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number | null
          stage_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number | null
          stage_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number | null
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_levels_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "global_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          created_at: string
          exam_id: string
          graded_by: string | null
          id: string
          notes: string | null
          score: number
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          graded_by?: string | null
          id?: string
          notes?: string | null
          score: number
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          graded_by?: string | null
          id?: string
          notes?: string | null
          score?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_grades_exam_id"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_grades_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_attendance: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          joined_at: string
          lesson_id: string | null
          status: string
          student_id: string
          zoom_link_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          lesson_id?: string | null
          status?: string
          student_id: string
          zoom_link_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          lesson_id?: string | null
          status?: string
          student_id?: string
          zoom_link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_attendance_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_attendance_zoom_link_id_fkey"
            columns: ["zoom_link_id"]
            isOneToOne: false
            referencedRelation: "zoom_links"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string
          course_id: string
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          meeting_link: string | null
          price: number
          recorded_video_url: string | null
          room: string | null
          school_id: string | null
          start_time: string
          subject: string
          teacher_id: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          meeting_link?: string | null
          price?: number
          recorded_video_url?: string | null
          room?: string | null
          school_id?: string | null
          start_time: string
          subject: string
          teacher_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          meeting_link?: string | null
          price?: number
          recorded_video_url?: string | null
          room?: string | null
          school_id?: string | null
          start_time?: string
          subject?: string
          teacher_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      news_ticker: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          link: string | null
          order_index: number
          text: string
          text_en: string | null
          text_fr: string | null
          text_ur: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          link?: string | null
          order_index?: number
          text: string
          text_en?: string | null
          text_fr?: string | null
          text_ur?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          link?: string | null
          order_index?: number
          text?: string
          text_en?: string | null
          text_fr?: string | null
          text_ur?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      news_updates: {
        Row: {
          content_type: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          link_url: string | null
          order_index: number
          published_at: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          link_url?: string | null
          order_index?: number
          published_at?: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          link_url?: string | null
          order_index?: number
          published_at?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      online_sessions: {
        Row: {
          created_at: string
          description: string | null
          end_time: string
          id: string
          is_active: boolean | null
          is_free: boolean | null
          max_students: number | null
          meeting_link: string | null
          meeting_type: Database["public"]["Enums"]["meeting_type"] | null
          price: number | null
          session_date: string
          start_time: string
          subject: string
          teacher_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          max_students?: number | null
          meeting_link?: string | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"] | null
          price?: number | null
          session_date: string
          start_time: string
          subject: string
          teacher_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          max_students?: number | null
          meeting_link?: string | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"] | null
          price?: number | null
          session_date?: string
          start_time?: string
          subject?: string
          teacher_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          bank_account_info: string | null
          created_at: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          bank_account_info?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          bank_account_info?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          package_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          package_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          package_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_submissions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          payment_method: string
          paymob_order_id: string | null
          paymob_transaction_id: string | null
          raw_response: Json | null
          reference_id: string | null
          reference_type: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_method?: string
          paymob_order_id?: string | null
          paymob_transaction_id?: string | null
          raw_response?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_method?: string
          paymob_order_id?: string | null
          paymob_transaction_id?: string | null
          raw_response?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio: {
        Row: {
          client: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          client: string
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          client?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_orders: {
        Row: {
          created_at: string
          governorate_id: string | null
          id: string
          notes: string | null
          payment_receipt_url: string | null
          phone: string | null
          product_id: string
          quantity: number
          reviewed_at: string | null
          reviewed_by: string | null
          shipping_address: string | null
          shipping_cost: number | null
          status: string
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          governorate_id?: string | null
          id?: string
          notes?: string | null
          payment_receipt_url?: string | null
          phone?: string | null
          product_id: string
          quantity?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          shipping_address?: string | null
          shipping_cost?: number | null
          status?: string
          total_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          governorate_id?: string | null
          id?: string
          notes?: string | null
          payment_receipt_url?: string | null
          phone?: string | null
          product_id?: string
          quantity?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          shipping_address?: string | null
          shipping_cost?: number | null
          status?: string
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_orders_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "shipping_governorates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country_code: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      question_options: {
        Row: {
          id: string
          is_correct: boolean | null
          match_text: string | null
          option_text: string
          order_index: number | null
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean | null
          match_text?: string | null
          option_text: string
          order_index?: number | null
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean | null
          match_text?: string | null
          option_text?: string
          order_index?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          answer_text: string | null
          attempt_id: string
          graded_at: string | null
          graded_by: string | null
          id: string
          is_correct: boolean | null
          manual_score: number | null
          question_id: string
          selected_option_id: string | null
        }
        Insert: {
          answer_text?: string | null
          attempt_id: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          manual_score?: number | null
          question_id: string
          selected_option_id?: string | null
        }
        Update: {
          answer_text?: string | null
          attempt_id?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          manual_score?: number | null
          question_id?: string
          selected_option_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string | null
          course_id: string | null
          id: string
          passed: boolean | null
          quiz_id: string
          score: number | null
          started_at: string
          total_points: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          id?: string
          passed?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string
          total_points?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string
          total_points?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "course_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string | null
          created_at: string
          id: string
          image_url: string | null
          order_index: number | null
          points: number | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          quiz_id: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          order_index?: number | null
          points?: number | null
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          quiz_id: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          order_index?: number | null
          points?: number | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "course_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      school_assessment_answers: {
        Row: {
          answer_text: string | null
          attempt_id: string
          graded_at: string | null
          graded_by: string | null
          id: string
          is_correct: boolean | null
          manual_score: number | null
          question_id: string
          selected_option_id: string | null
        }
        Insert: {
          answer_text?: string | null
          attempt_id: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          manual_score?: number | null
          question_id: string
          selected_option_id?: string | null
        }
        Update: {
          answer_text?: string | null
          attempt_id?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          manual_score?: number | null
          question_id?: string
          selected_option_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_assessment_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "school_assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assessment_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "school_assessment_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assessment_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "school_assessment_options"
            referencedColumns: ["id"]
          },
        ]
      }
      school_assessment_attempts: {
        Row: {
          assessment_id: string
          completed_at: string | null
          created_at: string
          id: string
          max_score: number | null
          passed: boolean | null
          percentage: number | null
          score: number | null
          started_at: string
          student_id: string
        }
        Insert: {
          assessment_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          max_score?: number | null
          passed?: boolean | null
          percentage?: number | null
          score?: number | null
          started_at?: string
          student_id: string
        }
        Update: {
          assessment_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          max_score?: number | null
          passed?: boolean | null
          percentage?: number | null
          score?: number | null
          started_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_assessment_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "school_level_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assessment_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_assessment_options: {
        Row: {
          id: string
          is_correct: boolean | null
          match_text: string | null
          option_text: string
          order_index: number | null
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean | null
          match_text?: string | null
          option_text: string
          order_index?: number | null
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean | null
          match_text?: string | null
          option_text?: string
          order_index?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_assessment_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "school_assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      school_assessment_questions: {
        Row: {
          assessment_id: string
          correct_answer: string | null
          created_at: string
          explanation: string | null
          id: string
          image_url: string | null
          order_index: number | null
          points: number
          question_text: string
          question_type: string
          weakness_feedback: string | null
        }
        Insert: {
          assessment_id: string
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          order_index?: number | null
          points?: number
          question_text: string
          question_type?: string
          weakness_feedback?: string | null
        }
        Update: {
          assessment_id?: string
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          order_index?: number | null
          points?: number
          question_text?: string
          question_type?: string
          weakness_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "school_level_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      school_level_assessments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          grade_level_id: string | null
          id: string
          is_active: boolean
          max_score: number
          school_id: string | null
          stage_id: string | null
          subject_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_level_id?: string | null
          id?: string
          is_active?: boolean
          max_score?: number
          school_id?: string | null
          stage_id?: string | null
          subject_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_level_id?: string | null
          id?: string
          is_active?: boolean
          max_score?: number
          school_id?: string | null
          stage_id?: string | null
          subject_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_level_assessments_grade_level_id_fkey"
            columns: ["grade_level_id"]
            isOneToOne: false
            referencedRelation: "grade_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_level_assessments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_level_assessments_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "global_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_level_assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      school_teachers: {
        Row: {
          created_at: string
          id: string
          school_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          school_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          school_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "public_teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_enrollments: {
        Row: {
          enrolled_at: string
          id: string
          session_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          enrolled_at?: string
          id?: string
          session_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          enrolled_at?: string
          id?: string
          session_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_enrollments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "online_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_governorates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          shipping_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          shipping_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          shipping_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          created_at: string
          id: string
          path: string
          referrer: string | null
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          permission_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_key?: string
          user_id?: string
        }
        Relationships: []
      }
      stages: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number | null
          school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number | null
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number | null
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_performance_notes: {
        Row: {
          created_at: string
          id: string
          note: string
          recommendation: string | null
          shared_with_parent: boolean | null
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          recommendation?: string | null
          shared_with_parent?: boolean | null
          student_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          recommendation?: string | null
          shared_with_parent?: boolean | null
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_performance_notes_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_performance_notes_teacher_id"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_performance_notes_teacher_id"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "public_teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_performance_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class_id: string | null
          created_at: string
          enrollment_date: string | null
          grade_level_id: string | null
          id: string
          parent_id: string | null
          school_id: string | null
          stage_id: string | null
          status: string | null
          student_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          enrollment_date?: string | null
          grade_level_id?: string | null
          id?: string
          parent_id?: string | null
          school_id?: string | null
          stage_id?: string | null
          status?: string | null
          student_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          enrollment_date?: string | null
          grade_level_id?: string | null
          id?: string
          parent_id?: string | null
          school_id?: string | null
          stage_id?: string | null
          status?: string | null
          student_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_students_class_id"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_students_parent_id"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_students_parent_id"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "public_teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_students_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_students_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_grade_level_id_fkey"
            columns: ["grade_level_id"]
            isOneToOne: false
            referencedRelation: "grade_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "global_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_content: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_free: boolean | null
          order_index: number | null
          pdf_url: string | null
          subject_id: string
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_free?: boolean | null
          order_index?: number | null
          pdf_url?: string | null
          subject_id: string
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_free?: boolean | null
          order_index?: number | null
          pdf_url?: string | null
          subject_id?: string
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_content_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_content_progress: {
        Row: {
          completed_at: string
          content_id: string
          created_at: string
          id: string
          subject_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          content_id: string
          created_at?: string
          id?: string
          subject_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          content_id?: string
          created_at?: string
          id?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_content_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "subject_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_content_progress_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_quiz_options: {
        Row: {
          id: string
          is_correct: boolean | null
          option_text: string
          order_index: number | null
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean | null
          option_text: string
          order_index?: number | null
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean | null
          option_text?: string
          order_index?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "subject_quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_quiz_questions: {
        Row: {
          correct_answer: string | null
          created_at: string
          id: string
          order_index: number | null
          points: number | null
          question_text: string
          question_type: string
          quiz_id: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          id?: string
          order_index?: number | null
          points?: number | null
          question_text: string
          question_type?: string
          quiz_id: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          id?: string
          order_index?: number | null
          points?: number | null
          question_text?: string
          question_type?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "subject_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_quizzes: {
        Row: {
          content_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          passing_score: number | null
          subject_id: string
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          passing_score?: number | null
          subject_id: string
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          passing_score?: number | null
          subject_id?: string
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_quizzes_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "subject_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_quizzes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          grade_level_id: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          school_id: string
          stage_id: string
          term_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          grade_level_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          school_id: string
          stage_id: string
          term_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          grade_level_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          school_id?: string
          stage_id?: string
          term_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_grade_level_id_fkey"
            columns: ["grade_level_id"]
            isOneToOne: false
            referencedRelation: "grade_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "global_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      task_submissions: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          link_url: string | null
          status: string
          student_id: string
          submitted_at: string | null
          task_id: string
          text_content: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          link_url?: string | null
          status?: string
          student_id: string
          submitted_at?: string | null
          task_id: string
          text_content?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          link_url?: string | null
          status?: string
          student_id?: string
          submitted_at?: string | null
          task_id?: string
          text_content?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "course_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          status: string
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_attendance: {
        Row: {
          attendance_type: string
          created_at: string
          date: string
          id: string
          joined_at: string | null
          lesson_id: string | null
          session_id: string | null
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          attendance_type: string
          created_at?: string
          date?: string
          id?: string
          joined_at?: string | null
          lesson_id?: string | null
          session_id?: string | null
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          attendance_type?: string
          created_at?: string
          date?: string
          id?: string
          joined_at?: string | null
          lesson_id?: string | null
          session_id?: string | null
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "online_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          review: string | null
          teacher_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          teacher_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          teacher_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_ratings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_ratings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "public_teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number | null
          school_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number | null
          school_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "terms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          is_active: boolean | null
          package_id: string
          payment_submission_id: string | null
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          is_active?: boolean | null
          package_id: string
          payment_submission_id?: string | null
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          is_active?: boolean | null
          package_id?: string
          payment_submission_id?: string | null
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_payment_submission_id_fkey"
            columns: ["payment_submission_id"]
            isOneToOne: false
            referencedRelation: "payment_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          course_id: string | null
          created_at: string
          id: string
          lesson_id: string | null
          metadata: Json | null
          target_title: string | null
          target_url: string | null
          zoom_link_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          metadata?: Json | null
          target_title?: string | null
          target_url?: string | null
          zoom_link_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          metadata?: Json | null
          target_title?: string | null
          target_url?: string | null
          zoom_link_id?: string | null
        }
        Relationships: []
      }
      zoom_links: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean
          lesson_id: string | null
          meeting_id: string | null
          passcode: string | null
          scheduled_at: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          lesson_id?: string | null
          meeting_id?: string | null
          passcode?: string | null
          scheduled_at?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          lesson_id?: string | null
          meeting_id?: string | null
          passcode?: string | null
          scheduled_at?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoom_links_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoom_links_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_reminders_sent: {
        Row: {
          kind: string
          sent_at: string
          user_id: string
          zoom_link_id: string
        }
        Insert: {
          kind: string
          sent_at?: string
          user_id: string
          zoom_link_id: string
        }
        Update: {
          kind?: string
          sent_at?: string
          user_id?: string
          zoom_link_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_teachers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          full_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
      teacher_ratings_public: {
        Row: {
          created_at: string | null
          id: string | null
          rating: number | null
          review: string | null
          teacher_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          rating?: number | null
          review?: string | null
          teacher_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          rating?: number | null
          review?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_ratings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_ratings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "public_teachers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_and_issue_certificate: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: undefined
      }
      check_due_installments: { Args: never; Returns: undefined }
      filter_student_ids: { Args: { _user_ids: string[] }; Returns: string[] }
      get_site_visit_stats: {
        Args: { days_back?: number }
        Returns: {
          total_views: number
          unique_visitors: number
        }[]
      }
      get_student_school_id: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_blog_view: { Args: { _post_id: string }; Returns: number }
      is_student_of_school: { Args: { _school_id: string }; Returns: boolean }
      list_active_schools_for_signup: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      list_classes_for_signup: {
        Args: { _school_id: string; _stage_id?: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      set_certificate_honorific: {
        Args: { p_certificate_id: string; p_honorific: string }
        Returns: undefined
      }
      student_can_view_school: {
        Args: { _school_id: string }
        Returns: boolean
      }
      teacher_can_view_school: {
        Args: { _school_id: string }
        Returns: boolean
      }
      user_has_course_access: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student" | "parent" | "school" | "staff"
      attendance_status: "present" | "absent" | "late" | "excused"
      discount_scope: "all" | "products" | "courses"
      discount_type: "percentage" | "fixed"
      exam_type:
        | "quiz"
        | "midterm"
        | "final"
        | "assignment"
        | "project"
        | "evaluation"
      meeting_type: "google_meet" | "zoom" | "other"
      question_type:
        | "multiple_choice"
        | "true_false"
        | "fill_blank"
        | "short_answer"
        | "matching"
        | "essay"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "student", "parent", "school", "staff"],
      attendance_status: ["present", "absent", "late", "excused"],
      discount_scope: ["all", "products", "courses"],
      discount_type: ["percentage", "fixed"],
      exam_type: [
        "quiz",
        "midterm",
        "final",
        "assignment",
        "project",
        "evaluation",
      ],
      meeting_type: ["google_meet", "zoom", "other"],
      question_type: [
        "multiple_choice",
        "true_false",
        "fill_blank",
        "short_answer",
        "matching",
        "essay",
      ],
    },
  },
} as const
