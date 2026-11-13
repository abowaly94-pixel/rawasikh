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
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !requestingUser) throw new Error('Unauthorized')

    // Check if requesting user is a school
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single()

    if (roleData?.role !== 'school') throw new Error('Only school accounts can create teachers')

    // Get the school
    const { data: school } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('user_id', requestingUser.id)
      .single()

    if (!school) throw new Error('School not found')

    const { email, password, fullName, phone } = await req.json()
    if (!email || !password || !fullName) throw new Error('Missing required fields')

    // Create the user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: 'teacher', phone }
    })

    if (createError) throw createError
    if (!userData.user) throw new Error('Failed to create user')

    // Link teacher to school
    const { error: linkError } = await supabaseAdmin
      .from('school_teachers')
      .insert({ school_id: school.id, teacher_id: userData.user.id })

    if (linkError) {
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      throw linkError
    }

    return new Response(
      JSON.stringify({ success: true, userId: userData.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
