import React, { useState, useEffect } from 'react';
import Question from './Question';

function AssessmentForm() {
    const [questions, setQuestions] = useState([]);

    useEffect(() => {
        // Simula una llamada a la API o una carga de datos
        const fetchedQuestions = [
            { id: 1, text: "¿Tu sitio tiene protección contra ataques?" },
        ];

        setQuestions(fetchedQuestions);  // Asegúrate de que questions es un array
    }, []);

    const handleAnswer = (questionId, answer) => {
        console.log(`Pregunta ${questionId}: Respuesta seleccionada: ${answer}`);
    };

    return (
        <div>
            {/* Mapea las preguntas solo si questions es un array */}
            {Array.isArray(questions) && questions.length > 0 ? (
                questions.map((question) => (
                    <Question
                        key={question.id}
                        question={question}
                        handleAnswer={handleAnswer}
                    />
                ))
            ) : (
                <p>No hay preguntas disponibles</p>
            )}
        </div>
    );
}

export default AssessmentForm;
