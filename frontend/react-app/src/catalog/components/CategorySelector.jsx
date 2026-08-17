import React, { useMemo, useState } from "react";
import { Box, Button, ButtonBase, Chip, Collapse, Grid, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";

export const parentIdOf = category => category.parentId ?? category.parent_id ?? null;
export const activeCategories = categories => categories.filter(category => category.active !== false);

export function categoryPath(categories, selectedId) {
  const byId = new Map(categories.map(category => [Number(category.id), category]));
  const path = []; let current = byId.get(Number(selectedId)); const visited = new Set();
  while (current && !visited.has(current.id)) { path.unshift(current); visited.add(current.id); current = byId.get(Number(parentIdOf(current))); }
  return path;
}

export function categoryRows(categories) {
  const children = new Map();
  categories.forEach(category => { const parent = Number(parentIdOf(category)) || 0; children.set(parent, [...(children.get(parent) || []), category]); });
  const rows = [];
  const visit = (parent, depth) => (children.get(parent) || []).sort((a, b) => a.name.localeCompare(b.name)).forEach(category => { rows.push({ category, depth }); visit(Number(category.id), depth + 1); });
  visit(0, 0); return rows;
}

export default function CategorySelector({ categories, value, onChange, required = false, label = "Master category" }) {
  const usable = useMemo(() => activeCategories(categories), [categories]);
  const path = categoryPath(usable, value);
  const levels = [];
  let parent = null; let depth = 0;
  while (true) {
    const choices = usable.filter(category => (Number(parentIdOf(category)) || null) === (Number(parent) || null));
    if (!choices.length) break;
    levels.push({ choices, selected: path[depth]?.id || "" });
    const selected = path[depth]; if (!selected) break;
    parent = selected.id; depth += 1;
  }
  const choose = (level, next) => { if (!next) onChange(level ? path[level - 1]?.id || "" : ""); else onChange(next); };
  return <Grid container spacing={1.25}>{levels.map((level, index) => <Grid key={index} size={{ xs: 12, md: Math.max(3, 12 / Math.min(levels.length, 4)) }}><TextField select fullWidth required={required && index === 0} label={index === 0 ? label : `Subcategory level ${index}`} value={level.selected} onChange={event => choose(index, event.target.value)}><MenuItem value="">{index === 0 ? "Select category" : "Use category above"}</MenuItem>{level.choices.map(category => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}</TextField></Grid>)}</Grid>;
}

function TreeNode({ node, depth, selectedId, expanded, setExpanded, onChange }) {
  const id = Number(node.category.id), open = expanded.has(id), selected = Number(selectedId) === id, hasChildren = node.children.length > 0;
  const toggle = event => { event.stopPropagation(); setExpanded(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  return <Box sx={{ position: "relative", pl: depth ? 2.5 : 0, "&:before": depth ? { content: '""', position: "absolute", left: 9, top: 0, bottom: 0, borderLeft: 1, borderColor: "divider" } : {} }}><ButtonBase component="div" onClick={() => onChange(node.category.id)} sx={{ width: "100%", justifyContent: "flex-start", textAlign: "left", borderRadius: 1.25, px: 1, py: .75, mb: .5, border: 1, borderColor: selected ? "primary.main" : "transparent", bgcolor: selected ? "action.selected" : "transparent", "&:hover": { bgcolor: selected ? "action.selected" : "action.hover" } }}><IconButton component="span" size="small" onClick={toggle} aria-label={open ? "Collapse category" : "Expand category"} sx={{ mr: .5, visibility: hasChildren ? "visible" : "hidden" }}>{open ? "▾" : "▸"}</IconButton><Box sx={{ flex: 1 }}><Typography variant="body2" fontWeight={selected ? 800 : 600}>{node.category.name}</Typography>{node.category.description && <Typography variant="caption" color="text.secondary">{node.category.description}</Typography>}</Box>{selected && <Stack direction="row" spacing={.75} alignItems="center"><Chip size="small" color="primary" label="Selected" /><Button size="small" onClick={event => { event.stopPropagation(); onChange(parentIdOf(node.category)); }}>Unselect</Button></Stack>}</ButtonBase>{hasChildren && <Collapse in={open} unmountOnExit>{node.children.map(child => <TreeNode key={child.category.id} {...{ node: child, depth: depth + 1, selectedId, expanded, setExpanded, onChange }} />)}</Collapse>}</Box>;
}

export function CategoryTreeSelector({ categories, value, onChange, required = false, label = "Master category" }) {
  const usable = useMemo(() => activeCategories(categories), [categories]);
  const forest = useMemo(() => { const nodes = new Map(usable.map(category => [Number(category.id), { category, children: [] }])); const roots = []; nodes.forEach(node => { const parent = nodes.get(Number(parentIdOf(node.category))); if (parent) parent.children.push(node); else roots.push(node); }); const sort = list => { list.sort((a, b) => a.category.name.localeCompare(b.category.name)); list.forEach(node => sort(node.children)); }; sort(roots); return roots; }, [usable]);
  const initialPath = categoryPath(usable, value).slice(0, -1).map(category => Number(category.id));
  const [expanded, setExpanded] = useState(new Set(initialPath));
  const path = categoryPath(usable, value);
  const selectedRoot = forest.find(node => Number(node.category.id) === Number(path[0]?.id));
  const choose = id => { onChange(id); const ancestors = categoryPath(usable, id).slice(0, -1).map(category => Number(category.id)); setExpanded(current => new Set([...current, ...ancestors])); };
  return <Box><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ mb: 1 }}><Box><Typography variant="subtitle2" fontWeight={800}>{label}{required ? " *" : ""}</Typography><Typography variant="caption" color="text.secondary">Choose a top-level category, then browse its subcategory tree.</Typography></Box>{path.length > 0 && <Chip color="primary" variant="outlined" label={path.map(category => category.name).join(" › ")} />}</Stack><TextField select fullWidth required={required} label="Top-level category" value={path[0]?.id || ""} onChange={event => choose(event.target.value)}><MenuItem value="">Select top-level category</MenuItem>{forest.map(node => <MenuItem key={node.category.id} value={node.category.id}>{node.category.name}</MenuItem>)}</TextField>{selectedRoot?.children.length > 0 && <Paper variant="outlined" sx={{ p: 1, mt: 1.25, maxHeight: 310, overflowY: "auto" }}><Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1, py: .5 }}>Select a subcategory below, or keep {selectedRoot.category.name} as the master category.</Typography>{selectedRoot.children.map(node => <TreeNode key={node.category.id} {...{ node, depth: 0, selectedId: value, expanded, setExpanded, onChange: choose }} />)}</Paper>}</Box>;
}
