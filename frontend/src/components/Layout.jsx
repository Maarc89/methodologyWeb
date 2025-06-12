import Header from './Header';
import Footer from './Footer';
import {Outlet} from 'react-router-dom';

const Layout = ({isAuthenticated, onLogout}) => {
    return (
        <div className="min-h-screen flex flex-col">
            <Header isAuthenticated={isAuthenticated} onLogout={onLogout} />
            <main className="flex-grow container mx-auto px-4 py-6">
                <Outlet/>
            </main>
            <Footer/>
        </div>
    );
};

export default Layout;
