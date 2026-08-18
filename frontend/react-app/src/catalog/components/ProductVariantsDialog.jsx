import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

const packageFields = [
  ["lengthCm", "Length (cm)"],
  ["widthCm", "Width (cm)"],
  ["heightCm", "Height (cm)"],
  ["weightKg", "Weight (kg)"],
];
const blankVariant = (product) => ({
  sku: "",
  barcode: "",
  variantName: "",
  sellingPrice: "",
  initialStock: 0,
  defaultVariant: !product?.variants?.length,
  active: true,
  options: Object.fromEntries(
    (product?.optionTypes || []).map((type) => [type.name, ""]),
  ),
  packaging: { lengthCm: "", widthCm: "", heightCm: "", weightKg: "" },
});
const fromVariant = (variant) => ({
  ...variant,
  sellingPrice: String(variant.sellingPrice ?? ""),
  packaging: variant.packaging || {
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    weightKg: "",
  },
});
const numericPackage = (packaging) =>
  Object.fromEntries(
    Object.entries(packaging).map(([key, value]) => [key, Number(value)]),
  );

function VariantFields({ value, optionTypes, isNew, onChange }) {
  const set = (name, next) => onChange({ ...value, [name]: next });
  const setPackage = (name, next) =>
    set("packaging", { ...value.packaging, [name]: next });
  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          required
          fullWidth
          label="SKU"
          value={value.sku}
          onChange={(e) => set("sku", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          required
          fullWidth
          label="Barcode"
          value={value.barcode}
          onChange={(e) => set("barcode", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Variant name"
          value={value.variantName || ""}
          onChange={(e) => set("variantName", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <TextField
          required
          fullWidth
          type="number"
          label="Selling price"
          value={value.sellingPrice}
          onChange={(e) => set("sellingPrice", e.target.value)}
          inputProps={{ min: 0, step: 0.01 }}
        />
      </Grid>
      {isNew && (
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            required
            fullWidth
            type="number"
            label="Opening stock"
            value={value.initialStock}
            onChange={(e) => set("initialStock", e.target.value)}
            inputProps={{ min: 0 }}
          />
        </Grid>
      )}
      <Grid size={{ xs: 12, md: isNew ? 6 : 9 }}>
        <Stack direction="row" spacing={2}>
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(value.defaultVariant)}
                onChange={(e) => set("defaultVariant", e.target.checked)}
              />
            }
            label="Default variant"
          />
          {!isNew && (
            <FormControlLabel
              control={
                <Switch
                  checked={value.active !== false}
                  onChange={(e) => set("active", e.target.checked)}
                />
              }
              label="Active"
            />
          )}
        </Stack>
      </Grid>
      {optionTypes.map((type) => (
        <Grid key={type.id || type.name} size={{ xs: 12, md: 3 }}>
          <TextField
            required
            select
            fullWidth
            label={type.name}
            value={value.options?.[type.name] || ""}
            onChange={(e) =>
              set("options", { ...value.options, [type.name]: e.target.value })
            }
          >
            {type.values
              .filter((item) => item.active !== false)
              .map((item) => (
                <MenuItem key={item.id || item.value} value={item.value}>
                  {item.value}
                </MenuItem>
              ))}
          </TextField>
        </Grid>
      ))}
      {packageFields.map(([key, label]) => (
        <Grid key={key} size={{ xs: 6, md: 3 }}>
          <TextField
            required
            fullWidth
            type="number"
            label={label}
            value={value.packaging?.[key] ?? ""}
            onChange={(e) => setPackage(key, e.target.value)}
            inputProps={{ min: 0.001, step: 0.001 }}
          />
        </Grid>
      ))}
    </Grid>
  );
}

export default function ProductVariantsDialog({
  product,
  open,
  saving,
  onClose,
  onAddOptionType,
  onAddVariant,
  onUpdateVariant,
}) {
  const [editing, setEditing] = useState(null),
    [draft, setDraft] = useState(blankVariant(product)),
    [option, setOption] = useState({ name: "", values: "" }),
    [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setEditing(null);
      setDraft(blankVariant(product));
      setOption({ name: "", values: "" });
      setError("");
    }
  }, [
    open,
    product?.id,
    product?.optionTypes?.length,
    product?.variants?.length,
  ]);
  if (!product) return null;
  const activeOptionTypes = (product.optionTypes || []).filter(
    (type) => type.active !== false,
  );
  const combinationKey = (options) =>
    activeOptionTypes
      .map(
        (type) =>
          `${String(type.name).toLowerCase()}=${String(options?.[type.name] || "").toLowerCase()}`,
      )
      .join("|");
  const existingCombinations = new Set(
    (product.variants || []).map((variant) => combinationKey(variant.options)),
  );
  const possibleCombinationCount = activeOptionTypes.length
    ? activeOptionTypes.reduce(
        (total, type) =>
          total * type.values.filter((value) => value.active !== false).length,
        1,
      )
    : 1;
  const allCombinationsDefined =
    existingCombinations.size >= possibleCombinationCount;
  const draftCombination = combinationKey(draft.options);
  const draftCombinationComplete = activeOptionTypes.every(
    (type) => draft.options?.[type.name],
  );
  const draftCombinationExists =
    draftCombinationComplete && existingCombinations.has(draftCombination);
  const valid = (value) =>
    value.sku.trim() &&
    value.barcode.trim() &&
    value.sellingPrice !== "" &&
    Object.values(value.packaging || {}).every((item) => Number(item) > 0) &&
    activeOptionTypes.every((type) => value.options?.[type.name]);
  const saveExisting = async () => {
    if (!valid(editing))
      return setError(
        "Complete the SKU, barcode, price, options, and positive package measurements.",
      );
    const duplicate = (product.variants || []).some(
      (variant) =>
        variant.id !== editing.id &&
        combinationKey(variant.options) === combinationKey(editing.options),
    );
    if (duplicate)
      return setError("Another variant already uses this option combination.");
    try {
      await onUpdateVariant(editing.id, {
        sku: editing.sku,
        barcode: editing.barcode,
        variantName: editing.variantName,
        sellingPrice: Number(editing.sellingPrice),
        defaultVariant: editing.defaultVariant,
        active: editing.active,
        options: editing.options,
        packaging: numericPackage(editing.packaging),
      });
      setEditing(null);
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Could not update the variant.");
    }
  };
  const setVariantActive = async (variant, active) => {
    if (!active && variant.defaultVariant)
      return setError(
        "Make another active variant the default before deactivating this variant.",
      );
    if (
      !active &&
      !window.confirm(
        `Deactivate ${variant.variantName || variant.sku}? It will be unavailable for new sales.`,
      )
    )
      return;
    try {
      await onUpdateVariant(variant.id, { active });
      setEditing(null);
      setError("");
    } catch (e) {
      setError(
        e.response?.data?.message ||
          `Could not ${active ? "reactivate" : "deactivate"} the variant.`,
      );
    }
  };
  const addVariant = async () => {
    if (allCombinationsDefined)
      return setError("All possible option combinations are already defined.");
    if (draftCombinationExists)
      return setError("This option combination already exists.");
    if (!valid(draft))
      return setError(
        "Complete the SKU, barcode, price, options, and positive package measurements.",
      );
    try {
      await onAddVariant({
        ...draft,
        sellingPrice: Number(draft.sellingPrice),
        initialStock: Number(draft.initialStock || 0),
        active: true,
        packaging: numericPackage(draft.packaging),
      });
      setDraft(blankVariant(product));
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Could not add the variant.");
    }
  };
  const addOption = async () => {
    const values = option.values
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!option.name.trim() || !values.length)
      return setError(
        "Enter an option type and at least one comma-separated value.",
      );
    try {
      await onAddOptionType({ name: option.name.trim(), values });
      setOption({ name: "", values: "" });
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Could not add the option type.");
    }
  };
  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      fullWidth
      maxWidth="lg"
    >
      <DialogTitle>
        <Typography variant="h5" fontWeight={800}>
          Manage variants
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {product.masterName} · {product.spu}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: "background.default" }}>
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Paper variant="outlined" sx={{ p: 2, mb: 2.5 }}>
          <Typography fontWeight={700}>Add another option type</Typography>
          <Typography variant="caption" color="text.secondary">
            Use this when future variants need a new dimension such as Scent or
            Material.
          </Typography>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            sx={{ mt: 1.5 }}
          >
            <TextField
              label="Option type"
              placeholder="Scent"
              value={option.name}
              onChange={(e) => setOption({ ...option, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Values (comma separated)"
              placeholder="Rose, Citrus, Vanilla"
              value={option.values}
              onChange={(e) => setOption({ ...option, values: e.target.value })}
            />
            <Button variant="outlined" onClick={addOption} disabled={saving}>
              Add option
            </Button>
          </Stack>
        </Paper>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Existing variants
        </Typography>
        <Stack spacing={1.5}>
          {product.variants?.map((variant) => (
            <Paper key={variant.id} variant="outlined" sx={{ p: 2 }}>
              {editing?.id === variant.id ? (
                <>
                  <VariantFields
                    value={editing}
                    optionTypes={product.optionTypes || []}
                    onChange={setEditing}
                  />
                  <Stack
                    direction="row"
                    justifyContent="flex-end"
                    spacing={1}
                    sx={{ mt: 2 }}
                  >
                    <Button onClick={() => setEditing(null)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      onClick={saveExisting}
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save variant"}
                    </Button>
                  </Stack>
                </>
              ) : (
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ md: "center" }}
                  spacing={1}
                >
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography fontWeight={700}>
                        {variant.variantName || "Default variant"}
                      </Typography>
                      <Chip
                        size="small"
                        color={variant.active ? "success" : "default"}
                        label={variant.active ? "Active" : "Inactive"}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {variant.sku} · {variant.barcode} ·{" "}
                      {Object.entries(variant.options || {})
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(" · ") || "No options"}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      onClick={() => setEditing(fromVariant(variant))}
                      disabled={saving}
                    >
                      Edit
                    </Button>
                    {variant.active ? (
                      <Button
                        color="error"
                        variant="outlined"
                        onClick={() => setVariantActive(variant, false)}
                        disabled={saving || variant.defaultVariant}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        color="success"
                        variant="outlined"
                        onClick={() => setVariantActive(variant, true)}
                        disabled={saving}
                      >
                        Reactivate
                      </Button>
                    )}
                  </Stack>
                </Stack>
              )}
            </Paper>
          ))}
        </Stack>
        <Paper
          variant="outlined"
          sx={{ p: 2, mt: 3, opacity: allCombinationsDefined ? 0.65 : 1 }}
        >
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Add variant
          </Typography>
          {allCombinationsDefined && (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              All {possibleCombinationCount} possible option combination
              {possibleCombinationCount === 1 ? " is" : "s are"} already
              defined.
            </Alert>
          )}
          {draftCombinationExists && !allCombinationsDefined && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              This option combination already exists. Choose a different
              combination.
            </Alert>
          )}
          <VariantFields
            value={draft}
            optionTypes={product.optionTypes || []}
            isNew
            onChange={setDraft}
          />
          <Box sx={{ textAlign: "right", mt: 2 }}>
            <Button
              variant="contained"
              onClick={addVariant}
              disabled={
                saving || allCombinationsDefined || draftCombinationExists
              }
            >
              {saving ? "Adding…" : "Add variant"}
            </Button>
          </Box>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
