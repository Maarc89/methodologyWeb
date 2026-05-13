import { useState, useRef } from "react";
import { fetchWithAuth } from "../utils/api.js";
import { API_BASE } from "../config.js";
import Button from '../components/ui/Button.jsx';

const ImportAssessment = ({ onCreated }) => {
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const json = JSON.parse(text);

            const response = await fetchWithAuth(`${API_BASE}/assessment-templates/import/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            <input
                ref={inputRef}
                id="import-assessment-input"
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            <Button variant="muted" onClick={() => inputRef.current?.click()}>Importar Evaluación</Button>

            {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>
    );
};

export default ImportAssessment;
