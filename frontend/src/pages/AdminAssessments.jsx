import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { downloadCSV } from '../functionalities/ExportAssessment.jsx';
import { Loading, EmptyState, ErrorState } from '../components/ui/States.jsx';
import { fetchWithAuth } from '../utils/api.js';

const AdminAssessments = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ user: '', from: '', to: '', q: '' });
  const [pagination, setPagination] = useState({ next: null, previous: null, count: null });
  const [users, setUsers] = useState([]);
  const [showOnlyAnon, setShowOnlyAnon] = useState(false);
  const searchTimeout = useRef(null);
  const navigate = useNavigate();

  // Fetch con parámetros (backend filtering)
  const fetchAssessments = async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      });

      const url = `${API_BASE}/admin/user-assessments/` + (qs.toString() ? `?${qs.toString()}` : '');
      const res = await fetchWithAuth(url);
      if (!res.ok) {
        setError('Error al cargar las evaluaciones');
        setAssessments([]);
        setPagination({ next: null, previous: null, count: null });
        return;
      }

      const data = await res.json();
      // Si la API es paginada
      if (data && data.results) {
        setAssessments(data.results);
        setPagination({ next: data.next, previous: data.previous, count: data.count });
      } else {
        setAssessments(Array.isArray(data) ? data : []);
        setPagination({ next: null, previous: null, count: Array.isArray(data) ? data.length : null });
      }

      // Construir lista de usuarios a partir de la página actual si no está poblada
      setUsers(prev => {
        const s = new Set(prev);
        (data.results ? data.results : (Array.isArray(data) ? data : [])).forEach(a => {
          const uname = a.user_username || a.user?.username || a.user?.email || '';
          if (uname) s.add(uname);
        });
        return Array.from(s).sort();
      });

    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las evaluaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // carga inicial sin filtros
    fetchAssessments();
    // limpiar timeout on unmount
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, []);

  // Aplicar filtros en el backend: lanzamos fetch cuando cambian
  useEffect(() => {
    // debounce para evitar demasiadas peticiones al tipear
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchAssessments(filters);
    }, 400);
  }, [filters.user, filters.from, filters.to, filters.q]);

  if (loading) return <Loading label="Cargando evaluaciones…" />;
  if (error) return <ErrorState title="Error" message={error} onRetry={() => window.location.reload()} />;

  if (!assessments || assessments.length === 0) {
    return <EmptyState title="No hay evaluaciones" message="No se han encontrado evaluaciones en el sistema." />;
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Fecha no disponible';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const clearFilters = () => setFilters({ user: '', from: '', to: '', q: '' });

  const goToPage = async (url) => {
    if (!url) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(url);
      if (!res.ok) {
        setError('Error paginación');
        setAssessments([]);
        setPagination({ next: null, previous: null, count: null });
        return;
      }
      const data = await res.json();
      if (data && data.results) {
        setAssessments(data.results);
        setPagination({ next: data.next, previous: data.previous, count: data.count });
      }
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la página');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-main">
      <h1 className="text-2xl font-bold mb-4 dark:text-gray-100">Evaluaciones (administrador)</h1>

      {/* Área de filtros */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <label className="block text-sm text-gray-600">Usuario</label>
            <select className="input" value={filters.user} onChange={e => setFilters(f => ({ ...f, user: e.target.value }))}>
              <option value="">Todos</option>
              {users.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div className="flex items-center ml-2">
            <input id="onlyAnon" type="checkbox" className="mr-2" checked={showOnlyAnon} onChange={e => setShowOnlyAnon(e.target.checked)} />
            <label htmlFor="onlyAnon" className="text-sm text-gray-600">Mostrar solo anonimizadas</label>
          </div>

          <div>
            <label className="block text-sm text-gray-600">Desde</label>
            <input type="date" className="input" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Hasta</label>
            <input type="date" className="input" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
          </div>

          <div className="flex-1">
            <label className="block text-sm text-gray-600">Buscar</label>
            <input type="text" placeholder="Buscar por título, nombre de usuario o email" className="input" value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} />
          </div>

          <div className="flex items-end">
            <Button variant="muted" onClick={clearFilters}>Limpiar</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {assessments
          .filter(a => (showOnlyAnon ? Boolean(a.user_anonymized) : true))
          .map((a) => {
           const uname = a.user_username || (a.user && a.user.username) || '';
           const uemail = a.user_email || (a.user && a.user.email) || '';
           const isAnon = !a.user; // if backend set user to null when deleted
           const subtitleText = `Usuario: ${uname || 'Usuario desconocido'}${uemail ? ` · ${uemail}` : ''}`;
           return (
             <Card key={a.id} title={a.name || a.assessment_template?.title || `Evaluación ${a.id}`} subtitle={subtitleText}>
              {a.user_anonymized && (
                <div className="mt-2">
                  <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded" title="El usuario que realizó esta evaluación fue eliminado o su cuenta está inactiva; mostramos la información guardada por privacidad.">Usuario eliminado / anonimizado</span>
                </div>
              )}
               <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">Plantilla: {a.assessment_template?.title || a.assessment_template || 'N/D'}</div>
               <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">Creada: {formatDate(a.started_at || a.created_at)}</div>
               <div className="mb-4 text-sm">Estado: <strong>{a.completed ? 'Completada' : 'En progreso'}</strong></div>
               <div className="flex gap-2">
                 <Button variant="muted" onClick={() => navigate(`/user-assessments/${a.id}?admin=1`)}>Ver</Button>
                 <Button variant="ghost" onClick={() => downloadCSV(`${API_BASE}/export-user-assessment-csv/${a.id}/`, `assessment_${a.id}.csv`)}>Exportar CSV</Button>
                 <Button variant="danger" onClick={async () => {
                   if (!window.confirm('¿Eliminar esta evaluación? Esta acción es irreversible.')) return;
                   try {
                     const res = await fetchWithAuth(`${API_BASE}/admin/user-assessments/${a.id}/delete/`, { method: 'DELETE' });
                     if (res.ok) {
                       setAssessments(prev => prev.filter(x => x.id !== a.id));
                     } else {
                       const txt = await res.text();
                       alert('Error al borrar: ' + (txt || res.status));
                     }
                   } catch (err) {
                     console.error(err);
                     alert('Error al borrar la evaluación');
                   }
                 }}>Borrar</Button>
               </div>
             </Card>
           );
         })}
       </div>
      {/* Paginación */}
      <div className="flex justify-between items-center mt-4">
        <div>Resultados: {pagination.count ?? '-'}</div>
        <div className="flex gap-2">
          <Button variant="muted" onClick={() => goToPage(pagination.previous)} disabled={!pagination.previous}>Anterior</Button>
          <Button variant="muted" onClick={() => goToPage(pagination.next)} disabled={!pagination.next}>Siguiente</Button>
        </div>
      </div>
     </div>
   );
 };

 export default AdminAssessments;
