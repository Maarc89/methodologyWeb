import {Navigate} from 'react-router-dom';
import {hasAuthToken} from '../utils/auth.js';

const PrivateRoute = ({children}) => {
    return hasAuthToken() ? children : <Navigate to="/login" replace/>;
};

export default PrivateRoute;
