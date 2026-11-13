DELETE FROM blog_posts
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY title ORDER BY created_at ASC, id ASC) AS rn
    FROM blog_posts
  ) t
  WHERE t.rn > 1
);