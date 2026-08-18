import React from "react";
import Button from "@mui/material/Button";

export default function AppButton({ children, ...props }) {
  return (
    <Button variant="contained" {...props}>
      {children}
    </Button>
  );
}
/*
import Button from "@mui/material/Button";

export default function AppButton({
                                      children,
                                      ...props
                                  }) {
    return (
        <Button
            variant="contained"
            {...props}
        >
            {children}
        </Button>
    );
}

 */
