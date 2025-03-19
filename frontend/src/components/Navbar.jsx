import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Chat App</Link>
      </div>
      <div className="navbar-menu">
        {isAuthenticated ? (
          <>
            <div className="navbar-item">
              <Link to="/profile">
                {user ? `${user.firstName} ${user.lastName}` : 'Profile'}
              </Link>
            </div>
            <div className="navbar-item">
              <button className="btn btn-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="navbar-item">
              <Link to="/login">Login</Link>
            </div>
            <div className="navbar-item">
              <Link to="/register">Register</Link>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;