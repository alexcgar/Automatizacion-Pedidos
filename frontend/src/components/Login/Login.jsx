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
  const [isLoading, setIsLoading] = useState(false);

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
    // Validar campos
    if (!codUser.trim()) {
      setError("Porfavor introduce tu codigo de usuario");  
      return;
    }
    
    if (!password.trim()) {
      setError("Porfavor introduce tu contraseña");
      return;
    }

    setError(""); // Limpiar errores previos
    setIsLoading(true);
    
    // IMPORTANTE: Procesar primero las credenciales conocidas antes de hacer la petición
    // Para usuarios de prueba
    if (codUser.toLowerCase() === "juani" && password === "jfas") {
      console.log("Permitiendo acceso a usuario de prueba");
      setIsLoggedIn(true);
      setUserEmail(codUser);
      setUserPassword(password);
      localStorage.setItem("userEmail", codUser);
      localStorage.setItem("userPassword", password);
      setIsLoading(false);
      return;
    }
    
    try {
      console.log("Iniciando login para usuario:", codUser);
      // Se obtiene la información del usuario mediante fetchLoginUser
      const response = await fetchLoginUser("1", codUser, password);
      
      // Log completo de la respuesta para diagnóstico
      console.log("Respuesta API completa:", response);
      
      // Para debugging: verificar si la respuesta tiene la estructura esperada
      if (response === undefined || response === null) {
        console.error("Respuesta de API indefinida o nula");
        setError("Error en la comunicación con el servidor");
        return;
      }

      // Verificar que la respuesta fue exitosa - API devuelve isError: false si es exitoso
      // También verificamos otras posibles formas de indicar éxito
      const isSuccess = 
        response?.success === true || 
        response?.data?.success === true || 
        response?.status === 200 ||
        response?.status === "200" ||
        response?.isError === false || // Esta es la clave - API devuelve isError: false
        (response?.CodUser && response?.CodUser.toLowerCase() === codUser.toLowerCase()); // Verificar si devuelve el usuario
      
      // Verificar si hay IDWarehouse
      const hasWarehouse = response?.IDWarehouse && response.IDWarehouse.trim() !== "";
      
      if (isSuccess) {
        if (!hasWarehouse) {
          // La autenticación es correcta pero no tiene almacén
          console.error("Usuario autenticado pero sin almacén asignado");
          setError("No tiene el almacén establecido");
        } else {
          console.log("Login exitoso, guardando datos de usuario");
          // Si se obtiene la información del usuario correctamente, se establece la sesión
          setIsLoggedIn(true);
          setUserEmail(codUser);
          setUserPassword(password);
          localStorage.setItem("userEmail", codUser);
          localStorage.setItem("userPassword", password);
        }
      } else {
        // La API respondió pero con error
        const errorMsg = response?.message || "Credenciales no válidas. Por favor, verifique sus datos.";
        console.error("Error de login:", errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      // Error de conexión o en la petición
      console.error("Error de login:", error);
      if (error.response) {
        // La API respondió con un código de estado diferente de 2xx
        if (error.response.status === 401) {
          setError("Usuario o contraseña incorrectos");
        } else {
          setError(`Error: ${error.response.data?.message || "Credenciales no válidas"}`);
        }
      } else if (error.request) {
        // La solicitud se realizó pero no se recibió respuesta
        setError("No se pudo conectar con el servidor. Verifique su conexión.");
      } else {
        // Error en la configuración de la solicitud
        setError("Error al intentar iniciar sesión. Por favor, inténtelo de nuevo.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
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

              {error && <p className="text-danger text-center mb-3">{error}</p>}
              <MDBInput
                wrapperClass="mb-4 w-100"
                label="Usuario"
                id="formControlLgUsuario"
                type="text"
                size="lg"
                value={codUser}
                onChange={(e) => setCodUser(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <MDBInput
                wrapperClass="mb-4 w-100"
                label="Contraseña"
                id="formControlLgContraseña"
                type="password"
                size="lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <MDBBtn size="lg" onClick={handleLogin} disabled={isLoading}>
                {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
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