import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import ImportAssessment from '../functionalities/ImportAssessment.jsx';
import {Info, Play, Trash2, FilePenLine} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {API_BASE} from "../config.js";

const Home = () => {
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [names, setNames] = useState({});
    const [editingName, setEditingName] = useState({});
    const [showInfo, setShowInfo] = useState({});
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchAssessments = async () => {
            try {
                const res = await fetch(`${API_BASE}/assessments/`);
                if (!res.ok) throw new Error('Error al cargar las evaluaciones');
                const data = await res.json();
                const assessmentsData = data.results ?? data;
                setAssessments(assessmentsData);
            } catch (error) {
                console.error(error);
                alert('No se pudieron cargar las evaluaciones');
            } finally {
                setLoading(false);
            }
        };

        const fetchUserData = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${API_BASE}/users/me/`, {
                    headers: {Authorization: `Token ${token}`},
                });
                if (res.ok) {
                    const user = await res.json();
                    setIsAdmin(user.is_staff);
                }
            } catch (err) {
                console.error('Error al cargar usuario:', err);
            }
        };

        fetchAssessments();
        fetchUserData();
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
            alert('Por favor, introduce un nombre para la evaluación');
            return;
        }

        const res = await fetch(`${API_BASE}/user-assessments/start/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Token ${token}`,
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
            alert('Error al iniciar la evaluación');
        }
    };

    const handleEdit = (id) => {
        navigate(`/assessments/${id}/edit`);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de que quieres borrar esta evaluación?')) return;

        const res = await fetch(`${API_BASE}/assessments-admin/${id}/`, {
            method: 'DELETE',
            headers: {
                Authorization: `Token ${token}`,
            },
        });

        if (res.ok) {
            alert('Evaluación borrada correctamente');
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
        } else {
            alert('Error al borrar la evaluación');
        }
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
                {isAdmin && (
                    <div className="admin-actions flex justify-center items-center space-x-4 mt-4 mb-6">
                        <button
                            onClick={() => navigate('/create-assessment')}
                            className="btn-secondary"
                        >
                            Crear Evaluación
                        </button>
                        <ImportAssessment
                            token={token}
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
                                        <button
                                            className="btn-primary w-10 h-10 flex items-center justify-center"
                                            onClick={() => handleStartClick(a.id)}
                                            aria-label="Empezar"
                                        >
                                            <Play className="w-5 h-5"/>
                                        </button>

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
                                                    onClick={() => handleDelete(a.id)}
                                                    aria-label="Borrar"
                                                >
                                                    <Trash2 className="w-5 h-5"/>
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* Mostrar info si está activo */}
                                    <AnimatePresence initial={false}>
                                        {showInfo[a.id] && (
                                            <motion.div
                                                key="info"
                                                initial={{opacity: 0, scaleY: 0}}
                                                animate={{opacity: 1, scaleY: 1}}
                                                exit={{opacity: 0, scaleY: 0}}
                                                transition={{duration: 0.3, ease: "easeInOut"}}
                                                style={{originY: 0}}
                                                className="bg-gray-100 p-4 rounded border border-gray-300 mt-2"
                                            >
                                                <p className="mb-4 text-gray-700 whitespace-pre-wrap">
                                                    {a.description || 'Sin descripción'}
                                                </p>
                                            </motion.div>
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
