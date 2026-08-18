import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PageContainer from "../../shared/components/layout/PageContainer";
import PageHeader from "../../shared/components/layout/PageHeader";
import {
  brandsApi,
  categoriesApi,
  channelsApi,
  productsApi,
} from "../../shared/api/mvpApi";
import { useAuth } from "../../identity/hooks/useAuth";
import ProductEditorDialog from "../components/ProductEditorDialog";
import ProductDetailDialog from "../components/ProductDetailDialog";
import ProductVariantsDialog from "../components/ProductVariantsDialog";
import CategorySelector, { categoryPath } from "../components/CategorySelector";
import ProductRegister from "../components/ProductRegister";

const message = (error, fallback) => error.response?.data?.message || fallback;

export default function ProductsPage() {
  const { user } = useAuth();
  const canManage = user?.roles?.includes("MANAGEMENT");
  const [items, setItems] = useState([]),
    [categoryItems, setCategoryItems] = useState({}),
    [categoryCounts, setCategoryCounts] = useState({}),
    [categories, setCategories] = useState([]),
    [brands, setBrands] = useState([]),
    [channels, setChannels] = useState([]),
    [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false),
    [variantsOpen, setVariantsOpen] = useState(false),
    [detail, setDetail] = useState(null),
    [selected, setSelected] = useState(null),
    [expandedSections, setExpandedSections] = useState(new Set()),
    [loadingCategory, setLoadingCategory] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const categoryBreadcrumb = (categoryId) =>
    categoryPath(categories, categoryId)
      .map((category) => category.name)
      .join(" › ");

  const loadCounts = async () => {
    const rows = await productsApi.categoryCounts();
    setCategoryCounts(
      Object.fromEntries(
        rows.map((row) => [
          String(row.category_id ?? row.categoryId),
          Number(row.product_count ?? row.productCount ?? 0),
        ]),
      ),
    );
  };
  const load = async (term) => {
    setLoading(true);
    try {
      if (term?.trim()) setItems(await productsApi.search(term.trim()));
      else {
        setItems([]);
        await loadCounts();
      }
    } catch (e) {
      setError(message(e, "Could not load the product register."));
    } finally {
      setLoading(false);
    }
  };
  const loadReferences = async () => {
    try {
      const [c, b, ch] = await Promise.all([
        categoriesApi.list(),
        brandsApi.list(),
        channelsApi.list(),
      ]);
      setCategories(c);
      setBrands(b);
      setChannels(ch);
    } catch (e) {
      setError(message(e, "Could not load catalogue reference data."));
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => load(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    loadReferences();
  }, []);
  const refreshRegister = async () => {
    if (query.trim()) await load(query);
    else {
      await loadCounts();
      setCategoryItems({});
      setExpandedSections(new Set());
    }
  };
  const create = async (payload) => {
    setSaving(true);
    try {
      await productsApi.create(payload);
      await refreshRegister();
    } finally {
      setSaving(false);
    }
  };
  const inspect = async (item) => {
    setSaving(true);
    try {
      setDetail(await productsApi.get(item.id));
    } catch (e) {
      setError(message(e, "Could not retrieve product details."));
    } finally {
      setSaving(false);
    }
  };
  const edit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await productsApi.update(selected.id, {
        masterName: selected.masterName,
        upc: selected.upc,
        spu: selected.spu,
        categoryId: Number(selected.categoryId),
        brandId: Number(selected.brandId),
        condition: selected.condition,
        shelfLifeDays: selected.shelfLifeDays
          ? Number(selected.shelfLifeDays)
          : null,
        minimumPurchaseQuantity: Number(selected.minimumPurchaseQuantity),
        shortDescription: selected.shortDescription,
        longDescription: selected.longDescription,
        preorder: selected.preorder,
        remarks1: selected.remarks1,
        remarks2: selected.remarks2,
        remarks3: selected.remarks3,
        active: selected.active,
      });
      setSelected(null);
      await refreshRegister();
      if (detail) setDetail(await productsApi.get(detail.id));
    } catch (e) {
      setError(message(e, "Could not update product."));
    } finally {
      setSaving(false);
    }
  };
  const archive = async (item) => {
    if (
      !window.confirm(
        `Archive ${item.masterName}? It will be unavailable for new orders.`,
      )
    )
      return;
    setSaving(true);
    try {
      await productsApi.archive(item.id);
      setDetail((current) =>
        current?.id === item.id ? { ...current, active: false } : current,
      );
      await refreshRegister();
    } catch (e) {
      setError(message(e, "Could not archive product."));
    } finally {
      setSaving(false);
    }
  };
  const stock = async (variant) => {
    const quantity = window.prompt(
      `Set physical quantity for ${variant.sku}`,
      variant.quantity,
    );
    if (quantity === null || quantity === "") return;
    setSaving(true);
    try {
      await productsApi.variantStock(detail.id, variant.id, Number(quantity));
      setDetail(await productsApi.get(detail.id));
      await refreshRegister();
    } catch (e) {
      setError(message(e, "Could not update variant stock."));
    } finally {
      setSaving(false);
    }
  };
  const changeVariant = async (action) => {
    setSaving(true);
    try {
      await action();
      setDetail(await productsApi.get(detail.id));
      await refreshRegister();
    } finally {
      setSaving(false);
    }
  };
  const searching = Boolean(query.trim());
  const searchGroups = Object.values(
    items.reduce((groups, item) => {
      const path = categoryPath(categories, item.categoryId);
      const root = path[0],
        key = root?.id ? String(root.id) : "uncategorized";
      groups[key] ||= {
        id: key,
        name: root?.name || "Uncategorized",
        items: [],
        count: 0,
        loaded: true,
      };
      groups[key].items.push(item);
      groups[key].count += 1;
      return groups;
    }, {}),
  );
  const lazyGroups = categories
    .filter((category) => !(category.parentId ?? category.parent_id))
    .map((category) => ({
      id: String(category.id),
      name: category.name,
      count: categoryCounts[String(category.id)] || 0,
      items: categoryItems[String(category.id)] || [],
      loaded: Object.hasOwn(categoryItems, String(category.id)),
    }));
  const groupedItems = (searching ? searchGroups : lazyGroups)
    .map((group) => ({
      ...group,
      items: group.items.sort(
        (a, b) =>
          (categoryBreadcrumb(a.categoryId) || "").localeCompare(
            categoryBreadcrumb(b.categoryId) || "",
          ) || (a.masterName || a.name).localeCompare(b.masterName || b.name),
      ),
    }))
    .sort((a, b) =>
      a.name === "Uncategorized"
        ? 1
        : b.name === "Uncategorized"
          ? -1
          : a.name.localeCompare(b.name),
    );
  const subcategoryGroups = (group) =>
    Object.values(
      group.items.reduce((groups, item) => {
        const path = categoryPath(categories, item.categoryId),
          subcategory = path[1],
          key = subcategory?.id ? String(subcategory.id) : `root-${group.id}`;
        groups[key] ||= {
          id: key,
          name: subcategory?.name || `Directly under ${group.name}`,
          items: [],
        };
        item.deepCategoryPath =
          path
            .slice(2)
            .map((category) => category.name)
            .join(" › ") || "Other";
        groups[key].items.push(item);
        return groups;
      }, {}),
    ).sort((a, b) => a.name.localeCompare(b.name));
  const toggleSection = async (group) => {
    const key = String(group.id);
    if (expandedSections.has(key))
      return setExpandedSections((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    if (!searching && !group.loaded) {
      setLoadingCategory(key);
      try {
        const rows = await productsApi.list(key);
        setCategoryItems((current) => ({ ...current, [key]: rows }));
      } catch (e) {
        setError(message(e, "Could not load products in this category."));
        return;
      } finally {
        setLoadingCategory(null);
      }
    }
    setExpandedSections((current) => new Set([...current, key]));
  };
  const totalProducts = searching
    ? items.length
    : Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);

  return (
    <PageContainer>
      <PageHeader
        title="Product catalogue"
        subtitle="Master products, sellable variants, channel status and inventory in one place."
      />
      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      )}
      <Card sx={{ mb: 2.5, p: 2.5 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ md: "center" }}
          spacing={2}
        >
          <Box>
            <Typography variant="h6">Catalogue workspace</Typography>
            <Typography variant="body2" color="text.secondary">
              Each product can have arbitrary option types and its own SKU,
              barcode, package and stock per combination.
            </Typography>
          </Box>
          {canManage && (
            <Button
              variant="contained"
              size="large"
              onClick={() => setCreateOpen(true)}
            >
              Create master product
            </Button>
          )}
        </Stack>
      </Card>
      <Card sx={{ overflow: "visible" }}>
        <Box
          sx={{
            p: 2.5,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            alignItems: { sm: "center" },
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Product register</Typography>
            <Typography variant="body2" color="text.secondary">
              {totalProducts} {searching ? "matching " : ""}master product
              {totalProducts === 1 ? "" : "s"}
              {!searching ? " · expand a category to load its products" : ""}
            </Typography>
          </Box>
          <TextField
            placeholder="Search SPU, SKU or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">⌕</InputAdornment>
              ),
            }}
            sx={{ width: { xs: "100%", sm: 330 } }}
          />
        </Box>
        <ProductRegister
          loading={loading}
          searching={searching}
          groups={groupedItems}
          expandedSections={expandedSections}
          loadingCategory={loadingCategory}
          subcategoryGroups={subcategoryGroups}
          categoryBreadcrumb={categoryBreadcrumb}
          saving={saving}
          onToggle={toggleSection}
          onView={inspect}
        />
      </Card>
      <ProductEditorDialog
        open={createOpen}
        categories={categories}
        brands={brands}
        channels={channels}
        saving={saving}
        onClose={() => setCreateOpen(false)}
        onSave={create}
      />
      <ProductDetailDialog
        product={detail}
        categoryBreadcrumb={detail ? categoryBreadcrumb(detail.categoryId) : ""}
        canManage={canManage}
        saving={saving}
        onClose={() => setDetail(null)}
        onStock={stock}
        onEdit={() => setSelected({ ...detail })}
        onEditVariants={() => setVariantsOpen(true)}
        onArchive={() => archive(detail)}
      />
      <ProductVariantsDialog
        product={detail}
        open={variantsOpen}
        saving={saving}
        onClose={() => setVariantsOpen(false)}
        onAddOptionType={(payload) =>
          changeVariant(() => productsApi.addOptionType(detail.id, payload))
        }
        onAddVariant={(payload) =>
          changeVariant(() => productsApi.addVariant(detail.id, payload))
        }
        onUpdateVariant={(variantId, payload) =>
          changeVariant(() =>
            productsApi.updateVariant(detail.id, variantId, payload),
          )
        }
      />
      <Dialog
        open={Boolean(selected)}
        onClose={() => !saving && setSelected(null)}
        fullWidth
        maxWidth="md"
      >
        <Box component="form" onSubmit={edit}>
          <DialogTitle>Edit master product</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  required
                  fullWidth
                  label="Master product name"
                  value={selected?.masterName || ""}
                  onChange={(e) =>
                    setSelected({ ...selected, masterName: e.target.value })
                  }
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  required
                  fullWidth
                  label="UPC"
                  value={selected?.upc || ""}
                  onChange={(e) =>
                    setSelected({ ...selected, upc: e.target.value })
                  }
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  required
                  fullWidth
                  label="SPU"
                  value={selected?.spu || ""}
                  onChange={(e) =>
                    setSelected({ ...selected, spu: e.target.value })
                  }
                />
              </Grid>
              <Grid size={12}>
                <CategorySelector
                  categories={categories}
                  value={selected?.categoryId || ""}
                  onChange={(value) =>
                    setSelected({ ...selected, categoryId: value })
                  }
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  required
                  select
                  fullWidth
                  label="Brand"
                  value={selected?.brandId || ""}
                  onChange={(e) =>
                    setSelected({ ...selected, brandId: e.target.value })
                  }
                >
                  {brands.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  label="Condition"
                  value={selected?.condition || "NEW"}
                  onChange={(e) =>
                    setSelected({ ...selected, condition: e.target.value })
                  }
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
                  value={selected?.shelfLifeDays || ""}
                  onChange={(e) =>
                    setSelected({ ...selected, shelfLifeDays: e.target.value })
                  }
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  required
                  fullWidth
                  type="number"
                  label="Minimum purchase"
                  value={selected?.minimumPurchaseQuantity || 1}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      minimumPurchaseQuantity: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Short description"
                  value={selected?.shortDescription || ""}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      shortDescription: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Long description"
                  value={selected?.longDescription || ""}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      longDescription: e.target.value,
                    })
                  }
                />
              </Grid>
              {[1, 2, 3].map((n) => (
                <Grid key={n} size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label={`Remarks ${n}`}
                    value={selected?.[`remarks${n}`] || ""}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        [`remarks${n}`]: e.target.value,
                      })
                    }
                  />
                </Grid>
              ))}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelected(null)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </PageContainer>
  );
}
