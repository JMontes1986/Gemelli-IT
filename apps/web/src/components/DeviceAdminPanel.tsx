import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  XCircle,
} from 'lucide-react';

import { auth, devices } from '../lib/api';
import InventoryPermissionManager from './InventoryPermissionManager';

interface Device {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  ubicacion: string;
  notas?: string;
  usuario_actual?: {
    nombre: string;
    email: string;
  };
}

interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  org_unit_id: string | null;
  org_unit_nombre: string | null;
}

interface FormState {
  nombre: string;
  estado: string;
  ubicacion: string;
  notas: string;
}

interface CreateFormState extends FormState {
  tipo: string;
}

const initialFormState: FormState = {
  nombre: '',
  estado: 'ACTIVO',
  ubicacion: '',
  notas: '',
};

const initialCreateState: CreateFormState = {
  nombre: '',
  tipo: 'PC',
  estado: 'ACTIVO',
  ubicacion: '',
  notas: '',
};

const DeviceAdminPanel: React.FC = () => {
  const [deviceList, setDeviceList] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [createFormData, setCreateFormData] = useState<CreateFormState>(initialCreateState);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        const userProfile = await auth.getProfile();
        setProfile(userProfile);
      } catch (error) {
        console.error('No se pudo obtener el perfil del usuario:', error);
      } finally {
        await fetchDevices();
      }
    };

    finitialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await devices.list();
      const list = response.data || [];
      setDeviceList(list);

      if (selectedDeviceId) {
        const refreshed = list.find((item) => item.id === selectedDeviceId);
        if (refreshed) {
          setFormData({
            nombre: refreshed.nombre || '',
            estado: refreshed.estado || 'ACTIVO',
            ubicacion: refreshed.ubicacion || '',
            notas: refreshed.notas || '',
          });
        }
      }
    } catch (error) {
      console.error('Error al cargar dispositivos:', error);
      setMessage({ type: 'error', text: 'No se pudieron cargar los dispositivos.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = useMemo(() => {
    return deviceList.filter((device) => {
      const matchesSearch =
        device.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.ubicacion.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstado = filterEstado ? device.estado === filterEstado : true;
      return matchesSearch && matchesEstado;
    });
  }, [deviceList, searchTerm, filterEstado]);

  const handleSelectDevice = (device: Device) => {
    setSelectedDeviceId(device.id);
    setFormData({
      nombre: device.nombre || '',
      estado: device.estado || 'ACTIVO',
      ubicacion: device.ubicacion || '',
      notas: device.notas || '',
    });
    setMessage(null);
  };

  const handleUpdateDevice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDeviceId) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        nombre: formData.nombre,
        estado: formData.estado,
        ubicacion: formData.ubicacion,
        notas: formData.notas.trim() ? formData.notas : null,
      };

      await devices.update(selectedDeviceId, payload);
      setMessage({ type: 'success', text: 'Dispositivo actualizado correctamente.' });
      await fetchDevices();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || 'No se pudo actualizar el dispositivo.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    field: keyof FormState
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleCreateChange = (
    field: keyof CreateFormState
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setCreateFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleCreateDevice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setMessage(null);

    try {
      const payload = {
        nombre: createFormData.nombre,
        tipo: createFormData.tipo,
        estado: createFormData.estado,
        ubicacion: createFormData.ubicacion,
        notas: createFormData.notas.trim() ? createFormData.notas : null,
      };

      const response = await devices.create(payload);
      setMessage({ type: 'success', text: 'Dispositivo creado correctamente.' });
      setCreateFormData(initialCreateState);
      setShowCreateForm(false);

      if (response?.data) {
        const newDeviceId = response.data.id ?? null;
        setSelectedDeviceId(newDeviceId);
        setFormData({
          nombre: response.data.nombre || '',
          estado: response.data.estado || 'ACTIVO',
          ubicacion: response.data.ubicacion || '',
          notas: response.data.notas || '',
        });
      } else {
        setSelectedDeviceId(null);
      }
      await fetchDevices();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || 'No se pudo crear el dispositivo.',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <div className="mb-4">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Administración del Inventario</h1>
        <p className="max-w-2xl text-gray-600">
          Gestiona y actualiza la información de los equipos registrados para mantener el control de los activos de TI.
        </p>
      </div>

   <div className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Panel administrativo de inventario</h2>
            <p className="text-sm text-gray-600">
              Actualiza estados, ubicaciones y notas para mantener el control de los activos TI.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => {
                setShowCreateForm((prev) => !prev);
                setMessage(null);
                setSelectedDeviceId(null);
                setFormData(initialFormState);
                setCreateFormData(initialCreateState);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                showCreateForm ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Plus className="h-4 w-4" />
              {showCreateForm ? 'Cerrar formulario' : 'Agregar dispositivo'}
            </button>
            <button
              onClick={fetchDevices}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Recargar
            </button>
          </div>
        </div>
     </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o ubicación"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="input pl-10"
              />
            </div>

            <select
              value={filterEstado}
              onChange={(event) => setFilterEstado(event.target.value)}
              className="input"
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVO">Activo</option>
              <option value="REPARACIÓN">En reparación</option>
              <option value="RETIRADO">Retirado</option>
            </select>

            <div className="overflow-hidden divide-y rounded-lg border">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600"></div>
                </div>
               ) : filteredDevices.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center text-gray-600">
                  <AlertCircle className="h-10 w-10 text-gray-400" />
                  <p>No se encontraron dispositivos con los filtros aplicados.</p>
                </div>
              ) : (
                filteredDevices.map((device) => {
                  const isSelected = device.id === selectedDeviceId;
                  return (
                    <button
                      key={device.id}
                      onClick={() => handleSelectDevice(device)}
                      className={`w-full px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isSelected
                          ? 'border-l-4 border-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{device.nombre}</p>
                          <p className="text-sm text-gray-500">{device.tipo}</p>
                          <p className="mt-1 text-sm text-gray-500">{device.ubicacion}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            device.estado === 'ACTIVO'
                              ? 'bg-green-100 text-green-700'
                              : device.estado === 'REPARACIÓN'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {device.estado}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Pencil className="h-5 w-5 text-blue-600" />
            {showCreateForm
              ? 'Registrar nuevo dispositivo'
              : selectedDeviceId
              ? 'Editar dispositivo'
              : 'Selecciona un dispositivo'}
          </h3>

          {message && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                message.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              {message.text}
            </div>
          )}

          {showCreateForm ? (
            <form onSubmit={handleCreateDevice} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  value={createFormData.nombre}
                  onChange={handleCreateChange('nombre')}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  value={createFormData.tipo}
                  onChange={handleCreateChange('tipo')}
                  className="input"
                  required
                >
                  <option value="PC">PC</option>
                  <option value="LAPTOP">Laptop</option>
                  <option value="IMPRESORA">Impresora</option>
                  <option value="RED">Equipo de red</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Estado</label>
                <select
                  value={createFormData.estado}
                  onChange={handleCreateChange('estado')}
                  className="input"
                  required
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="REPARACIÓN">En reparación</option>
                  <option value="RETIRADO">Retirado</option>
                </select>
              </div>
        
                <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Ubicación</label>
                <input
                  type="text"
                  value={createFormData.ubicacion}
                  onChange={handleCreateChange('ubicacion')}
                  className="input"
                  required
                />
              </div>

                <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Notas</label>
                <textarea
                  value={createFormData.notas}
                  onChange={handleCreateChange('notas')}
                  className="input"
                  rows={4}
                  placeholder="Observaciones, accesorios, responsables, etc."
                />
              </div>

                <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateFormData(initialCreateState);
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-75"
                >
                  {creating ? 'Guardando...' : 'Registrar dispositivo'}
                </button>
              </div>
            </form>
          ) : selectedDeviceId ? (
            <form onSubmit={handleUpdateDevice} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={handleChange('nombre')}
                  className="input"
                  required
                />
              </div>

                <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Estado</label>
                <select
                  value={formData.estado}
                  onChange={handleChange('estado')}
                  className="input"
                  required
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="REPARACIÓN">En reparación</option>
                  <option value="RETIRADO">Retirado</option>
                </select>
              </div>

                <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Ubicación</label>
                <input
                  type="text"
                  value={formData.ubicacion}
                  onChange={handleChange('ubicacion')}
                  className="input"
                  required
                />
              </div>

                <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Notas</label>
                <textarea
                  value={formData.notas}
                  onChange={handleChange('notas')}
                  className="input"
                  rows={4}
                  placeholder="Observaciones, accesorios, responsables, etc."
                />
              </div>

                <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeviceId(null);
                    setFormData(initialFormState);
                    setMessage(null);
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-75"
                >
                  {saving ? 'Guardando...' : 'Actualizar dispositivo'}
                </button>
              </div>
              </form>
          ) : (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-gray-600">
              Selecciona un dispositivo del listado para editar su información. También puedes usar el buscador y los filtros para encontrarlo rápidamente.
            </div>
          )}
        </div>
      </div>

      {profile?.rol === 'LIDER_TI' && <InventoryPermissionManager />}
    </div>
  );
};
export default DeviceAdminPanel;
