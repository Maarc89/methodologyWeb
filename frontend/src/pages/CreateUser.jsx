import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { fetchWithAuth } from '../utils/api';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';

const CreateUser = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [serverDetail, setServerDetail] = useState(null);

  useEffect(() => {
    // Comprobar que el usuario actual es admin
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/users/me/`);
        if (!res.ok) {
          alert('No autorizado');
          navigate('/');
          return;
        }
        const data = await res.json();
        const isAdmin = data.is_admin || data.is_staff;
        if (!isAdmin) {
          alert('Acceso denegado: sólo administradores');
          navigate('/');
        }
      } catch (e) {
        console.error(e);
        alert('Error comprobando permisos');
        navigate('/');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username || !email || !password) {
      setError('Usuario, correo electrónico y contraseña son obligatorios');
      return;
    }

    // validación simple de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Formato de correo electrónico inválido');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/keycloak/create-user/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, enabled, first_name: firstName, last_name: lastName, roles }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        // si existen errores de asignación de roles, mostrar aviso y detalle
        if (data.role_assignment_errors && Array.isArray(data.role_assignment_errors) && data.role_assignment_errors.length) {
          setSuccess('Usuario creado correctamente, pero hubo problemas asignando roles (ver detalle).');
          setServerDetail(data);
        } else {
          setSuccess('Usuario creado correctamente');
          setServerDetail(null);
        }
        setUsername('');
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setRoles([]);
      } else {
        // mostrar mensaje útil
        let msg = data.detail || 'Error creando usuario';
        if (data.error) {
          try {
            msg += `: ${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}`;
          } catch (err) {
            msg += `: ${String(data.error)}`;
          }
        }
        if (data.admin_token_lacks_roles) {
          msg += ' (el token admin no tiene roles de administración)';
        }
        // guardar detalle server para mostrar opcionalmente
        setServerDetail(data);
        setError(msg);
      }
    } catch (e) {
      setError('Error de conexión con el servidor');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-main">
      <div className="mb-2">
        <h1 className="text-3xl font-bold">Crear usuario en Keycloak</h1>
        <p className="text-sm text-gray-600">Rellena los campos para crear un usuario en el realm configurado.</p>
        <p className="text-sm text-red-600 mt-2">Campos obligatorios: <span className="font-semibold">Usuario, Correo electrónico y Contraseña</span> (marcados con *)</p>
      </div>

      <Card className="p-6 max-w-xl">
        {error && <div className="mb-4 text-red-600">{error}</div>}
        {success && <div className="mb-4 text-green-600">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="label">Nombre</label>
            <input aria-label="Nombre" className="input w-full" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nombre (opcional)" />
          </div>

          <div>
            <label className="label">Apellido</label>
            <input aria-label="Apellido" className="input w-full" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Apellido (opcional)" />
          </div>

          <div>
            <label className="label">Usuario <span className="text-red-600">*</span></label>
            <input required aria-required="true" aria-label="Usuario" className="input w-full" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nombre de usuario único" />
            {!username && <p className="text-xs text-red-600 mt-1">Obligatorio</p>}
          </div>

          <div>
            <label className="label">Correo electrónico <span className="text-red-600">*</span></label>
            <input required aria-required="true" aria-label="Correo electrónico" type="email" className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@dominio.ext" />
            {!email && <p className="text-xs text-red-600 mt-1">Obligatorio</p>}
          </div>

          <div>
            <label className="label">Contraseña <span className="text-red-600">*</span></label>
            <input required aria-required="true" aria-label="Contraseña" type="password" className="input w-full" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña segura" />
            {!password && <p className="text-xs text-red-600 mt-1">Obligatorio</p>}
          </div>

          <div className="flex items-center gap-3">
            <label className="label">Enabled</label>
            <input aria-label="Enabled" type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span title="Si está activado, el usuario podrá iniciar sesión inmediatamente. Si está desactivado, el usuario quedará bloqueado hasta activarlo." className="text-gray-500 ml-2 cursor-help">ⓘ</span>
          </div>

          <div>
            <label className="label">Roles</label>
            <div className="flex gap-3 items-center">
              {['admin','editor','base_user'].map(r => (
                <label key={r} className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={roles.includes(r)} onChange={(e)=>{
                    if(e.target.checked) setRoles(prev=>[...prev, r]); else setRoles(prev=>prev.filter(x=>x!==r));
                  }} />
                  <span className="capitalize">{r.replace('_',' ')}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-1">Selecciona los roles que quieres asignar al usuario.</p>
          </div>

          <div className="pt-3">
            <Button variant="brand" type="submit" disabled={loading || !username || !email || !password}>
              {loading ? 'Creando...' : 'Crear usuario'}
            </Button>
          </div>
        </form>

        {serverDetail && (
          <div className="card p-4 mt-4">
            <h3 className="font-bold mb-2">Detalle devuelto por Keycloak / backend</h3>
            {/* Mostrar role_assignment_errors de forma legible si existen */}
            {serverDetail.role_assignment_errors && Array.isArray(serverDetail.role_assignment_errors) && (
              <div className="mb-3">
                <h4 className="font-semibold">Problemas al asignar roles:</h4>
                <ul className="list-disc pl-5 text-sm text-gray-700">
                  {serverDetail.role_assignment_errors.map((errObj, idx) => (
                    <li key={idx}>
                      {Object.entries(errObj).map(([k, v]) => (
                        <div key={k} className="mb-1">
                          <strong>{k}:</strong> {typeof v === 'string' ? v : JSON.stringify(v)}
                        </div>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <h4 className="font-semibold mt-2">Respuesta completa:</h4>
            <pre className="text-sm overflow-x-auto">{JSON.stringify(serverDetail, null, 2)}</pre>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CreateUser;
