import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import PageContainer from "../../shared/components/layout/PageContainer";
import PageHeader from "../../shared/components/layout/PageHeader";
import { inventoryApi, warehouseApi } from "../../shared/api/mvpApi";
import { useAuth } from "../../identity/hooks/useAuth";

const shipmentTone = (status) =>
  ({
    PENDING: "warning",
    PACKED: "info",
    DISPATCHED: "secondary",
    DELIVERED: "success",
  })[status] || "default";
const tableViewport = {
  height: { xs: "55vh", md: "calc(100vh - 300px)" },
  "& .MuiTableCell-stickyHeader": {
    bgcolor: "background.paper",
    boxShadow: "inset 0 -1px 0 rgba(11,31,53,.14)",
  },
};

function useFittedRows(estimatedRowHeight, contentVersion) {
  const containerRef = useRef(null);
  const [rows, setRows] = useState(5);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const calculate = () => {
      const headerHeight =
        container.querySelector("thead")?.getBoundingClientRect().height || 57;
      const measuredRows = [...container.querySelectorAll("tbody tr")]
        .map((row) => row.getBoundingClientRect().height)
        .filter((height) => height > 0 && height < 120);
      const rowHeight = measuredRows.length
        ? Math.max(...measuredRows)
        : estimatedRowHeight;
      const capacity = Math.max(
        3,
        Math.floor((container.clientHeight - headerHeight - 2) / rowHeight),
      );
      setRows((current) => (current === capacity ? current : capacity));
    };
    calculate();
    const resizeObserver = new ResizeObserver(calculate);
    const mutationObserver = new MutationObserver(calculate);
    resizeObserver.observe(container);
    mutationObserver.observe(container, { childList: true, subtree: true });
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [estimatedRowHeight, contentVersion]);
  return [containerRef, rows];
}

function SectionHeader({ title, detail, action }) {
  return (
    <Box
      sx={{
        px: 2.5,
        py: 2,
        borderBottom: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        gap: 2,
        alignItems: { sm: "center" },
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {detail}
        </Typography>
      </Box>
      {action}
    </Box>
  );
}

const text = (value) => String(value ?? "").toLocaleLowerCase();
const sortRows = (rows, sort) =>
  [...rows].sort((a, b) => {
    const left = a[sort.field] ?? "",
      right = b[sort.field] ?? "";
    const comparison =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), undefined, {
            numeric: true,
            sensitivity: "base",
          });
    return (
      (sort.direction === "asc" ? comparison : -comparison) ||
      Number(a.id || a.variantId || 0) - Number(b.id || b.variantId || 0)
    );
  });

