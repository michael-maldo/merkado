import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Backdrop,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
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
import {
  clientsApi,
  ordersApi,
  pricingApi,
  productsApi,
} from "../../shared/api/mvpApi";
import { useAuth } from "../../identity/hooks/useAuth";

const money = (value) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
    Number(value || 0),
  );
const statusTone = (status) =>
  ({
    PAYMENT_PENDING: "warning",
    PAYMENT_VERIFIED: "info",
    PACKED: "secondary",
    DISPATCHED: "success",
    COMPLETED: "success",
    CANCELLED: "error",
    FAILED: "error",
  })[status] || "default";
const optionLabel = (options) =>
  Object.entries(options || {})
    .map(([name, value]) => `${name}: ${value}`)
    .join(" · ");
const ORDER_STATUSES = [
  "PAYMENT_PENDING",
  "PAYMENT_VERIFIED",
  "PACKED",
  "DISPATCHED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
];
const countMap = (rows) =>
  Object.fromEntries(
    rows.map((row) => [
      row.status,
      {
        count: Number(row.order_count ?? row.orderCount ?? 0),
        total: Number(row.order_total ?? row.orderTotal ?? 0),
      },
    ]),
  );

export default function OrdersPage() {
  const { user } = useAuth();
  const [ordersByStatus, setOrdersByStatus] = useState({}),
    [statusCounts, setStatusCounts] = useState({}),
    [expandedStatuses, setExpandedStatuses] = useState(new Set()),
    [loadingStatus, setLoadingStatus] = useState(null),
    [clients, setClients] = useState([]),
    [bands, setBands] = useState([]);
  const [productMatches, setProductMatches] = useState([]),
    [selectedProduct, setSelectedProduct] = useState(null),
    [productQuery, setProductQuery] = useState("");
  const [lines, setLines] = useState([]),
    [lineDraft, setLineDraft] = useState({ variantId: "", quantity: 1 });
  const [form, setForm] = useState({ clientId: "", bandId: "" }),
    [detail, setDetail] = useState(null),
    [failureOrder, setFailureOrder] = useState(null),
    [failureReason, setFailureReason] = useState("");
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [searchingProducts, setSearchingProducts] = useState(false),
    [saving, setSaving] = useState(false),
    [viewingOrderId, setViewingOrderId] = useState(null),
    [transitionNotice, setTransitionNotice] = useState(null),
    [highlightOrderId, setHighlightOrderId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const loadedStatuses = Object.keys(ordersByStatus);
      const [countRows, clientRows, discountBands, ...loadedOrders] =
        await Promise.all([
          ordersApi.statusCounts(),
          clientsApi.list(),
          pricingApi.bands(),
          ...loadedStatuses.map((status) => ordersApi.list(status)),
        ]);
      setStatusCounts(countMap(countRows));
      if (loadedStatuses.length)
        setOrdersByStatus((current) => ({
          ...current,
          ...Object.fromEntries(
            loadedStatuses.map((status, index) => [
              status,
              loadedOrders[index],
            ]),
          ),
        }));
      setClients(clientRows.filter((client) => client.active !== false));
      setBands(discountBands.filter((band) => band.active !== false));
    } catch (cause) {
      setError(
        cause.response?.data?.message || "Could not load the order desk.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    let active = true;
    const refreshCounts = async () => {
      try {
        const rows = await ordersApi.statusCounts();
        if (active) setStatusCounts(countMap(rows));
      } catch {
        /* Keep the last known summary during a transient background failure. */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshCounts();
    };
    const timer = window.setInterval(refreshCounts, 30000);
    window.addEventListener("focus", refreshCounts);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshCounts);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  useEffect(() => {
    if (productQuery.trim().length < 2) {
      setProductMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        setProductMatches(
          (await productsApi.search(productQuery.trim())).filter(
            (product) => product.active,
          ),
        );
      } catch {
        setProductMatches([]);
      } finally {
        setSearchingProducts(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [productQuery]);

  const activeVariants = (selectedProduct?.variants || []).filter(
    (variant) => variant.active && variant.available > 0,
  );
  const selectedVariant = activeVariants.find(
    (variant) => String(variant.id) === String(lineDraft.variantId),
  );
  const subtotal = useMemo(
    () =>
      lines.reduce(
        (total, line) => total + Number(line.sellingPrice) * line.quantity,
        0,
      ),
    [lines],
  );

  const chooseProduct = async (summary) => {
    setSelectedProduct(null);
    setLineDraft({ variantId: "", quantity: 1 });
    if (!summary) return;
    setSearchingProducts(true);
    try {
      const product = await productsApi.get(summary.id);
      setSelectedProduct(product);
      const sellable =
        product.variants?.filter(
          (variant) => variant.active && variant.available > 0,
        ) || [];
      if (sellable.length === 1)
        setLineDraft({ variantId: sellable[0].id, quantity: 1 });
    } catch (cause) {
      setError(
        cause.response?.data?.message || "Could not load product variants.",
      );
    } finally {
      setSearchingProducts(false);
    }
  };
  const addLine = () => {
    if (!selectedProduct || !selectedVariant)
      return setError("Choose a product and an available variant.");
    const quantity = Number(lineDraft.quantity);
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > selectedVariant.available
    )
      return setError(
        `Quantity must be between 1 and ${selectedVariant.available}.`,
      );
    setLines((current) => {
      const existing = current.find(
        (line) => line.variantId === selectedVariant.id,
      );
      if (!existing)
        return [
          ...current,
          {
            ...selectedVariant,
            productId: selectedProduct.id,
            productName: selectedProduct.masterName,
            spu: selectedProduct.spu,
            quantity,
          },
        ];
      const combined = existing.quantity + quantity;
      if (combined > selectedVariant.available) {
        setError(
          `Only ${selectedVariant.available} units of ${selectedVariant.sku} are available.`,
        );
        return current;
      }
      return current.map((line) =>
        line.variantId === selectedVariant.id
          ? { ...line, quantity: combined }
          : line,
      );
    });
    setSelectedProduct(null);
    setProductQuery("");
    setProductMatches([]);
    setLineDraft({ variantId: "", quantity: 1 });
    setError("");
  };
  const create = async (event) => {
    event.preventDefault();
    if (!lines.length)
      return setError("Add at least one product variant to the order.");
    setSaving(true);
    setError("");
    try {
      const selectedBand = bands.find(
        (band) => String(band.id) === String(form.bandId),
      );
      if (selectedBand && subtotal < Number(selectedBand.minimum_amount))
        throw new Error(
          `This discount requires an order of at least ${money(selectedBand.minimum_amount)}.`,
        );
      const order = await ordersApi.create({
        clientId: Number(form.clientId),
        items: lines.map((line) => ({
          variantId: line.id,
          quantity: line.quantity,
        })),
      });
      if (selectedBand)
        await ordersApi.addDiscount(order.id, {
          code: selectedBand.name,
          description: `Approved ${selectedBand.percentage}% discount band`,
          amount: Number(
            ((subtotal * Number(selectedBand.percentage)) / 100).toFixed(2),
          ),
        });
      setForm({ clientId: "", bandId: "" });
      setLines([]);
      await load();
    } catch (cause) {
      setError(
        cause.response?.data?.message ||
          cause.message ||
          "Could not create order. Check variant availability.",
      );
    } finally {
      setSaving(false);
    }
  };
  const act = async (id, action) => {
    setError("");
    try {
      const moved = await ordersApi.action(id, action);
      setTransitionNotice({
        id,
        from:
          action === "verify-payment"
            ? "PAYMENT_PENDING"
            : action === "pack"
              ? "PAYMENT_VERIFIED"
              : "PACKED",
        to: moved.status,
      });
      await load();
    } catch (cause) {
      setError(cause.response?.data?.message || "Could not update the order.");
    }
  };
  const view = async (id) => {
    setViewingOrderId(id);
    try {
      await new Promise((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(resolve),
        ),
      );
      setDetail(await ordersApi.get(id));
    } catch (cause) {
      setError(
        cause.response?.data?.message || "Could not load order details.",
      );
    } finally {
      setViewingOrderId(null);
    }
  };
  const update = async (order) => {
    const notes = window.prompt("Order notes", order.notes || "");
    if (notes === null) return;
    setSaving(true);
    try {
      await ordersApi.update(order.id, { notes });
      await load();
    } catch (cause) {
      setError(
        cause.response?.data?.message ||
          "Only payment-pending orders can be updated.",
      );
    } finally {
      setSaving(false);
    }
  };
  const cancel = async (id) => {
    if (!window.confirm("Cancel this order?")) return;
    setSaving(true);
    try {
      await ordersApi.cancel(id);
      await load();
    } catch (cause) {
      setError(cause.response?.data?.message || "Could not cancel order.");
    } finally {
      setSaving(false);
    }
  };
  const failOrder = async (event) => {
    event.preventDefault();
    if (!failureReason.trim()) return;
    setSaving(true);
    setError("");
    try {
      const moved = await ordersApi.fail(failureOrder.id, failureReason.trim());
      setTransitionNotice({
        id: moved.id,
        from: failureOrder.status,
        to: moved.status,
      });
      setFailureOrder(null);
      setFailureReason("");
      await load();
    } catch (cause) {
      setError(
        cause.response?.data?.message || "Could not mark the order as failed.",
      );
    } finally {
      setSaving(false);
    }
  };
  const management = user?.roles?.includes("MANAGEMENT"),
    warehouse = management || user?.roles?.includes("WAREHOUSE");
  const toggleStatus = async (status) => {
    if (expandedStatuses.has(status))
      return setExpandedStatuses((current) => {
        const next = new Set(current);
        next.delete(status);
        return next;
      });
    if (!Object.hasOwn(ordersByStatus, status)) {
      setLoadingStatus(status);
      try {
        const rows = await ordersApi.list(status);
        setOrdersByStatus((current) => ({ ...current, [status]: rows }));
      } catch (cause) {
        setError(
          cause.response?.data?.message ||
            `Could not load ${status.replaceAll("_", " ").toLowerCase()} orders.`,
        );
        return;
      } finally {
        setLoadingStatus(null);
      }
    }
    setExpandedStatuses((current) => new Set([...current, status]));
  };
  const showDestination = async (status, orderId) => {
    if (!Object.hasOwn(ordersByStatus, status)) {
      setLoadingStatus(status);
      try {
        const rows = await ordersApi.list(status);
        setOrdersByStatus((current) => ({ ...current, [status]: rows }));
      } catch (cause) {
        setError(
          cause.response?.data?.message ||
            "Could not load the destination section.",
        );
        return;
      } finally {
        setLoadingStatus(null);
      }
    }
    setExpandedStatuses((current) => new Set([...current, status]));
    setHighlightOrderId(orderId);
    setTransitionNotice(null);
    window.setTimeout(() => {
      const target = [
        ...document.querySelectorAll(`[data-order-id="${orderId}"]`),
      ].find((element) => element.getClientRects().length);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    window.setTimeout(
      () =>
        setHighlightOrderId((current) =>
          current === orderId ? null : current,
        ),
      2200,
    );
  };
  const orderActions = (order) => (
    <Stack
      direction="row"
      justifyContent={{ xs: "flex-start", md: "flex-end" }}
      spacing={0.5}
      flexWrap="wrap"
      useFlexGap
    >
      <Button
        size="small"
        onClick={() => view(order.id)}
        disabled={viewingOrderId !== null}
        startIcon={
          viewingOrderId === order.id ? (
            <CircularProgress size={14} color="inherit" />
          ) : undefined
        }
      >
        {viewingOrderId === order.id ? "Loading…" : "View"}
      </Button>
      {order.status === "PAYMENT_PENDING" && (
        <Button size="small" onClick={() => update(order)}>
          Edit
        </Button>
      )}
      {management && order.status === "PAYMENT_PENDING" && (
        <Button size="small" onClick={() => act(order.id, "verify-payment")}>
          Verify
        </Button>
      )}
      {warehouse && order.status === "PAYMENT_VERIFIED" && (
        <Button size="small" onClick={() => act(order.id, "pack")}>
          Pack
        </Button>
      )}
      {warehouse && order.status === "PACKED" && (
        <Button size="small" onClick={() => act(order.id, "dispatch")}>
          Dispatch
        </Button>
      )}
      {management &&
        ["PAYMENT_PENDING", "PAYMENT_VERIFIED", "PACKED"].includes(
          order.status,
        ) && (
          <Button
            size="small"
            color="error"
            onClick={() => {
              setFailureOrder(order);
              setFailureReason("");
            }}
          >
            Mark failed
          </Button>
        )}
      {order.status === "PAYMENT_PENDING" && (
        <Button size="small" color="error" onClick={() => cancel(order.id)}>
          Cancel
        </Button>
      )}
    </Stack>
  );
  const desktopOrder = (order) => (
    <TableRow
      data-order-id={order.id}
      hover
      key={order.id}
      sx={{
        bgcolor: highlightOrderId === order.id ? "success.light" : "inherit",
        transition: "background-color .35s ease",
      }}
    >
      <TableCell>
        <Typography variant="subtitle2">#{order.id}</Typography>
        <Typography variant="caption" color="text.secondary">
          {order.createdAt
            ? new Date(order.createdAt).toLocaleDateString("en-AU")
            : ""}
        </Typography>
      </TableCell>
      <TableCell>{order.clientName}</TableCell>
      <TableCell sx={{ maxWidth: 320 }}>
        {order.items
          .map(
            (item) =>
              `${item.quantity} × ${item.sku}${item.variantName ? ` (${item.variantName})` : ""}`,
          )
          .join(", ")}
      </TableCell>
      <TableCell align="right">{money(order.total)}</TableCell>
      <TableCell>
        <Chip
          size="small"
          color={statusTone(order.status)}
          label={order.status.replaceAll("_", " ")}
        />
      </TableCell>
      <TableCell align="right">{orderActions(order)}</TableCell>
    </TableRow>
  );
  const mobileOrder = (order) => (
    <Box
      data-order-id={order.id}
      key={order.id}
      sx={{
        p: 2,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor:
          highlightOrderId === order.id ? "success.light" : "background.paper",
        transition: "background-color .35s ease",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={1.5}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={800}>
            Order #{order.id}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {order.clientName}
          </Typography>
        </Box>
        <Box textAlign="right" sx={{ flexShrink: 0 }}>
          <Typography fontWeight={800}>{money(order.total)}</Typography>
          <Typography variant="caption" color="text.secondary">
            {order.createdAt
              ? new Date(order.createdAt).toLocaleDateString("en-AU")
              : ""}
          </Typography>
        </Box>
      </Stack>
      <Box sx={{ mt: 1.5, p: 1.25, bgcolor: "action.hover", borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          VARIANT LINES
        </Typography>
        {order.items.map((item, index) => (
          <Typography
            key={`${item.variantId || item.sku}-${index}`}
            variant="body2"
            sx={{ mt: 0.35, overflowWrap: "anywhere" }}
          >
            {item.quantity} × {item.sku}
            {item.variantName ? ` · ${item.variantName}` : ""}
          </Typography>
        ))}
      </Box>
      <Box sx={{ mt: 1.25 }}>{orderActions(order)}</Box>
    </Box>
  );

  return (
    <PageContainer>
      <Backdrop
        open={viewingOrderId !== null}
        sx={{
          zIndex: (theme) => theme.zIndex.modal + 1,
          color: "common.white",
          bgcolor: "rgba(11,31,53,.72)",
          backdropFilter: "blur(2px)",
        }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      <PageHeader
        title="Order desk"
        subtitle="Create variant-specific sales orders and move paid orders through fulfilment."
      />
      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      )}
      <Card sx={{ mb: 2.5 }}>
        <CardContent component="form" onSubmit={create}>
          <Typography variant="h6">Create sales order</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Choose exact sellable variants. Submitting immediately reserves
            stock against each SKU.
          </Typography>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl required fullWidth>
                <InputLabel>Client</InputLabel>
                <Select
                  label="Client"
                  value={form.clientId}
                  onChange={(event) =>
                    setForm({ ...form, clientId: event.target.value })
                  }
                >
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name} · {client.phone}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Discount band</InputLabel>
                <Select
                  label="Discount band"
                  value={form.bandId}
                  onChange={(event) =>
                    setForm({ ...form, bandId: event.target.value })
                  }
                >
                  <MenuItem value="">No discount</MenuItem>
                  {bands.map((band) => (
                    <MenuItem key={band.id} value={band.id}>
                      {band.name} · {band.percentage}%
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography fontWeight={800} sx={{ mb: 1.5 }}>
              Add order line
            </Typography>
            <Grid container spacing={1.5} alignItems="center">
              <Grid size={{ xs: 12, lg: 5 }}>
                <Autocomplete
                  options={productMatches}
                  loading={searchingProducts}
                  value={selectedProduct}
                  inputValue={productQuery}
                  onInputChange={(_, value) => setProductQuery(value)}
                  onChange={(_, value) => chooseProduct(value)}
                  getOptionLabel={(option) =>
                    option.masterName || option.name || ""
                  }
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {option.masterName || option.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          SPU {option.spu} · {option.variantCount} variant
                          {option.variantCount === 1 ? "" : "s"}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search master product"
                      placeholder="Name, SPU or SKU"
                      slotProps={{
                        ...params.slotProps,
                        input: {
                          ...params.slotProps.input,
                          endAdornment: (
                            <>
                              {searchingProducts && (
                                <CircularProgress size={18} />
                              )}
                              {params.slotProps.input.endAdornment}
                            </>
                          ),
                        },
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, lg: 4 }}>
                <TextField
                  select
                  fullWidth
                  label="Sellable variant"
                  value={lineDraft.variantId}
                  disabled={!selectedProduct}
                  onChange={(event) =>
                    setLineDraft({
                      ...lineDraft,
                      variantId: event.target.value,
                    })
                  }
                >
                  {activeVariants.map((variant) => (
                    <MenuItem key={variant.id} value={variant.id}>
                      <Box>
                        <Typography variant="body2">
                          {optionLabel(variant.options) || variant.variantName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {variant.sku} · {money(variant.sellingPrice)} ·{" "}
                          {variant.available} available
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 7, lg: 1 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Qty"
                  value={lineDraft.quantity}
                  onChange={(event) =>
                    setLineDraft({ ...lineDraft, quantity: event.target.value })
                  }
                  inputProps={{
                    min: 1,
                    max: selectedVariant?.available || undefined,
                  }}
                />
              </Grid>
              <Grid size={{ xs: 5, lg: 2 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={addLine}
                  disabled={!selectedVariant}
                >
                  Add line
                </Button>
              </Grid>
            </Grid>
            {selectedProduct && !activeVariants.length && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                This product has no active variant with available stock.
              </Alert>
            )}
          </Paper>
          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product / variant</TableCell>
                  <TableCell>SKU / barcode</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Line total</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Typography fontWeight={700}>
                        {line.productName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {optionLabel(line.options) || line.variantName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{line.sku}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {line.barcode}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {money(line.sellingPrice)}
                    </TableCell>
                    <TableCell align="right">{line.quantity}</TableCell>
                    <TableCell align="right">
                      {money(Number(line.sellingPrice) * line.quantity)}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="error"
                        onClick={() =>
                          setLines((current) =>
                            current.filter((item) => item.id !== line.id),
                          )
                        }
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!lines.length && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align="center"
                      sx={{ py: 3, color: "text.secondary" }}
                    >
                      No variants added yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="flex-end"
            alignItems={{ sm: "center" }}
            spacing={2}
            sx={{ mt: 2 }}
          >
            <Box textAlign={{ sm: "right" }}>
              <Typography variant="caption" color="text.secondary">
                Draft subtotal
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {money(subtotal)}
              </Typography>
            </Box>
            <Button
              type="submit"
              size="large"
              variant="contained"
              disabled={saving || !form.clientId || !lines.length}
            >
              {saving ? "Creating…" : "Create order"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <Card sx={{ overflow: "visible" }}>
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderBottom: 1,
            borderColor: "divider",
            position: { xs: "sticky", md: "static" },
            top: { xs: "72px" },
            zIndex: 3,
            bgcolor: "background.paper",
            boxShadow: { xs: "0 2px 5px rgba(11,31,53,.10)", md: "none" },
          }}
        >
          <Typography variant="h6">Order queue</Typography>
          <Typography variant="body2" color="text.secondary">
            Order lines retain their original variant identity and price
            snapshots.
          </Typography>
        </Box>
        <TableContainer
          sx={{
            display: { xs: "none", md: "block" },
            overflow: "visible",
            "& .MuiTableCell-stickyHeader": {
              top: "72px",
              zIndex: 2,
              bgcolor: "background.paper",
              boxShadow: "inset 0 -1px 0 rgba(11,31,53,.14)",
            },
          }}
        >
          <Table stickyHeader>
            {expandedStatuses.size > 0 && (
              <TableHead>
                <TableRow>
                  <TableCell>Order</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Variant lines</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
            )}
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (
                ORDER_STATUSES.map((status) => {
                  const open = expandedStatuses.has(status),
                    summary = statusCounts[status] || { count: 0, total: 0 },
                    rows = ordersByStatus[status] || [];
                  return (
                    <React.Fragment key={status}>
                      <TableRow>
                        <TableCell
                          data-order-status={status}
                          colSpan={6}
                          onClick={() => toggleStatus(status)}
                          aria-expanded={open}
                          sx={{
                            position: open ? "sticky" : "static",
                            top: open ? "121px" : "auto",
                            zIndex: open ? 1 : "auto",
                            py: 1.5,
                            cursor: "pointer",
                            bgcolor: "background.paper",
                            borderBottom: 2,
                            borderBottomColor: open
                              ? "primary.main"
                              : "divider",
                            boxShadow: open
                              ? "0 2px 5px rgba(11,31,53,.10)"
                              : "none",
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <Typography aria-hidden>
                              {open ? "▾" : "▸"}
                            </Typography>
                            <Chip
                              size="small"
                              color={statusTone(status)}
                              label={status.replaceAll("_", " ")}
                            />
                            <Typography variant="body2" color="text.secondary">
                              {summary.count} order
                              {summary.count === 1 ? "" : "s"}
                            </Typography>
                            <Box sx={{ flex: 1 }} />
                            <Typography variant="body2" fontWeight={700}>
                              {money(summary.total)}
                            </Typography>
                            {loadingStatus === status && (
                              <CircularProgress size={16} />
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                      {open && rows.map(desktopOrder)}
                      {open && !rows.length && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            align="center"
                            sx={{ py: 3, color: "text.secondary" }}
                          >
                            No orders in this status.
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Stack sx={{ display: { xs: "flex", md: "none" } }}>
          {loading ? (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            ORDER_STATUSES.map((status) => {
              const open = expandedStatuses.has(status),
                summary = statusCounts[status] || { count: 0, total: 0 },
                rows = ordersByStatus[status] || [];
              return (
                <Box key={status}>
                  <Box
                    data-order-status={status}
                    onClick={() => toggleStatus(status)}
                    aria-expanded={open}
                    sx={{
                      position: open ? "sticky" : "static",
                      top: open ? "150px" : "auto",
                      zIndex: open ? 2 : "auto",
                      p: 1.5,
                      cursor: "pointer",
                      bgcolor: "background.paper",
                      borderBottom: 2,
                      borderBottomColor: open ? "primary.main" : "divider",
                      boxShadow: open ? "0 2px 5px rgba(11,31,53,.10)" : "none",
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography aria-hidden>{open ? "▾" : "▸"}</Typography>
                      <Chip
                        size="small"
                        color={statusTone(status)}
                        label={status.replaceAll("_", " ")}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {summary.count}
                      </Typography>
                      <Box sx={{ flex: 1 }} />
                      <Typography variant="body2" fontWeight={700}>
                        {money(summary.total)}
                      </Typography>
                      {loadingStatus === status && (
                        <CircularProgress size={16} />
                      )}
                    </Stack>
                  </Box>
                  {open && rows.map(mobileOrder)}
                  {open && !rows.length && (
                    <Typography
                      align="center"
                      color="text.secondary"
                      sx={{ py: 3 }}
                    >
                      No orders in this status.
                    </Typography>
                  )}
                </Box>
              );
            })
          )}
        </Stack>
      </Card>
      <Snackbar
        open={Boolean(transitionNotice)}
        autoHideDuration={8000}
        onClose={(_, reason) =>
          reason !== "clickaway" && setTransitionNotice(null)
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setTransitionNotice(null)}
          action={
            transitionNotice && (
              <Button
                color="inherit"
                size="small"
                onClick={() =>
                  showDestination(transitionNotice.to, transitionNotice.id)
                }
              >
                Open {transitionNotice.to.replaceAll("_", " ")}
              </Button>
            )
          }
        >
          <Typography variant="body2" fontWeight={700}>
            Order #{transitionNotice?.id} moved
          </Typography>
          <Typography variant="caption">
            {transitionNotice?.from.replaceAll("_", " ")} →{" "}
            {transitionNotice?.to.replaceAll("_", " ")}
          </Typography>
        </Alert>
      </Snackbar>
      <Dialog
        open={Boolean(failureOrder)}
        onClose={() => !saving && setFailureOrder(null)}
        fullWidth
        maxWidth="xs"
      >
        <Box component="form" onSubmit={failOrder}>
          <DialogTitle>Mark order #{failureOrder?.id} as failed</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This releases reserved stock and records the reason in the order
              history. This action cannot be reversed from the order queue.
            </Typography>
            <TextField
              autoFocus
              required
              fullWidth
              multiline
              minRows={3}
              label="Failure reason"
              value={failureReason}
              onChange={(event) => setFailureReason(event.target.value)}
              inputProps={{ maxLength: 500 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFailureOrder(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="error"
              variant="contained"
              disabled={saving || !failureReason.trim()}
            >
              {saving ? "Marking failed…" : "Mark failed"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Order #{detail?.id}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {detail?.clientName} · {detail?.status?.replaceAll("_", " ")}
          </Typography>
          <Stack spacing={1.25}>
            {detail?.items?.map((item) => (
              <Paper
                key={`${item.variantId}-${item.sku}`}
                variant="outlined"
                sx={{ p: 2 }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Box>
                    <Typography fontWeight={800}>{item.productName}</Typography>
                    <Typography variant="body2">{item.variantName}</Typography>
                    <Stack
                      direction="row"
                      flexWrap="wrap"
                      gap={0.5}
                      sx={{ mt: 0.75 }}
                    >
                      {Object.entries(item.variantOptions || {}).map(
                        ([name, value]) => (
                          <Chip
                            key={name}
                            size="small"
                            variant="outlined"
                            label={`${name}: ${value}`}
                          />
                        ),
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      SPU {item.spu} · SKU {item.sku} · Barcode {item.barcode}
                    </Typography>
                  </Box>
                  <Box textAlign={{ sm: "right" }}>
                    <Typography>
                      {item.quantity} × {money(item.unitPrice)}
                    </Typography>
                    <Typography fontWeight={800}>
                      {money(item.lineTotal)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
          <Typography sx={{ mt: 2 }} variant="h6" fontWeight={800}>
            Total: {money(detail?.total)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
