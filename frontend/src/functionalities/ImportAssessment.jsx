// ImportAssessment.jsx
import {useState} from "react";
import {authFetch} from '../utils/auth.js';

const ImportAssessment = ({onCreated, API_BASE}) => {
    const [error, setError] = useState(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const json = JSON.parse(text);

            const response = await authFetch(`${API_BASE}/assessment-templates/import/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(json),
            });

            if (!response.ok) {
                const err = await response.json();
                setError(JSON.stringify(err));
            } else {
                const data = await response.json();
                setError(null);
                alert('Evaluación importada correctamente');
                if (onCreated) onCreated(data);
            }
        } catch (err) {
            console.error(err);
            setError('Error leyendo o parseando el archivo JSON');
        }
    };

    return (
        <div>
            <label
                htmlFor="import-assessment-input"
                style={{cursor: 'pointer'}}
                className="btn-secondary"
            >
                Importar Evaluación
            </label>
            <input
                id="import-assessment-input"
                type="file"
                accept=".json"
                style={{display: 'none'}}
                onChange={handleFileChange}
            />
            {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>
    );
};

export default ImportAssessment;
