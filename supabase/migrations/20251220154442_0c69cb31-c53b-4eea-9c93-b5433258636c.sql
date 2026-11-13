-- Allow users to update their own session enrollment status
CREATE POLICY "Users can update their enrollment status"
ON public.session_enrollments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);