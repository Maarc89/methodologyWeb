import React, {useState} from 'react';

const Question = ({question, handleAnswer}) => {
    const [selectedAnswer, setSelectedAnswer] = useState(null);

    const handleClick = (answer) => {
        setSelectedAnswer(answer);
        handleAnswer(question.id, answer); // Enviar la respuesta seleccionada al formulario
    };

    return (
        <div className="question">
            <h3>{question.text}</h3>
            <div className="buttons">
                {['SI', 'NO', 'NO_SE'].map((answer) => (
                    <button
                        key={answer}
                        onClick={() => handleClick(answer)}
                        className={selectedAnswer === answer ? 'selected' : ''}
                    >
                        {answer}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Question;
