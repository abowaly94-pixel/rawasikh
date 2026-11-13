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
      throw new Error('Only admins can create school accounts')
    }

    const { email, password, schoolName, phone } = await req.json()

    if (!email || !password || !schoolName) {
      throw new Error('Missing required fields')
    }

    // Create the user with admin API (won't trigger email confirmation)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: schoolName,
        role: 'school'
      }
    })

    if (createError) {
      throw createError
    }

    if (!userData.user) {
      throw new Error('Failed to create user')
    }

    // Create school record
    const { error: schoolError } = await supabaseAdmin
      .from('schools')
      .insert({
        user_id: userData.user.id,
        name: schoolName,
        email: email,
        phone: phone || null,
      })

    if (schoolError) {
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      throw schoolError
    }

    return new Response(
      JSON.stringify({ success: true, userId: userData.user.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
