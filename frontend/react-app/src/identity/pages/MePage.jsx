import React from "react";
import { useState } from "react";

import axios from "axios";

export default function MePage() {

  const [token, setToken] =
    useState("");

  const [response, setResponse] =
    useState("");

  async function callProtectedApi() {

    try {

      const result =
        await axios.get(

          "https://merkado-api.tech-labs.dev/api/v1/users/me",

          {
            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }

        );

      setResponse(result.data);

    } catch (error) {

      console.error(error);

      setResponse("Request failed");

    }
  }

  return (

    <div style={{ padding: "20px" }}>

      <h1>
        Protected API Test
      </h1>

      <textarea

        rows="8"
        cols="100"

        placeholder="Paste JWT token"

        value={token}

        onChange={(e) =>
          setToken(e.target.value)
        }

      />

      <br />
      <br />

      <button
        onClick={callProtectedApi}
      >
        Call Protected API
      </button>

      <br />
      <br />

      <strong>Response:</strong>

      <p>{response}</p>

    </div>
  );
}