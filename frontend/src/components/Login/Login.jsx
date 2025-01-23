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
import { authenticate, generateEntity } from "../../Services/apiServices";
import axios from "axios";
import logo from "../../assets/novaLogo.png";

const arrayBufferToBase64 = (buffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const Login = ({ setIsLoggedIn, setUserEmail, setUserPassword }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [audioBase64, setAudioBase64] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [entityGenerated, setEntityGenerated] = useState(false);

  // Obtener el audio desde el servidor
  useEffect(() => {
    const handleObtenerAudio = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/getAudio", {
          responseType: "arraybuffer",
        });

        if (response.status === 200) {
          // Convertir arraybuffer a base64
          const base64String = arrayBufferToBase64(response.data);
          setAudioBase64(base64String);

          // Crear Blob URL para reproducir el audio
          const audioBlob = new Blob([response.data], { type: "audio/mp3" });
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
        }
      } catch (error) {
        console.error("Error al obtener el audio:", error);
        setError("Error al obtener el audio. Por favor, inténtelo de nuevo.");
      }
    };

    handleObtenerAudio();
  }, []);

  // Generar entidad cuando el audioBase64 esté disponible
  useEffect(() => {
    if (!audioBase64 || entityGenerated) {
      return;
    }

    const fetchPrediccionesAndGenerateEntity = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/predicciones");

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const responseText = await response.text();
          console.error("Respuesta inesperada:", responseText);
          throw new Error("La respuesta no es un JSON válido");
        }

        const predicciones = await response.json();

        if (predicciones && predicciones.length > 0 && audioUrl) {
          const IdMessage = predicciones[0]?.correo_id;

          const entityData = {
            CodCompany: "1",
            IDWorkOrder: "1074241204161431", // Datos de ejemplo
            IDEmployee: "804f63b9-89fe-446e-a2c3-f11bb7be8e27", // ID de empleado
            IDMessage: IdMessage,
            TextTranscription: predicciones
              .map((producto) => `${producto.descripcion}${producto.cantidad}`)
              .join(","),
            FileMP3: audioBase64,
          };
          // console.log("Generando entidad:", entityData);
          try {
            const entityResponse = await generateEntity(entityData);
            console.log("Entidad generada exitosamente:", entityResponse);
            setEntityGenerated(true);
          } catch (error) {
            console.error("Error al generar la entidad:", error);
            setError("Error al generar la entidad: " + error.message);
          }
        }
      } catch (error) {
        setError("Error al obtener las predicciones: " + error.message);
      }
    };

    fetchPrediccionesAndGenerateEntity();
  }, [audioBase64, audioUrl, entityGenerated]);

  const handleLogin = async () => {
    try {
      const token = await authenticate(email, password);
      if (token) {
        setIsLoggedIn(true);
        setUserEmail(email);
        setUserPassword(password);
      }
    } catch (error) {
      if (error.response) {
        console.error("Error en la respuesta del servidor:", error.response.data);
        if (error.response.status === 401) {
          setError("No autorizado. Por favor, verifique sus credenciales.");
        } else {
          setError(`Error: ${error.response.data.message || "Error desconocido"}`);
        }
      } else if (error.request) {
        console.error("No se recibió respuesta del servidor:", error.request);
        setError("No se recibió respuesta del servidor. Por favor, inténtelo de nuevo.");
      } else {
        console.error("Error al configurar la solicitud:", error.message);
        setError("Error durante la autenticación. Por favor, inténtelo de nuevo.");
      }
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
