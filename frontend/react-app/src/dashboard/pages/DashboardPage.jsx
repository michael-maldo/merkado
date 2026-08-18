import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import PageContainer from "../../shared/components/layout/PageContainer";
import PageHeader from "../../shared/components/layout/PageHeader";
import { analyticsApi } from "../../shared/api/mvpApi";

const currency = (value) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
    Number(value || 0),
  );
const number = (value) =>
  new Intl.NumberFormat("en-AU").format(Number(value || 0));

function MetricCard({ label, value, detail, tone = "primary" }) {
  return (
    <Card sx={{ height: "100%", borderTop: 3, borderColor: `${tone}.main` }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h3" sx={{ mt: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {detail}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState({
    revenue: null,
    statuses: [],
    inventory: [],
    products: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.revenue(),
      analyticsApi.orders(),
      analyticsApi.inventory(),
      analyticsApi.topProducts(),
    ])
      .then(([revenue, statuses, inventory, products]) =>
        setDashboard({ revenue, statuses, inventory, products }),
      )
      .catch((e) =>
        setError(
          e.response?.data?.message ||
            "Dashboard data is unavailable. Please try again.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const { revenue, statuses, inventory, products } = dashboard;
  const lowStock = inventory.filter(
    (item) => Number(item.available) <= 5,
  ).length;
  const pending =
    statuses.find((item) => item.status === "PAYMENT_PENDING")?.count || 0;

  return (
    <PageContainer>
      <PageHeader
        title="Operations overview"
        subtitle="A live view of orders, revenue and stock across Merkado."
      />
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 3 }} />}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Recognised revenue"
            value={currency(revenue?.revenue)}
            detail={`${number(revenue?.orders)} dispatched or completed orders`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Order queue"
            value={number(pending)}
            detail="Awaiting payment verification"
            tone="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Stock exposure"
            value={number(lowStock)}
            detail="SKUs at five units or fewer"
            tone={lowStock ? "error" : "success"}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Discounts issued"
            value={currency(revenue?.discounts)}
            detail="Across dispatched and completed orders"
            tone="secondary"
          />
        </Grid>
      </Grid>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Box
                sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: "divider" }}
              >
                <Typography variant="h6">Order pipeline</Typography>
                <Typography variant="body2" color="text.secondary">
                  Current workload by fulfilment stage
                </Typography>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Orders</TableCell>
                    <TableCell align="right">Order value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statuses.map((item) => (
                    <TableRow key={item.status}>
                      <TableCell>
                        <Chip
                          size="small"
                          label={item.status.replaceAll("_", " ")}
                        />
                      </TableCell>
                      <TableCell align="right">{number(item.count)}</TableCell>
                      <TableCell align="right">
                        {currency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && !statuses.length && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No orders recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Box
                sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: "divider" }}
              >
                <Typography variant="h6">Top products</Typography>
                <Typography variant="body2" color="text.secondary">
                  Highest units sold
                </Typography>
              </Box>
              <Stack
                divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}
              >
                {products.slice(0, 5).map((product) => (
                  <Box
                    key={product.product_id}
                    sx={{
                      px: 2.5,
                      py: 1.5,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">
                        {product.product_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {product.sku}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="subtitle2">
                        {number(product.units)} units
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {currency(product.revenue)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
                {!loading && !products.length && (
                  <Typography color="text.secondary" sx={{ p: 2.5 }}>
                    No product activity yet.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
