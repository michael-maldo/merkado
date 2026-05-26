import { useState } from "react";

import axios from "axios";

export default function LoginPage() {

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [token, setToken] =
    useState("");

  const [error, setError] =
    useState("");

  async function handleLogin() {

    try {

      setError("");

      const response =
        await axios.post(

          "http://localhost:8080/api/v1/auth/login",

          {
            username,
            password
          }

        );

      console.log(response.data);

      setToken(response.data.token);

    } catch (err) {

      console.error(err);

      setError("Login failed");

    }
  }

  return (

    <div style={{ padding: "20px" }}>

      <h1>Merkado Login</h1>

      <div>

        <input
          type="text"

          placeholder="Username"

          value={username}

          onChange={(e) =>
            setUsername(e.target.value)
          }
        />

      </div>

      <br />

      <div>

        <input
          type="password"

          placeholder="Password"

          value={password}

          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

      </div>

      <br />

      <button onClick={handleLogin}>
        Login
      </button>

      <br />
      <br />

      {error && (
        <p>{error}</p>
      )}

      {token && (

        <div>

          <strong>JWT Token:</strong>

          <textarea

            rows="10"
            cols="100"

            value={token}

            readOnly

          />

        </div>

      )}

    </div>

  );
}