import { useState, useEffect } from "react";
import { Button, Collapse, Table } from "react-bootstrap";
import PropTypes from "prop-types";
import axios from "axios";
import "../components_css/Audio.css";
import CustomAudioPlayer from "../ReproductorAudio/ReproductorAudio";
import { authenticate } from "../../Services/apiServices"; // Asegúrate de importar esto

const AudioPlayer = ({ setAudioBase64, idBoton }) => {
  const [audioUrl, setAudioUrl] = useState("");
  const [open, setOpen] = useState(false);

  // Función para convertir base64 a Blob y generar una URL
  const base64ToAudioUrl = (base64String) => {
    try {
      const binaryString = window.atob(base64String);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: "audio/mp4" }); // Cambia a "audio/mp4" si es MP4
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.warn("Error al convertir base64 a audio URL:", error);
      return "";
    }
  };

  // Obtener el audio desde el endpoint consult
  useEffect(() => {
    const fetchAudioFromConsult = async () => {
      try {
        const response = await axios.post(
          "https://erp.wskserver.com:56544/api/audiomp3toordersl/consult",
          {
            CodCompany: "1",
            CodUser: "juani",
            IDMessage: idBoton,
            IsAll: false,
          },
          {
            headers: {
              Authorization: `Bearer ${await authenticate()}`,
              "Content-Type": "application/json",
            },
          }
        );
        const result = response.data;
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          const entity = result.data[0]; // Tomamos la primera entidad; ajusta si necesitas otra lógica
          const base64Audio = entity.FileMP3;
          if (base64Audio) {
            console.log("Audio base64 obtenido desde consult:", base64Audio.substring(0, 50) + "...");
            setAudioBase64(base64Audio); // Pasamos el base64 al estado superior
            const url = base64ToAudioUrl(base64Audio);
            setAudioUrl(url);
          } else {
            console.warn("No se encontró FileMP3 en la entidad:", entity);
          }
        } else {
          console.warn("No se encontraron datos válidos en la respuesta:", result);
        }
      } catch (error) {
        console.warn("Error al obtener el audio desde consult:", error);
      }
    };

    fetchAudioFromConsult();
  }, [idBoton, setAudioBase64]);

  const handleDownload = () => {
    if (audioUrl) {
      const link = document.createElement("a");
      link.href = audioUrl;
      link.download = "audio.mp4"; // Cambia a .mp4 si es necesario
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="text-white text-center mb-3 mt-3">
      <Button
        className="mb-1"
        onClick={() => setOpen(!open)}
        style={{ backgroundColor: "#283746", width: "100%", fontSize: "1.1rem" }}
      >
        {open ? "Cerrar Detalles" : "Ver Detalles del Audio"}
      </Button>
      <Collapse in={open}>
        <div className="nova2 text-white">
          <Table bordered className="text-white">
            <thead>
              <tr>
                <th className="text-white"></th>
                <th className="text-white">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ width: "100%" }}>
                  {audioUrl ? (
                    <CustomAudioPlayer audioUrl={audioUrl} />
                  ) : (
                    <p>No hay audio disponible</p>
                  )}
                </td>
                <td>
                  <div className="d-flex gap-3">
                    <Button
                      className="border border-white text-white"
                      variant=""
                      onClick={handleDownload}
                      disabled={!audioUrl}
                    >
                      Descargar
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </Table>
        </div>
      </Collapse>
    </div>
  );
};

AudioPlayer.propTypes = {
  setAudioBase64: PropTypes.func.isRequired,
  idBoton: PropTypes.string.isRequired, // Añadimos idBoton como prop requerida
};

export default AudioPlayer;