function SortHeading({ label, field, sort, onSort, align }) {
  return (
    <TableCell
      align={align}
      sortDirection={sort.field === field ? sort.direction : false}
    >
      <TableSortLabel
        active={sort.field === field}
        direction={sort.field === field ? sort.direction : "asc"}
        onClick={() => onSort(field)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}

function SearchField({ label, value, onChange }) {
  return (
    <TextField
      size="small"
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={{ width: { xs: "100%", sm: 280 } }}
    />
  );
}

export default function FulfillmentPage() {
  const { user } = useAuth();
  const canOperate = user?.roles?.some((role) =>
    ["MANAGEMENT", "WAREHOUSE"].includes(role),
  );
  const [inventory, setInventory] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [movements, setMovements] = useState([]);
  const [inventoryPage, setInventoryPage] = useState(0);
  const [shipmentPage, setShipmentPage] = useState(0);
  const [movementPage, setMovementPage] = useState(0);
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [shipmentQuery, setShipmentQuery] = useState("");
  const [movementQuery, setMovementQuery] = useState("");
  const [inventorySort, setInventorySort] = useState({
    field: "productName",
    direction: "asc",
  });
  const [shipmentSort, setShipmentSort] = useState({
    field: "id",
    direction: "desc",
  });
  const [movementSort, setMovementSort] = useState({
    field: "created_at",
    direction: "desc",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adjustment, setAdjustment] = useState(null);
  const [operation, setOperation] = useState(null);
  const [stockRecord, setStockRecord] = useState(null);
  const [shipmentDetail, setShipmentDetail] = useState(null);
  const [waybill, setWaybill] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [stock, shipmentList, movementList] = await Promise.all([
        inventoryApi.list(),
        warehouseApi.list(),
        inventoryApi.movements(),
      ]);
      setInventory(stock);
      setShipments(shipmentList);
      setMovements(movementList);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load fulfilment data.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const transition = async (shipment, action) => {
    setSaving(true);
    setError("");
    try {
      await warehouseApi[action](shipment.id);
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message || "The shipment could not be updated.",
      );
    } finally {
      setSaving(false);
    }
  };
  const adjust = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await inventoryApi.adjustVariant(
        adjustment.variantId,
        Number(quantity),
        note,
      );
      setAdjustment(null);
      setQuantity("");
      setNote("");
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "The stock adjustment could not be applied.",
      );
    } finally {
      setSaving(false);
    }
  };
  const inspectStock = (item) => setStockRecord(item);
  const reserveOrRelease = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const action =
        operation.type === "reserve"
          ? inventoryApi.reserveVariant
          : inventoryApi.releaseVariant;
      await action(operation.item.variantId, Number(quantity), note);
      setOperation(null);
      setQuantity("");
      setNote("");
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message ||
          `The reservation could not be ${operation?.type === "reserve" ? "created" : "released"}.`,
      );
    } finally {
      setSaving(false);
    }
  };
  const viewShipment = async (shipment) => {
    setSaving(true);
    setError("");
    try {
      setShipmentDetail(await warehouseApi.get(shipment.id));
    } catch (e) {
      setError(
        e.response?.data?.message || "The shipment could not be retrieved.",
      );
    } finally {
      setSaving(false);
    }
  };
  const viewWaybill = async (shipment) => {
    setSaving(true);
    setError("");
    try {
      setWaybill(await warehouseApi.waybill(shipment.id));
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message || "The waybill could not be generated.",
      );
    } finally {
      setSaving(false);
    }
  };
  const toggleSort = (setter) => (field) =>
    setter((current) => ({
      field,
      direction:
        current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  const filteredShipments = useMemo(
    () =>
      sortRows(
        shipments.filter((item) =>
          [
            item.id,
            item.order_id,
            item.status,
            item.tracking_number,
            item.carrier,
          ].some((value) => text(value).includes(text(shipmentQuery))),
        ),
        shipmentSort,
      ),
    [shipments, shipmentQuery, shipmentSort],
  );
  const filteredInventory = useMemo(
    () =>
      sortRows(
        inventory.filter((item) =>
          [
            item.productName,
            item.variantName,
            item.sku,
            item.quantity,
            item.reserved,
            item.available,
          ].some((value) => text(value).includes(text(inventoryQuery))),
        ),
        inventorySort,
      ),
    [inventory, inventoryQuery, inventorySort],
  );
  const filteredMovements = useMemo(
    () =>
      sortRows(
        movements.filter((item) =>
          [
            item.movement_type,
            item.sku,
            item.product_name,
            item.variant_name,
            item.note,
            item.quantity,
            item.created_by,
            item.created_at,
          ].some((value) => text(value).includes(text(movementQuery))),
        ),
        movementSort,
      ),
    [movements, movementQuery, movementSort],
  );
  const [shipmentTableRef, shipmentRowsPerPage] = useFittedRows(
    53,
    `${loading}:${filteredShipments.length}:${shipmentPage}`,
  );
  const [inventoryTableRef, inventoryRowsPerPage] = useFittedRows(
    53,
    `${loading}:${filteredInventory.length}:${inventoryPage}`,
  );
  const [movementTableRef, movementRowsPerPage] = useFittedRows(
    65,
    `${loading}:${filteredMovements.length}:${movementPage}`,
  );
  useEffect(() => {
    setShipmentPage((page) =>
      Math.min(
        page,
        Math.max(
          0,
          Math.ceil(filteredShipments.length / shipmentRowsPerPage) - 1,
        ),
      ),
    );
  }, [filteredShipments.length, shipmentRowsPerPage]);
  useEffect(() => {
    setInventoryPage((page) =>
      Math.min(
        page,
        Math.max(
          0,
          Math.ceil(filteredInventory.length / inventoryRowsPerPage) - 1,
        ),
      ),
    );
  }, [filteredInventory.length, inventoryRowsPerPage]);
  useEffect(() => {
    setMovementPage((page) =>
      Math.min(
        page,
        Math.max(
          0,
          Math.ceil(filteredMovements.length / movementRowsPerPage) - 1,
        ),
      ),
    );
  }, [filteredMovements.length, movementRowsPerPage]);

  return (
    <PageContainer>
      <PageHeader
        title="Fulfilment centre"
        subtitle="Control inventory, warehouse hand-offs and carrier documentation from the live operations API."
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      )}
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={12}>
          <Card>
            <SectionHeader
              title="Shipment queue"
              detail={`${filteredShipments.length} matching shipment${filteredShipments.length === 1 ? "" : "s"} · search by shipment, order, status, tracking or carrier`}
              action={
                <SearchField
                  label="Search shipments"
                  value={shipmentQuery}
                  onChange={(value) => {
                    setShipmentQuery(value);
                    setShipmentPage(0);
                  }}
                />
              }
            />
            <TableContainer ref={shipmentTableRef} sx={tableViewport}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <SortHeading
                      label="Shipment"
                      field="id"
                      sort={shipmentSort}
                      onSort={toggleSort(setShipmentSort)}
                    />
                    <SortHeading
                      label="Order"
                      field="order_id"
                      sort={shipmentSort}
                      onSort={toggleSort(setShipmentSort)}
                    />
                    <SortHeading
                      label="Status"
                      field="status"
                      sort={shipmentSort}
                      onSort={toggleSort(setShipmentSort)}
                    />
                    <SortHeading
                      label="Tracking"
                      field="tracking_number"
                      sort={shipmentSort}
                      onSort={toggleSort(setShipmentSort)}
                    />
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredShipments
                      .slice(
                        shipmentPage * shipmentRowsPerPage,
                        shipmentPage * shipmentRowsPerPage +
                          shipmentRowsPerPage,
                      )
                      .map((s) => (
                        <TableRow hover key={s.id}>
                          <TableCell>
                            <Typography variant="subtitle2">#{s.id}</Typography>
                          </TableCell>
                          <TableCell>#{s.order_id}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              color={shipmentTone(s.status)}
                              label={s.status}
                            />
                          </TableCell>
                          <TableCell>
                            {s.tracking_number || (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Not issued
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Stack
                              direction="row"
                              spacing={0.5}
                              useFlexGap
                              sx={{
                                justifyContent: "flex-end",
                                flexWrap: "wrap",
                              }}
                            >
                              <Button
                                size="small"
                                onClick={() => viewShipment(s)}
                                disabled={saving}
                              >
                                View
                              </Button>
                              {canOperate && s.status === "PENDING" && (
                                <Button
                                  size="small"
                                  onClick={() => transition(s, "pack")}
                                  disabled={saving}
                                >
                                  Pack
                                </Button>
                              )}
                              {canOperate && s.status === "PACKED" && (
                                <Button
                                  size="small"
                                  onClick={() => transition(s, "dispatch")}
                                  disabled={saving}
                                >
                                  Dispatch
                                </Button>
                              )}
                              {canOperate && s.status === "DISPATCHED" && (
                                <Button
                                  size="small"
                                  color="success"
                                  variant="contained"
                                  onClick={() => transition(s, "deliver")}
                                  disabled={saving}
                                >
                                  Confirm delivery
                                </Button>
                              )}
                              {canOperate && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => viewWaybill(s)}
                                  disabled={saving}
                                >
                                  Waybill
                                </Button>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                  {!loading && !filteredShipments.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        align="center"
                        sx={{ py: 5, color: "text.secondary" }}
                      >
                        {shipmentQuery
                          ? "No shipments match this search."
                          : "No shipments are currently queued."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredShipments.length}
              page={shipmentPage}
              onPageChange={(_, page) => setShipmentPage(page)}
              rowsPerPage={shipmentRowsPerPage}
              rowsPerPageOptions={[shipmentRowsPerPage]}
            />
          </Card>
        </Grid>
        <Grid size={12}>
          <Card>
            <SectionHeader
              title="Recent stock activity"
              detail={`${filteredMovements.length} matching ledger event${filteredMovements.length === 1 ? "" : "s"} · search by SKU, product, activity, note, user or date`}
              action={
                <SearchField
                  label="Search stock activity"
                  value={movementQuery}
                  onChange={(value) => {
                    setMovementQuery(value);
                    setMovementPage(0);
                  }}
                />
              }
            />
            <TableContainer ref={movementTableRef} sx={tableViewport}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <SortHeading
                      label="Activity"
                      field="movement_type"
                      sort={movementSort}
                      onSort={toggleSort(setMovementSort)}
                    />
                    <SortHeading
                      label="Product / SKU"
                      field="product_name"
                      sort={movementSort}
                      onSort={toggleSort(setMovementSort)}
                    />
                    <SortHeading
                      label="Quantity"
                      field="quantity"
                      sort={movementSort}
                      onSort={toggleSort(setMovementSort)}
                      align="right"
                    />
                    <SortHeading
                      label="Date"
                      field="created_at"
                      sort={movementSort}
                      onSort={toggleSort(setMovementSort)}
                    />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMovements
                      .slice(
                        movementPage * movementRowsPerPage,
                        movementPage * movementRowsPerPage +
                          movementRowsPerPage,
                      )
                      .map((m) => (
                        <TableRow hover key={m.id}>
                          <TableCell>
                            <Chip
                              size="small"
                              label={m.movement_type}
                              variant="outlined"
                            />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: "block", mt: 0.5 }}
                            >
                              {m.note || "No note recorded"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {m.product_name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {m.sku}
                              {m.variant_name ? ` · ${m.variant_name}` : ""}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight={700}>
                              {m.quantity > 0 ? "+" : ""}
                              {m.quantity}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {m.created_at
                              ? new Date(m.created_at).toLocaleString("en-AU")
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                  {!loading && !filteredMovements.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        align="center"
                        sx={{ py: 5, color: "text.secondary" }}
                      >
                        {movementQuery
                          ? "No stock activity matches this search."
                          : "No inventory activity recorded."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredMovements.length}
              page={movementPage}
              onPageChange={(_, page) => setMovementPage(page)}
              rowsPerPage={movementRowsPerPage}
              rowsPerPageOptions={[movementRowsPerPage]}
            />
          </Card>
        </Grid>
      </Grid>
      <Card>
        <SectionHeader
          title="Inventory position"
          detail={`${filteredInventory.length} matching SKU${filteredInventory.length === 1 ? "" : "s"} · search by product, variant, SKU or quantity`}
          action={
            <SearchField
              label="Search inventory"
              value={inventoryQuery}
              onChange={(value) => {
                setInventoryQuery(value);
                setInventoryPage(0);
              }}
            />
          }
        />
        <TableContainer ref={inventoryTableRef} sx={tableViewport}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <SortHeading
                  label="Product"
                  field="productName"
                  sort={inventorySort}
                  onSort={toggleSort(setInventorySort)}
                />
                <SortHeading
                  label="On hand"
                  field="quantity"
                  sort={inventorySort}
                  onSort={toggleSort(setInventorySort)}
                  align="right"
                />
                <SortHeading
                  label="Reserved"
                  field="reserved"
                  sort={inventorySort}
                  onSort={toggleSort(setInventorySort)}
                  align="right"
                />
                <SortHeading
                  label="Available"
                  field="available"
                  sort={inventorySort}
                  onSort={toggleSort(setInventorySort)}
                  align="right"
                />
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory
                  .slice(
                    inventoryPage * inventoryRowsPerPage,
                    inventoryPage * inventoryRowsPerPage + inventoryRowsPerPage,
                  )
                  .map((item) => (
                    <TableRow hover key={item.variantId}>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {item.productName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.sku}
                          {item.variantName ? ` · ${item.variantName}` : ""}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{item.reserved}</TableCell>
                      <TableCell align="right">
                        <Typography
                          fontWeight={700}
                          color={
                            item.available <= 5 ? "error.main" : "text.primary"
                          }
                        >
                          {item.available}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{ justifyContent: "flex-end" }}
                        >
                          <Button
                            size="small"
                            onClick={() => inspectStock(item)}
                            disabled={saving}
                          >
                            View
                          </Button>
                          {canOperate && (
                            <>
                              <Button
                                size="small"
                                onClick={() => setAdjustment(item)}
                              >
                                Adjust
                              </Button>
                              <Button
                                size="small"
                                onClick={() =>
                                  setOperation({ type: "reserve", item })
                                }
                                disabled={!item.available}
                              >
                                Reserve
                              </Button>
                              <Button
                                size="small"
                                onClick={() =>
                                  setOperation({ type: "release", item })
                                }
                                disabled={!item.reserved}
                              >
                                Release
                              </Button>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
              )}
              {!loading && !filteredInventory.length && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{ py: 5, color: "text.secondary" }}
                  >
                    {inventoryQuery
                      ? "No inventory matches this search."
                      : "No stock records found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredInventory.length}
          page={inventoryPage}
          onPageChange={(_, page) => setInventoryPage(page)}
          rowsPerPage={inventoryRowsPerPage}
          rowsPerPageOptions={[inventoryRowsPerPage]}
        />
      </Card>
      <Dialog
        open={Boolean(adjustment)}
        onClose={() => !saving && setAdjustment(null)}
        fullWidth
        maxWidth="xs"
      >
        <Box component="form" onSubmit={adjust}>
          <DialogTitle>Adjust inventory</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {adjustment?.sku} · {adjustment?.productName}. Enter a positive
              quantity to add stock or a negative quantity to reduce it.
            </Typography>
            <TextField
              autoFocus
              required
              fullWidth
              type="number"
              label="Adjustment quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputProps={{ step: 1, min: -999999 }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Reason / note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setAdjustment(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || quantity === ""}
            >
              {saving ? "Applying…" : "Apply adjustment"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog
        open={Boolean(operation)}
        onClose={() => !saving && setOperation(null)}
        fullWidth
        maxWidth="xs"
      >
        <Box component="form" onSubmit={reserveOrRelease}>
          <DialogTitle>
            {operation?.type === "reserve"
              ? "Reserve stock"
              : "Release reservation"}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {operation?.item.sku} · {operation?.item.productName}.{" "}
              {operation?.type === "reserve"
                ? `${operation?.item.available} units are available to reserve.`
                : `${operation?.item.reserved} units are currently reserved.`}
            </Typography>
            <TextField
              autoFocus
              required
              fullWidth
              type="number"
              label="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputProps={{
                min: 1,
                max:
                  operation?.type === "reserve"
                    ? operation?.item.available
                    : operation?.item.reserved,
              }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Reason / note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setOperation(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || !quantity}
            >
              {saving
                ? "Saving…"
                : operation?.type === "reserve"
                  ? "Reserve stock"
                  : "Release stock"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog
        open={Boolean(stockRecord)}
        onClose={() => setStockRecord(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Stock record</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 1 }}>
            <Typography variant="h6">{stockRecord?.productName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {stockRecord?.sku}
            </Typography>
            <Typography>
              On hand: <b>{stockRecord?.quantity}</b>
            </Typography>
            <Typography>
              Reserved: <b>{stockRecord?.reserved}</b>
            </Typography>
            <Typography>
              Available: <b>{stockRecord?.available}</b>
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockRecord(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(shipmentDetail)}
        onClose={() => setShipmentDetail(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Shipment #{shipmentDetail?.id}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 1 }}>
            <Typography>
              Order: <b>#{shipmentDetail?.order_id}</b>
            </Typography>
            <Typography>
              Status:{" "}
              <Chip
                size="small"
                color={shipmentTone(shipmentDetail?.status)}
                label={shipmentDetail?.status}
              />
            </Typography>
            <Typography>
              Carrier: <b>{shipmentDetail?.carrier || "Unassigned"}</b>
            </Typography>
            <Typography>
              Tracking: <b>{shipmentDetail?.tracking_number || "Not issued"}</b>
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShipmentDetail(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(waybill)}
        onClose={() => setWaybill(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Waybill</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 1 }}>
            <Typography variant="h6">
              Tracking {waybill?.trackingNumber}
            </Typography>
            <Typography>
              Shipment: <b>#{waybill?.shipmentId}</b>
            </Typography>
            <Typography>
              Order: <b>#{waybill?.orderId}</b>
            </Typography>
            <Typography>
              Carrier: <b>{waybill?.carrier}</b>
            </Typography>
            <Chip
              size="small"
              color={shipmentTone(waybill?.status)}
              label={waybill?.status}
              sx={{ alignSelf: "flex-start" }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWaybill(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
