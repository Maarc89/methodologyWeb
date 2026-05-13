import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from "../config";
import { fetchWithAuth } from "../utils/api";
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { Loading } from '../components/ui/States.jsx';

const statusBadge = (status) => {
  const map = {
    approved: 'badge-success',
    pending: 'badge-warning',
    denied: 'badge-danger',
  };
  const cls = map[status] || 'badge-neutral';
  const label = status?.charAt(0).toUpperCase() + status?.slice(1);
  return <span className={`badge ${cls}`}>{label || 'N/A'}</span>;
};

const AccessRequestsAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [count, setCount] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', page.toString());
      const url = `${API_BASE}/assessment-access/${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error('Error cargando solicitudes');
      const data = await res.json();
      if (Array.isArray(data)) {
        setRequests(data);
        setCount(null);
      } else {
        setRequests(data.results ?? []);
        setCount(data.count ?? null);
      }
    } catch (e) {
      console.error(e);
      setError('No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  const totalPages = useMemo(() => {
    if (!count) return null;
    return Math.max(1, Math.ceil(count / pageSize));
  }, [count, pageSize]);

  const performAction = async (id, action) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/assessment-access/${id}/${action}/`, { method: 'POST' });
      if (!res.ok) throw new Error(`Error al ${action === 'approve' ? 'aprobar' : 'denegar'}`);
      const updated = await res.json();
      setRequests(prev => prev.map(r => r.id === id ? updated : r));
    } catch (e) {
      console.error(e);
      alert('Operación no realizada');
    }
  };

  if (loading) return <Loading label="Cargando solicitudes…" />;

  return (
    <div className="container-main space-y-6">
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Solicitudes de acceso</h1>
          <div>
            <Link to="/admin/create-user"><Button variant="brand">Crear usuario</Button></Link>
          </div>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="field">
            <label className="label">Estado</label>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
            >
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobado</option>
              <option value="denied">Denegado</option>
            </select>
          </div>
          <Button variant="muted" onClick={() => { setPage(1); fetchRequests(); }}>Refrescar</Button>
        </div>
      </Card>

      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <Card className="p-0 overflow-x-auto">
          <table className="table min-w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Assessment</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Actualizado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-gray-600">No hay solicitudes</td>
                </tr>
              )}
              {requests.map(r => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.username ?? r.user}</td>
                  <td>{r.assessment_title ?? r.assessment}</td>
                  <td>{statusBadge(r.status)}</td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                  <td>{r.updated_at ? new Date(r.updated_at).toLocaleString() : '-'}</td>
                  <td>
                    <div className="flex gap-2">
                      <Button
                        variant="success"
                        className="btn-sm"
                        disabled={r.status === 'approved'}
                        onClick={() => performAction(r.id, 'approve')}
                      >
                        Aprobar
                      </Button>
                      <Button
                        variant="muted"
                        className="btn-sm"
                        disabled={r.status === 'denied'}
                        onClick={() => performAction(r.id, 'deny')}
                      >
                        Denegar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {totalPages && totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="muted" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            Anterior
          </Button>
          <span className="text-sm">Página {page} de {totalPages}</span>
          <Button variant="muted" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
};

export default AccessRequestsAdmin;
