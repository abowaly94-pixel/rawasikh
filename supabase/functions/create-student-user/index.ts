import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !requestingUser) {
      throw new Error('Unauthorized')
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single()

    if (roleError || roleData?.role !== 'admin') {
      throw new Error('Only admins can create student accounts')
    }

    const {
      email,
      password,
      fullName,
      phone,
      whatsapp,
      countryCode,
      parentPhone,
      studentNumber,
      schoolId,
      stageId,
      gradeLevelId,
      classId,
      parentId,
      status = 'active'
    } = await req.json()

    if (!email || !password || !fullName) {
      throw new Error('Missing required fields: email, password, fullName')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('البريد الإلكتروني غير صالح')
    }

    // Check if user with this email already exists in auth
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      console.error('Error checking existing users:', listError)
      throw new Error('فشل في التحقق من وجود المستخدم')
    }

    const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (existingUser) {
      // Check if this user already has a student record
      const { data: existingStudent } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('user_id', existingUser.id)
        .maybeSingle()

      if (existingStudent) {
        throw new Error('يوجد طالب مسجل بهذا البريد الإلكتروني بالفعل')
      } else {
        throw new Error('يوجد مستخدم بهذا البريد الإلكتروني بالفعل. يمكنك إسناده كطالب من صفحة المستخدمين')
      }
    }

    console.log('Creating student user:', { email, fullName, schoolId, stageId, gradeLevelId, classId })

    // Create the user with admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'student',
        skip_student_creation: true // Prevent trigger from creating duplicate student record
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      throw createError
    }

    if (!userData.user) {
      throw new Error('Failed to create user')
    }

    console.log('User created successfully:', userData.user.id)

    // Update profile with phone / whatsapp / country code
    if (phone || whatsapp || countryCode) {
      const profileUpdate: Record<string, string> = {}
      if (phone) profileUpdate.phone = phone
      if (whatsapp) profileUpdate.whatsapp = whatsapp
      if (countryCode) profileUpdate.country_code = countryCode

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userData.user.id)

      if (profileError) {
        console.error('Error updating profile contact info:', profileError)
      }
    }

    // Create student record
    const { error: studentError } = await supabaseAdmin
      .from('students')
      .insert({
        user_id: userData.user.id,
        student_number: studentNumber || null,
        school_id: schoolId || null,
        stage_id: stageId || null,
        grade_level_id: gradeLevelId || null,
        class_id: classId || null,
        parent_id: parentId || null,
        status: status,
      })

    if (studentError) {
      console.error('Error creating student record:', studentError)
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      throw studentError
    }

    console.log('Student record created successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userData.user.id,
        message: 'Student created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Error in create-student-user:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
