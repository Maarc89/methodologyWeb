import {useState, useEffect} from 'react';
import axios from 'axios';

const Settings = () => {
    const [email, setEmail] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [editingEmail, setEditingEmail] = useState(false);

    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await axios.get('http://localhost:8001/api/auth/user/', {
                    headers: {Authorization: `Token ${token}`}
                });
                setEmail(response.data.email);
                setNewEmail(response.data.email);
            } catch (err) {
                console.error(err);
                setMessage('Error al obtener el usuario');
            }
        };

        fetchUser();
    }, []);

    const handleEmailUpdate = async () => {
        const token = localStorage.getItem('token');
        try {
            await axios.put('http://localhost:8001/api/auth/settings/update/', {
                email: newEmail,
            }, {
                headers: {Authorization: `Token ${token}`}
            });
            setEmail(newEmail);
            setEditingEmail(false);
            setMessage('Email actualizado con éxito');
        } catch (err) {
            console.error(err);
            setMessage('Error al actualizar el email');
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await axios.put('http://localhost:8001/api/auth/settings/update/', {
                password: currentPassword,
                new_password: newPassword,
            }, {
                headers: {Authorization: `Token ${token}`}
            });
            setCurrentPassword('');
            setNewPassword('');
            setShowPasswordForm(false);
            setMessage('Contraseña actualizada correctamente');
        } catch (err) {
            setMessage(err.response?.data?.detail || 'Error al cambiar la contraseña');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-8 p-4 border rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Configuración</h2>

            {message && <div className="mb-4 text-blue-600">{message}</div>}

            {/* EMAIL SECTION */}
            <div className="mb-6">
                <label className="block font-medium mb-1">Correo electrónico</label>
                {editingEmail ? (
                    <div className="flex gap-2">
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="border px-2 py-1 flex-1"
                        />
                        <button
                            onClick={handleEmailUpdate}
                            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                        >
                            Guardar
                        </button>
                        <button
                            onClick={() => {
                                setNewEmail(email);
                                setEditingEmail(false);
                            }}
                            className="text-red-500 hover:underline"
                        >
                            Cancelar
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-between items-center">
                        <span>{email}</span>
                        <button
                            onClick={() => setEditingEmail(true)}
                            className="text-blue-600 hover:underline"
                        >
                            Editar
                        </button>
                    </div>
                )}
            </div>

            {/* PASSWORD SECTION */}
            <div className="mb-2">
                <button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="text-blue-600 hover:underline"
                >
                    {showPasswordForm ? 'Ocultar cambio de contraseña' : 'Cambiar contraseña'}
                </button>
            </div>

            {showPasswordForm && (
                <form onSubmit={handlePasswordUpdate} className="space-y-4 mt-4">
                    <div>
                        <label className="block">Contraseña actual</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full border px-2 py-1"
                        />
                    </div>
                    <div>
                        <label className="block">Nueva contraseña</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full border px-2 py-1"
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Guardar nueva contraseña
                    </button>
                </form>
            )}
        </div>
    );
};

export default Settings;
