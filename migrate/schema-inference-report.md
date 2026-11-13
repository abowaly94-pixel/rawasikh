# تقرير استنتاج الهيكل — 17 جدول

المصدر: `rawasikh-backup-2026-11-01-13-50-14.json`

## certificates — 20 صف
- `id: uuid`
- `student_id: uuid`
- `course_id: uuid`
- `certificate_number: text`
- `student_name: text`
- `course_title: text`
- `issued_at: timestamptz`
- `honorific: text`

## course_payment_plans — 66 صف
- `id: uuid`
- `student_id: uuid`
- `course_id: uuid`
- `total_amount: integer`
- `notes: text`
- `created_by: uuid`
- `created_at: timestamptz`
- `updated_at: timestamptz`
- `next_due_date: date`
- `last_reminder_sent_date: date`

## course_payments — 36 صف
- `id: uuid`
- `plan_id: uuid`
- `amount: integer`
- `paid_at: date`
- `channel: text`
- `reference: text`
- `notes: text`
- `source: text`
- `recorded_by: uuid`
- `created_at: timestamptz`

## course_review_screenshots — 0 صف
> فاضي تمامًا

## course_reviews — 3 صف
- `id: uuid`
- `course_id: uuid`
- `user_id: uuid`
- `rating: integer`
- `review: text`
- `created_at: timestamptz`
- `updated_at: timestamptz`
- `reviewer_name: text`

## course_tasks — 2 صف
- `id: uuid`
- `course_id: uuid`
- `lesson_id: uuid`
- `title: text`
- `description: text`
- `submission_type: text`
- `is_required: boolean`
- `due_date: date`
- `created_by: uuid`
- `created_at: timestamptz`
- `updated_at: timestamptz`

## course_translations — 21 صف
- `id: uuid`
- `course_id: uuid`
- `language: text`
- `title: text`
- `description: text`
- `source_updated_at: timestamptz`
- `created_at: timestamptz`
- `updated_at: timestamptz`

## form_fields — 3 صف
- `id: uuid`
- `form_id: uuid`
- `label: text`
- `field_type: text`
- `options: jsonb`
- `rating_max: integer`
- `is_required: boolean`
- `order_index: integer`
- `created_at: timestamptz`

## form_response_answers — 2 صف
- `id: uuid`
- `response_id: uuid`
- `field_id: uuid`
- `answer_text: text`
- `answer_number: integer`
- `answer_options: jsonb`
- `created_at: timestamptz`

## form_responses — 1 صف
- `id: uuid`
- `form_id: uuid`
- `user_id: uuid`
- `created_at: timestamptz`

## forms — 2 صف
- `id: uuid`
- `title: text`
- `description: text`
- `is_active: boolean`
- `created_by: text`
- `created_at: timestamptz`
- `updated_at: timestamptz`
- `course_id: uuid`

## lecture_attendance — 138 صف
- `id: uuid`
- `zoom_link_id: uuid`
- `course_id: uuid`
- `lesson_id: uuid`
- `student_id: uuid`
- `status: text`
- `joined_at: timestamptz`
- `created_at: timestamptz`

## shipping_governorates — 0 صف
> فاضي تمامًا

## site_visits — 10505 صف
- `id: uuid`
- `visitor_id: text`
- `path: text`
- `referrer: text`
- `user_agent: text`
- `created_at: timestamptz`

## staff_permissions — 11 صف
- `id: uuid`
- `user_id: uuid`
- `permission_key: text`
- `granted_by: uuid`
- `created_at: timestamptz`

## task_submissions — 2 صف
- `id: uuid`
- `task_id: uuid`
- `student_id: uuid`
- `status: text`
- `text_content: text`
- `file_url: text`
- `link_url: text`
- `video_url: text`
- `submitted_at: timestamptz`
- `created_at: timestamptz`
- `updated_at: timestamptz`

## tasks — 3 صف
- `id: uuid`
- `student_id: uuid`
- `assigned_by: uuid`
- `title: text`
- `description: text`
- `due_date: date`
- `status: text`
- `completed_at: timestamptz`
- `created_at: timestamptz`
- `updated_at: timestamptz`
