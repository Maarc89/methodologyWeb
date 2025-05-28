import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import ImportAssessment from '../functionalities/ImportAssessment.jsx';

const Home = () => {
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [names, setNames] = useState({});
    const [editingName, setEditingName] = useState({}); // control para mostrar input
    const navigate = useNavigate();
    const API_BASE = 'http://localhost:8001/api';
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchAssessments = async () => {
            try {
                const res = await fetch(`${API_BASE}/assessments/`);
                if (!res.ok) throw new Error('Error al cargar assessments');
                const data = await res.json();
                const assessmentsData = data.results ?? data;
                setAssessments(assessmentsData);
            } catch (error) {
                console.error(error);
                alert('No se pudieron cargar los assessments');
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
            alert('Por favor, introduce un nombre para el assessment');
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
            alert('Error al iniciar el assessment');
        }
    };

    const handleEdit = (id) => {
        navigate(`/edit-assessment/${id}`);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de que quieres borrar este assessment?')) return;

        const res = await fetch(`${API_BASE}/assessments-admin/${id}/`, {
            method: 'DELETE',
            headers: {
                Authorization: `Token ${token}`,
            },
        });

        if (res.ok) {
            alert('Assessment borrado correctamente');
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
            alert('Error al borrar el assessment');
        }
    };

    const handleAssessmentImported = (newAssessment) => {
        setAssessments((prev) => [...prev, newAssessment]);
    };

    if (loading) return <div className="text-center mt-8">Cargando assessments...</div>;
    if (!loading && assessments.length === 0)
        return <div className="text-center mt-8">No hay assessments disponibles en este momento.</div>;

    return (
        <div className="max-w-4xl mx-auto mt-10">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Assessments disponibles</h1>
                {isAdmin && (
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => navigate('/create-assessment')}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                            Crear Assessment
                        </button>
                        <ImportAssessment
                            token={token}
                            API_BASE={API_BASE}
                            onCreated={handleAssessmentImported}
                        />
                    </div>
                )}
            </div>
            <ul>
                {assessments.map((a) => (
                    <li
                        key={a.id}
                        className="mb-3 p-4 border rounded shadow flex flex-col space-y-2"
                    >
                        <div>
                            <h2 className="font-semibold text-xl">{a.title}</h2>
                            <p className="text-sm text-gray-600 mb-2">{a.description}</p>
                        </div>

                        {!editingName[a.id] ? (
                            isAdmin ? (
                                <div className="flex space-x-2 mt-2">
                                    <button
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                        onClick={() => handleStartClick(a.id)}
                                    >
                                        Empezar
                                    </button>
                                    <button
                                        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                        onClick={() => handleEdit(a.id)}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                        onClick={() => handleDelete(a.id)}
                                    >
                                        Borrar
                                    </button>
                                </div>
                            ) : (
                                <div className="flex space-x-2 mt-2">
                                    <button
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mt-2"
                                        onClick={() => handleStartClick(a.id)}
                                    >
                                        Empezar
                                    </button>
                                </div>
                            )
                        ) : (
                            <>
                                <input
                                    type="text"
                                    placeholder="Nombre para tu assessment"
                                    value={names[a.id] || ''}
                                    onChange={(e) => handleNameChange(a.id, e.target.value)}
                                    className="border p-2 rounded w-full"
                                />
                                <div className="flex space-x-2 mt-2">
                                    <button
                                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300"
                                        onClick={() => handleConfirmStart(a.id)}
                                        disabled={!names[a.id]?.trim()}
                                    >
                                        Confirmar
                                    </button>
                                    <button
                                        className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                                        onClick={() =>
                                            setEditingName((prev) => {
                                                const copy = {...prev};
                                                delete copy[a.id];
                                                return copy;
                                            })
                                        }
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Home;
