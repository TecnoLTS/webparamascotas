'use client'

export default function CustomerAccountShellStyles() {
  return (
    <style jsx global>{`
      .customer-account-shell {
        --account-accent: #007f91;
        --account-accent-dark: #005f6c;
        --account-accent-soft: #e8f3f4;
        --account-bg: #f4f6f6;
        --account-surface: #ffffff;
        --account-ink: #152f35;
        --account-body: #36565c;
        --account-muted: #677e83;
        --account-border: #d8e1e2;
        --account-danger: #a33d3d;
        min-height: 640px;
        overflow-x: hidden;
        background: var(--account-bg);
        color: var(--account-ink);
      }

      .customer-account-shell .left,
      .customer-account-shell .right {
        min-width: 0;
      }

      .customer-account-shell .customer-account-nav {
        border: 1px solid var(--account-border);
        border-radius: 12px;
        background: var(--account-surface);
        box-shadow: none;
      }

      .customer-account-shell .customer-account-nav .heading {
        flex-direction: row;
        justify-content: flex-start;
        gap: 12px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--account-border);
      }

      .customer-account-shell .customer-initials {
        background: var(--account-accent);
        color: #fff;
        box-shadow: none;
      }

      .customer-account-shell .customer-eyebrow {
        color: var(--account-muted);
      }

      .customer-account-shell .customer-profile-name,
      .customer-account-shell .customer-page-title {
        color: var(--account-ink);
      }

      .customer-account-shell .customer-muted {
        color: var(--account-muted);
      }

      .customer-account-shell .customer-account-nav .menu-tab {
        margin-top: 12px;
      }

      .customer-account-shell .customer-nav-item {
        min-height: 48px;
        color: var(--account-body);
        border-left: 3px solid transparent !important;
        border-radius: 6px;
        transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease;
      }

      .customer-account-shell .customer-nav-item:hover {
        background: #f1f5f5;
        color: var(--account-accent-dark);
      }

      .customer-account-shell .customer-nav-item--active {
        border-left-color: var(--account-accent) !important;
        background: var(--account-accent-soft);
        color: var(--account-accent-dark);
      }

      .customer-account-shell .customer-account-menu-toggle {
        min-height: 48px;
        border: 1px solid var(--account-border);
        background: #f7f9f9;
        color: var(--account-ink);
      }

      .customer-account-shell .customer-account-logout {
        min-height: 48px;
        border: 1px solid #ecd2d2;
        background: #fff;
        color: var(--account-danger);
      }

      .customer-account-shell .customer-account-logout:hover {
        background: #fff7f7;
      }

      .customer-account-shell .customer-page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        min-height: 88px;
        margin-bottom: 16px;
        padding: 16px 20px;
        border: 1px solid var(--account-border);
        border-radius: 12px;
        background: var(--account-surface);
      }

      .customer-account-shell .customer-page-title {
        margin-top: 2px;
        font-size: clamp(22px, 2vw, 28px);
        line-height: 1.2;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .customer-account-shell .customer-page-description {
        margin-top: 4px;
        color: var(--account-muted);
        font-size: 14px;
        line-height: 1.5;
      }

      .customer-account-shell .customer-shopping-link,
      .customer-account-shell .customer-secondary-action {
        min-height: 44px;
        border: 1px solid var(--account-accent);
        border-radius: 6px;
        background: #fff;
        color: var(--account-accent-dark);
        transition: background-color 160ms ease, color 160ms ease;
      }

      .customer-account-shell .customer-shopping-link:hover,
      .customer-account-shell .customer-secondary-action:hover {
        background: var(--account-accent-soft);
      }

      .customer-account-shell .customer-content-surface,
      .customer-account-shell .right > .tab:not(.customer-dashboard-tab),
      .customer-account-shell .right > .tab_address {
        border: 1px solid var(--account-border) !important;
        border-radius: 12px !important;
        background: var(--account-surface);
        box-shadow: none !important;
      }

      .customer-account-shell .customer-summary-strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        border: 1px solid var(--account-border);
        border-radius: 12px;
        background: var(--account-surface);
      }

      .customer-account-shell .customer-summary-item {
        display: grid;
        grid-template-columns: 40px minmax(0, 1fr);
        align-items: center;
        gap: 12px;
        min-height: 88px;
        padding: 16px 20px;
      }

      .customer-account-shell .customer-summary-item + .customer-summary-item {
        border-left: 1px solid var(--account-border);
      }

      .customer-account-shell .customer-summary-icon {
        display: flex;
        width: 40px;
        height: 40px;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        background: var(--account-accent-soft);
        color: var(--account-accent-dark);
      }

      .customer-account-shell .customer-summary-value {
        color: var(--account-ink);
        font-size: 24px;
        line-height: 1;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      .customer-account-shell .customer-summary-label {
        margin-top: 4px;
        color: var(--account-body);
        font-size: 13px;
        font-weight: 600;
      }

      .customer-account-shell .customer-data-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      .customer-account-shell .customer-data-table th {
        height: 40px;
        padding: 0 12px;
        border-bottom: 1px solid var(--account-border);
        color: var(--account-muted);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .08em;
        text-align: left;
        text-transform: uppercase;
      }

      .customer-account-shell .customer-data-table td {
        min-height: 64px;
        padding: 12px;
        border-bottom: 1px solid #e8eeee;
        color: var(--account-body);
        vertical-align: middle;
      }

      .customer-account-shell .customer-data-table tbody tr:last-child td {
        border-bottom: 0;
      }

      .customer-account-shell .customer-data-table tbody tr:hover {
        background: #f7fafa;
      }

      .customer-account-shell .customer-order-number,
      .customer-account-shell .customer-order-total {
        color: var(--account-ink);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      .customer-account-shell .customer-order-detail {
        display: inline-flex;
        min-height: 44px;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border-radius: 6px;
        color: var(--account-accent-dark);
        font-size: 13px;
        font-weight: 700;
      }

      .customer-account-shell .customer-order-detail:hover {
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      .customer-account-shell .customer-order-card {
        border: 1px solid var(--account-border);
        border-radius: 8px;
        background: #fff;
      }

      .customer-account-shell .customer-filter {
        min-height: 44px;
        border-bottom: 2px solid transparent;
        color: var(--account-muted);
        font-size: 14px;
        font-weight: 600;
      }

      .customer-account-shell .customer-filter:hover {
        color: var(--account-ink);
      }

      .customer-account-shell .customer-filter--active {
        border-bottom-color: var(--account-accent);
        color: var(--account-accent-dark);
      }

      .customer-account-shell .right input,
      .customer-account-shell .right select {
        min-height: 48px;
        border-color: var(--account-border);
        background-color: #fff;
      }

      .customer-account-shell .right input:focus,
      .customer-account-shell .right select:focus,
      .customer-account-shell .right textarea:focus,
      .customer-account-shell a:focus-visible,
      .customer-account-shell button:focus-visible {
        outline: 2px solid var(--account-accent) !important;
        outline-offset: 2px;
      }

      @media (min-width: 1024px) {
        .customer-account-shell .left {
          position: sticky;
          top: 88px;
          align-self: start;
        }
      }

      @media (max-width: 1023px) {
        .customer-account-shell .customer-account-nav .heading,
        .customer-account-shell .customer-account-nav .customer-profile-copy {
          text-align: left;
        }
      }

      @media (max-width: 767px) {
        .customer-account-shell .customer-page-header {
          align-items: flex-start;
          flex-direction: column;
          gap: 12px;
        }

        .customer-account-shell .customer-summary-strip {
          grid-template-columns: 1fr;
        }

        .customer-account-shell .customer-summary-item {
          min-height: 72px;
          padding: 12px 16px;
        }

        .customer-account-shell .customer-summary-item + .customer-summary-item {
          border-top: 1px solid var(--account-border);
          border-left: 0;
        }

        .customer-account-shell .right > .tab:not(.customer-dashboard-tab),
        .customer-account-shell .right > .tab_address {
          padding: 16px !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .customer-account-shell *,
        .customer-account-shell *::before,
        .customer-account-shell *::after {
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
          animation-duration: 0.01ms !important;
        }
      }
    `}</style>
  )
}
