import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {API_BASE} from "../config.js";

const CreateAssessment = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState([]); // preguntas existentes del backend
    const [selectedQuestions, setSelectedQuestions] = useState([]); // preguntas seleccionadas (objetos completos)

    // Para nueva pregunta
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newQuestionArea, setNewQuestionArea] = useState('');
    const [newQuestionOptionSet, setNewQuestionOptionSet] = useState(''); // id del option_set seleccionado
    const [optionSets, setOptionSets] = useState([]);

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const res = await fetch(`${API_BASE}/questions/`, {
                    headers: {Authorization: `Token ${token}`},
                });
                if (!res.ok) throw new Error('Error al cargar preguntas');
                const data = await res.json();
                setQuestions(data.results ?? data);
            } catch (error) {
                alert('No se pudieron cargar las preguntas');
            }
        };

        const fetchOptionSets = async () => {
            try {
                const res = await fetch(`${API_BASE}/answer-option-sets/`, {
                    headers: {Authorization: `Token ${token}`},
                });
                if (!res.ok) throw new Error('Error al cargar option sets');
                const data = await res.json();
                setOptionSets(data.results ?? data);
            } catch (error) {
                alert('No se pudieron cargar los conjuntos de opciones');
            }
        };

        fetchQuestions();
        fetchOptionSets();
    }, [token]);

    // Manejar selección/deselección de preguntas existentes
    const handleCheckboxChange = (question) => {
        setSelectedQuestions((prev) => {
            const exists = prev.find((q) => q.id === question.id);
            if (exists) {
                return prev.filter((q) => q.id !== question.id);
            } else {
                return [...prev, question];
            }
        });
    };

    // Añadir nueva pregunta desde el formulario pequeño
    const handleAddNewQuestion = () => {
        if (!newQuestionText.trim() || !newQuestionArea.trim()) {
            alert('Completa texto y área para la nueva pregunta');
            return;
        }
        // Convertir opción vacía a null para backend
        const optionSetId = newQuestionOptionSet === '' ? null : newQuestionOptionSet;

        const newQuestion = {
            text: newQuestionText,
            area: newQuestionArea,
            option_set: optionSetId,
        };
        setSelectedQuestions((prev) => [...prev, newQuestion]);
        setNewQuestionText('');
        setNewQuestionArea('');
        setNewQuestionOptionSet('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (selectedQuestions.length === 0) {
            alert('Selecciona o añade al menos una pregunta');
            return;
        }

        const questionsToSend = selectedQuestions.map((q) => ({
            id: q.id, // puede ser undefined/null para preguntas nuevas
            text: q.text,
            area: q.area,
            option_set: q.option_set ?? null,
        }));

        const res = await fetch(`${API_BASE}/assessment-templates/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Token ${token}`,
            },
            body: JSON.stringify({
                title,
                description,
                questions: questionsToSend,
            }),
        });

        const data = await res.json();
        console.log(data);

        if (res.ok) {
            alert('Assessment creado correctamente');
            navigate('/');
        } else {
            alert('Error al crear el assessment: ' + JSON.stringify(data));
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

                <label className="block mb-2 font-semibold">Selecciona preguntas existentes</label>
                <div className="max-h-48 overflow-auto border p-2 mb-4 rounded">
                    {questions.length === 0 ? (
                        <p>No hay preguntas disponibles.</p>
                    ) : (
                        questions.map((q) => (
                            <div key={q.id} className="mb-1">
                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedQuestions.some((sq) => sq.id === q.id)}
                                        onChange={() => handleCheckboxChange(q)}
                                        className="mr-2"
                                    />
                                    {q.text}
                                </label>
                            </div>
                        ))
                    )}
                </div>

                {/* Formulario para añadir pregunta nueva */}
                <div className="mb-4 p-4 border rounded">
                    <h3 className="font-semibold mb-2">Añadir pregunta nueva</h3>
                    <input
                        type="text"
                        placeholder="Texto pregunta"
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        className="w-full mb-2 p-2 border rounded"
                    />
                    <input
                        type="text"
                        placeholder="Área"
                        value={newQuestionArea}
                        onChange={(e) => setNewQuestionArea(e.target.value)}
                        className="w-full mb-2 p-2 border rounded"
                    />
                    <label className="block mb-1 font-semibold">Conjunto de opciones</label>

                    {console.log("optionSets:", optionSets)}

                    <select
                        value={newQuestionOptionSet}
                        onChange={(e) => setNewQuestionOptionSet(e.target.value)}
                        className="w-full mb-2 p-2 border rounded"
                    >
                        <option value="">Sin conjunto de opciones</option>
                        {optionSets.map((os) => (
                            <option key={os.id} value={os.id}>{os.name}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={handleAddNewQuestion}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                        Añadir pregunta
                    </button>
                </div>

                {/* Mostrar preguntas seleccionadas (existentes y nuevas) */}
                <div className="mb-4 p-2 border rounded max-h-48 overflow-auto">
                    <h3 className="font-semibold mb-2">Preguntas seleccionadas</h3>
                    {selectedQuestions.length === 0 && <p>No hay preguntas seleccionadas.</p>}
                    {selectedQuestions.map((q, i) => (
                        <div
                            key={q.id ?? `new-${i}`}
                            className="flex justify-between items-center mb-1"
                        >
                            <span>
                                {q.text} ({q.area}) {q.id ? '' : '[Nueva]'} {q.option_set ? '[Opciones]' : ''}
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedQuestions((prev) => prev.filter((_, idx) => idx !== i))
                                }
                                className="text-red-600 hover:text-red-800"
                            >
                                ×
                            </button>
                        </div>
                    ))}
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
