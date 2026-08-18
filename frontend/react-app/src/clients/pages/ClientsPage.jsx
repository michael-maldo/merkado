import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import PageContainer from "../../shared/components/layout/PageContainer";
import PageHeader from "../../shared/components/layout/PageHeader";
import { clientsApi } from "../../shared/api/mvpApi";
const initialClient = {
  name: "",
  phone: "",
  address: "",
  socialHandle: "",
  email: "",
};
export default function ClientsPage() {
  const [items, setItems] = useState([]),
    [form, setForm] = useState(initialClient),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState(null),
    [detail, setDetail] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const load = async (term) => {
    setLoading(true);
    try {
      setItems(
        term.trim()
          ? await clientsApi.search(term.trim())
          : await clientsApi.list(),
      );
    } catch (e) {
      setError(e.response?.data?.message || "Could not load client records.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const timeout = setTimeout(() => load(query), 250);
    return () => clearTimeout(timeout);
  }, [query]);
  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await clientsApi.create(form);
      setForm(initialClient);
      await load("");
    } catch (e) {
      setError(e.response?.data?.message || "Could not create client.");
    } finally {
      setSaving(false);
    }
  };
  const view = async (item) => {
    setSaving(true);
    try {
      setDetail(await clientsApi.get(item.id));
    } catch (e) {
      setError(e.response?.data?.message || "Could not load client.");
    } finally {
      setSaving(false);
    }
  };
  const update = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await clientsApi.update(selected.id, selected);
      setSelected(null);
      await load(query);
    } catch (err) {
      setError(err.response?.data?.message || "Could not update client.");
    } finally {
      setSaving(false);
    }
  };
  const archive = async (item) => {
    if (!window.confirm(`Archive ${item.name}?`)) return;
    setSaving(true);
    try {
      await clientsApi.archive(item.id);
      await load(query);
    } catch (e) {
      setError(e.response?.data?.message || "Could not archive client.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <PageContainer>
      <PageHeader
        title="Clients"
        subtitle="Maintain accurate customer records for sales and fulfilment."
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      )}
      <Card sx={{ mb: 2.5 }}>
        <CardContent component="form" onSubmit={create}>
          <Typography variant="h6">New client</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Contact details are available during order entry.
          </Typography>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5}>
            <TextField
              required
              label="Client name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              required
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <TextField
              required
              fullWidth
              label="Delivery address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving…" : "Add client"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <Box
          sx={{
            p: 2.5,
            display: "flex",
            alignItems: { sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Client register</Typography>
            <Typography variant="body2" color="text.secondary">
              {items.length} matching client{items.length === 1 ? "" : "s"}
            </Typography>
          </Box>
          <TextField
            size="small"
            placeholder="Search name, phone or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">⌕</InputAdornment>
              ),
            }}
            sx={{ width: { xs: "100%", sm: 310 } }}
          />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Client</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Delivery address</TableCell>
                <TableCell>Social handle</TableCell>
                <TableCell>Record status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow hover key={item.id}>
                    <TableCell>
                      <Typography variant="subtitle2">{item.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.email || "No email recorded"}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.phone}</TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>{item.address}</TableCell>
                    <TableCell>{item.socialHandle || "—"}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={
                          item.active === false
                            ? "text.secondary"
                            : "success.main"
                        }
                      >
                        {item.active === false ? "Archived" : "Active"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => view(item)}>
                        View
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setSelected({ ...item })}
                      >
                        Edit
                      </Button>
                      {item.active !== false && (
                        <Button
                          size="small"
                          color="error"
                          onClick={() => archive(item)}
                        >
                          Archive
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!loading && !items.length && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align="center"
                    sx={{ py: 5, color: "text.secondary" }}
                  >
                    No clients match this search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)}>
        <DialogTitle>{detail?.name}</DialogTitle>
        <DialogContent>
          <Typography>{detail?.phone}</Typography>
          <Typography>{detail?.address}</Typography>
          <Typography>{detail?.email || "No email recorded"}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={update}>
          <DialogTitle>Edit client</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                required
                label="Name"
                value={selected?.name || ""}
                onChange={(e) =>
                  setSelected({ ...selected, name: e.target.value })
                }
              />
              <TextField
                required
                label="Phone"
                value={selected?.phone || ""}
                onChange={(e) =>
                  setSelected({ ...selected, phone: e.target.value })
                }
              />
              <TextField
                required
                label="Address"
                value={selected?.address || ""}
                onChange={(e) =>
                  setSelected({ ...selected, address: e.target.value })
                }
              />
              <TextField
                label="Social handle"
                value={selected?.socialHandle || ""}
                onChange={(e) =>
                  setSelected({ ...selected, socialHandle: e.target.value })
                }
              />
              <TextField
                label="Email"
                value={selected?.email || ""}
                onChange={(e) =>
                  setSelected({ ...selected, email: e.target.value })
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelected(null)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              Save
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </PageContainer>
  );
}
