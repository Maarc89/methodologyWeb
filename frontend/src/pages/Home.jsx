import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImportAssessment from '../functionalities/ImportAssessment.jsx';
import { Info, Play, Trash2, FilePenLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from "../config.js";
import keycloak from '../Keycloak.js';
import { fetchWithAuth } from "../utils/api.js"; 
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import IconButton from '../components/ui/IconButton.jsx';
import { EmptyState } from '../components/ui/States.jsx';

const Home = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [rolesList, setRolesList] = useState([]);
  const [names, setNames] = useState({});
  const [editingName, setEditingName] = useState({});
  const [showInfo, setShowInfo] = useState({});
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '' });
  const navigate = useNavigate();

  useEffect(() => {
    if (!keycloak.authenticated) return;

    const fetchData = async () => {
      try {
        const userRes = await fetchWithAuth(`${API_BASE}/users/me/`);
        if (!userRes.ok) throw new Error('Error al cargar info de usuario');
        const user = await userRes.json();
        const roles = Array.isArray(user.roles) ? user.roles : [];
        const fallbackRoles = [];
        if (!roles || roles.length === 0) {
          if (user.is_admin) fallbackRoles.push('admin');
          if (user.is_editor) fallbackRoles.push('editor');
          if (user.is_base_user) fallbackRoles.push('base_user');
        }
        const finalRoles = (roles && roles.length) ? roles : fallbackRoles;
        console.debug('user_me response:', user);
        console.debug('detected roles:', finalRoles);

        const editorFlag = finalRoles.includes('editor');
        const adminFlag = finalRoles.includes('admin');
        setIsAdmin(adminFlag);
        setIsEditor(editorFlag);
        setRolesList(finalRoles);

        const assessmentsRes = await fetchWithAuth(`${API_BASE}/assessments/`);
        if (!assessmentsRes.ok) throw new Error('Error al cargar evaluaciones');
        const data = await assessmentsRes.json();
        const assessmentsList = (data.results ?? data).map(a => ({
          ...a,
          has_access: adminFlag || a.access_status === 'approved',
          access_requested: ['pending', 'denied'].includes(a.access_status),
        }));
        setAssessments(assessmentsList);

      } catch (err) {
        console.error(err);
        alert('Error al cargar datos iniciales');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleNameChange = (id, value) => setNames(prev => ({ ...prev, [id]: value }));
  const handleStartClick = (id) => setEditingName(prev => ({ ...prev, [id]: true }));

  const handleConfirmStart = async (id) => {
    const name = names[id]?.trim();
    if (!name) return alert('Por favor, introduce un nombre para la evaluación');

    try {
      const res = await fetchWithAuth(`${API_BASE}/user-assessments/start/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_template_id: id, name }),
      });

      if (res.ok) {
        const data = await res.json();
        navigate(`/user-assessments/${data.id}`);
      } else alert('Error al iniciar la evaluación');
    } catch (err) {
      console.error(err);
      alert('Error al iniciar la evaluación');
    }
  };

  const handleEdit = (id) => navigate(`/assessments/${id}/edit`);

  const requestAccess = async (id) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/assessments/${id}/request-access/`, { method: 'POST' });
      if (!res.ok) throw new Error('Error al solicitar acceso');
      const data = await res.json();
      setAssessments(prev => prev.map(a => a.id === id ? {
        ...a,
        access_status: data.status,
        has_access: data.status === 'approved',
        access_requested: ['pending','denied'].includes(data.status)
      } : a));
      if (data.status === 'pending') alert('Solicitud de acceso enviada. Estado: pendiente');
    } catch (e) {
      console.error(e);
      alert('No se pudo solicitar acceso');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres borrar esta evaluación?')) return;

    try {
      const res = await fetchWithAuth(`${API_BASE}/assessments-admin/${id}/`, { method: 'DELETE' });
      if (res.ok) setAssessments(prev => prev.filter(a => a.id !== id));
      else alert('Error al borrar la evaluación');
    } catch (err) {
      console.error(err);
      alert('Error al borrar la evaluación');
    }
  };

  const toggleInfo = (id) => setShowInfo(prev => ({ ...prev, [id]: !prev[id] }));
  const handleCancelEdit = (id) => setEditingName(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
  const handleAssessmentImported = (newAssessment) => setAssessments(prev => [...prev, newAssessment]);

  const handleCreateUser = () => {
    navigate('/admin/create-user');
  };

  if (loading) return (
    <div className="container-main">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-2/3 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container-main">
      <div className="header text-center mb-6">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">Evaluaciones</h1>

        {(isAdmin || isEditor) && (
          <div className="admin-actions flex justify-center items-center space-x-4 mt-4 mb-6">
            <Button variant="muted" onClick={() => navigate('/create-assessment')}>Crear Evaluación</Button>
            <ImportAssessment token={keycloak.token} API_BASE={API_BASE} onCreated={handleAssessmentImported} />
            {isAdmin && (
               <>
                 <Button variant="muted" onClick={() => navigate('/admin/access-requests')}>Solicitudes de acceso</Button>
                 <Button variant="muted" onClick={handleCreateUser}>Crear Usuario</Button>
               </>
             )}
          </div>
        )}
      </div>

      {assessments.length === 0 ? (
        <EmptyState
          title={isAdmin ? 'No hay evaluaciones todavía' : 'No tienes evaluaciones disponibles'}
          message={isAdmin ? 'Importa o crea una evaluación para empezar.' : 'Solicita acceso a evaluaciones para empezar.'}
          actionLabel={isAdmin ? 'Crear evaluación' : undefined}
          onAction={isAdmin ? () => navigate('/create-assessment') : undefined}
        />
      ) : (
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6">
          {assessments.map(a => (
            <Card key={a.id} title={a.title} className="flex flex-col justify-between" centerTitle>
              {!editingName[a.id] ? (
                <>
                  <div className="flex justify-center items-center gap-3 flex-wrap mb-3">
                    {(() => {
                      const canStart = isAdmin || a.has_access;
                      const isEditorOnly = isEditor && !isAdmin;
                      // Si es editor (no admin) no mostramos el botón de inicio; en su lugar mostramos un texto explicativo
                      if (isEditorOnly) {
                        return (
                          <span className="text-sm text-gray-500 dark:text-gray-400">Los usuarios con rol "editor" no pueden iniciar evaluaciones; puedes editar plantillas.</span>
                        );
                      }
                      const enabled = canStart;
                      return (
                        <IconButton
                          variant="brand"
                          size="md"
                          className={`${!enabled ? 'opacity-50 cursor-not-allowed' : ''} bg-blau text-white`}
                          onClick={() => enabled ? handleStartClick(a.id) : null}
                          ariaLabel="Empezar"
                          title={enabled ? 'Empezar' : 'Acceso no aprobado'}
                        >
                          <Play className="w-5 h-5" />
                        </IconButton>
                      );
                    })()}
                    {(isAdmin || isEditor) && (
                      <IconButton variant="ghost" size="md" className="bg-transparent border border-gray-200 dark:border-gray-700" onClick={() => handleEdit(a.id)} ariaLabel="Editar evaluación" title="Editar">
                        <FilePenLine className="w-5 h-5" />
                      </IconButton>
                    )}
                    <IconButton variant="ghost" size="md" className="bg-transparent" onClick={() => toggleInfo(a.id)} ariaLabel="Mostrar información" title="Información">
                      <Info className="w-5 h-5" />
                    </IconButton>
                    {isAdmin && (
                      <IconButton variant="danger" size="md" className="bg-red-600 text-white" onClick={() => handleDelete(a.id)} ariaLabel="Borrar" title="Borrar">
                        <Trash2 className="w-5 h-5" />
                      </IconButton>
                    )}
                  </div>
                  {!isAdmin && (
                    <div className="flex flex-col items-center gap-2 mb-2">
                      {a.access_status === 'approved' && <span className="badge badge-success">Acceso aprobado</span>}
                      {a.access_status === 'pending' && <span className="badge badge-warning">Solicitud pendiente</span>}
                      {a.access_status === 'denied' && <span className="badge badge-danger">Solicitud denegada</span>}
                      {(a.access_status === 'none' || a.access_status === 'denied') && (
                        <Button variant="muted" onClick={() => requestAccess(a.id)}>Solicitar acceso</Button>
                      )}
                    </div>
                  )}
                  {showInfo[a.id] && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm text-gray-700 dark:text-gray-300">
                      <p className="mb-0"><strong>Descripción:</strong> {a.description || 'Sin descripción'}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input type="text" placeholder="Nombre para tu assessment" value={names[a.id] || ''} onChange={e => handleNameChange(a.id, e.target.value)} className="input w-full mb-3" />
                  <div className="flex justify-center gap-3 flex-wrap">
                    <Button variant="success" onClick={() => handleConfirmStart(a.id)} disabled={!names[a.id]?.trim()}>Confirmar</Button>
                    <Button variant="muted" onClick={() => handleCancelEdit(a.id)}>Cancelar</Button>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
