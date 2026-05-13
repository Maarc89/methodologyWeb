import React from 'react';
import keycloak from '../Keycloak';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';

const Login = () => {
    const handleLogin = () => {
        keycloak.login();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-app">
            <Card className="max-w-md w-full p-8 text-center">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Iniciar sesión</h2>
                <Button variant="brand" className="w-full" onClick={handleLogin}>Iniciar sesión con Keycloak</Button>
            </Card>
        </div>
    );
};

export default Login;
