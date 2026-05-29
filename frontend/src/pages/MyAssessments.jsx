import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Trash2} from 'lucide-react';
import {downloadCSV} from "../functionalities/ExportAssessment.jsx";
import {API_BASE} from "../config.js";
import {authFetch, getAuthToken} from '../utils/auth.js';

const MyAssessments = () => {
    const [userAssessments, setUserAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [message, setMessage] = useState({type: '', text: ''});
    const navigate = useNavigate();
    const token = getAuthToken();

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        authFetch(`${API_BASE}/user-assessments/`)
            .then((res) => {
                if (!res.ok) throw new Error('No se pudieron cargar tus evaluaciones');
                return res.json();
            })
            .then((data) => {
                setUserAssessments(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setMessage({type: 'error', text: 'No se pudieron cargar tus evaluaciones'});
                setLoading(false);
            });
    }, [navigate, token]);

    const handleDeleteAssessment = async (assessmentId) => {
        setDeletingId(assessmentId);
        setMessage({type: '', text: ''});
        try {
            const res = await authFetch(`${API_BASE}/user-assessments/${assessmentId}/delete/`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Error al eliminar la evaluación');
            setUserAssessments((prev) => prev.filter((a) => a.id !== assessmentId));
            setMessage({type: 'success', text: 'Evaluación eliminada correctamente'});
            setConfirmDeleteId(null);
        } catch (err) {
            console.error(err);
            setMessage({type: 'error', text: 'No se pudo eliminar la evaluación'});
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) return <div>Cargando tus evaluaciones...</div>;

    // Función para formatear fecha en formato legible
    const formatDate = (dateStr) => {
        if (!dateStr) return 'Fecha no disponible';
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Mis Evaluaciones</h1>
            {message.text && (
                <div
                    className={`mb-4 rounded-md px-4 py-2 text-sm ${
                        message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}
                >
                    {message.text}
                </div>
            )}
            <ul>
                {userAssessments.length === 0 && <p>No has empezado ningúna evaluación.</p>}
                {userAssessments.map((ua) => (
                    <li key={ua.id} className="mb-3 p-4 border rounded shadow">
                        <h2 className="font-semibold text-xl">{ua.name || ua.assessment_template.title}</h2>
                        <p className="text-sm text-gray-600 mb-2">
                            Creado el: {formatDate(ua.started_at)}
                        </p>
                        <div className="container-buttons">
                            <button
                                className="btn-secondary"
                                onClick={() => navigate(`/user-assessments/${ua.id}`)}
                            >
                                Continuar
                            </button>

                            {ua.completed && (
                                <button
                                    onClick={() =>
                                        downloadCSV(
                                            `${API_BASE}/export-user-assessment-csv/${ua.id}/`,
                                            `assessment_${ua.id}.csv`
                                        )
                                    }
                                    className="btn-confirm"
                                >
                                    Exportar en formato CSV
                                </button>
                            )}
                            <button
                                className="btn-delete w-10 h-10 flex items-center justify-center"
                                onClick={() => setConfirmDeleteId(ua.id)}
                                disabled={deletingId === ua.id}
                                aria-label="Borrar"
                            >
                                <Trash2 className="w-5 h-5"/>
                            </button>
                        </div>
                        {confirmDeleteId === ua.id && (
                            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                <p className="mb-2">¿Seguro que quieres borrar esta evaluación?</p>
                                <div className="flex gap-2">
                                    <button
                                        className="btn-delete"
                                        onClick={() => handleDeleteAssessment(ua.id)}
                                        disabled={deletingId === ua.id}
                                    >
                                        {deletingId === ua.id ? 'Borrando...' : 'Sí, borrar'}
                                    </button>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => setConfirmDeleteId(null)}
                                        disabled={deletingId === ua.id}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MyAssessments;
