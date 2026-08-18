import React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";

export default function AppCard({ children, ...props }) {
  return (
    <Card elevation={2} {...props}>
      <CardContent
        sx={{
          p: 4,

          "&:last-child": {
            pb: 4,
          },
        }}
      >
        {children}
      </CardContent>
    </Card>
  );
}
/*
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";

export default function AppCard({
                                    children,
                                    ...props
                                }) {
    return (
        <Card {...props}>
            <CardContent>
                {children}
            </CardContent>
        </Card>
    );
}

 */
