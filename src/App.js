import './App.css';
import { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

function App() {
  const [logCom, setLogCom] = useState(true);
  const [signCom, setSignCom] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginFormValues, setLoginFormValues] = useState({
    userId: "",
    password: ""
  });

  const [signFormValues, setSignFormValues] = useState({
    userId: "",
    password: "",
    confirmPassword: ""
  });

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken(token);
    }
  }, []);

  function handleSignUp() {
    setSignCom(true);
    setLogCom(false);
  }

  function handleLogIn() {
    setSignCom(false);
    setLogCom(true);
  }

  function handleLogChange(e) {
    const { name, value } = e.target;
    setLoginFormValues(prev => ({ ...prev, [name]: value }));
  }

  function handleSignChange(e) {
    const { name, value } = e.target;
    setSignFormValues(prev => ({ ...prev, [name]: value }));
  }

  async function handlelogInData(e) {
    e.preventDefault();
    if (!loginFormValues.userId || !loginFormValues.password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/login", loginFormValues);
      toast.success(res.data.message);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      await verifyToken(res.data.token);
      navigate('/home'); // Redirect to Home after successful login
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred. Please try again.");
    }
  }

  async function verifyToken(token) {
    try {
      const res = await axios.post("http://localhost:5000/verify", { token });
      console.log("Token verified:", res.data);
    } catch (error) {
      console.error("Token verification failed:", error);
      localStorage.removeItem('token'); // Remove invalid token
      navigate('/');
    }
  }

  async function handleSignUpData(e) {
    e.preventDefault();
    if (!signFormValues.userId || !signFormValues.password || !signFormValues.confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (signFormValues.password !== signFormValues.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/signup', signFormValues);
      if (res.status === 201) {
        toast.success(res.data.message);
        setSignCom(false);
        setLogCom(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred. Please try again.");
    }
  }

  return (
    <div className="App">
      <ToastContainer className="notify" position='top-center' />
      {logCom ? (
        <div className="auth">
          <h1>Logo</h1>
          <h4>Enter your credentials to access your account</h4>
          <form className="form" onSubmit={handlelogInData}>
            <TextField
              id="UserId"
              name="userId"
              label="UserID"
              variant="outlined"
              className="textfield"
              value={loginFormValues.userId}
              onChange={handleLogChange}
            />
            <TextField
              id="Password"
              name="password"
              label="Password"
              variant="outlined"
              type={showLoginPassword ? "text" : "password"}
              className="textfield"
              value={loginFormValues.password}
              onChange={handleLogChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowLoginPassword(!showLoginPassword)}>
                      {showLoginPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <button className="btn" type="submit">Sign In</button>
            <button className="btn" type="button" onClick={handleSignUp}>Sign Up</button>
          </form>
        </div>
      ) : (
        <div className="auth">
          <h1>Logo</h1>
          <h4>Create New Account</h4>
          <form className="form" onSubmit={handleSignUpData}>
            <TextField
              id="UserId"
              name="userId"
              label="UserID"
              variant="outlined"
              className="textfield"
              value={signFormValues.userId}
              onChange={handleSignChange}
            />
            <TextField
              id="Password"
              name="password"
              label="Password"
              variant="outlined"
              type={showSignupPassword ? "text" : "password"}
              className="textfield"
              value={signFormValues.password}
              onChange={handleSignChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowSignupPassword(!showSignupPassword)}>
                      {showSignupPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              id="ConfirmPassword"
              name="confirmPassword"
              label="Confirm Password"
              variant="outlined"
              type={showConfirmPassword ? "text" : "password"}
              className="textfield"
              value={signFormValues.confirmPassword}
              onChange={handleSignChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <button className="btn" type="button" onClick={handleLogIn}>Sign In</button>
            <button className="btn" type="submit">Sign Up</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
