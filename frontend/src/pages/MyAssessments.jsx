import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';

const MyAssessments = () => {
    const [userAssessments, setUserAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        fetch('http://localhost:8001/api/user-assessments/', {
            headers: {Authorization: `Token ${token}`},
        })
            .then((res) => res.json())
            .then((data) => {
                setUserAssessments(data);
                setLoading(false);
            });
    }, [navigate, token]);

    if (loading) return <div>Cargando tus assessments...</div>;

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
                            <button
                                className="btn-delete"
                                onClick={() => {
                                    if (window.confirm("¿Estás seguro de que quieres borrar esta evaluación?")) {
                                        fetch(`http://localhost:8001/api/user-assessments/${ua.id}/delete/`, {
                                            method: 'DELETE',
                                            headers: {
                                                Authorization: `Token ${token}`,
                                            },
                                        })
                                            .then((res) => {
                                                if (res.ok) {
                                                    setUserAssessments(userAssessments.filter(a => a.id !== ua.id));
                                                } else {
                                                    console.error("Error al eliminar la evaluación");
                                                }
                                            });
                                    }
                                }}
                            >
                                Borrar
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MyAssessments;
