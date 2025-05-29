import {useState, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom';

const API_BASE = 'http://localhost:8001/api';

const EditAssessment = () => {
    const {id} = useParams();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch(`${API_BASE}/assessments/${id}/`, {
            headers: {
                'Authorization': `Token ${localStorage.getItem('token')}`,
            }
        })
            .then(res => {
                if (!res.ok) throw new Error('Error al cargar el assessment');
                return res.json();
            })
            .then(data => {
                setTitle(data.title);
                setDescription(data.description);
                setQuestions(data.questions || []);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [id]);

    const handleQuestionChange = (index, value) => {
        const updated = [...questions];
        updated[index].text = value;
        setQuestions(updated);
    };

    const handleAddQuestion = () => {
        setQuestions(prev => [...prev, {id: null, text: ''}]);
    };

    const handleDeleteQuestion = (index) => {
        const updated = [...questions];
        updated.splice(index, 1);
        setQuestions(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            // 1. Actualizar assessment
            const resAssessment = await fetch(`${API_BASE}/assessments/${id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({title, description, questions}),
            });

            if (!resAssessment.ok) throw new Error('Error al actualizar assessment');

            // 2. Actualizar preguntas (una a una)
            for (const q of questions) {
                if (q.id) {
                    // Actualizar existente
                    await fetch(`${API_BASE}/questions/${q.id}/`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Token ${localStorage.getItem('token')}`,
                        },
                        body: JSON.stringify({text: q.text}),
                    });
                } else {
                    // Crear nueva
                    await fetch(`${API_BASE}/questions/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Token ${localStorage.getItem('token')}`,
                        },
                        body: JSON.stringify({text: q.text, assessment: id}),
                    });
                }
            }

            alert('Assessment actualizado correctamente');
            navigate('/');
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    if (loading) return <p>Cargando...</p>;
    if (error) return <p className="text-red-600">Error: {error}</p>;

    return (
        <div className="max-w-2xl mx-auto mt-10 p-6 border rounded shadow bg-white">
            <h1 className="text-2xl font-bold mb-4">Editar Assessment</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block font-semibold mb-1">Título</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full border rounded p-2"
                        required
                    />
                </div>
                <div>
                    <label className="block font-semibold mb-1">Descripción</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full border rounded p-2"
                        rows={3}
                    />
                </div>

                <div>
                    <label className="block font-semibold mb-2">Preguntas</label>
                    {questions.map((q, idx) => (
                        <div key={idx} className="flex items-start space-x-2 mb-2">
                            <textarea
                                value={q.text}
                                onChange={(e) => handleQuestionChange(idx, e.target.value)}
                                className="flex-grow border rounded p-2"
                                rows={2}
                            />
                            <button
                                type="button"
                                onClick={() => handleDeleteQuestion(idx)}
                                className="text-red-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="text-blue-600 underline mt-2"
                    >
                        Añadir Pregunta
                    </button>
                </div>

                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Guardar Cambios
                </button>
            </form>
        </div>
    );
};

export default EditAssessment;
