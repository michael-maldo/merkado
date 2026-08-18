import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { categoryRows, parentIdOf } from "./CategorySelector";

const empty = (parentId) => ({
  name: "",
  code: "",
  description: "",
  parentId: parentId || "",
});

function CategoryNode({
  node,
  depth,
  expanded,
  setExpanded,
  editingId,
  setEditingId,
  childOf,
  setChildOf,
  editForm,
  setEditForm,
  childForm,
  setChildForm,
  saving,
  rows,
  excluded,
  onSaveEdit,
  onSaveChild,
  onArchive,
  onRestore,
}) {
  const category = node.category,
    isOpen = expanded.has(Number(category.id)),
    hasChildren = node.children.length > 0,
    isEditing = editingId === category.id,
    addingChild = childOf === category.id;
  const toggle = () =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(Number(category.id))) next.delete(Number(category.id));
      else next.add(Number(category.id));
      return next;
    });
  const beginEdit = () => {
    setEditingId(category.id);
    setChildOf(null);
    setEditForm({
      name: category.name,
      code: category.code || "",
      description: category.description || "",
      parentId: parentIdOf(category) || "",
    });
  };
  const beginChild = () => {
    setChildOf(category.id);
    setEditingId(null);
    setChildForm(empty(category.id));
    setExpanded((current) => new Set([...current, Number(category.id)]));
  };
  return (
    <Box
      sx={{
        position: "relative",
        pl: depth ? 3 : 0,
        "&:before": depth
          ? {
              content: '""',
              position: "absolute",
              left: 11,
              top: 0,
              bottom: 0,
              borderLeft: 1,
              borderColor: "divider",
            }
          : {},
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          p: 1.25,
          mb: 1,
          bgcolor:
            category.active === false ? "action.hover" : "background.paper",
        }}
      >
        {isEditing ? (
          <Stack
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              onSaveEdit(category.id);
            }}
            spacing={1.25}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
              <TextField
                required
                size="small"
                fullWidth
                label="Name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
              <TextField
                size="small"
                fullWidth
                label="Code"
                value={editForm.code}
                onChange={(e) =>
                  setEditForm({ ...editForm, code: e.target.value })
                }
              />
              <TextField
                select
                size="small"
                fullWidth
                label="Parent"
                value={editForm.parentId}
                onChange={(e) =>
                  setEditForm({ ...editForm, parentId: e.target.value })
                }
              >
                <MenuItem value="">Top level</MenuItem>
                {rows
                  .filter(
                    ({ category: option }) =>
                      option.active !== false &&
                      !excluded.has(Number(option.id)),
                  )
                  .map(({ category: option, depth: optionDepth }) => (
                    <MenuItem key={option.id} value={option.id}>
                      {"— ".repeat(optionDepth)}
                      {option.name}
                    </MenuItem>
                  ))}
              </TextField>
            </Stack>
            <TextField
              size="small"
              fullWidth
              label="Description"
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
            />
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button size="small" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
              <Button
                size="small"
                type="submit"
                variant="contained"
                disabled={saving}
              >
                Save
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ sm: "center" }}
            spacing={1}
          >
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <IconButton
                size="small"
                onClick={toggle}
                disabled={!hasChildren}
                aria-label={isOpen ? "Collapse category" : "Expand category"}
                sx={{ visibility: hasChildren ? "visible" : "hidden" }}
              >
                {isOpen ? "▾" : "▸"}
              </IconButton>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={700}>{category.name}</Typography>
                  {depth === 0 && (
                    <Chip size="small" variant="outlined" label="Top level" />
                  )}
                  {category.active === false && (
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Chip size="small" label="Archived" />
                      <Button
                        size="small"
                        color="success"
                        variant="outlined"
                        onClick={() => onRestore(category)}
                      >
                        Unarchive
                      </Button>
                    </Stack>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {category.code}
                  {category.description ? ` · ${category.description}` : ""}
                  {hasChildren
                    ? ` · ${node.children.length} subcategor${node.children.length === 1 ? "y" : "ies"}`
                    : ""}
                </Typography>
              </Box>
            </Stack>
            {category.active !== false && (
              <Stack direction="row" spacing={0.5}>
                <Button size="small" onClick={beginChild}>
                  + Subcategory
                </Button>
                <Button size="small" onClick={beginEdit}>
                  Edit
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => onArchive(category)}
                >
                  Archive
                </Button>
              </Stack>
            )}
          </Stack>
        )}
      </Paper>
      {addingChild && (
        <Paper
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            onSaveChild();
          }}
          variant="outlined"
          sx={{ p: 1.5, mb: 1, ml: 3, borderStyle: "dashed" }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            New subcategory under {category.name}
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField
              required
              size="small"
              fullWidth
              label="Name"
              value={childForm.name}
              onChange={(e) =>
                setChildForm({ ...childForm, name: e.target.value })
              }
            />
            <TextField
              size="small"
              fullWidth
              label="Code"
              value={childForm.code}
              onChange={(e) =>
                setChildForm({ ...childForm, code: e.target.value })
              }
            />
            <TextField
              size="small"
              fullWidth
              label="Description"
              value={childForm.description}
              onChange={(e) =>
                setChildForm({ ...childForm, description: e.target.value })
              }
            />
            <Button onClick={() => setChildOf(null)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              Add
            </Button>
          </Stack>
        </Paper>
      )}
      <Collapse in={isOpen} unmountOnExit>
        <Box>
          {node.children.map((child) => (
            <CategoryNode
              key={child.category.id}
              {...{
                node: child,
                depth: depth + 1,
                expanded,
                setExpanded,
                editingId,
                setEditingId,
                childOf,
                setChildOf,
                editForm,
                setEditForm,
                childForm,
                setChildForm,
                saving,
                rows,
                excluded,
                onSaveEdit,
                onSaveChild,
                onArchive,
                onRestore,
              }}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

export default function CategoryManagerDialog({
  open,
  categories,
  saving,
  onClose,
  onCreate,
  onUpdate,
  onArchive,
  onRestore,
}) {
  const [rootForm, setRootForm] = useState(empty()),
    [showRoot, setShowRoot] = useState(false),
    [expanded, setExpanded] = useState(new Set()),
    [editingId, setEditingId] = useState(null),
    [childOf, setChildOf] = useState(null),
    [editForm, setEditForm] = useState(empty()),
    [childForm, setChildForm] = useState(empty()),
    [error, setError] = useState("");
  const rows = useMemo(() => categoryRows(categories), [categories]);
  const forest = useMemo(() => {
    const nodes = new Map(
      categories.map((category) => [
        Number(category.id),
        { category, children: [] },
      ]),
    );
    const roots = [];
    nodes.forEach((node) => {
      const parent = nodes.get(Number(parentIdOf(node.category)));
      if (parent) parent.children.push(node);
      else roots.push(node);
    });
    const sort = (list) => {
      list.sort((a, b) => a.category.name.localeCompare(b.category.name));
      list.forEach((node) => sort(node.children));
    };
    sort(roots);
    return roots;
  }, [categories]);
  const descendants = (id) => {
    const found = new Set([Number(id)]);
    let changed = true;
    while (changed) {
      changed = false;
      categories.forEach((category) => {
        if (
          found.has(Number(parentIdOf(category))) &&
          !found.has(Number(category.id))
        ) {
          found.add(Number(category.id));
          changed = true;
        }
      });
    }
    return found;
  };
  const save = async (action, after) => {
    setError("");
    try {
      await action();
      after();
    } catch (e) {
      setError(e.response?.data?.message || "Could not save the category.");
    }
  };
  const saveRoot = () =>
    save(
      () => onCreate({ ...rootForm, parentId: null }),
      () => {
        setRootForm(empty());
        setShowRoot(false);
      },
    );
  const saveChild = () =>
    save(
      () => onCreate({ ...childForm, parentId: Number(childOf) }),
      () => {
        setChildOf(null);
        setChildForm(empty());
      },
    );
  const saveEdit = (id) =>
    save(
      () =>
        onUpdate(id, {
          ...editForm,
          parentId: editForm.parentId ? Number(editForm.parentId) : null,
        }),
      () => setEditingId(null),
    );
  const archive = async (category) => {
    if (
      categories.some(
        (item) =>
          item.active !== false &&
          Number(parentIdOf(item)) === Number(category.id),
      )
    )
      return setError(
        "Archive or move this category’s active subcategories first.",
      );
    if (
      !window.confirm(
        `Archive ${category.name}? Existing products will keep their category.`,
      )
    )
      return;
    try {
      await onArchive(category.id);
    } catch (e) {
      setError(e.response?.data?.message || "Could not archive the category.");
    }
  };
  const restore = async (category) => {
    try {
      await onRestore(category);
    } catch (e) {
      setError(
        e.response?.data?.message || "Could not unarchive the category.",
      );
    }
  };
  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        <Typography variant="h5" fontWeight={800}>
          Category hierarchy
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Expand branches and edit the catalogue structure directly.
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: "background.default" }}>
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Collapse in={showRoot}>
          <Paper
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              saveRoot();
            }}
            variant="outlined"
            sx={{ p: 1.5, mb: 2, borderStyle: "dashed" }}
          >
            <Typography fontWeight={700} sx={{ mb: 1 }}>
              New top-level category
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                required
                size="small"
                fullWidth
                label="Name"
                value={rootForm.name}
                onChange={(e) =>
                  setRootForm({ ...rootForm, name: e.target.value })
                }
              />
              <TextField
                size="small"
                fullWidth
                label="Code"
                value={rootForm.code}
                onChange={(e) =>
                  setRootForm({ ...rootForm, code: e.target.value })
                }
              />
              <TextField
                size="small"
                fullWidth
                label="Description"
                value={rootForm.description}
                onChange={(e) =>
                  setRootForm({ ...rootForm, description: e.target.value })
                }
              />
              <Button onClick={() => setShowRoot(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                Add
              </Button>
            </Stack>
          </Paper>
        </Collapse>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          spacing={1}
          sx={{ mb: 1.5, width: "100%" }}
        >
          <Typography variant="subtitle1" fontWeight={800}>
            {forest.length} top-level categor{forest.length === 1 ? "y" : "ies"}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              onClick={() =>
                setExpanded(
                  new Set(categories.map((category) => Number(category.id))),
                )
              }
            >
              Expand all
            </Button>
            <Button size="small" onClick={() => setExpanded(new Set())}>
              Collapse all
            </Button>
          </Stack>
          <Button
            size="small"
            variant="contained"
            sx={{ ml: { sm: "auto !important" } }}
            onClick={() => {
              setShowRoot(true);
              setEditingId(null);
              setChildOf(null);
            }}
          >
            Add top-level category
          </Button>
        </Stack>
        {forest.map((node) => (
          <CategoryNode
            key={node.category.id}
            {...{
              node,
              depth: 0,
              expanded,
              setExpanded,
              editingId,
              setEditingId,
              childOf,
              setChildOf,
              editForm,
              setEditForm,
              childForm,
              setChildForm,
              saving,
              rows,
              excluded: editingId ? descendants(editingId) : new Set(),
              onSaveEdit: saveEdit,
              onSaveChild: saveChild,
              onArchive: archive,
              onRestore: restore,
            }}
          />
        ))}
        {!forest.length && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No categories yet. Add the first top-level category.
            </Typography>
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
