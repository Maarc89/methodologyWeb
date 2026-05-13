import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config.js";
import { fetchWithAuth } from "../utils/api.js";
import keycloak from "../Keycloak.js";
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';

const CreateAssessment = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionArea, setNewQuestionArea] = useState("");
  const [newQuestionOptionSet, setNewQuestionOptionSet] = useState("");
  const [optionSets, setOptionSets] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    if (!keycloak.authenticated) return;

    const fetchQuestions = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/questions/`);
        if (!res.ok) { console.error('Error al cargar preguntas'); return; }
        const data = await res.json();
        setQuestions(data.results ?? data);
      } catch (error) {
        console.error(error);
        alert("No se pudieron cargar las preguntas");
      }
    };

    const fetchOptionSets = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/answer-option-sets/`);
        if (!res.ok) { console.error('Error al cargar option sets'); return; }
        const data = await res.json();
        setOptionSets(data.results ?? data);
      } catch (error) {
        console.error(error);
        alert("No se pudieron cargar los conjuntos de opciones");
      }
    };

    fetchQuestions();
    fetchOptionSets();
  }, []);

  const handleCheckboxChange = (question) => {
    setSelectedQuestions((prev) => {
      const exists = prev.find((q) => q.id === question.id);
      return exists
        ? prev.filter((q) => q.id !== question.id)
        : [...prev, question];
    });
  };

  const handleAddNewQuestion = () => {
    if (!newQuestionText.trim() || !newQuestionArea.trim()) {
      alert("Completa texto y área para la nueva pregunta");
      return;
    }

    const optionSetId = newQuestionOptionSet === "" ? null : newQuestionOptionSet;

    const newQuestion = {
      text: newQuestionText,
      area: newQuestionArea,
      option_set: optionSetId,
    };

    setSelectedQuestions((prev) => [...prev, newQuestion]);
    setNewQuestionText("");
    setNewQuestionArea("");
    setNewQuestionOptionSet("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedQuestions.length === 0) {
      alert("Selecciona o añade al menos una pregunta");
      return;
    }

    const questionsToSend = selectedQuestions.map((q) => ({
      id: q.id,
      text: q.text,
      area: q.area,
      option_set: q.option_set ?? null,
    }));

    try {
      const res = await fetchWithAuth(`${API_BASE}/assessment-templates/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          questions: questionsToSend,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Evaluación creada correctamente");
        navigate("/");
      } else {
        alert("Error al crear la evaluación: " + JSON.stringify(data));
      }
    } catch (err) {
      console.error("Error creando evaluación:", err);
      alert("Error al crear la evaluación");
    }
  };

  return (
    <div className="container-main">
      <Card className="max-w-xl mx-auto mt-10 p-6">
        <h1 className="text-2xl font-bold mb-4">Crear nueva Evaluación</h1>

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

          {/* Nueva pregunta */}
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

            <select
              value={newQuestionOptionSet}
              onChange={(e) => setNewQuestionOptionSet(e.target.value)}
              className="w-full mb-2 p-2 border rounded"
            >
              <option value="">Sin conjunto de opciones</option>
              {optionSets.map((os) => (
                <option key={os.id} value={os.id}>
                  {os.name}
                </option>
              ))}
            </select>

            <Button type="button" variant="success" onClick={handleAddNewQuestion}>Añadir pregunta</Button>
          </div>

          {/* Preguntas seleccionadas */}
          <div className="mb-4 p-2 border rounded max-h-48 overflow-auto">
            <h3 className="font-semibold mb-2">Preguntas seleccionadas</h3>
            {selectedQuestions.length === 0 && <p>No hay preguntas seleccionadas.</p>}
            {selectedQuestions.map((q, i) => (
              <div key={q.id ?? `new-${i}`} className="flex justify-between items-center mb-1">
                <span>
                  {q.text} ({q.area}) {q.id ? "" : "[Nueva]"} {q.option_set ? "[Opciones]" : ""}
                </span>
                <Button type="button" variant="muted" onClick={() => setSelectedQuestions((prev) => prev.filter((_, idx) => idx !== i))}>×</Button>
              </div>
            ))}
          </div>

          <Button type="submit" variant="brand">Crear</Button>
        </form>
      </Card>
    </div>
  );
};

export default CreateAssessment;
