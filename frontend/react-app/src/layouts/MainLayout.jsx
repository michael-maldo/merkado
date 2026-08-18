import React, { useEffect, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../identity/hooks/useAuth";
import { systemApi } from "../shared/api/mvpApi";

const desktopSidebarWidth = 256;
const tabletSidebarWidth = 80;
const navigation = [
  ["/dashboard", "Overview", "OV"],
  ["/products", "Catalog", "CA"],
  ["/clients", "Clients", "CL"],
  ["/orders", "Orders", "OR"],
  ["/fulfillment", "Fulfilment", "FU"],
  ["/management", "Management", "MG"],
  ["/users", "User administration", "UA"],
];

function SidebarContent({ compact = false, onNavigate, platformStatus }) {
  return (
    <Box sx={{ height: "100%", bgcolor: "#0B1F35", color: "#dce7f5" }}>
      <Toolbar
        sx={{
          minHeight: "72px !important",
          px: compact ? 1 : 2.5,
          gap: 1.25,
          justifyContent: compact ? "center" : "flex-start",
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.25,
            display: "grid",
            placeItems: "center",
            bgcolor: "#25B6A5",
            color: "#082034",
            fontWeight: 900,
          }}
        >
          M
        </Box>
        {!compact && (
          <Box>
            <Typography
              sx={{ fontSize: 15, fontWeight: 800, letterSpacing: ".08em" }}
            >
              MERKADO
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#90a7c4", letterSpacing: ".08em" }}
            >
              OPERATIONS CLOUD
            </Typography>
          </Box>
        )}
      </Toolbar>
      <Divider sx={{ borderColor: "rgba(220,231,245,.12)" }} />
      <Typography
        variant="overline"
        sx={{
          display: compact ? "none" : "block",
          color: "#8aa1c0",
          px: 2.5,
          pt: 3,
          pb: 1,
        }}
      >
        Workspace
      </Typography>
      <List sx={{ px: 1.25, py: compact ? 2 : 0 }}>
        {navigation.map(([to, label, initials]) => (
          <ListItemButton
            key={to}
            component={NavLink}
            to={to}
            onClick={onNavigate}
            title={label}
            sx={{
              minHeight: 48,
              mb: 0.5,
              px: compact ? 1 : 1.5,
              justifyContent: compact ? "center" : "flex-start",
              borderRadius: 1.25,
              color: "#c3d1e4",
              "&.active": {
                bgcolor: "rgba(71,194,177,.14)",
                color: "#fff",
                "& .nav-code": { color: "#57d6c5" },
              },
              "&:hover": { bgcolor: "rgba(255,255,255,.07)" },
            }}
          >
            <Typography
              className="nav-code"
              variant="caption"
              sx={{
                width: compact ? "auto" : 28,
                color: "#84a0c3",
                fontWeight: 800,
              }}
            >
              {initials}
            </Typography>
            {!compact && (
              <ListItemText
                primary={label}
                slotProps={{
                  primary: { sx: { fontSize: 14, fontWeight: 600 } },
                }}
              />
            )}
          </ListItemButton>
        ))}
      </List>
      {!compact && (
        <Box
          sx={{
            position: "absolute",
            bottom: 24,
            left: 20,
            right: 20,
            p: 1.5,
            border: "1px solid rgba(220,231,245,.12)",
            borderRadius: 1.5,
            bgcolor: "rgba(255,255,255,.025)",
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: "#8aa1c0", letterSpacing: ".06em" }}
          >
            PLATFORM STATUS
          </Typography>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 0.8, mt: 0.4 }}
          >
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                flexShrink: 0,
                bgcolor: platformStatus.color,
              }}
            />
            <Typography variant="body2" sx={{ color: "#dce7f5" }}>
              {platformStatus.platformLabel}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default function MainLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [health, setHealth] = useState("CHECKING");
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const signOut = async () => {
    await logout();
    navigate("/login");
  };
  const initials = (user?.username || "U").slice(0, 2).toUpperCase();
  const drawer = (width) => ({ width, boxSizing: "border-box", border: 0 });
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const status = await systemApi.status();
        if (active)
          setHealth(
            status.status === "OPERATIONAL" && status.database === "UP"
              ? "OPERATIONAL"
              : "DEGRADED",
          );
      } catch (error) {
        if (active)
          setHealth(
            error.response?.data?.api === "UP" ? "DEGRADED" : "DISCONNECTED",
          );
      }
    };
    check();
    const timer = window.setInterval(check, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  const platformStatus = {
    CHECKING: {
      apiLabel: "Checking API…",
      platformLabel: "Checking services…",
      color: "#F5B942",
      background: "#FFF8E1",
      text: "#8A5A00",
    },
    OPERATIONAL: {
      apiLabel: "API connected",
      platformLabel: "All services operational",
      color: "#16A085",
      background: "#ECFDF8",
      text: "#087B6B",
    },
    DEGRADED: {
      apiLabel: "API connected · degraded",
      platformLabel: "Database unavailable",
      color: "#ED8B00",
      background: "#FFF4E5",
      text: "#9A5700",
    },
    DISCONNECTED: {
      apiLabel: "API disconnected",
      platformLabel: "Services unavailable",
      color: "#D32F2F",
      background: "#FDECEC",
      text: "#A51C1C",
    },
  }[health];

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100dvh",
        bgcolor: "background.default",
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        color="inherit"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "rgba(255,255,255,.94)",
          backdropFilter: "blur(12px)",
          width: {
            xs: "100%",
            sm: `calc(100% - ${tabletSidebarWidth}px)`,
            lg: `calc(100% - ${desktopSidebarWidth}px)`,
          },
          ml: { sm: `${tabletSidebarWidth}px`, lg: `${desktopSidebarWidth}px` },
        }}
      >
        <Toolbar sx={{ minHeight: "72px !important", px: { xs: 2, md: 3 } }}>
          <IconButton
            onClick={() => setMobileSidebarOpen(true)}
            sx={{ mr: 1.5, display: { xs: "inline-flex", sm: "none" } }}
          >
            ☰
          </IconButton>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Operations workspace
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Live operational data
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 0.75,
              mr: 2,
              px: 1.25,
              py: 0.55,
              borderRadius: 10,
              bgcolor: platformStatus.background,
              color: platformStatus.text,
            }}
          >
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: platformStatus.color,
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {platformStatus.apiLabel}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mr: 1.5, display: { xs: "none", sm: "block" } }}
          >
            {user?.username}
          </Typography>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              mr: 1.5,
              bgcolor: "primary.dark",
              fontSize: 13,
            }}
          >
            {initials}
          </Avatar>
          <Button size="small" variant="outlined" onClick={signOut}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{
          width: { sm: tabletSidebarWidth, lg: desktopSidebarWidth },
          flexShrink: { sm: 0 },
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": drawer(desktopSidebarWidth),
          }}
        >
          <SidebarContent
            platformStatus={platformStatus}
            onNavigate={() => setMobileSidebarOpen(false)}
          />
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", sm: "block", lg: "none" },
            "& .MuiDrawer-paper": drawer(tabletSidebarWidth),
          }}
        >
          <SidebarContent platformStatus={platformStatus} compact />
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", lg: "block" },
            "& .MuiDrawer-paper": drawer(desktopSidebarWidth),
          }}
        >
          <SidebarContent platformStatus={platformStatus} />
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, pt: "72px" }}>
        <Outlet />
      </Box>
    </Box>
  );
}
