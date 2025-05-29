import {useState} from "react";

const ImportAssessment = ({onCreated, token, API_BASE}) => {
    const [error, setError] = useState(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const json = JSON.parse(text);

            const response = await fetch(`${API_BASE}/assessment-templates/create/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`,
                },
                body: JSON.stringify(json),
            });

            if (!response.ok) {
                const err = await response.json();
                setError(JSON.stringify(err));
            } else {
                const data = await response.json();
                setError(null);
                alert('Assessment importado correctamente');
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
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 ml-2"
            >
                Importar Assessment
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
