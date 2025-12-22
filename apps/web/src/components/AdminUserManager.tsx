import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  RefreshCcw,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';

import { admin } from '../lib/api';

interface AdminUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo?: boolean;
  org_unit_id?: string | null;
  org_unit_nombre?: string | null;
}

interface OrgUnit {
  id: string;
  nombre: string;
}

interface MessageState {
  type: 'success' | 'error';
  text: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
};

const CREATE_USER_ERROR_MESSAGES = {
  authCreate: 'El usuario no fue creado en Auth',
  authMissingUuid: 'Falta UUID del usuario creado en Auth',
  profileInsert: 'El perfil no fue creado en public.users',
} as const;

const mapCreateUserErrorMessage = (errorMessage: string) => {
  switch (errorMessage) {
    case CREATE_USER_ERROR_MESSAGES.authCreate:
      return 'El usuario no fue creado en Auth.';
    case CREATE_USER_ERROR_MESSAGES.authMissingUuid:
      return 'Falta UUID del usuario creado en Auth.';
    case CREATE_USER_ERROR_MESSAGES.profileInsert:
      return 'No se pudo crear el perfil en public.users.';
    default:
      return errorMessage;
  }
};

const ROLE_OPTIONS = [
  { value: 'DOCENTE', label: 'Docente' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo' },
  { value: 'TI', label: 'Equipo TI' },
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'LIDER_TI', label: 'Líder TI' },
];

const INITIAL_FORM_STATE = {
  nombre: '',
  email: '',
  password: '',
  rol: 'DOCENTE',
  orgUnitId: '',
  activo: true,
};

