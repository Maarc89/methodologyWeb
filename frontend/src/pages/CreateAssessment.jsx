import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';

const CreateAssessment = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState([]); // preguntas cargadas de backend
    const [selectedQuestions, setSelectedQuestions] = useState([]); // ids seleccionados
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const API_BASE = 'http://localhost:8001/api';

    useEffect(() => {
        // Cargar preguntas para seleccionar
        const fetchQuestions = async () => {
            try {
                const res = await fetch(`${API_BASE}/questions/`, {
                    headers: {Authorization: `Token ${token}`}
                });
                if (!res.ok) throw new Error('Error al cargar preguntas');
                const data = await res.json();
                setQuestions(data.results ?? data);
            } catch (error) {
                alert('No se pudieron cargar las preguntas');
            }
        };
        fetchQuestions();
    }, [token]);

    const handleCheckboxChange = (id) => {
        setSelectedQuestions((prev) =>
            prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (selectedQuestions.length === 0) {
            alert('Selecciona al menos una pregunta');
            return;
        }

        const res = await fetch(`${API_BASE}/assessments/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Token ${token}`
            },
            body: JSON.stringify({
                title,
                description,
                questions: selectedQuestions // enviar array de IDs
            })
        });

        if (res.ok) {
            alert('Assessment creado correctamente');
            navigate('/');
        } else {
            alert('Error al crear el assessment');
        }
    };

    return (
        <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-4">Crear nuevo Assessment</h1>
            <form onSubmit={handleSubmit}>
                <label className="block mb-2 font-semibold">Título</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full mb-4 p-2 border rounded"
                />

                <label className="block mb-2 font-semibold">Descripción</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full mb-4 p-2 border rounded"
                />

                <label className="block mb-2 font-semibold">Selecciona preguntas</label>
                <div className="max-h-48 overflow-auto border p-2 mb-4 rounded">
                    {questions.length === 0 ? (
                        <p>No hay preguntas disponibles.</p>
                    ) : (
                        questions.map((q) => (
                            <div key={q.id} className="mb-1">
                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        value={q.id}
                                        checked={selectedQuestions.includes(q.id)}
                                        onChange={() => handleCheckboxChange(q.id)}
                                        className="mr-2"
                                    />
                                    {q.text}
                                </label>
                            </div>
                        ))
                    )}
                </div>

                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Crear
                </button>
            </form>
        </div>
    );
};

export default CreateAssessment;
