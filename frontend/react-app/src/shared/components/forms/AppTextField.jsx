import React from "react";
import TextField from "@mui/material/TextField";

export default function AppTextField({
                                         margin = "normal",
                                         ...props
                                     }) {
    return (
        <TextField
            fullWidth
            variant="outlined"
            margin={margin}
            {...props}
        />
    );
}
/*
import TextField from "@mui/material/TextField";

export default function AppTextField(props) {
    return (
        <TextField
            fullWidth
            variant="outlined"
            {...props}
        />
    );
}

 */