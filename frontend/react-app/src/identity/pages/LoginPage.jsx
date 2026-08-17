import React from "react";
import { useState } from "react";

import { useNavigate } from "react-router-dom";

import {
    Box,
    Typography
} from "@mui/material";

import { useAuth } from "../hooks/useAuth";

import AppButton
    from "../../shared/components/buttons/AppButton";

import AppCard
    from "../../shared/components/cards/AppCard";

import AppTextField
    from "../../shared/components/forms/AppTextField";

import AppAlert
    from "../../shared/components/feedback/AppAlert";

export default function LoginPage() {

    const navigate = useNavigate();

    const { login } = useAuth();

    const [username, setUsername] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const handleSubmit =
        async (event) => {

            event.preventDefault();

            setError("");

            try {

                setLoading(true);

                await login(
                    username,
                    password
                );

                navigate(
                    "/dashboard"
                );

            } catch (err) {

                console.error(
                    "Login failed:",
                    err
                );

                setError(
                    "Invalid username or password"
                );

            } finally {

                setLoading(false);
            }
        };

    return (

        <AppCard
            sx={{
                width: "100%",
                maxWidth: 420
            }}
        >

            <Box
                component="form"
                onSubmit={handleSubmit}
            >

                <Box sx={{ width: 42, height: 42, mx: "auto", mb: 2, borderRadius: 1.25, display: "grid", placeItems: "center", bgcolor: "primary.dark", color: "white", fontWeight: 800 }}>M</Box>
                <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 800, letterSpacing: ".04em" }}>MERKADO</Typography>

                <Typography
                    variant="body2"
                    color="text.secondary"
                    align="center"
                    sx={{ mb: 3 }}
                >
                    Sign in to the operations workspace
                </Typography>

                {error && (

                    <AppAlert
                        severity="error"
                    >
                        {error}
                    </AppAlert>

                )}

                <AppTextField
                    label="Username"
                    value={username}
                    onChange={(event) =>
                        setUsername(
                            event.target.value
                        )
                    }
                    autoComplete="username"
                    autoFocus
                    margin="normal"
                />

                <AppTextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                        setPassword(
                            event.target.value
                        )
                    }
                    autoComplete="current-password"
                    margin="normal"
                />

                <AppButton
                    type="submit"
                    fullWidth
                    disabled={
                        loading ||
                        !username ||
                        !password
                    }
                    sx={{
                        mt: 2
                    }}
                >
                    {loading
                        ? "Signing In..."
                        : "Sign In"}
                </AppButton>

            </Box>

        </AppCard>
    );
}

/*
import React from "react";
import { useState } from "react";

import { useNavigate } from "react-router-dom";

import {
    Box,
    Button,
    TextField,
    Typography
} from "@mui/material";

import { useAuth }
from "../hooks/useAuth";

export default function LoginPage() {

    const navigate =
        useNavigate();

    const { login } =
        useAuth();

    const [username, setUsername] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const handleSubmit =
    async (event) => {

        event.preventDefault();

        setError("");

        try {

            setLoading(true);

            await login(
                username,
                password
            );

            navigate(
                "/dashboard"
            );

        } catch (err) {

            setError(
                "Invalid username or password"
            );

        } finally {

            setLoading(false);
        }
    };

    return (

    <Box
        sx={{
            width: 400,
            mx: "auto",
            mt: 10
        }}
    >

        <Typography
            variant="h4"
            gutterBottom
        >

            Login

        </Typography>

        <form
            onSubmit={handleSubmit}
        >

            <TextField
                fullWidth
                margin="normal"
                label="Username"
                value={username}
                onChange={(event) =>
                    setUsername(
                        event.target.value
                    )
                }
            />

            <TextField
                fullWidth
                margin="normal"
                type="password"
                label="Password"
                value={password}
                onChange={(event) =>
                    setPassword(
                        event.target.value
                    )
                }
            />

            {
                error && (

                    <Typography
                        color="error"
                    >
                        {error}
                    </Typography>
                )
            }

            <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{ mt: 2 }}
            >

                {
                    loading
                        ? "Signing In..."
                        : "Login"
                }

            </Button>

        </form>

    </Box>
);

}

 */




// import React from "react";
// import { useState } from "react";

// import axios from "axios";

// export default function LoginPage() {

//   const [username, setUsername] =
//     useState("");

//   const [password, setPassword] =
//     useState("");

//   const [token, setToken] =
//     useState("");

//   const [error, setError] =
//     useState("");

//   async function handleLogin() {

//     try {

//       setError("");

//       const response =
//         await axios.post(


//           //DEV
//           "http://localhost:8080/api/v1/auth/login",
//           //PROD
//           // "https://merkado-api.tech-labs.dev/api/v1/auth/login",

//           {
//             username,
//             password
//           }

//         );

//       console.log(response.data);

//       setToken(response.data.token);

//     } catch (err) {

//       console.error(err);

//       setError("Login failed");

//     }
//   }

//   return (

//     <div style={{ padding: "20px" }}>
//       <h1>Merkado Login</h1>

//       <div>

//         <input
//           type="text"

//           placeholder="Username"

//           value={username}

//           onChange={(e) =>
//             setUsername(e.target.value)
//           }
//         />

//       </div>

//       <br />

//       <div>

//         <input
//           type="password"

//           placeholder="Password"

//           value={password}

//           onChange={(e) =>
//             setPassword(e.target.value)
//           }
//         />

//       </div>

//       <br />

//       <button onClick={handleLogin}>
//         Login
//       </button>

//       <br />
//       <br />

//       {error && (
//         <p>{error}</p>
//       )}

//       {token && (

//         <div>

//           <strong>JWT Token:</strong>

//           <textarea

//             rows="10"
//             cols="100"

//             value={token}

//             readOnly

//           />

//         </div>

//       )}

//     </div>

//   );
// }
