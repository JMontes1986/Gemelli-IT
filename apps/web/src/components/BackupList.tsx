// src/components/BackupList.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Cloud, HardDrive, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { backups } from '../lib/api';

type BackupRecord = {
  id: string;
  device_id: string;
  tipo: 'INCREMENTAL' | 'COMPLETA' | 'DIFERENCIAL';
  almacenamiento: 'NUBE' | 'LOCAL' | 'HIBRIDO';
  frecuencia: string;
  fecha_backup: string;
  evidencia_url?: string | null;
  notas?: string | null;
  device?: {
    nombre?: string | null;
    tipo?: string | null;
  } | null;
};

const storageLabels: Record<BackupRecord['almacenamiento'], string> = {
  NUBE: 'Nube',
  LOCAL: 'Local',
  HIBRIDO: 'Híbrido',
};

const backupLabels: Record<BackupRecord['tipo'], string> = {
  INCREMENTAL: 'Incremental',
  COMPLETA: 'Completa',
  DIFERENCIAL: 'Diferencial',
};

const storageIcons: Record<BackupRecord['almacenamiento'], React.ReactNode> = {
  NUBE: <Cloud className="h-4 w-4 text-blue-500" />,
  LOCAL: <HardDrive className="h-4 w-4 text-emerald-500" />,
  HIBRIDO: <RefreshCw className="h-4 w-4 text-purple-500" />,
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const BackupList: React.FC = () => {
  const [items, setItems] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBackups = async () => {
      try {
        const response = await backups.list();
        setItems(response.data || []);
      } catch (error) {
        console.error('Error al cargar backups:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBackups();
  }, []);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.fecha_backup.localeCompare(a.fecha_backup)),
    [items]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (sortedItems.length === 0) {
    return (
      <div className="card text-center py-12">
        <Cloud className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aún no hay backups</h3>
        <p className="text-gray-600">Los respaldos registrados aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedItems.map((backup) => (
        <div key={backup.id} className="card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                  {storageIcons[backup.almacenamiento]}
                  {storageLabels[backup.almacenamiento]}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                  {backupLabels[backup.tipo]}
                </span>
                <span className="inline-flex items-center gap-2 text-gray-500">
                  <Calendar className="h-4 w-4" />
                  {formatDate(backup.fecha_backup)}
                </span>
              </div>

              <div className="mt-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {backup.device?.nombre ?? 'Dispositivo sin nombre'}
                </h3>
                <p className="text-sm text-gray-600">
                  {backup.device?.tipo ?? 'Tipo desconocido'} • Frecuencia: {backup.frecuencia}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-sm text-gray-600">
              {backup.notas && (
                <p className="max-w-xs text-gray-600">{backup.notas}</p>
              )}
              {backup.evidencia_url && (
                <a
                  href={backup.evidencia_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <LinkIcon className="h-4 w-4" />
                  Ver evidencia
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BackupList;
