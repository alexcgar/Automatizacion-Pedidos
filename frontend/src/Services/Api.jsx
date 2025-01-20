import axios from "axios"; // Importamos axios para realizar peticiones HTTP


export const fetchCorreos = async () => {
  try {
    const response = await axios.get("http://10.83.0.17:5000/api/predicciones");
    if (response.status !== 200) {
      throw new Error(`Error en la solicitud: ${response.statusText}`);
    }
    return response.data; // Axios automatically parses JSON responses
  } catch (error) {
    console.error("Error al obtener predicciones:", error);
    return []; // Devuelve un array vacío en caso de error
  }
};


export const sendSeleccion = async (seleccion, descripcion) => {
  try {
    await axios.post("http://10.83.0.17:5000/api/send-seleccion", {
      seleccion, 
      descripcion  
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch {
    console.log("Error al enviar la selección:");
    // throw new Error("Hubo un problema al enviar la selección.");
  }
};

export const buscarProductos = async (busqueda) => {
  try {
    const response = await axios.post("http://10.83.0.17:5000/api/buscar", { busqueda });
    return response.data.rango_descripciones;
  } catch (err) {
    console.error("Error al buscar productos:", err);
    return []; // Devuelve un array vacío en caso de error
  }
};

export const generateOrder = async (orderData) => {
  try {
    const response = await axios.post('/api/generate_order', orderData);
    return response.data;
  } catch (error) {
    console.error('Error al generar el pedido:', error);
    throw error;
  }
};