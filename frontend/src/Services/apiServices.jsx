
import axios from 'axios';



const API_SERVER = 'https://dinasa.wskserver.com:56544';
const USERNAME = "apiuser";
const PASSWORD = "XFBORp6srOlNY96qFLmr";

let authToken = null; // Variable para almacenar el token

/**
 * Función para autenticarse y obtener el token.
 */
export const authenticate = async () => {
  if (authToken) {
    // Si ya tenemos un token, lo reutilizamos
    return authToken;
  }

  try {
    const authResponse = await axios.post(`${API_SERVER}/api/login/authenticate`, {
      Username: USERNAME,
      Password: PASSWORD,
    });

    // Verificar si la respuesta tiene el token
    if (authResponse.data) {
      authToken = authResponse.data.replace(/'/g, '');
      return authToken;
    } else {
      throw new Error('Autenticación fallida: Token no recibido.');
    }
  } catch (error) {
    console.error('Error durante la autenticación:', error);
    throw error;
  }
};

export const insertAudioMP3ToOrderSL = async (audioData) => {
  try {
    const token = await authenticate();

    const response = await axios.post(
      `${API_SERVER}/api/audiomp3toordersl/insert`,
      audioData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data && response.data.success) {
      return response.data.data.IDAudioMP3ToOrderSL;
    } else {
      throw new Error('Error al insertar la entidad AudioMP3ToOrderSL.');
    }
  } catch (error) {
    console.error('Error al insertar la entidad AudioMP3ToOrderSL:', error);
    throw error;
  }
};


/**
 * Generar pedido.
 */
export const generateOrder = async (orderData) => {
  try {
    const token = await authenticate();

    const response = await axios.post(
      `${API_SERVER}/api/audiomp3toordersl/generateordersl`,
      orderData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log('Estado de la respuesta:', response.status); // Registrar el estado de la respuesta
    console.log('Encabezados de la respuesta:', response.headers); // Registrar los encabezados de la respuesta
    console.log('Datos de la respuesta:', response.data); // Registrar los datos de la respuesta

    if (response.data && response.data.success) {
      return response.data;
    } else {
      throw new Error('Solicitud fallida: No se pudo generar el pedido.');
    }
  } catch (error) {
    console.error('Error al generar el pedido:', error);

    throw error;
  }
};

export const generateEntity = async (entityData) => {
  try {
    const token = await authenticate();

    const response = await axios.post(
      `${API_SERVER}/api/audiomp3toordersl/insert`,
      entityData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data && response.data.success) {
      return response.data;
    } else {
      console.error('Respuesta del servidor:', response.data);
      throw new Error('Solicitud fallida: No se pudo generar la entidad.');
    }
  } catch (error) {
    console.error('Error al generar la entidad:', error);
    throw error;
  }
};

export const fetchLoginUser = async (codCompany, codUser, password) => {
  try {
    const token = await authenticate();

    const response = await axios.post(
      `${API_SERVER}/api/User/getbycodv2`,
      {
        CodCompany: codCompany,
        CodUser: codUser,
        Password: password,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      console.error('Respuesta del servidor:', response.data);
      throw new Error('Solicitud fallida: No se pudo obtener la información del usuario.');
    }
  }
  catch (error) {
    console.error('Error al obtener la información del usuario:', error);
    throw error;
  }
}

export const fetchEmployeeInfo = async (codCompany, codUser, idMessage) => { // Consultar información del empleado entidad
  try {
    const token = await authenticate(); // Asumiendo que tienes una función de autenticación que obtiene el token

    const response = await axios.post(
      `${API_SERVER}/api/audiomp3toordersl/consult`,
      {
        CodCompany: codCompany,
        CodUser: codUser,
        IDMessage: idMessage,
        IsAll: false, // Agregar el campo faltante
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      console.error('Respuesta del servidor:', response.data);
      throw new Error('Solicitud fallida: No se pudo obtener la información del empleado.');
    }
  } catch (error) {
    console.error('Error al obtener la información del empleado:', error);
    throw error;
  }
};

export const fetchAlbaranesSinFirmar = async (codCompany, idWarehouse) => {
  try {
    const token = await authenticate();

    const response = await axios.post(
      `${API_SERVER}/api/ZappStudio/getinfowindow`,
      {
        CodCompany: codCompany,
        IDWarehouse: idWarehouse,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      console.error('Respuesta del servidor:', response.data);
      throw new Error('Solicitud fallida: No se pudieron obtener los albaranes sin firmar.');
    }
  } catch (error) {
    console.error('Error al obtener los albaranes sin firmar:', error);
    throw error;
  }
}

export const fetchDocumentosSinUbicar = async (codCompany, idWarehouse) => {
  try {
    const token = await authenticate();

    const response = await axios.post(
      `${API_SERVER}/api/MySGA/getinfowindow`,
      {
        CodCompany: codCompany,
        IDWarehouse: idWarehouse,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      console.error('Respuesta del servidor:', response.data);
      throw new Error('Solicitud fallida: No se pudieron obtener los albaranes sin firmar.');
    }
  } catch (error) {
    console.error('Error al obtener documentos', error);
    throw error;
  }
}