import { Navbar, Nav, Container } from 'react-bootstrap';
import "../components_css/Navbar.css"; // Asegúrate de importar el archivo CSS con los estilos personalizados
import PropTypes from 'prop-types';
import logo from "../../assets/logo-blanco-novagric-200x146.png"; // Importa la imagen de React

const NavBar = ({ setIsLoggedIn, onNavigateToDashboard, isDashboardVisible }) => {
  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <div className='navbar-custom'>
      <Navbar>
        <Container fluid>
          <Navbar.Brand>
            <img src={logo} alt="Logo" className='logo' href="https://novagric.com/" />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="navbarNav" />
          <Navbar.Collapse id="navbarNav">
            <Nav className="ms-auto me-1 gap-3">
              <Nav.Link as="button" onClick={onNavigateToDashboard} className="nav-link-button border">
                {isDashboardVisible ? "Refrescar" : "Volver al Inicio"}
              </Nav.Link>
              <Nav.Link as="button" onClick={handleLogout} className="nav-link-button border">
                LOG OUT
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </div>
  );
};

NavBar.propTypes = {
  setIsLoggedIn: PropTypes.func.isRequired,
  onNavigateToDashboard: PropTypes.func.isRequired,
  isDashboardVisible: PropTypes.bool.isRequired,
};

export default NavBar;
