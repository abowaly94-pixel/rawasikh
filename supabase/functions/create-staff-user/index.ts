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

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError || !roleData) {
      throw new Error('Only admins can create staff accounts')
    }

    const { email, password, fullName, permissions } = await req.json()

    if (!email || !password || !fullName) {
      throw new Error('Missing required fields: email, password, fullName')
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('البريد الإلكتروني غير صالح')
    }

    if (password.length < 6) {
      throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    }

    const permissionKeys: string[] = Array.isArray(permissions) ? permissions.filter((p) => typeof p === 'string' && p.length > 0) : []

    // Check if user with this email already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      console.error('Error checking existing users:', listError)
      throw new Error('فشل في التحقق من وجود المستخدم')
    }

    const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (existingUser) {
      throw new Error('يوجد مستخدم بهذا البريد الإلكتروني بالفعل')
    }

    console.log('Creating staff user:', { email, fullName, permissionKeys })

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'staff',
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      throw createError
    }

    if (!userData.user) {
      throw new Error('Failed to create user')
    }

    console.log('Staff user created successfully:', userData.user.id)

    if (permissionKeys.length > 0) {
      const rows = permissionKeys.map((key) => ({
        user_id: userData.user!.id,
        permission_key: key,
        granted_by: requestingUser.id,
      }))
      const { error: permError } = await supabaseAdmin.from('staff_permissions').insert(rows)
      if (permError) {
        console.error('Error inserting staff permissions:', permError)
        // Rollback: delete the created user so we don't leave a staff account with no permissions
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
        throw permError
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: userData.user.id,
        message: 'Staff account created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Error in create-staff-user:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
