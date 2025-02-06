import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  MDBBtn,
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBCard,
  MDBCardBody,
  MDBInput,
} from "mdb-react-ui-kit";
import "../components_css/Login.css";
import { fetchLoginUser } from "../../Services/apiServices";
import logo from "../../assets/novaLogo.png";

const Login = ({ setIsLoggedIn, setUserEmail, setUserPassword }) => {
  const [codUser, setCodUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Verificar si el usuario ya está logueado
    const storedUser = localStorage.getItem("userEmail");
    const storedPassword = localStorage.getItem("userPassword");
    if (storedUser && storedPassword) {
      setIsLoggedIn(true);
      setUserEmail(storedUser);
      setUserPassword(storedPassword);
    }
  }, [setIsLoggedIn, setUserEmail, setUserPassword]);

  const handleLogin = async () => {
    setError(""); // Limpiar errores previos
    try {
      // Se obtiene la información del usuario mediante fetchLoginUser
      await fetchLoginUser("1", codUser, password);

      // Si se obtiene la información del usuario, se establece la sesión
      setIsLoggedIn(true);
      setUserEmail(codUser);
      setUserPassword(password);
      localStorage.setItem("userEmail", codUser);
      localStorage.setItem("userPassword", password);
    } catch {
      // En caso de error, se muestra el mensaje de credenciales incorrectas
      setError("Credenciales no válidas. Por favor, verifique sus datos.");
    }
  };

  return (
    <MDBContainer fluid className="vh-100" style={{ backgroundColor: "#e4e8ed" }}>
      <MDBRow className="d-flex justify-content-center align-items-center h-100">
        <MDBCol col="12">
          <MDBCard
            className="bg-white my-5 mx-auto"
            style={{ borderRadius: "1rem", maxWidth: "500px" }}
          >
            <MDBCardBody className="p-5 w-100 d-flex flex-column">
              <img
                src={logo}
                alt="Logo"
                className="mb-4 mx-auto d-block"
                style={{ width: "150px" }}
              />

              {error && <p className="text-danger">{error}</p>}
              <MDBInput
                wrapperClass="mb-4 w-100"
                label="Usuario"
                id="formControlLgUsuario"
                type="email"
                size="lg"
                value={codUser}
                onChange={(e) => setCodUser(e.target.value)}
              />
              <MDBInput
                wrapperClass="mb-4 w-100"
                label="Contraseña"
                id="formControlLgContraseña"
                type="password"
                size="lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <MDBBtn size="lg" onClick={handleLogin}>
                Iniciar sesión
              </MDBBtn>
            </MDBCardBody>
          </MDBCard>
        </MDBCol>
      </MDBRow>
    </MDBContainer>
  );
};

Login.propTypes = {
  setIsLoggedIn: PropTypes.func.isRequired,
  setUserEmail: PropTypes.func.isRequired,
  setUserPassword: PropTypes.func.isRequired,
};

export default Login;
