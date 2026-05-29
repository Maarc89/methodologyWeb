import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import ImportAssessment from '../functionalities/ImportAssessment.jsx';
import {Info, Play, Trash2, FilePenLine} from 'lucide-react';
import {AnimatePresence} from 'framer-motion';
import {API_BASE} from "../config.js";
import {authFetch, getAuthToken} from '../utils/auth.js';

const Home = () => {
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({type: '', text: ''});
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isEditor, setIsEditor] = useState(false);
    const [names, setNames] = useState({});
    const [editingName, setEditingName] = useState({});
    const [showInfo, setShowInfo] = useState({});
    const navigate = useNavigate();
    const token = getAuthToken();

    useEffect(() => {
        const fetchData = async () => {
            try {
                let adminFlag = false;
                let editorFlag = false;
                if (token) {
                    const userRes = await authFetch(`${API_BASE}/users/me/`);
                    if (userRes.ok) {
                        const user = await userRes.json();
                        adminFlag = Boolean(user.is_staff || user.is_admin);
                        // support both flags
                        editorFlag = Boolean(user.is_editor || (Array.isArray(user.roles) && user.roles.includes('editor')));
                        setIsAdmin(adminFlag);
                        setIsEditor(editorFlag);
                    }
                }

                const res = await fetch(`${API_BASE}/assessments/`);
                if (!res.ok) throw new Error('Error al cargar las evaluaciones');
                const data = await res.json();
                const assessmentsData = (data.results ?? data).map(a => ({
                    ...a,
                    has_access: adminFlag || a.access_status === 'approved',
                    access_requested: ['pending','denied'].includes(a.access_status),
                }));
                setAssessments(assessmentsData);
            } catch (error) {
                console.error(error);
                setMessage({type: 'error', text: 'No se pudieron cargar las evaluaciones'});
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    const handleNameChange = (id, value) => {
        setNames((prev) => ({...prev, [id]: value}));
    };

    // Este método solo activa el input para el id seleccionado
    const handleStartClick = (id) => {
        setEditingName((prev) => ({...prev, [id]: true}));
    };

    // Este método se llama para confirmar y enviar el formulario
    const handleConfirmStart = async (id) => {
        const name = names[id]?.trim();
        if (!token) {
            navigate('/login');
            return;
        }
        if (!name) {
            setMessage({type: 'error', text: 'Por favor, introduce un nombre para la evaluación'});
            return;
        }

        const res = await authFetch(`${API_BASE}/user-assessments/start/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                assessment_template_id: id,
                name,
            }),
        });

        if (res.ok) {
            const data = await res.json();
            navigate(`/user-assessments/${data.id}`);
        } else {
            setMessage({type: 'error', text: 'Error al iniciar la evaluación'});
        }
    };

    const handleEdit = (id) => {
        navigate(`/assessments/${id}/edit`);
    };

    const requestAccess = async (id) => {
        if (!token) {
            navigate('/login');
            return;
        }
        try {
            const res = await authFetch(`${API_BASE}/assessments/${id}/request-access/`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Error al solicitar acceso');
            const data = await res.json();
            setAssessments(prev => prev.map(a => a.id === id ? ({
                ...a,
                access_status: data.status,
                has_access: data.status === 'approved',
                access_requested: ['pending','denied'].includes(data.status),
            }) : a));
            if (data.status === 'pending') {
                setMessage({type: 'success', text: 'Solicitud de acceso enviada. Estado: pendiente'});
            }
        } catch (err) {
            console.error(err);
            setMessage({type: 'error', text: 'No se pudo solicitar acceso'});
        }
    };

    const handleDelete = async (id) => {
        setDeletingId(id);
        setMessage({type: '', text: ''});

        const res = await authFetch(`${API_BASE}/assessments-admin/${id}/`, {
            method: 'DELETE',
        });

        if (res.ok) {
            setMessage({type: 'success', text: 'Evaluación borrada correctamente'});
            setAssessments((prev) => prev.filter((a) => a.id !== id));
            setNames((prev) => {
                const copy = {...prev};
                delete copy[id];
                return copy;
            });
            setEditingName((prev) => {
                const copy = {...prev};
                delete copy[id];
                return copy;
            });
            setConfirmDeleteId(null);
        } else {
            setMessage({type: 'error', text: 'Error al borrar la evaluación'});
        }
        setDeletingId(null);
    };

    const toggleInfo = (id) => {
        setShowInfo((prev) => ({...prev, [id]: !prev[id]}));
    };

    const handleCancelEdit = (id) => {
        setEditingName((prev) => {
            const copy = {...prev};
            delete copy[id];
            return copy;
        });
    };

    const handleAssessmentImported = (newAssessment) => {
        setAssessments((prev) => [...prev, newAssessment]);
    };

    if (loading) return <div className="text-center mt-8">Cargando evaluaciones...</div>;

    return (
        <div className="container-main">
            <div className="header text-center mb-6">
                <h1 className="text-3xl font-bold mb-4 text-gray-800">Evaluaciones</h1>
                {message.text && (
                    <div
                        className={`mb-4 rounded-md px-4 py-2 text-sm ${
                            message.type === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                        }`}
                    >
                        {message.text}
                    </div>
                )}
                {isAdmin && (
                    <div className="admin-actions flex justify-center items-center space-x-4 mt-4 mb-6">
                        <button
                            onClick={() => navigate('/create-assessment')}
                            className="btn-secondary"
                        >
                            Crear Evaluación
                        </button>
                        <ImportAssessment
                            API_BASE={API_BASE}
                            onCreated={handleAssessmentImported}
                        />
                    </div>
                )}
            </div>

            {assessments.length === 0 ? (
                <div className="text-center mt-8">No hay evaluaciones disponibles en este momento.</div>
            ) : (
                <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
                    {assessments.map((a) => (
                        <div
                            key={a.id}
                            className="p-6 border rounded shadow bg-white flex flex-col justify-between"
                        >
                            <h2 className="font-semibold text-2xl text-center mb-4 text-gray-900">{a.title}</h2>

                            {/* Botones o input para nombre */}
                            {!editingName[a.id] ? (
                                <>
                                    <div className="flex justify-center items-center gap-3 flex-wrap mb-3">
                                        {(() => {
                                            const canStart = isAdmin || a.has_access;
                                            const isEditorOnly = isEditor && !isAdmin;
                                            if (isEditorOnly) {
                                                return (
                                                    <span className="text-sm text-gray-500">Los usuarios con rol "editor" no pueden iniciar evaluaciones.</span>
                                                );
                                            }
                                            if (canStart) {
                                                return (
                                                    <button
                                                        className="btn-primary w-10 h-10 flex items-center justify-center"
                                                        onClick={() => handleStartClick(a.id)}
                                                        aria-label="Empezar"
                                                    >
                                                        <Play className="w-5 h-5"/>
                                                    </button>
                                                );
                                            }
                                            return (
                                                <button className="btn-secondary" onClick={() => requestAccess(a.id)}>Solicitar acceso</button>
                                            );
                                        })()}

                                        {isAdmin && (
                                            <>
                                                <button
                                                    className="btn-edit w-10 h-10 flex items-center justify-center"
                                                    onClick={() => handleEdit(a.id)}
                                                    aria-label="Editar evaluación"
                                                >
                                                    <FilePenLine className="w-5 h-5"/>
                                                </button>
                                            </>
                                        )}

                                        <button
                                            className="btn-info rounded-full w-10 h-10 flex items-center justify-center"
                                            onClick={() => toggleInfo(a.id)}
                                            aria-label="Mostrar información"
                                        >
                                            <Info className="w-5 h-5"/>
                                        </button>
                                        {isAdmin && (
                                            <>
                                                <button
                                                    className="btn-delete w-10 h-10 flex items-center justify-center"
                                                    onClick={() => setConfirmDeleteId(a.id)}
                                                    disabled={deletingId === a.id}
                                                    aria-label="Borrar"
                                                >
                                                    <Trash2 className="w-5 h-5"/>
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {isAdmin && confirmDeleteId === a.id && (
                                        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                            <p className="mb-2">¿Seguro que quieres borrar esta evaluación?</p>
                                            <div className="flex gap-2">
                                                <button
                                                    className="btn-delete"
                                                    onClick={() => handleDelete(a.id)}
                                                    disabled={deletingId === a.id}
                                                >
                                                    {deletingId === a.id ? 'Borrando...' : 'Sí, borrar'}
                                                </button>
                                                <button
                                                    className="btn-secondary"
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    disabled={deletingId === a.id}
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Mostrar info si está activo */}
                                    <AnimatePresence initial={false}>
                                        {showInfo[a.id] && (
                                            <div
                                                key="info"
                                                className="bg-gray-100 p-4 rounded border border-gray-300 mt-2"
                                            >
                                                <p className="mb-4 text-gray-700 whitespace-pre-wrap">
                                                    {a.description || 'Sin descripción'}
                                                </p>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Nombre para tu assessment"
                                        value={names[a.id] || ''}
                                        onChange={(e) => handleNameChange(a.id, e.target.value)}
                                        className="input-name w-full mb-3 px-3 py-2 border rounded"
                                    />
                                    <div className="flex justify-center gap-3 flex-wrap">
                                        <button
                                            className="btn-confirm"
                                            onClick={() => handleConfirmStart(a.id)}
                                            disabled={!names[a.id]?.trim()}
                                        >
                                            Confirmar
                                        </button>
                                        <button
                                            className="btn-cancel"
                                            onClick={() => handleCancelEdit(a.id)}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Home;
