import Navbar from "./components/Navbar/Navbar.jsx";
import Employee from "./components/Employee/Employee.jsx";
import Footer from "./components/Footer/Footer.jsx";
import Correos from "./components/Correos/Correos.jsx";
import AudioRecorder from "./components/Audio/Audio.jsx";
import Login from "./components/Login/Login.jsx";
import DashBoard from "./components/DashBoard/DashBoard.jsx";
import "mdb-react-ui-kit/dist/css/mdb.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./App.css";
import { useState } from "react";

function App() {
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [audioBase64, setAudioBase64] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showDashboard, setShowDashboard] = useState(true);
  const [idBoton, setIdBoton] = useState(null);

  const handleLogin = (isLoggedIn) => {
    setIsLoggedIn(isLoggedIn);
    setShowDashboard(true);
  };

  const handleButtonClick = (id) => {
    setIdBoton(id);
    setShowDashboard(false);
  };


  if (!isLoggedIn) {
    return (
      <Login
        setIsLoggedIn={handleLogin}
        setUserEmail={setEmail}
        setUserPassword={setPassword}
        audioBase64={audioBase64}
      />
    );
  }

  if (showDashboard) {
    return (
      <DashBoard
        setIdBoton={setIdBoton}
        onButtonClick={handleButtonClick}
        email={email}
        password={password}
      />
    );
  }

  return (
    <div className="container-fluid d-flex flex-column min-vh-100 ">
      <div className="row">
        <div className="col-12 mb-5 mt-2">
          <Navbar setisLoggedin={setIsLoggedIn}  />{" "}
        </div>
      </div>

      <div className="row  justify-content-center flex-grow-1 p-3">
        <div className="col-lg-12 mb-5 mt-4">
          <Employee
            productos={productosSeleccionados}
            setIsLoggedIn={setIsLoggedIn}
            email={email}
            password={password}
          />
        </div>
        <div className="col-12">
          <Correos setProductosSeleccionados={setProductosSeleccionados} idBoton={idBoton} />
        </div>
      </div>
      <div className="row ">
        <div className="col-12 p-4 ">
          <AudioRecorder setAudioBase64={setAudioBase64} />{" "}
        </div>
      </div>
      <div className="row mt-auto">
        <div className="col-12 p-0 m-0">
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default App;
