import React, { useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { CategoryTreeSelector } from "./CategorySelector";

const emptyVariant = () => ({
  sku: "",
  barcode: "",
  variantName: "Default",
  sellingPrice: "",
  initialStock: 0,
  options: {},
  packaging: { lengthCm: "", widthCm: "", heightCm: "", weightKg: "" },
});
const initial = () => ({
  masterName: "",
  upc: "",
  spu: "",
  categoryId: "",
  brandId: "",
  condition: "NEW",
  shelfLifeDays: "",
  minimumPurchaseQuantity: 1,
  shortDescription: "",
  longDescription: "",
  hasVariations: false,
  preorder: false,
  remarks1: "",
  remarks2: "",
  remarks3: "",
  customs: {
    chineseName: "",
    englishName: "",
    hsCode: "",
    invoiceAmount: "",
    invoiceCurrency: "AUD",
    grossWeightKg: "",
  },
  cost: {
    sourceUrl: "",
    purchaseDurationDays: "",
    salesTaxAmount: "",
    taxCurrency: "AUD",
  },
});
const clean = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
const numberOrNull = (value) =>
  value === "" || value == null ? null : Number(value);
const present = (object) =>
  Object.values(object).some((value) => value !== "" && value != null);
const combinations = (groups) =>
  groups.reduce(
    (sets, group) =>
      sets.flatMap((set) =>
        group.values.map((value) => ({ ...set, [group.name]: value })),
      ),
    [{}],
  );

function Section({ title, subtitle, children, defaultExpanded = false }) {
  return (
    <Accordion defaultExpanded={defaultExpanded} disableGutters>
      <AccordionSummary expandIcon="⌄">
        <Box>
          <Typography fontWeight={700}>{title}</Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

export default function ProductEditorDialog({
  open,
  categories,
  brands,
  channels,
  onClose,
  onSave,
  saving,
}) {
  const [form, setForm] = useState(initial),
    [options, setOptions] = useState([]),
    [variants, setVariants] = useState([emptyVariant()]),
    [images, setImages] = useState([]),
    [listings, setListings] = useState([]),
    [error, setError] = useState("");
  const activeOptions = useMemo(
    () =>
      options
        .map((o) => ({
          name: o.name.trim(),
          values: o.values
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        }))
        .filter((o) => o.name && o.values.length),
    [options],
  );

  const close = () => {
    if (!saving) {
      setForm(initial());
      setOptions([]);
      setVariants([emptyVariant()]);
      setImages([]);
      setListings([]);
      setError("");
      onClose();
    }
  };
  const generate = () => {
    if (!activeOptions.length)
      return setError(
        "Add at least one option type and its comma-separated values.",
      );
    const combos = combinations(activeOptions);
    if (combos.length > 200)
      return setError(
        `These options create ${combos.length} variants. Reduce the values to 200 combinations or fewer.`,
      );
    setVariants(
      combos.map((combo, index) => {
        const key = JSON.stringify(combo);
        const old = variants.find((v) => JSON.stringify(v.options) === key);
        return (
          old || {
            ...emptyVariant(),
            sku: [clean(form.spu), ...Object.values(combo).map(clean)]
              .filter(Boolean)
              .join("-"),
            variantName: Object.values(combo).join(" / "),
            options: combo,
            defaultVariant: index === 0,
          }
        );
      }),
    );
    setError("");
  };
  const updateVariant = (index, patch) =>
    setVariants((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  const updatePackage = (index, field, value) =>
    updateVariant(index, {
      packaging: { ...variants[index].packaging, [field]: value },
    });
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (
      !form.masterName.trim() ||
      !form.upc.trim() ||
      !form.spu.trim() ||
      !form.categoryId ||
      !form.brandId
    )
      return setError("Complete the required master product fields.");
    if (form.hasVariations && !activeOptions.length)
      return setError("Generate variants from at least one option type.");
    if (
      !variants.length ||
      variants.some(
        (v) => !v.sku.trim() || !v.barcode.trim() || v.sellingPrice === "",
      )
    )
      return setError(
        "Every variant requires a SKU, barcode and selling price.",
      );
    if (
      variants.some((v) =>
        Object.values(v.packaging).some((x) => !x || Number(x) <= 0),
      )
    )
      return setError(
        "Every variant requires positive package length, width, height and weight.",
      );
    const payload = {
      ...form,
      categoryId: Number(form.categoryId),
      brandId: Number(form.brandId),
      shelfLifeDays: numberOrNull(form.shelfLifeDays),
      minimumPurchaseQuantity: Number(form.minimumPurchaseQuantity),
      optionTypes: form.hasVariations ? activeOptions : [],
      variants: variants.map((v, i) => ({
        ...v,
        sellingPrice: Number(v.sellingPrice),
        initialStock: Number(v.initialStock || 0),
        defaultVariant: i === 0,
        active: true,
        packaging: Object.fromEntries(
          Object.entries(v.packaging).map(([k, val]) => [k, Number(val)]),
        ),
      })),
      images: images
        .filter((i) => i.imageUrl.trim())
        .map((i, index) => ({ ...i, primary: index === 0, sortOrder: index })),
      channelListings: listings
        .filter((l) => l.enabled)
        .map((l) => ({
          channelId: Number(l.channelId),
          sellingStatus: l.sellingStatus,
          externalProductId: l.externalProductId,
        })),
      customs: present({ ...form.customs, invoiceCurrency: "" })
        ? {
            ...form.customs,
            invoiceAmount: numberOrNull(form.customs.invoiceAmount),
            grossWeightKg: numberOrNull(form.customs.grossWeightKg),
          }
        : null,
      cost: present({ ...form.cost, taxCurrency: "" })
        ? {
            ...form.cost,
            purchaseDurationDays: numberOrNull(form.cost.purchaseDurationDays),
            salesTaxAmount: numberOrNull(form.cost.salesTaxAmount),
          }
        : null,
    };
    try {
      await onSave(payload);
      setForm(initial());
      setOptions([]);
      setVariants([emptyVariant()]);
      setImages([]);
      setListings([]);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Could not create the product.");
    }
  };
  const field = (name, value) =>
    setForm((current) => ({ ...current, [name]: value }));
  const nested = (group, name, value) =>
    setForm((current) => ({
      ...current,
      [group]: { ...current[group], [name]: value },
    }));

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xl">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>
          <Typography variant="h5" fontWeight={800}>
            Create master product
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Define the product once, then create every sellable SKU beneath it.
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "background.default" }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={1.5}>
            <Section
              title="1. Master product"
              subtitle="Identity, classification and selling rules"
              defaultExpanded
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    required
                    fullWidth
                    label="Master product name"
                    value={form.masterName}
                    onChange={(e) => field("masterName", e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    required
                    fullWidth
                    label="UPC"
                    value={form.upc}
                    onChange={(e) => field("upc", e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    required
                    fullWidth
                    label="SPU"
                    value={form.spu}
                    onChange={(e) => field("spu", e.target.value)}
                  />
                </Grid>
                <Grid size={12}>
                  <CategoryTreeSelector
                    categories={categories}
                    value={form.categoryId}
                    onChange={(value) => field("categoryId", value)}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    required
                    select
                    fullWidth
                    label="Brand"
                    value={form.brandId}
                    onChange={(e) => field("brandId", e.target.value)}
                  >
                    {brands
                      .filter((b) => b.active !== false)
                      .map((b) => (
                        <MenuItem key={b.id} value={b.id}>
                          {b.name}
                        </MenuItem>
                      ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Condition"
                    value={form.condition}
                    onChange={(e) => field("condition", e.target.value)}
                  >
                    {[
                      "NEW",
                      "USED_LIKE_NEW",
                      "USED_GOOD",
                      "USED_ACCEPTABLE",
                      "REFURBISHED",
                    ].map((v) => (
                      <MenuItem key={v} value={v}>
                        {v.replaceAll("_", " ")}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Shelf life (days)"
                    value={form.shelfLifeDays}
                    onChange={(e) => field("shelfLifeDays", e.target.value)}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField
                    required
                    fullWidth
                    type="number"
                    label="Minimum purchase quantity"
                    value={form.minimumPurchaseQuantity}
                    onChange={(e) =>
                      field("minimumPurchaseQuantity", e.target.value)
                    }
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.preorder}
                        onChange={(e) => field("preorder", e.target.checked)}
                      />
                    }
                    label="Available for preorder"
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Short description"
                    value={form.shortDescription}
                    onChange={(e) => field("shortDescription", e.target.value)}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Long description"
                    value={form.longDescription}
                    onChange={(e) => field("longDescription", e.target.value)}
                  />
                </Grid>
              </Grid>
            </Section>
            <Section
              title="2. Product variants"
              subtitle="Any option types are supported: Color, Size, Scent, Material and more"
              defaultExpanded
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={form.hasVariations}
                    onChange={(e) => {
                      field("hasVariations", e.target.checked);
                      if (!e.target.checked) setVariants([emptyVariant()]);
                    }}
                  />
                }
                label="This product has variations"
              />
              {form.hasVariations && (
                <Box sx={{ mt: 2 }}>
                  <Stack spacing={1.5}>
                    {options.map((option, index) => (
                      <Stack
                        key={index}
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                      >
                        <TextField
                          fullWidth
                          label="Option type"
                          placeholder="e.g. Scent"
                          value={option.name}
                          onChange={(e) =>
                            setOptions((current) =>
                              current.map((o, i) =>
                                i === index
                                  ? { ...o, name: e.target.value }
                                  : o,
                              ),
                            )
                          }
                          sx={{ minWidth: { md: 220 } }}
                        />
                        <TextField
                          fullWidth
                          label="Values (comma separated)"
                          placeholder="e.g. Rose, Citrus, Vanilla"
                          value={option.values}
                          onChange={(e) =>
                            setOptions((current) =>
                              current.map((o, i) =>
                                i === index
                                  ? { ...o, values: e.target.value }
                                  : o,
                              ),
                            )
                          }
                        />
                        <IconButton
                          aria-label="Remove option"
                          onClick={() =>
                            setOptions((current) =>
                              current.filter((_, i) => i !== index),
                            )
                          }
                          sx={{ alignSelf: { xs: "flex-end", md: "center" } }}
                        >
                          ×
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ mt: 1.5 }}
                  >
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() =>
                        setOptions((current) => [
                          ...current,
                          { name: "", values: "" },
                        ])
                      }
                    >
                      Add option type
                    </Button>
                    <Button fullWidth variant="contained" onClick={generate}>
                      Generate combinations
                    </Button>
                  </Stack>
                </Box>
              )}
              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                {variants.length} sellable variant
                {variants.length === 1 ? "" : "s"}
              </Typography>
              <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" } }}>
                {variants.map((variant, index) => (
                  <Paper
                    variant="outlined"
                    key={JSON.stringify(variant.options) + index}
                    sx={{ p: 2 }}
                  >
                    <Stack spacing={2}>
                      <Typography fontWeight={700}>
                        {variant.variantName}
                      </Typography>
                      <TextField
                        required
                        fullWidth
                        label="SKU"
                        value={variant.sku}
                        onChange={(e) =>
                          updateVariant(index, { sku: e.target.value })
                        }
                      />
                      <TextField
                        required
                        fullWidth
                        label="Barcode"
                        value={variant.barcode}
                        onChange={(e) =>
                          updateVariant(index, { barcode: e.target.value })
                        }
                      />
                      <TextField
                        required
                        fullWidth
                        label="Price"
                        type="number"
                        value={variant.sellingPrice}
                        onChange={(e) =>
                          updateVariant(index, { sellingPrice: e.target.value })
                        }
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                      <TextField
                        fullWidth
                        label="Opening stock"
                        type="number"
                        value={variant.initialStock}
                        onChange={(e) =>
                          updateVariant(index, { initialStock: e.target.value })
                        }
                        inputProps={{ min: 0 }}
                      />
                      <Divider>
                        <Typography variant="caption" color="text.secondary">
                          PACKAGE
                        </Typography>
                      </Divider>
                      {[
                        ["lengthCm", "Length (cm)"],
                        ["widthCm", "Width (cm)"],
                        ["heightCm", "Height (cm)"],
                      ].map(([key, label]) => (
                        <TextField
                          required
                          fullWidth
                          key={key}
                          label={label}
                          type="number"
                          value={variant.packaging[key]}
                          onChange={(e) =>
                            updatePackage(index, key, e.target.value)
                          }
                          inputProps={{ min: 0.01, step: 0.01 }}
                        />
                      ))}
                      <TextField
                        required
                        fullWidth
                        label="Weight (kg)"
                        type="number"
                        value={variant.packaging.weightKg}
                        onChange={(e) =>
                          updatePackage(index, "weightKg", e.target.value)
                        }
                        inputProps={{ min: 0.001, step: 0.001 }}
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ display: { xs: "none", md: "block" } }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Variant</TableCell>
                      <TableCell>SKU *</TableCell>
                      <TableCell>Barcode *</TableCell>
                      <TableCell>Price *</TableCell>
                      <TableCell>Opening stock</TableCell>
                      <TableCell>Package L × W × H (cm)</TableCell>
                      <TableCell>Weight (kg)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {variants.map((variant, index) => (
                      <TableRow key={JSON.stringify(variant.options) + index}>
                        <TableCell sx={{ minWidth: 130 }}>
                          {variant.variantName}
                        </TableCell>
                        <TableCell>
                          <TextField
                            required
                            size="small"
                            value={variant.sku}
                            onChange={(e) =>
                              updateVariant(index, { sku: e.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            required
                            size="small"
                            value={variant.barcode}
                            onChange={(e) =>
                              updateVariant(index, { barcode: e.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            required
                            size="small"
                            type="number"
                            value={variant.sellingPrice}
                            onChange={(e) =>
                              updateVariant(index, {
                                sellingPrice: e.target.value,
                              })
                            }
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={variant.initialStock}
                            onChange={(e) =>
                              updateVariant(index, {
                                initialStock: e.target.value,
                              })
                            }
                            inputProps={{ min: 0 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {["lengthCm", "widthCm", "heightCm"].map((k) => (
                              <TextField
                                required
                                key={k}
                                size="small"
                                type="number"
                                value={variant.packaging[k]}
                                onChange={(e) =>
                                  updatePackage(index, k, e.target.value)
                                }
                                inputProps={{ min: 0.01, step: 0.01 }}
                                sx={{ width: 78 }}
                              />
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <TextField
                            required
                            size="small"
                            type="number"
                            value={variant.packaging.weightKg}
                            onChange={(e) =>
                              updatePackage(index, "weightKg", e.target.value)
                            }
                            inputProps={{ min: 0.001, step: 0.001 }}
                            sx={{ width: 90 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Section>
            <Section
              title="3. Images and channels"
              subtitle="Images are stored by URL; the first image is primary"
            >
              <Stack spacing={1.5}>
                {images.map((item, index) => (
                  <Stack
                    key={index}
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                  >
                    <TextField
                      required
                      fullWidth
                      label="Image URL"
                      value={item.imageUrl}
                      onChange={(e) =>
                        setImages((curr) =>
                          curr.map((x, i) =>
                            i === index
                              ? { ...x, imageUrl: e.target.value }
                              : x,
                          ),
                        )
                      }
                    />
                    <TextField
                      label="Alt text"
                      value={item.altText}
                      onChange={(e) =>
                        setImages((curr) =>
                          curr.map((x, i) =>
                            i === index ? { ...x, altText: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <IconButton
                      onClick={() =>
                        setImages((curr) => curr.filter((_, i) => i !== index))
                      }
                    >
                      ×
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
              <Button
                variant="outlined"
                sx={{ mt: 1 }}
                onClick={() =>
                  setImages((curr) => [...curr, { imageUrl: "", altText: "" }])
                }
              >
                Add image
              </Button>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={1.5}>
                {channels.map((channel) => {
                  const current = listings.find(
                    (l) => l.channelId === channel.id,
                  ) || {
                    channelId: channel.id,
                    enabled: false,
                    sellingStatus: "DRAFT",
                    externalProductId: "",
                  };
                  const change = (patch) =>
                    setListings((values) => [
                      ...values.filter((l) => l.channelId !== channel.id),
                      { ...current, ...patch },
                    ]);
                  return (
                    <Grid key={channel.id} size={{ xs: 12, md: 6 }}>
                      <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={current.enabled}
                                onChange={(e) =>
                                  change({ enabled: e.target.checked })
                                }
                              />
                            }
                            label={channel.name}
                          />
                          <TextField
                            select
                            size="small"
                            label="Status"
                            value={current.sellingStatus}
                            onChange={(e) =>
                              change({ sellingStatus: e.target.value })
                            }
                            disabled={!current.enabled}
                            sx={{ minWidth: 130 }}
                          >
                            {[
                              "DRAFT",
                              "READY",
                              "ACTIVE",
                              "PAUSED",
                              "REJECTED",
                              "ARCHIVED",
                            ].map((v) => (
                              <MenuItem key={v} value={v}>
                                {v}
                              </MenuItem>
                            ))}
                          </TextField>
                          <TextField
                            size="small"
                            label="External product ID"
                            value={current.externalProductId}
                            onChange={(e) =>
                              change({ externalProductId: e.target.value })
                            }
                            disabled={!current.enabled}
                          />
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Section>
            <Section title="4. Customs and cost information">
              <Grid container spacing={2}>
                {[
                  ["chineseName", "Customs Chinese name"],
                  ["englishName", "Customs English name"],
                  ["hsCode", "HS code"],
                  ["invoiceAmount", "Invoice amount", "number"],
                  ["invoiceCurrency", "Invoice currency"],
                  ["grossWeightKg", "Gross weight (kg)", "number"],
                ].map(([key, label, type]) => (
                  <Grid key={key} size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      type={type}
                      label={label}
                      value={form.customs[key]}
                      onChange={(e) => nested("customs", key, e.target.value)}
                    />
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                {[
                  ["sourceUrl", "Source URL"],
                  [
                    "purchaseDurationDays",
                    "Purchase duration (days)",
                    "number",
                  ],
                  ["salesTaxAmount", "Sales tax amount", "number"],
                  ["taxCurrency", "Tax currency"],
                ].map(([key, label, type]) => (
                  <Grid key={key} size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      type={type}
                      label={label}
                      value={form.cost[key]}
                      onChange={(e) => nested("cost", key, e.target.value)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Section>
            <Section title="5. Other information">
              <Grid container spacing={2}>
                {[1, 2, 3].map((n) => (
                  <Grid key={n} size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      label={`Remarks ${n}`}
                      value={form[`remarks${n}`]}
                      onChange={(e) => field(`remarks${n}`, e.target.value)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Section>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Creating product…" : "Create product"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