const AdminUserManager: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [orgUnitsLoading, setOrgUnitsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [creating, setCreating] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<MessageState | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const runIfMounted = useCallback((fn: () => void) => {
    if (isMountedRef.current) {
      fn();
    }
  }, []);

  const loadUsers = async (showSpinner = false) => {
    if (showSpinner) {
      runIfMounted(() => setLoading(true));
    }

    try {
      const response = await admin.listUsers();
      runIfMounted(() => setUsers(response?.data ?? []));
    } catch (error: any) {
      runIfMounted(() =>
        setMessage({
          type: 'error',
          text: getErrorMessage(error, 'No se pudieron cargar los usuarios.'),
        })
      );
    } finally {
      runIfMounted(() => setLoading(false));
    }
  };

  const loadOrgUnits = async () => {
    runIfMounted(() => setOrgUnitsLoading(true));
    try {
      const response = await admin.listOrgUnits();
      runIfMounted(() => setOrgUnits(response?.data ?? []));
    } catch (error: any) {
      runIfMounted(() =>
        setMessage({
          type: 'error',
          text: getErrorMessage(error, 'No se pudieron cargar las unidades organizacionales.'),
        })
      );
    } finally {
      runIfMounted(() => setOrgUnitsLoading(false));
    }
  };

  useEffect(() => {
    loadUsers(true);
    loadOrgUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => runIfMounted(() => setMessage(null)), 5000);
    return () => window.clearTimeout(timeout);
  }, [message, runIfMounted]);

  const orderedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [users]);

  const handleFormChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runIfMounted(() => setMessage(null));

    if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) {
      runIfMounted(() => setMessage({ type: 'error', text: 'Completa todos los campos obligatorios.' }));
      return;
    }

    runIfMounted(() => setCreating(true));

    try {
      await admin.createUser({
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        password: form.password,
        rol: form.rol,
        org_unit_id: form.orgUnitId ? form.orgUnitId : null,
        activo: form.activo,
      });

      runIfMounted(() => {
        setMessage({ type: 'success', text: 'Usuario creado correctamente.' });
        setForm(INITIAL_FORM_STATE);
      });
      await loadUsers();
    } catch (error: any) {
      const baseMessage = getErrorMessage(error, 'No se pudo crear el usuario.');
      const mappedMessage = mapCreateUserErrorMessage(baseMessage);
      runIfMounted(() =>
        setMessage({
          type: 'error',
          text: mappedMessage,
        })
      );
    } finally {
      runIfMounted(() => setCreating(false));
    }
  };

  const handleRoleChange = async (userId: string, currentRole: string, newRole: string) => {
    if (newRole === currentRole) {
      return;
    }

    runIfMounted(() => {
      setUpdatingUserId(userId);
      setMessage(null);
    });

    try {
      await admin.updateUser(userId, { rol: newRole });
      runIfMounted(() => setMessage({ type: 'success', text: 'Rol actualizado correctamente.' }));
      await loadUsers();
    } catch (error: any) {
      runIfMounted(() =>
        setMessage({
          type: 'error',
          text: getErrorMessage(error, 'No se pudo actualizar el rol del usuario.'),
        })
      );
    } finally {
      runIfMounted(() => setUpdatingUserId(null));
    }
  };

  const handleOrgUnitChange = async (userId: string, currentOrgUnit: string | null | undefined, newOrgUnit: string) => {
    const normalizedCurrent = currentOrgUnit ?? '';
    if (normalizedCurrent === newOrgUnit) {
      return;
    }

    runIfMounted(() => {
      setUpdatingUserId(userId);
      setMessage(null);
    });

    try {
      await admin.updateUser(userId, { org_unit_id: newOrgUnit || null });
      runIfMounted(() => setMessage({ type: 'success', text: 'Unidad organizacional actualizada.' }));
      await loadUsers();
    } catch (error: any) {
      runIfMounted(() =>
        setMessage({
          type: 'error',
          text: getErrorMessage(error, 'No se pudo actualizar la unidad organizacional.'),
        })
      );
    } finally {
      runIfMounted(() => setUpdatingUserId(null));
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    runIfMounted(() => {
      setUpdatingUserId(user.id);
      setMessage(null);
    });

    try {
      await admin.updateUser(user.id, { activo: !user.activo });
      runIfMounted(() => setMessage({ type: 'success', text: 'Estado del usuario actualizado.' }));
      await loadUsers();
    } catch (error: any) {
      runIfMounted(() =>
        setMessage({
          type: 'error',
          text: getErrorMessage(error, 'No se pudo actualizar el estado del usuario.'),
        })
      );
    } finally {
      runIfMounted(() => setUpdatingUserId(null));
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    const newPassword =
      typeof window !== 'undefined'
        ? window.prompt(
            `Ingresa una nueva contraseña temporal para ${userName}. Debe tener al menos 8 caracteres.`
          )
        : null;

    if (!newPassword) {
      return;
    }

    if (newPassword.trim().length < 8) {
      runIfMounted(() => setMessage({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres.' }));
      return;
    }

    runIfMounted(() => {
      setUpdatingUserId(userId);
      setMessage(null);
    });

    try {
      await admin.updateUser(userId, { password: newPassword.trim() });
      runIfMounted(() => setMessage({ type: 'success', text: 'Contraseña restablecida correctamente.' }));
    } catch (error: any) {
      runIfMounted(() =>
        setMessage({
          type: 'error',
          text: getErrorMessage(error, 'No se pudo restablecer la contraseña.'),
        })
      );
    } finally {
      runIfMounted(() => setUpdatingUserId(null));
    }
  };

  return (
    <section id="usuarios" className="card">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <Users className="h-6 w-6 text-blue-600" />
            Gestión de usuarios
          </h2>
          <p className="text-sm text-gray-600">
            Crea cuentas para el personal del colegio y administra sus roles y permisos de acceso.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadUsers(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
        >
          <RefreshCcw className="h-4 w-4" />
          Actualizar lista
        </button>
      </div>

      {message && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="mt-6">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <UserPlus className="h-5 w-5 text-blue-600" />
          Crear nuevo usuario
        </h3>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Nombre completo *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(event) => handleFormChange('nombre', event.target.value)}
              className="input"
              placeholder="Nombre y apellidos"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Correo institucional *</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => handleFormChange('email', event.target.value)}
              className="input"
              placeholder="usuario@colegiogemelli.edu"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Contraseña temporal *</label>
            <input
              type="password"
              value={form.password}
              onChange={(event) => handleFormChange('password', event.target.value)}
              className="input"
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Rol *</label>
            <select
              value={form.rol}
              onChange={(event) => handleFormChange('rol', event.target.value)}
              className="input"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Unidad organizacional</label>
            <select
              value={form.orgUnitId}
              onChange={(event) => handleFormChange('orgUnitId', event.target.value)}
              className="input"
              disabled={orgUnitsLoading}
            >
              <option value="">Sin unidad asignada</option>
              {orgUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <input
              id="form-activo"
              type="checkbox"
              checked={form.activo}
              onChange={(event) => handleFormChange('activo', event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="form-activo" className="text-sm text-gray-700">
              Usuario activo desde el inicio
            </label>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="btn-primary inline-flex items-center gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              {creating ? 'Creando usuario...' : 'Registrar usuario'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-10">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Usuarios registrados</h3>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        ) : orderedUsers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-600">
            No hay usuarios registrados todavía. Usa el formulario para crear el primero.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Unidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {orderedUsers.map((user) => (
                  <tr key={user.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-900">{user.nombre}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={user.rol}
                        onChange={(event) =>
                          handleRoleChange(user.id, user.rol, event.target.value)
                        }
                        className="input"
                        disabled={updatingUserId === user.id}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={user.org_unit_id ?? ''}
                        onChange={(event) =>
                          handleOrgUnitChange(user.id, user.org_unit_id, event.target.value)
                        }
                        className="input"
                        disabled={updatingUserId === user.id || orgUnitsLoading}
                      >
                        <option value="">Sin unidad asignada</option>
                        {orgUnits.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            user.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {user.activo ? 'Activo' : 'Inactivo'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(user)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                          disabled={updatingUserId === user.id}
                        >
                          {user.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleResetPassword(user.id, user.nombre)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
                          disabled={updatingUserId === user.id}
                        >
                          Restablecer contraseña
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminUserManager;
