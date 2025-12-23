import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { auth } from '@/lib/api';

interface RegisterFormData {
  nombre: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  org_unit_id: number;
  is_active: boolean;
}

export default function RegisterDialog() {
  const [formData, setFormData] = useState<RegisterFormData>({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'DOCENTE',
    org_unit_id: 1,
    is_active: true,
  });

  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validar contraseñas coinciden
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);

    try {
      await auth.register({
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password,
        rol: formData.role,
        org_unit_id: formData.org_unit_id,
        activo: formData.is_active,
      });

      setSuccess('Usuario creado exitosamente');
      
      // Limpiar formulario
      setFormData({
        nombre: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'DOCENTE',
        org_unit_id: 1,
        is_active: true,
      });

      // Cerrar dialog después de 2 segundos
      setTimeout(() => {
        setIsOpen(false);
        setSuccess('');
        // Recargar lista de usuarios o hacer lo que necesites
        window.location.reload();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof RegisterFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Limpiar error al escribir
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Crear Usuario</Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        {/* 🔧 FIX: Agregar DialogTitle para accesibilidad */}
        <DialogHeader>
          <DialogTitle>Crear Cuenta</DialogTitle>
          <DialogDescription>
            Completa el formulario para crear un nuevo usuario en el sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mensajes de error/éxito */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Nombre Completo */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre Completo</Label>
            <Input
              id="nombre"
              type="text"
              placeholder="Julián Andrés Montes Ramirez"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {/* Correo Electrónico */}
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="sistemas@colgemelli.edu.co"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {/* Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••••••"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo 8 caracteres
            </p>
          </div>

          {/* Confirmar Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••••••"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>

          {/* Rol */}
          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleChange('role', value)}
              disabled={isLoading}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LIDER_TI">Líder TI</SelectItem>
                <SelectItem value="TI">Técnico TI</SelectItem>
                <SelectItem value="DIRECTOR">Director</SelectItem>
                <SelectItem value="ADMINISTRATIVO">Administrativo</SelectItem>
                <SelectItem value="DOCENTE">Docente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Unidad Organizacional */}
          <div className="space-y-2">
            <Label htmlFor="org_unit">Unidad Organizacional</Label>
            <Select
              value={formData.org_unit_id.toString()}
              onValueChange={(value) => handleChange('org_unit_id', parseInt(value))}
              disabled={isLoading}
            >
              <SelectTrigger id="org_unit">
                <SelectValue placeholder="Seleccionar unidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Administración</SelectItem>
                <SelectItem value="2">Colegio</SelectItem>
                <SelectItem value="3">Sistemas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Usuario activo */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleChange('is_active', e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Usuario activo
            </Label>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// ALTERNATIVA: Si quieres ocultar el título visualmente
// ============================================

/*
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

<DialogHeader>
  <VisuallyHidden>
    <DialogTitle>Crear Cuenta</DialogTitle>
  </VisuallyHidden>
  <DialogDescription>
    Completa el formulario para crear un nuevo usuario
  </DialogDescription>
</DialogHeader>
*/
