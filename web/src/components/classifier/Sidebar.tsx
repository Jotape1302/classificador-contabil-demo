import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  HelpCircle,
  LogOut,
  Menu,
  Settings2,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useLogout } from "../../hooks/use-auth";
import { cn } from "../../lib/utils";
import type { User } from "../../lib/types";
import { Button } from "../ui/button";

function getInitials(name: string): string {
  if (!name) return "Z";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface SidebarProps {
  user: User;
}

export function Sidebar({ user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const logout = useLogout();
  const location = useLocation();

  const items = [
    { label: "Operação Contábil", icon: Sparkles, to: "/" },
    { label: "Impacto", icon: TrendingUp, to: "/impact" },
    { label: "Regras", icon: FileCheck2, to: "/rules" },
    { label: "Academy", icon: BookOpen, to: "/academy" },
    { label: "Ajuda & Suporte", icon: HelpCircle, to: "/help" },
    { label: "Configurações", icon: Settings2, to: "/settings" },
  ];

  // Fecha o menu mobile em mudanças de rota
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  // Bloqueia scroll do body e escuta tecla Escape quando menu mobile estiver aberto
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };

    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  const initials = getInitials(user.name);

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO MOBILE (Visível apenas em telas menores: md:hidden)          */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-sidebar px-4 shadow-sm md:hidden">
        {/* Botão Hambúrguer */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu de navegação"
          aria-expanded={mobileOpen}
          className="text-title hover:bg-elevated"
        >
          <Menu className="size-5" />
        </Button>

        {/* Logo Central da Zaeron */}
        <NavLink
          to="/"
          className="flex items-center gap-2.5 overflow-hidden transition-opacity hover:opacity-90"
        >
          <img
            src={`${import.meta.env.BASE_URL}assets/logo.png`}
            alt="Zaeron Contábil"
            className="h-7 w-auto object-contain"
          />
          <span className="text-xs font-semibold tracking-tight text-title">
            Zaeron Contábil
          </span>
        </NavLink>
      </header>

      {/* ========================================================================= */}
      {/* 2. DRAWER / OVERLAY MOBILE (Aberto via hambúrguer)                         */}
      {/* ========================================================================= */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="mobile-navigation"
        aria-label="Menu principal mobile"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-sidebar shadow-2xl transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <NavLink
            to="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5"
          >
            <img
              src={`${import.meta.env.BASE_URL}assets/logo.png`}
              alt="Zaeron Contábil"
              className="h-8 w-auto object-contain"
            />
            <span className="text-sm font-semibold tracking-tight text-title">
              Zaeron Contábil
            </span>
          </NavLink>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu de navegação"
            className="text-muted hover:bg-elevated hover:text-title"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Navegação Mobile */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map(({ label, icon: Icon, to }) => {
            const isItemActive =
              to === "/"
                ? location.pathname === "/" ||
                  location.pathname.startsWith("/history") ||
                  location.pathname.startsWith("/operation") ||
                  location.pathname.startsWith("/batches")
                : location.pathname === to || location.pathname.startsWith(`${to}/`);

            return (
              <NavLink
                key={label}
                to={to}
                end={to === "/"}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex h-10 w-full items-center gap-3 rounded-[4px] px-3.5 text-xs font-medium transition-colors",
                  isItemActive
                    ? "bg-copper/15 font-semibold text-action border border-copper/30"
                    : "text-muted hover:bg-elevated hover:text-title active:bg-elevated border border-transparent"
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Rodapé Mobile com Usuário e Logout */}
        <div className="border-t border-border bg-sidebar p-4">
          <div className="mb-3.5 px-1">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-[2px] bg-copper/20 text-xs font-bold text-action">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-title">{user.name}</p>
                <p className="truncate text-[11px] text-muted">{user.office_name || user.email}</p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 text-danger hover:bg-danger/10 hover:text-danger"
            onClick={() => {
              setMobileOpen(false);
              logout.mutate();
            }}
            aria-label="Sair da conta"
          >
            <LogOut className="size-4" />
            Sair da Conta
          </Button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 3. SIDEBAR DESKTOP (Fixo na lateral esquerda em md:flex)                 */}
      {/* ========================================================================= */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 md:flex",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        <div className="flex h-20 items-center border-b border-border px-4">
          <NavLink to="/" className="flex items-center gap-3 overflow-hidden">
            <img
              src={`${import.meta.env.BASE_URL}assets/logo.png`}
              alt="Zaeron Contábil"
              className={cn(
                "h-10 w-auto object-contain object-left transition-all duration-200",
                collapsed ? "w-9" : "max-w-[160px]"
              )}
            />
          </NavLink>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Navegação principal">
          {items.map(({ label, icon: Icon, to }) => {
            const isItemActive =
              to === "/"
                ? location.pathname === "/" ||
                  location.pathname.startsWith("/history") ||
                  location.pathname.startsWith("/operation") ||
                  location.pathname.startsWith("/batches")
                : location.pathname === to || location.pathname.startsWith(`${to}/`);

            return (
              <NavLink
                key={label}
                to={to}
                end={to === "/"}
                className={cn(
                  "flex h-9 w-full items-center gap-3 rounded-[4px] px-3 text-xs font-medium transition-colors duration-150",
                  isItemActive
                    ? "bg-copper/15 text-action font-semibold border border-copper/30"
                    : "text-muted hover:bg-elevated hover:text-title border border-transparent",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {!collapsed && label}
              </NavLink>
            );
          })}
        </nav>


        <div className="border-t border-border p-3">
          {!collapsed && (
            <div className="mb-3 px-2">
              <p className="truncate text-xs font-semibold text-title">{user.name}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted">
                {user.office_name ?? user.email}
              </p>
            </div>
          )}
          <div className={cn("flex gap-2", collapsed && "flex-col")}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size={collapsed ? "icon" : "default"}
              className={cn(!collapsed && "flex-1")}
              onClick={() => logout.mutate()}
              aria-label="Sair"
            >
              <LogOut className="size-4" />
              {!collapsed && "Sair"}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
