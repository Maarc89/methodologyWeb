import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from "../config.js";
import { fetchWithAuth } from "../utils/api.js"; // <-- importamos fetchWithAuth
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { Loading, ErrorState } from '../components/ui/States.jsx';

const EditAssessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [existingQuestions, setExistingQuestions] = useState([]);
  const [selectedExistingQuestionId, setSelectedExistingQuestionId] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [areas, setAreas] = useState([]);
  const [optionSets, setOptionSets] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          resAssessment,
          resAreas,
          resOptionSets,
          resExistingQuestions
        ] = await Promise.all([
          fetchWithAuth(`${API_BASE}/assessments/${id}/`),
          fetchWithAuth(`${API_BASE}/question-areas/`),
          fetchWithAuth(`${API_BASE}/answer-option-sets/`),
          fetchWithAuth(`${API_BASE}/questions/`)
        ]);

        if (!resAssessment.ok || !resAreas.ok || !resOptionSets.ok || !resExistingQuestions.ok) {
          setError('Error al cargar datos');
          setLoading(false);
          return;
        }

        const [
          assessmentData,
          areasData,
          optionSetsData,
          existingQuestionsData
        ] = await Promise.all([
          resAssessment.json(),
          resAreas.json(),
          resOptionSets.json(),
          resExistingQuestions.json()
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

  const filteredExistingQuestions = filterArea
    ? existingQuestions.filter(
        (q) => (q.area?.name === filterArea || q.area === filterArea)
      )
    : existingQuestions;

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { text: '', area: areas[0]?.name || '', option_set: '', id: null }
    ]);
  };

  const handleAddExistingQuestion = () => {
    if (!selectedExistingQuestionId) return;

    const questionToAdd = existingQuestions.find(
      (q) => q.id === parseInt(selectedExistingQuestionId)
    );
    if (!questionToAdd) return;

    if (questions.some((q) => q.id === questionToAdd.id))
      return alert('La pregunta ya está añadida.');

    setQuestions((prev) => [
      ...prev,
      {
        id: questionToAdd.id,
        text: questionToAdd.text,
        area: questionToAdd.area?.name || questionToAdd.area || '',
        option_set: questionToAdd.option_set?.name || questionToAdd.option_set || '',
      }
    ]);

    setSelectedExistingQuestionId('');
  };

  const handleQuestionFieldChange = (index, field, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const filteredQuestions = questions.filter((q) => q.text.trim() !== '');

    try {
      const resAssessment = await fetchWithAuth(`${API_BASE}/assessments/${id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, questions: filteredQuestions }),
      });

      if (!resAssessment.ok) {
        setError('Error al actualizar la evaluación');
        return;
      }

      alert('Evaluación actualizada correctamente');
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  if (loading) return <Loading label="Cargando…" />;
  if (error) return <ErrorState title="Error" message={error} onRetry={() => window.location.reload()} />;

  return (
    <Card className="max-w-2xl mx-auto mt-10 p-6 bg-white">
      <h1 className="text-2xl font-bold mb-4">Editar Evaluación</h1>
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

        {/* Filtro y añadir preguntas existentes */}
        <div>
          <label className="block font-semibold mb-2">Filtrar preguntas existentes por área</label>
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="border rounded p-2 mb-2"
          >
            <option value="">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a.name} value={a.name}>{a.name}</option>
            ))}
          </select>
        </div>

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
            <Button type="button" variant="success" onClick={handleAddExistingQuestion}>Añadir Pregunta Existente</Button>
          </div>
        </div>

        {/* Preguntas editables */}
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
                    <option key={a.name} value={a.name}>{a.name}</option>
                  ))}
                </select>
                <select
                  value={q.option_set || ''}
                  onChange={(e) => handleQuestionFieldChange(idx, 'option_set', e.target.value)}
                  className="border rounded p-2 flex-1"
                >
                  <option value="">Sin opciones</option>
                  {optionSets.map((o) => (
                    <option key={o.name} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </div>
              <Button type="button" variant="muted" onClick={() => handleDeleteQuestion(idx)}>✕ Eliminar</Button>
            </div>
          ))}
          <Button type="button" variant="brand" onClick={handleAddQuestion}>Añadir Pregunta Nueva</Button>
        </div>

        <Button type="submit" variant="brand">Guardar Cambios</Button>
      </form>
    </Card>
  );
};

export default EditAssessment;
