import React, { useState } from "react";
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

const money = (value) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(Number(value || 0));

function RootHeader({ group, open, loading, searching, onToggle, stickyTop }) {
  return (
    <Box
      component={searching ? "div" : "button"}
      type={searching ? undefined : "button"}
      onClick={() => !searching && onToggle(group)}
      sx={{
        width: "100%",
        border: 0,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: stickyTop == null ? "action.hover" : "background.paper",
        color: "text.primary",
        textAlign: "left",
        px: { xs: 2, md: 2.5 },
        py: 1.4,
        minHeight: 48,
        cursor: searching ? "default" : "pointer",
        position: stickyTop == null ? "static" : "sticky",
        top: stickyTop,
        zIndex: stickyTop == null ? "auto" : 6,
        boxShadow: stickyTop == null ? "none" : "0 3px 8px rgba(15,23,42,.14)",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        {!searching && (
          <Typography aria-hidden sx={{ width: 18 }}>
            {open ? "▾" : "▸"}
          </Typography>
        )}
        <Typography variant="subtitle1" fontWeight={800} sx={{ minWidth: 0 }}>
          {group.name}
        </Typography>
        <Chip
          size="small"
          variant="outlined"
          label={`${group.count} product${group.count === 1 ? "" : "s"}`}
        />
        {loading && <CircularProgress size={16} />}
      </Stack>
    </Box>
  );
}

function ColumnHeadingRow() {
  const stickyCell = {
    position: "sticky",
    top: 164,
    zIndex: 4,
    bgcolor: "background.paper",
    fontWeight: 700,
    borderTop: 0,
    "&::before": {
      content: '""',
      position: "absolute",
      left: 0,
      right: 0,
      top: -4,
      height: 4,
      bgcolor: "background.paper",
    },
  };
  return (
    <TableRow>
      <TableCell sx={stickyCell}>Brand</TableCell>
      <TableCell sx={stickyCell}>Master product</TableCell>
      <TableCell sx={stickyCell}>Default SKU</TableCell>
      <TableCell sx={stickyCell}>Variants</TableCell>
      <TableCell sx={stickyCell}>Price</TableCell>
      <TableCell sx={stickyCell} align="right">
        Available
      </TableCell>
      <TableCell sx={stickyCell}>Status</TableCell>
    </TableRow>
  );
}

function ProductCard({ item, stripeIndex, saving, onView }) {
  return (
    <Card
      variant="outlined"
      role="button"
      tabIndex={0}
      onClick={() => !saving && onView(item)}
      onKeyDown={(event) => {
        if (!saving && (event.key === "Enter" || event.key === " "))
          onView(item);
      }}
      sx={{
        p: 2,
        bgcolor: stripeIndex % 2 ? "action.hover" : "background.paper",
        cursor: saving ? "wait" : "pointer",
        transition: "border-color .15s, box-shadow .15s",
        "&:hover": { borderColor: "primary.main", boxShadow: 2 },
      }}
    >
      <Stack spacing={1.4}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={800}>
              {item.masterName || item.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              SPU {item.spu || "—"} · SKU {item.sku || "—"}
            </Typography>
          </Box>
          <Chip
            size="small"
            color={item.active ? "success" : "default"}
            label={item.active ? "Active" : "Archived"}
          />
        </Stack>
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {item.brandName || "No brand"}
          </Typography>
        </Box>
        <Divider />
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Price
            </Typography>
            <Typography fontWeight={800}>{money(item.price)}</Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="caption" color="text.secondary">
              Variants
            </Typography>
            <Typography fontWeight={700}>{item.variantCount}</Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="caption" color="text.secondary">
              Available
            </Typography>
            <Typography
              fontWeight={800}
              color={item.available <= 5 ? "error.main" : "inherit"}
            >
              {item.available}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Card>
  );
}

export default function ProductRegister({
  loading,
  searching,
  groups,
  expandedSections,
  loadingCategory,
  subcategoryGroups,
  categoryBreadcrumb,
  saving,
  onToggle,
  onView,
}) {
  const [expandedLeaves, setExpandedLeaves] = useState(new Set());
  const isOpen = (group) => searching || expandedSections.has(String(group.id));
  const sectionBreadcrumb = (categoryId) => {
    const parts = categoryBreadcrumb(categoryId).split(" › ");
    return (parts.length > 1 ? parts.slice(1) : parts).join(" › ");
  };
  const leafGroups = (subcategory) =>
    Object.values(
      subcategory.items.reduce((leaves, item) => {
        const key = item.deepCategoryPath;
        leaves[key] ||= { key, items: [] };
        leaves[key].items.push(item);
        return leaves;
      }, {}),
    );
  const toggleLeaf = (key) =>
    setExpandedLeaves((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (loading)
    return (
      <Box sx={{ py: 7, textAlign: "center" }}>
        <CircularProgress size={28} />
      </Box>
    );
  if (searching && !groups.length)
    return (
      <Box sx={{ py: 7, px: 2, textAlign: "center", color: "text.secondary" }}>
        No products match this search.
      </Box>
    );

  return (
    <>
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <TableContainer sx={{ overflow: "visible", position: "relative" }}>
          {groups.map((group) => (
            <Box key={group.id}>
              <RootHeader
                group={group}
                open={isOpen(group)}
                loading={loadingCategory === String(group.id)}
                searching={searching}
                onToggle={onToggle}
                stickyTop={72}
              />
              {isOpen(group) &&
                subcategoryGroups(group).flatMap((subcategory) =>
                  leafGroups(subcategory).map((leaf, leafIndex) => {
                    const leafKey = subcategory.id + ":" + leaf.key;
                    const leafOpen = searching || expandedLeaves.has(leafKey);
                    const firstItem = leaf.items[0];
                    return (
                      <Table
                        key={leafKey}
                        stickyHeader
                        sx={{
                          tableLayout: "fixed",
                          borderCollapse: "separate",
                        }}
                      >
                        <TableHead>
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              sx={{
                                px: 3,
                                py: 0,
                                height: 44,
                                boxSizing: "border-box",
                                position: leafOpen ? "sticky" : "static",
                                top: leafOpen ? 120 : "auto",
                                zIndex: leafOpen ? 5 : "auto",
                                bgcolor: "background.paper",
                                borderBottom: 2,
                                borderBottomColor: "primary.main",
                                cursor: "pointer",
                              }}
                              onClick={() => toggleLeaf(leafKey)}
                              aria-expanded={leafOpen}
                            >
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                              >
                                <Typography aria-hidden sx={{ width: 16 }}>
                                  {leafOpen ? "▾" : "▸"}
                                </Typography>
                                <Typography
                                  variant="overline"
                                  color="primary.main"
                                  fontWeight={800}
                                >
                                  {sectionBreadcrumb(firstItem.categoryId) ||
                                    leaf.key}
                                </Typography>
                                <Chip
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  label={
                                    leaf.items.length +
                                    " product" +
                                    (leaf.items.length === 1 ? "" : "s")
                                  }
                                />
                              </Stack>
                            </TableCell>
                          </TableRow>
                          {leafOpen && <ColumnHeadingRow />}
                        </TableHead>
                        <TableBody>
                          {leafOpen &&
                            leaf.items.map((item) => (
                              <TableRow
                                hover
                                key={item.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => !saving && onView(item)}
                                onKeyDown={(event) => {
                                  if (
                                    !saving &&
                                    (event.key === "Enter" || event.key === " ")
                                  )
                                    onView(item);
                                }}
                                sx={{
                                  cursor: saving ? "wait" : "pointer",
                                  bgcolor:
                                    leafIndex % 2
                                      ? "action.hover"
                                      : "background.paper",
                                }}
                              >
                                <TableCell sx={{ pl: 4 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {item.brandName || "—"}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="subtitle2">
                                    {item.masterName || item.name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    SPU {item.spu || "—"} · UPC{" "}
                                    {item.upc || "—"}
                                  </Typography>
                                </TableCell>
                                <TableCell>{item.sku}</TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={item.variantCount}
                                  />
                                </TableCell>
                                <TableCell>{money(item.price)}</TableCell>
                                <TableCell align="right">
                                  <Typography
                                    fontWeight={700}
                                    color={
                                      item.available <= 5
                                        ? "error.main"
                                        : "inherit"
                                    }
                                  >
                                    {item.available}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    color={item.active ? "success" : "default"}
                                    label={item.active ? "Active" : "Archived"}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    );
                  }),
                )}
            </Box>
          ))}
        </TableContainer>
      </Box>

      <Stack sx={{ display: { xs: "flex", md: "none" }, overflow: "visible" }}>
        {groups.map((group) => (
          <Box key={group.id} sx={{ position: "relative" }}>
            <RootHeader
              group={group}
              open={isOpen(group)}
              loading={loadingCategory === String(group.id)}
              searching={searching}
              onToggle={onToggle}
              stickyTop={72}
            />
            {isOpen(group) && (
              <Stack spacing={2} sx={{ p: { xs: 1.5, sm: 2 } }}>
                {subcategoryGroups(group).flatMap((subcategory) =>
                  leafGroups(subcategory).map((leaf, leafIndex) => {
                    const leafKey = subcategory.id + ":" + leaf.key;
                    const leafOpen = searching || expandedLeaves.has(leafKey);
                    const firstItem = leaf.items[0];
                    return (
                      <Box key={leafKey} sx={{ position: "relative" }}>
                        <Box
                          sx={{
                            py: 0.5,
                            minHeight: 44,
                            boxSizing: "border-box",
                            position: leafOpen ? "sticky" : "static",
                            top: leafOpen ? 120 : "auto",
                            zIndex: leafOpen ? 5 : "auto",
                            bgcolor: "background.paper",
                            boxShadow: leafOpen
                              ? "0 3px 6px rgba(15,23,42,.10)"
                              : "none",
                            cursor: "pointer",
                          }}
                          onClick={() => toggleLeaf(leafKey)}
                          aria-expanded={leafOpen}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ mb: 0.5 }}
                          >
                            <Typography aria-hidden sx={{ width: 16 }}>
                              {leafOpen ? "▾" : "▸"}
                            </Typography>
                            <Typography
                              variant="overline"
                              color="primary.main"
                              fontWeight={800}
                            >
                              {sectionBreadcrumb(firstItem.categoryId) ||
                                leaf.key}
                            </Typography>
                            <Chip
                              size="small"
                              color="primary"
                              variant="outlined"
                              label={
                                leaf.items.length +
                                " product" +
                                (leaf.items.length === 1 ? "" : "s")
                              }
                            />
                          </Stack>
                          <Divider
                            sx={{
                              borderColor: "primary.main",
                              borderBottomWidth: 2,
                            }}
                          />
                        </Box>
                        {leafOpen && (
                          <Stack spacing={1}>
                            {leaf.items.map((item) => (
                              <ProductCard
                                key={item.id}
                                item={item}
                                stripeIndex={leafIndex}
                                saving={saving}
                                onView={onView}
                              />
                            ))}
                          </Stack>
                        )}
                      </Box>
                    );
                  }),
                )}
              </Stack>
            )}
          </Box>
        ))}
      </Stack>
    </>
  );
}
