import {useState, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {API_BASE} from "../config.js";
import {authFetch} from '../utils/auth.js';

const EditAssessment = () => {
    const {id} = useParams();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState([]);
    const [existingQuestions, setExistingQuestions] = useState([]); // preguntas ya creadas
    const [selectedExistingQuestionId, setSelectedExistingQuestionId] = useState('');
    const [filterArea, setFilterArea] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusMsg, setStatusMsg] = useState({type: '', text: ''});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [areas, setAreas] = useState([]);
    const [optionSets, setOptionSets] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resAssessment, resAreas, resOptionSets, resExistingQuestions] =
                    await Promise.all([
                        authFetch(`${API_BASE}/assessments/${id}/`),
                        authFetch(`${API_BASE}/question-areas/`),
                        authFetch(`${API_BASE}/answer-option-sets/`),
                        authFetch(`${API_BASE}/questions/`),
                    ]);

                if (!resAssessment.ok || !resAreas.ok || !resOptionSets.ok || !resExistingQuestions.ok)
                    throw new Error('Error al cargar datos');

                const [assessmentData, areasData, optionSetsData, existingQuestionsData] = await Promise.all([
                    resAssessment.json(),
                    resAreas.json(),
                    resOptionSets.json(),
                    resExistingQuestions.json(),
                ]);

                setTitle(assessmentData.title);
                setDescription(assessmentData.description);

                const mappedQuestions = (assessmentData.questions || []).map((q) => ({
                    ...q,
                    area: q.area?.name || q.area || '',
                    option_set: q.option_set?.name || q.option_set || '',
                    id: q.id || null,
                }));
                setQuestions(mappedQuestions);

                setAreas(areasData);
                setOptionSets(optionSetsData);

                setExistingQuestions(existingQuestionsData);

                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // Filtrar preguntas existentes por área seleccionada
    const filteredExistingQuestions = filterArea
        ? existingQuestions.filter(
            (q) => (q.area?.name === filterArea || q.area === filterArea)
        )
        : existingQuestions;

    const handleAddQuestion = () => {
        setQuestions((prev) => [
            ...prev,
            {
                text: '',
                area: areas.length > 0 ? areas[0].name : '',
                option_set: '',
                id: null,
            },
        ]);
    };

    const handleAddExistingQuestion = () => {
        if (!selectedExistingQuestionId) return;

        const questionToAdd = existingQuestions.find(
            (q) => q.id === parseInt(selectedExistingQuestionId, 10)
        );
        if (!questionToAdd) return;

        if (questions.some((q) => q.id === questionToAdd.id)) {
            setStatusMsg({type: 'error', text: 'La pregunta ya está añadida.'});
            return;
        }

        setQuestions((prev) => [
            ...prev,
            {
                id: questionToAdd.id,
                text: questionToAdd.text,
                area: questionToAdd.area?.name || questionToAdd.area || '',
                option_set: questionToAdd.option_set?.name || questionToAdd.option_set || '',
            },
        ]);

        setSelectedExistingQuestionId('');
    };

    const handleQuestionFieldChange = (index, field, value) => {
        setQuestions((prev) => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                [field]: value,
            };
            return updated;
        });
    };

    const handleDeleteQuestion = (index) => {
        const updated = [...questions];
        updated.splice(index, 1);
        setQuestions(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setStatusMsg({type: '', text: ''});
        setIsSubmitting(true);

        const filteredQuestions = questions.filter((q) => q.text.trim() !== '');

        try {
            const resAssessment = await authFetch(`${API_BASE}/assessments/${id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({title, description, questions: filteredQuestions}),
            });

            if (!resAssessment.ok) throw new Error('Error al actualizar assessment');

            setStatusMsg({type: 'success', text: 'Assessment actualizado correctamente'});
            navigate('/');
        } catch (err) {
            console.error(err);
            setError(err.message);
            setStatusMsg({type: 'error', text: err.message || 'Error al actualizar assessment'});
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <p>Cargando...</p>;
    if (error) return <p className="text-red-600">Error: {error}</p>;

    return (
        <div className="max-w-2xl mx-auto mt-10 p-6 border rounded shadow bg-white">
            <h1 className="text-2xl font-bold mb-4">Editar Assessment</h1>
            {statusMsg.text && (
                <div
                    className={`mb-4 rounded-md px-4 py-2 text-sm ${
                        statusMsg.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}
                >
                    {statusMsg.text}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Título y descripción */}
                <div>
                    <label className="block font-semibold mb-1">Título</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full border rounded p-2"
                        required
                    />
                </div>
                <div>
                    <label className="block font-semibold mb-1">Descripción</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border rounded p-2"
                        rows={3}
                    />
                </div>

                {/* Selector de área para filtrar preguntas existentes */}
                <div>
                    <label className="block font-semibold mb-2">Filtrar preguntas existentes por área</label>
                    <select
                        value={filterArea}
                        onChange={(e) => setFilterArea(e.target.value)}
                        className="border rounded p-2 mb-2"
                    >
                        <option value="">Todas las áreas</option>
                        {areas.map((a) => (
                            <option key={a.name} value={a.name}>
                                {a.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Selector para añadir pregunta existente */}
                <div>
                    <label className="block font-semibold mb-2">Añadir Pregunta Existente</label>
                    <div className="flex space-x-2">
                        <select
                            value={selectedExistingQuestionId}
                            onChange={(e) => setSelectedExistingQuestionId(e.target.value)}
                            className="border rounded p-2 flex-1"
                        >
                            <option value="">Selecciona una pregunta</option>
                            {filteredExistingQuestions.map((q) => (
                                <option key={q.id} value={q.id}>
                                    {q.text.length > 50 ? q.text.slice(0, 50) + '...' : q.text}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={handleAddExistingQuestion}
                            className="bg-green-600 text-white px-4 rounded"
                        >
                            Añadir Pregunta Existente
                        </button>
                    </div>
                </div>

                {/* Preguntas (nuevas o editadas) */}
                <div>
                    <label className="block font-semibold mb-2">Preguntas</label>
                    {questions.map((q, idx) => (
                        <div key={idx} className="border p-3 rounded mb-3 space-y-2">
              <textarea
                  value={q.text}
                  onChange={(e) => handleQuestionFieldChange(idx, 'text', e.target.value)}
                  className="w-full border rounded p-2"
                  rows={2}
              />

                            <div className="flex space-x-2">
                                <select
                                    value={q.area || ''}
                                    onChange={(e) => handleQuestionFieldChange(idx, 'area', e.target.value)}
                                    className="border rounded p-2 flex-1"
                                >
                                    <option value="">Área</option>
                                    {areas.map((a) => (
                                        <option key={a.name} value={a.name}>
                                            {a.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={q.option_set || ''}
                                    onChange={(e) => handleQuestionFieldChange(idx, 'option_set', e.target.value)}
                                    className="border rounded p-2 flex-1"
                                >
                                    <option value="">Sin opciones</option>
                                    {optionSets.map((o) => (
                                        <option key={o.name} value={o.name}>
                                            {o.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleDeleteQuestion(idx)}
                                className="text-red-600 font-bold mt-1"
                            >
                                ✕ Eliminar
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="text-blue-600 underline mt-2"
                    >
                        Añadir Pregunta Nueva
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </form>
        </div>
    );
};

export default EditAssessment;
