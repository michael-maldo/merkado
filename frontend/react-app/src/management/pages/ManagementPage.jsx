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
  CardContent,
  Chip,
  CircularProgress,
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
import {
  brandsApi,
  categoriesApi,
  channelsApi,
  commissionApi,
  pricingApi,
  systemApi,
} from "../../shared/api/mvpApi";
import { useAuth } from "../../identity/hooks/useAuth";
import CategoryManagerDialog from "../../catalog/components/CategoryManagerDialog";

const money = (value) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
    Number(value || 0),
  );
const Section = ({ title, detail, action, children }) => (
  <Card sx={{ height: "100%" }}>
    <Box
      sx={{
        px: 2.5,
        py: 2,
        borderBottom: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: { sm: "center" },
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {detail}
        </Typography>
      </Box>
      {action}
    </Box>
    {children}
  </Card>
);
const Group = ({ title, detail, children }) => (
  <Box sx={{ mb: 4 }}>
    <Box sx={{ mb: 1.75 }}>
      <Typography variant="overline" color="primary.main" fontWeight={800}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {detail}
      </Typography>
    </Box>
    {children}
  </Box>
);
const pricingViewport = {
  height: { xs: "55vh", md: "calc(100vh - 300px)" },
  "& .MuiTableCell-stickyHeader": {
    bgcolor: "background.paper",
    boxShadow: "inset 0 -1px 0 rgba(11,31,53,.14)",
  },
};
const text = (value) => String(value ?? "").toLocaleLowerCase();

function useFittedRows(rowHeight) {
  const containerRef = useRef(null);
  const [rows, setRows] = useState(5);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const calculate = () => {
      const headerHeight =
        container.querySelector("thead")?.getBoundingClientRect().height || 57;
      const capacity = Math.max(
        3,
        Math.floor((container.clientHeight - headerHeight - 2) / rowHeight),
      );
      setRows((current) => (current === capacity ? current : capacity));
    };
    calculate();
    const resizeObserver = new ResizeObserver(calculate);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [rowHeight]);
  return [containerRef, rows];
}

export default function ManagementPage() {
  const { user } = useAuth();
  const allowed = user?.roles?.includes("MANAGEMENT");
  const [pricing, setPricing] = useState([]),
    [bands, setBands] = useState([]),
    [rules, setRules] = useState([]),
    [commissions, setCommissions] = useState([]),
    [audit, setAudit] = useState([]);
  const [categories, setCategories] = useState([]),
    [brands, setBrands] = useState([]),
    [channels, setChannels] = useState([]),
    [categoriesOpen, setCategoriesOpen] = useState(false);
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const [band, setBand] = useState({
      name: "",
      minimumAmount: 0,
      percentage: "",
    }),
    [rule, setRule] = useState({ name: "", percentage: "" }),
    [brand, setBrand] = useState({ name: "", description: "" }),
    [channel, setChannel] = useState({ code: "", name: "" });
  const [pricingQuery, setPricingQuery] = useState(""),
    [pricingPage, setPricingPage] = useState(0),
    [pricingSort, setPricingSort] = useState({
      field: "name",
      direction: "asc",
    });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [
        prices,
        discountBands,
        commissionRules,
        commissionRows,
        auditRows,
        categoryRows,
        brandRows,
        channelRows,
      ] = await Promise.all([
        pricingApi.list(),
        pricingApi.bands(),
        commissionApi.rules(),
        commissionApi.list(),
        systemApi.auditLogs(),
        categoriesApi.list(),
        brandsApi.list(),
        channelsApi.list(),
      ]);
      setPricing(prices);
      setBands(discountBands);
      setRules(commissionRules);
      setCommissions(commissionRows);
      setAudit(auditRows);
      setCategories(categoryRows);
      setBrands(brandRows);
      setChannels(channelRows);
    } catch (e) {
      setError(
        e.response?.data?.message || "Management data could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (allowed) load();
    else setLoading(false);
  }, [allowed]);
  const run = async (action, fallback, after) => {
    setSaving(true);
    setError("");
    try {
      await action();
      after?.();
      await load();
    } catch (e) {
      setError(e.response?.data?.message || fallback);
      throw e;
    } finally {
      setSaving(false);
    }
  };
  const savePrice = async (item) => {
    const next = window.prompt(`Set current price for ${item.sku}`, item.price);
    if (next === null || next === "") return;
    try {
      await run(
        () => pricingApi.updateVariant(item.variant_id, Number(next)),
        "Price could not be updated.",
      );
    } catch {
      /* displayed by run */
    }
  };
  const createBand = async (event) => {
    event.preventDefault();
    try {
      await run(
        () =>
          pricingApi.createBand({
            ...band,
            minimumAmount: Number(band.minimumAmount),
            percentage: Number(band.percentage),
            active: true,
          }),
        "Discount band could not be created.",
        () => setBand({ name: "", minimumAmount: 0, percentage: "" }),
      );
    } catch {
      /* displayed by run */
    }
  };
  const createRule = async (event) => {
    event.preventDefault();
    try {
      await run(
        () =>
          commissionApi.createRule({
            ...rule,
            percentage: Number(rule.percentage),
            active: true,
          }),
        "Commission rule could not be created.",
        () => setRule({ name: "", percentage: "" }),
      );
    } catch {
      /* displayed by run */
    }
  };
  const createBrand = async (event) => {
    event.preventDefault();
    try {
      await run(
        () => brandsApi.create(brand),
        "Brand could not be created.",
        () => setBrand({ name: "", description: "" }),
      );
    } catch {
      /* displayed by run */
    }
  };
  const createChannel = async (event) => {
    event.preventDefault();
    try {
      await run(
        () => channelsApi.create(channel),
        "Sales channel could not be created.",
        () => setChannel({ code: "", name: "" }),
      );
    } catch {
      /* displayed by run */
    }
  };
  const categoryAction = (action) =>
    run(action, "Category could not be saved.");
  const filteredPricing = useMemo(
    () =>
      [
        ...pricing.filter((item) =>
          [item.sku, item.name, item.variant_name, item.price].some((value) =>
            text(value).includes(text(pricingQuery)),
          ),
        ),
      ].sort((a, b) => {
        const left = a[pricingSort.field] ?? "",
          right = b[pricingSort.field] ?? "";
        const comparison =
          typeof left === "number" && typeof right === "number"
            ? left - right
            : String(left).localeCompare(String(right), undefined, {
                numeric: true,
                sensitivity: "base",
              });
        return (
          (pricingSort.direction === "asc" ? comparison : -comparison) ||
          Number(a.variant_id) - Number(b.variant_id)
        );
      }),
    [pricing, pricingQuery, pricingSort],
  );
  const [pricingTableRef, pricingRowsPerPage] = useFittedRows(45);
  const sortPricing = (field) =>
    setPricingSort((current) => ({
      field,
      direction:
        current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  useEffect(() => {
    setPricingPage((page) =>
      Math.min(
        page,
        Math.max(0, Math.ceil(filteredPricing.length / pricingRowsPerPage) - 1),
      ),
    );
  }, [filteredPricing.length, pricingRowsPerPage]);

  if (!allowed)
    return (
      <PageContainer>
        <PageHeader
          title="Management"
          subtitle="Restricted operational controls."
        />
        <Alert severity="warning">
          Management access is required for catalogue configuration, pricing,
          commissions and audit reporting.
        </Alert>
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        title="Management controls"
        subtitle="Configure catalogue structure, commercial policy and operational governance."
      />
      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      )}
      <Group
        title="Catalogue governance"
        detail="Shared product classifications and selling destinations."
      >
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Section
              title="Category hierarchy"
              detail="Manage top-level categories and unlimited nested subcategories."
              action={
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setCategoriesOpen(true)}
                >
                  Configure tree
                </Button>
              }
            >
              <CardContent>
                <Typography variant="h4" fontWeight={800}>
                  {categories.filter((item) => item.active !== false).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  active categories
                </Typography>
              </CardContent>
            </Section>
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3.5 }}>
            <Section
              title="Brands"
              detail="Reusable brands available to products."
            >
              <CardContent component="form" onSubmit={createBrand}>
                <Stack spacing={1.25}>
                  <TextField
                    required
                    size="small"
                    label="Brand name"
                    value={brand.name}
                    onChange={(e) =>
                      setBrand({ ...brand, name: e.target.value })
                    }
                  />
                  <TextField
                    size="small"
                    label="Description"
                    value={brand.description}
                    onChange={(e) =>
                      setBrand({ ...brand, description: e.target.value })
                    }
                  />
                  <Button type="submit" variant="outlined" disabled={saving}>
                    Add brand
                  </Button>
                  <Stack direction="row" gap={0.75} sx={{ flexWrap: "wrap" }}>
                    {brands
                      .filter((item) => item.active !== false)
                      .map((item) => (
                        <Chip key={item.id} size="small" label={item.name} />
                      ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Section>
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3.5 }}>
            <Section
              title="Sales channels"
              detail="Destinations used by product listings."
            >
              <CardContent component="form" onSubmit={createChannel}>
                <Stack spacing={1.25}>
                  <TextField
                    required
                    size="small"
                    label="Channel code"
                    value={channel.code}
                    onChange={(e) =>
                      setChannel({ ...channel, code: e.target.value })
                    }
                  />
                  <TextField
                    required
                    size="small"
                    label="Channel name"
                    value={channel.name}
                    onChange={(e) =>
                      setChannel({ ...channel, name: e.target.value })
                    }
                  />
                  <Button type="submit" variant="outlined" disabled={saving}>
                    Add channel
                  </Button>
                  <Stack direction="row" gap={0.75} sx={{ flexWrap: "wrap" }}>
                    {channels
                      .filter((item) => item.active !== false)
                      .map((item) => (
                        <Chip key={item.id} size="small" label={item.name} />
                      ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Section>
          </Grid>
        </Grid>
      </Group>

      <Group
        title="Pricing and discounts"
        detail="Selling prices and approved customer discount thresholds."
      >
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Section
              title="Pricing reference"
              detail={`${filteredPricing.length} matching price${filteredPricing.length === 1 ? "" : "s"} · search by SKU, product or price`}
              action={
                <TextField
                  size="small"
                  label="Search pricing"
                  value={pricingQuery}
                  onChange={(event) => {
                    setPricingQuery(event.target.value);
                    setPricingPage(0);
                  }}
                  sx={{ width: { xs: "100%", sm: 260 } }}
                />
              }
            >
              <TableContainer ref={pricingTableRef} sx={pricingViewport}>
                <Table size="small" stickyHeader sx={{ tableLayout: "fixed" }}>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        width="24%"
                        sortDirection={
                          pricingSort.field === "sku"
                            ? pricingSort.direction
                            : false
                        }
                      >
                        <TableSortLabel
                          active={pricingSort.field === "sku"}
                          direction={
                            pricingSort.field === "sku"
                              ? pricingSort.direction
                              : "asc"
                          }
                          onClick={() => sortPricing("sku")}
                        >
                          SKU
                        </TableSortLabel>
                      </TableCell>
                      <TableCell
                        sortDirection={
                          pricingSort.field === "name"
                            ? pricingSort.direction
                            : false
                        }
                      >
                        <TableSortLabel
                          active={pricingSort.field === "name"}
                          direction={
                            pricingSort.field === "name"
                              ? pricingSort.direction
                              : "asc"
                          }
                          onClick={() => sortPricing("name")}
                        >
                          Product
                        </TableSortLabel>
                      </TableCell>
                      <TableCell
                        width="20%"
                        align="right"
                        sortDirection={
                          pricingSort.field === "price"
                            ? pricingSort.direction
                            : false
                        }
                      >
                        <TableSortLabel
                          active={pricingSort.field === "price"}
                          direction={
                            pricingSort.field === "price"
                              ? pricingSort.direction
                              : "asc"
                          }
                          onClick={() => sortPricing("price")}
                        >
                          Current price
                        </TableSortLabel>
                      </TableCell>
                      <TableCell width="18%" align="right">
                        Action
                      </TableCell>
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
                      filteredPricing
                        .slice(
                          pricingPage * pricingRowsPerPage,
                          pricingPage * pricingRowsPerPage + pricingRowsPerPage,
                        )
                        .map((item) => (
                          <TableRow
                            key={item.variant_id}
                            hover
                            sx={{
                              height: 45,
                              "& .MuiTableCell-root": { py: 0.5 },
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" noWrap>
                                {item.sku}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                noWrap
                                title={`${item.name}${item.variant_name ? ` · ${item.variant_name}` : ""}`}
                              >
                                {item.name}
                                {item.variant_name
                                  ? ` · ${item.variant_name}`
                                  : ""}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {money(item.price)}
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                onClick={() => savePrice(item)}
                                disabled={saving}
                                sx={{ whiteSpace: "nowrap" }}
                              >
                                Update price
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                    {!loading && !filteredPricing.length && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          align="center"
                          sx={{ py: 5, color: "text.secondary" }}
                        >
                          {pricingQuery
                            ? "No pricing records match this search."
                            : "No pricing records found."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filteredPricing.length}
                page={pricingPage}
                onPageChange={(_, page) => setPricingPage(page)}
                rowsPerPage={pricingRowsPerPage}
                rowsPerPageOptions={[pricingRowsPerPage]}
              />
            </Section>
          </Grid>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Section
              title="Approved discount bands"
              detail="Discount levels available while building an order."
            >
              <CardContent
                component="form"
                onSubmit={createBand}
                sx={{
                  display: "flex",
                  gap: 1,
                  flexWrap: "wrap",
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <TextField
                  required
                  size="small"
                  label="Band name"
                  value={band.name}
                  onChange={(e) => setBand({ ...band, name: e.target.value })}
                />
                <TextField
                  required
                  size="small"
                  type="number"
                  label="Minimum order"
                  value={band.minimumAmount}
                  onChange={(e) =>
                    setBand({ ...band, minimumAmount: e.target.value })
                  }
                />
                <TextField
                  required
                  size="small"
                  type="number"
                  label="Percent"
                  value={band.percentage}
                  onChange={(e) =>
                    setBand({ ...band, percentage: e.target.value })
                  }
                  sx={{ width: 100 }}
                />
                <Button type="submit" variant="contained" disabled={saving}>
                  Add
                </Button>
              </CardContent>
              <Table size="small">
                <TableBody>
                  {bands.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{money(item.minimum_amount)}</TableCell>
                      <TableCell align="right">{item.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          </Grid>
        </Grid>
      </Group>

      <Group
        title="Commission management"
        detail="Calculation rules and the resulting commission ledger."
      >
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Section
              title="Commission rules"
              detail="Percentage rules available for commission calculation."
            >
              <CardContent
                component="form"
                onSubmit={createRule}
                sx={{
                  display: "flex",
                  gap: 1,
                  flexWrap: "wrap",
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <TextField
                  required
                  size="small"
                  label="Rule name"
                  value={rule.name}
                  onChange={(e) => setRule({ ...rule, name: e.target.value })}
                />
                <TextField
                  required
                  size="small"
                  type="number"
                  label="Percent"
                  value={rule.percentage}
                  onChange={(e) =>
                    setRule({ ...rule, percentage: e.target.value })
                  }
                />
                <Button type="submit" variant="contained" disabled={saving}>
                  Add rule
                </Button>
              </CardContent>
              <Table size="small">
                <TableBody>
                  {rules.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell align="right">{item.percentage}%</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={item.active ? "success" : "default"}
                          label={item.active ? "Active" : "Inactive"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Section
              title="Commission ledger"
              detail="Automatically calculated commission records."
            >
              <Stack
                divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}
              >
                {commissions.slice(0, 8).map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      px: 2.5,
                      py: 1.4,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box>
                      <Typography variant="body2">
                        Order #{item.order_id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Agent #{item.agent_id}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="subtitle2">
                        {money(item.amount)}
                      </Typography>
                      <Chip size="small" label={item.status} />
                    </Box>
                  </Box>
                ))}
                {!loading && !commissions.length && (
                  <Typography color="text.secondary" sx={{ p: 2.5 }}>
                    No commissions generated yet.
                  </Typography>
                )}
              </Stack>
            </Section>
          </Grid>
        </Grid>
      </Group>

      <Group
        title="System governance"
        detail="Trace administrative and operational changes across the platform."
      >
        <Section
          title="Audit trail"
          detail="Recorded writes across the operational API."
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Resource</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {audit.slice(0, 12).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString("en-AU")
                        : "—"}
                    </TableCell>
                    <TableCell>{row.username}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.action}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {row.resource_type}
                      {row.resource_id ? ` #${row.resource_id}` : ""}
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && !audit.length && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      No audit entries recorded.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Section>
      </Group>
      <CategoryManagerDialog
        open={categoriesOpen}
        categories={categories}
        saving={saving}
        onClose={() => setCategoriesOpen(false)}
        onCreate={(payload) =>
          categoryAction(() => categoriesApi.create(payload))
        }
        onUpdate={(id, payload) =>
          categoryAction(() => categoriesApi.update(id, payload))
        }
        onArchive={(id) => categoryAction(() => categoriesApi.archive(id))}
        onRestore={(category) =>
          categoryAction(() => categoriesApi.restore(category.id))
        }
      />
    </PageContainer>
  );
}
