import {
  MDBFooter,
  MDBContainer,
  MDBRow,
  MDBCol,
} from "mdb-react-ui-kit";
import logo from "../../assets/logo-blanco-novagric-200x146.png";
import "../components_css/Footer.css";

export default function Footer() {
  return (
    <MDBFooter className='nova text-white  mt-4 '>
      <MDBContainer className='p-5'>
        <MDBRow >
          {/* Logo Column */}
          <MDBCol lg='12' md='12' className='mb-1 text-center '>
            <a href='https://novagric.com/' className='text-white me-4'>
            <img 
              src={logo} 
              alt="Logo" 
              style={{ maxHeight: '100px' }}
            />
            </a>
          </MDBCol>          
        </MDBRow>
      </MDBContainer>
    </MDBFooter>
  );
}