import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { fetchWithAuth } from '../utils/api';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';

const ManageUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [roles, setRoles] = useState([]);
  const [editingRolesFor, setEditingRolesFor] = useState(null); // user id
  const [selectedRoles, setSelectedRoles] = useState([]);

  // New states: pagination & search
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [hasNextPage, setHasNextPage] = useState(false);
  const [rolesByUser, setRolesByUser] = useState({}); // { userId: ['admin','editor'] }
  const searchTimeout = useRef(null);

  useEffect(() => {
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
          return;
        }
        await loadRoles();
        await loadUsers();
      } catch (e) {
        console.error(e);
        alert('Error comprobando permisos');
        navigate('/');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // reload users when page, pageSize or search changes
    // debounce search a 400ms
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1); // reset page on search
      loadUsers();
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  useEffect(() => {
    // when page or pageSize or search changes, load users
    (async () => {
      try {
        await loadUsers();
      } catch (e) {
        console.error(e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const loadRoles = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/keycloak/roles/`);
      if (!res.ok) return setRoles([]);
      const data = await res.json();
      setRoles(Array.isArray(data.roles) ? data.roles : []);
    } catch (e) {
      console.error('Error cargando roles', e);
      setRoles([]);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      const first = (page - 1) * pageSize;
      params.append('first', String(first));
      params.append('max', String(pageSize));
      if (search && search.trim().length > 0) {
        const q = search.trim();
        if (q.includes('@')) params.append('email', q);
        else params.append('username', q);
      }

      const url = `${API_BASE}/keycloak/users/?${params.toString()}`;
      const res = await fetchWithAuth(url);
      if (!res.ok) {
        console.error('Error cargando usuarios', res.status);
        setUsers([]);
        setHasNextPage(false);
        return;
      }
      const data = await res.json();
      // Keycloak returns array; some proxies return { results, count }
      const list = Array.isArray(data) ? data : (data.results || []);
      setUsers(list);
      // enable next page if we got a full page of results
      setHasNextPage(list.length >= pageSize);

      // fetch roles for these users (concurrency control)
      const visibleIds = list.map(u => u.id).filter(Boolean);
      if (visibleIds.length) await fetchRolesForUsers(visibleIds);

    } catch (e) {
      console.error('Error cargando usuarios', e);
      setUsers([]);
      setHasNextPage(false);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRolesForUsers = async (userIds) => {
    // Fetch roles for visible user ids and store in rolesByUser
    const map = {};
    await Promise.all(userIds.map(async (uid) => {
      try {
        const r = await fetchWithAuth(`${API_BASE}/keycloak/users/${uid}/roles/`);
        if (r.ok) {
          const d = await r.json();
          const merged = (d.realm_roles || []).concat(Object.values(d.client_roles || {}).flat());
          map[uid] = Array.from(new Set(merged));
        } else {
          map[uid] = [];
        }
      } catch (e) {
        map[uid] = [];
      }
    }));
    setRolesByUser(prev => ({ ...prev, ...map }));
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('¿Seguro que quieres eliminar este usuario en Keycloak?')) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/keycloak/users/${userId}/`, { method: 'DELETE' });
      if (res.ok) {
        await loadUsers();
      } else {
        const body = await res.json().catch(() => ({}));
        alert(`Error eliminando usuario: ${body.detail || res.status}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error eliminando usuario');
    }
  };

  const handleToggleEnabled = async (user) => {
    const userId = user.id;
    const newEnabled = !user.enabled;
    try {
      const res = await fetchWithAuth(`${API_BASE}/keycloak/users/${userId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled })
      });
      if (res.ok) {
        await loadUsers();
      } else {
        const body = await res.json().catch(() => ({}));
        alert(`Error actualizando usuario: ${body.detail || res.status}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error actualizando usuario');
    }
  };

  const startEditRoles = (user) => {
    setEditingRolesFor(user.id);
    // obtener roles actuales del usuario
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/keycloak/users/${user.id}/roles/`);
        if (!res.ok) {
          setSelectedRoles([]);
          return;
        }
        const data = await res.json();
        const cur = (data.realm_roles || []).concat(Object.values(data.client_roles || {}).flat());
        setSelectedRoles(cur);
      } catch (e) {
        console.error(e);
        setSelectedRoles([]);
      }
    })();
  };

  const saveRoles = async (userId) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/keycloak/users/${userId}/assign-roles/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: selectedRoles }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(`Error asignando roles: ${body.detail || res.status}`);
      } else {
        setEditingRolesFor(null);
        await loadUsers();
      }
    } catch (e) {
      console.error(e);
      alert('Error asignando roles');
    }
  };

  const cancelEditRoles = () => {
    setEditingRolesFor(null);
    setSelectedRoles([]);
  };

  return (
    <div className="container-main">
      <Card className="p-6 max-w-4xl">
        <h2 className="text-xl font-bold mb-4">Gestionar usuarios</h2>

        {/* Search and pagination controls */}
        <div className="flex gap-2 items-center mb-4">
          <input
            type="text"
            placeholder="Buscar por username o email"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input input-bordered w-full max-w-md"
          />
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="select select-bordered">
            {[10,20,50,100].map(n => <option key={n} value={n}>{n} / pág</option>)}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="muted" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>Anterior</Button>
            <span>Página {page}</span>
            <Button variant="muted" onClick={() => { if (hasNextPage) setPage(p => p+1); }} disabled={!hasNextPage}>Siguiente</Button>
          </div>
        </div>

        {loadingUsers ? (
          <p>Cargando usuarios...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>First</th>
                  <th>Last</th>
                  <th>Roles</th>
                  <th>Enabled</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.firstName}</td>
                    <td>{u.lastName}</td>
                    <td>{rolesByUser[u.id] ? rolesByUser[u.id].join(', ') : '—'}</td>
                    <td>{u.enabled ? 'Sí' : 'No'}</td>
                    <td className="flex gap-2">
                      <Button variant="muted" onClick={() => handleToggleEnabled(u)}>{u.enabled ? 'Deshabilitar' : 'Habilitar'}</Button>
                      <Button variant="muted" onClick={() => startEditRoles(u)}>Asignar roles</Button>
                      <Button variant="danger" onClick={() => handleDeleteUser(u.id)}>Eliminar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editingRolesFor && (
          <div className="mt-4">
            <h3 className="font-semibold">Editar roles para usuario</h3>
            <div className="flex gap-3 flex-wrap mt-2">
              {roles.map((r) => (
                <label key={r} className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={selectedRoles.includes(r)} onChange={(e) => {
                    if (e.target.checked) setSelectedRoles(prev => [...prev, r]); else setSelectedRoles(prev => prev.filter(x => x !== r));
                  }} />
                  <span className="capitalize">{r.replace('_',' ')}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="brand" onClick={() => saveRoles(editingRolesFor)}>Guardar roles</Button>
              <Button variant="muted" onClick={cancelEditRoles}>Cancelar</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ManageUsers;
