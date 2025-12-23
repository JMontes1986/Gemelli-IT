// src/components/LoginForm.tsx
import React, { useEffect, useState } from 'react';
import { Activity, Mail, Lock, AlertCircle, User, Building, Shield } from 'lucide-react';
import { auth } from '../lib/api';
import { tryGetSupabaseClient } from '../lib/supabase';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'DOCENTE' | 'ADMINISTRATIVO' | 'TI' | 'DIRECTOR' | 'LIDER_TI'>('DOCENTE');
  const [orgUnitId, setOrgUnitId] = useState('');
  const [orgUnits, setOrgUnits] = useState<Array<{ id: string; nombre: string }>>([]);
  const [orgUnitsLoading, setOrgUnitsLoading] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [supabase, setSupabase] = useState<ReturnType<typeof tryGetSupabaseClient>>();

  const isLogin = mode === 'login';

  useEffect(() => {
    const client = tryGetSupabaseClient();

    if (!client) {
      setError('Supabase no está configurado. Verifica las variables PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }

    setSupabase(client);
  }, []);

  useEffect(() => {
    try {
      const profileError = localStorage.getItem('auth_profile_error');
      if (profileError) {
        setError(profileError);
        localStorage.removeItem('auth_profile_error');
      }
    } catch (storageError) {
      console.error('No se pudo leer el error de perfil:', storageError);
    }
  }, []);
  
  useEffect(() => {
    if (!supabase) {
      return;
    }
    
    const fetchOrgUnits = async () => {
      setOrgUnitsLoading(true);
      const { data, error } = await supabase
        .from('org_units')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) {
        setError('No se pudieron cargar las unidades organizacionales.');
      } else if (data) {
        setOrgUnits(data);
      }

      setOrgUnitsLoading(false);
    };

    fetchOrgUnits();
  }, [supabase]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase no está configurado.');
      }
      
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          localStorage.setItem('access_token', data.session.access_token);
          window.location.href = '/dashboard';
        }
      } else {
        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }

        await auth.register({
          nombre: fullName,
          email,
          password,
          rol: role,
          org_unit_id: orgUnitId || null,
          activo: isActive,
        });

       setSuccess(
          'Cuenta creada correctamente. Un administrador debe habilitar tu acceso para iniciar sesión.'
        );
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
        setRole('DOCENTE');
        setOrgUnitId('');
        setIsActive(true);
      }
    } catch (err: any) {
      setError(err.message || (isLogin ? 'Error al iniciar sesión' : 'Error al crear la cuenta'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo y Título */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4">
          <Activity className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gemelli IT</h1>
        <p className="text-gray-600">Inventario & HelpDesk</p>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <button
            type="button"
            onClick={() => {
              setMode(isLogin ? 'register' : 'login');
              setError('');
              setSuccess('');
              setPassword('');
              setConfirmPassword('');
              setFullName('');
              setRole('DOCENTE');
              setOrgUnitId('');
              setIsActive(true);
            }}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {isLogin ? 'Registrarme' : 'Ya tengo una cuenta'}
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input pl-10"
                  placeholder="Nombre y apellido"
                  required
                />
              </div>
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-10"
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Repite tu contraseña"
                  required
                />
              </div>
            </div>
          )}

          {!isLogin && (
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Rol
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as typeof role)}
                  className="input pl-10"
                  required
                >
                  <option value="DOCENTE">Docente</option>
                  <option value="ADMINISTRATIVO">Administrativo</option>
                  <option value="TI">Equipo de TI</option>
                  <option value="DIRECTOR">Director</option>
                  <option value="LIDER_TI">Líder TI</option>
                </select>
              </div>
            </div>
          )}

          {!isLogin && (
            <div>
              <label htmlFor="orgUnit" className="block text-sm font-medium text-gray-700 mb-2">
                Unidad Organizacional
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="orgUnit"
                  value={orgUnitId}
                  onChange={(e) => setOrgUnitId(e.target.value)}
                  className="input pl-10"
                  disabled={orgUnitsLoading || orgUnits.length === 0}
                >
                  <option value="">Selecciona una unidad (opcional)</option>
                  {orgUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.nombre}
                    </option>
                  ))}
                </select>
              </div>
              {orgUnitsLoading && (
                <p className="mt-1 text-xs text-gray-500">Cargando unidades...</p>
              )}
              {!orgUnitsLoading && orgUnits.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  No hay unidades organizacionales disponibles en este momento.
                </p>
              )}
            </div>
          )}

          {!isLogin && (
            <div className="flex items-center gap-3">
              <label htmlFor="active" className="block text-sm font-medium text-gray-700">
                Usuario activo
              </label>
              <input
                id="active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading
              ? isLogin
                ? 'Iniciando sesión...'
                : 'Creando cuenta...'
              : isLogin
              ? 'Iniciar Sesión'
              : 'Crear Cuenta'}
          </button>
        </form>

        {isLogin && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs font-medium text-blue-900 mb-2">Usuario de Prueba:</p>
            <p className="text-xs text-blue-700">Email: admin@gemelli.edu.co</p>
            <p className="text-xs text-blue-700">Password: Admin123!</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-gray-600 mt-6">
        Sistema protegido con Hash Chain 🔒
      </p>
    </div>
  );
};

export default LoginForm;
