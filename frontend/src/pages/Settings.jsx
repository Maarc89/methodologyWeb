import {useState, useEffect} from 'react';
import axios from 'axios';
import {API_BASE} from "../config.js";

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
                const response = await axios.get(`${API_BASE}/auth/user/`, {
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
            await axios.put(`${API_BASE}/auth/settings/update/`, {
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
            await axios.put(`${API_BASE}/auth/settings/update/`, {
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
        <div className="flex justify-center items-center mt-10 px-4">
            <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-md">
                <h2 className="text-2xl font-semibold text-center mb-6 text-title">Configuración</h2>

                {message && <div className="mb-4 text-blau text-sm text-center">{message}</div>}

                {/* EMAIL SECTION */}
                <div className="mb-6">
                    <label className="block text-sm font-bold mb-1 text-gray-700">Correo electrónico</label>
                    {editingEmail ? (
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                            <button
                                onClick={handleEmailUpdate}
                                className="bg-green-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-green-700"
                            >
                                Guardar
                            </button>
                            <button
                                onClick={() => {
                                    setNewEmail(email);
                                    setEditingEmail(false);
                                }}
                                className="text-red-500 text-sm hover:underline"
                            >
                                Cancelar
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-800">{email}</span>
                            <button
                                onClick={() => setEditingEmail(true)}
                                className="text-blau text-sm hover:underline"
                            >
                                Editar
                            </button>
                        </div>
                    )}
                </div>

                {/* PASSWORD SECTION */}
                <div className="mb-4">
                    <button
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                        className="text-blau text-sm hover:underline"
                    >
                        {showPasswordForm ? 'Ocultar cambio de contraseña' : 'Cambiar contraseña'}
                    </button>
                </div>

                {showPasswordForm && (
                    <form onSubmit={handlePasswordUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blau text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                        >
                            Guardar nueva contraseña
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Settings;
