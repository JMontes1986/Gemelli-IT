import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase con Service Role Key para operaciones admin
const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

export const POST: APIRoute = async ({ request }) => {
  try {
    // Obtener datos del body
    const body = await request.json();
    const { email, password, nombre, role, org_unit_id, is_active } = body;

    // Validar datos requeridos
    if (!email || !password || !nombre || !role) {
      return new Response(
        JSON.stringify({ 
          error: 'Datos incompletos. Email, contraseña, nombre y rol son requeridos.' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Formato de email inválido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar contraseña (mínimo 8 caracteres)
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar rol
    const rolesValidos = ['DOCENTE', 'ADMINISTRATIVO', 'TI', 'DIRECTOR', 'LIDER_TI'];
    if (!rolesValidos.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Rol inválido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar si el email ya existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'El email ya está registrado' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // OPCIÓN 1: Usar Supabase Auth (RECOMENDADO)
    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        nombre,
        role,
        org_unit_id: org_unit_id || 1,
        is_active: is_active !== false
      }
    });

    if (authError) {
      console.error('Error en Supabase Auth:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // El trigger handle_new_user() automáticamente insertará en public.users
    // Si no tienes el trigger, descomenta esto:
    /*
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        nombre,
        role,
        org_unit_id: org_unit_id || 1,
        is_active: is_active !== false
      });

    if (insertError) {
      console.error('Error al insertar en users:', insertError);
      // Intentar eliminar usuario de auth si falla la inserción
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return new Response(
        JSON.stringify({ error: 'Error al crear usuario en la base de datos' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    */

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        message: 'Usuario creado exitosamente',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          nombre,
          role,
          org_unit_id: org_unit_id || 1
        }
      }),
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error en registro:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// OPCIÓN 2: Sin usar Supabase Auth (solo si agregaste columna password)
/*
import bcrypt from 'bcryptjs';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, password, nombre, role, org_unit_id, is_active } = body;

    // Validaciones...
    
    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insertar directamente en users
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        nombre,
        role,
        org_unit_id: org_unit_id || 1,
        is_active: is_active !== false
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return new Response(
          JSON.stringify({ error: 'El email ya está registrado' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    // Respuesta sin incluir password
    const { password: _, ...userWithoutPassword } = data;
    
    return new Response(
      JSON.stringify({
        message: 'Usuario creado exitosamente',
        user: userWithoutPassword
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Error al crear usuario' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
*/
