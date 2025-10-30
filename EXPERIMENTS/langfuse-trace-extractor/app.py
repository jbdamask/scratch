from fasthtml.common import *
from langfuse import Langfuse
from dotenv import load_dotenv
import os
import json
import re
import socket
from datetime import datetime
from openai import OpenAI

load_dotenv(override=False)

app, rt = fast_app(
    hdrs=(
        Script(src="https://unpkg.com/htmx.org@1.9.10"),
        Script(src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"),
        Style("""
            * { margin: 0; padding: 0; box-sizing: border-box; }

            /* Langfuse color variables */
            :root {
                --background: hsl(222.2, 84%, 4.9%);
                --foreground: hsl(210, 40%, 83%);
                --card: hsl(222.2, 84%, 4.9%);
                --card-foreground: hsl(210, 40%, 83%);
                --primary: hsl(210, 40%, 83%);
                --primary-accent: hsl(217, 91.2%, 59.8%);
                --muted: hsl(217.2, 32.6%, 17.5%);
                --border: hsl(217.2, 32.6%, 17.5%);
                --ring: hsl(212.7, 26.8%, 83.9%);
                --dark-tremor-brand-faint: #0B1229;
                --dark-tremor-background-muted: #131A2B;
            }

            body {
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
                background: var(--background);
                color: var(--foreground);
                line-height: 1.5;
                overflow: hidden;
                font-size: 0.9rem;
                font-feature-settings: "rlig" 1, "calt" 1;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }

            .app-header {
                background: var(--dark-tremor-background-muted);
                padding: 1.25rem;
                border-bottom: 1px solid var(--border);
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 100;
                display: flex;
                align-items: center;
            }

            .app-layout {
                display: flex;
                margin-top: 70px;
                height: calc(100vh - 70px);
            }

            .left-sidebar {
                width: 280px;
                background: var(--dark-tremor-background-muted);
                border-right: 1px solid var(--border);
                padding: 1.25rem;
                overflow-y: auto;
                transition: margin-left 0.3s ease;
            }

            .left-sidebar.collapsed {
                margin-left: -280px;
            }

            .sidebar-toggle {
                position: fixed;
                left: 280px;
                top: 50%;
                transform: translateY(-50%);
                background: var(--dark-tremor-background-muted);
                border: 1px solid var(--border);
                border-left: none;
                width: 24px;
                height: 48px;
                cursor: pointer;
                z-index: 99;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: left 0.3s ease;
                border-radius: 0 0.375rem 0.375rem 0;
                color: var(--foreground);
                font-size: 12px;
            }

            .sidebar-toggle.collapsed {
                left: 0;
            }

            .sidebar-toggle:hover {
                background: var(--border);
            }

            .main-content-area {
                flex: 1;
                overflow-y: auto;
                padding: 1.25rem 1.25rem 2.5rem 1.25rem;
                transition: margin-left 0.3s ease, margin-right 0.3s ease;
            }

            .main-content-area.panel-open {
                margin-right: 600px;
            }

            .container {
                max-width: 100%;
                margin: 0 auto;
            }

            header {
                background: var(--dark-tremor-background-muted);
                padding: 1.25rem;
                border-radius: 0.5rem;
                margin-bottom: 1.25rem;
                border: 1px solid var(--border);
            }
            h1 {
                font-size: 1.5rem; /* 3xl */
                color: var(--primary);
                margin-bottom: 1rem;
                font-weight: 600;
                line-height: 2.25rem;
            }
            h2 {
                font-size: 1.1rem; /* lg */
                font-weight: 600;
                line-height: 1.75rem;
            }
            .fetch-section {
                background: var(--dark-tremor-background-muted);
                padding: 1.25rem;
                border-radius: 0.5rem;
                margin-bottom: 1.25rem;
                border: 1px solid var(--border);
            }
            .form-group { margin-bottom: 1rem; }
            label {
                display: block;
                margin-bottom: 0.5rem;
                font-size: 0.825rem; /* sm - tremor-default */
                line-height: 1.25rem;
                color: var(--foreground);
                font-weight: 500;
            }
            input, select {
                width: 100%;
                background: var(--background);
                border: 1px solid var(--border);
                border-radius: 0.375rem;
                padding: 0.5rem 0.75rem;
                color: var(--foreground);
                font-size: 0.825rem; /* sm */
                line-height: 1.25rem;
            }
            input:focus, select:focus {
                outline: none;
                border-color: var(--primary-accent);
                ring: 1px solid var(--primary-accent);
            }
            button {
                background: var(--primary-accent);
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 0.375rem;
                cursor: pointer;
                font-size: 0.825rem; /* sm */
                line-height: 1.25rem;
                font-weight: 500;
                transition: all 0.2s;
            }
            button:hover {
                background: hsl(217, 91.2%, 55%);
                transform: translateY(-1px);
            }
            button:disabled {
                background: var(--muted);
                cursor: not-allowed;
                opacity: 0.5;
            }
            .controls {
                display: flex;
                gap: 15px;
                align-items: center;
                margin-top: 15px;
            }
            .trace-counter { font-size: 14px; color: #94a3b8; }
            .trace-card {
                background: #1e293b;
                border-radius: 8px;
                padding: 24px;
                margin-bottom: 20px;
                border: 1px solid #334155;
            }
            .trace-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #334155;
            }
            .trace-id {
                font-size: 12px;
                color: #64748b;
                font-family: 'Courier New', monospace;
            }
            .section { margin-bottom: 1.25rem; }
            .section-title {
                font-size: 0.825rem;
                font-weight: 600;
                color: var(--primary);
                margin-bottom: 0.5rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .content-box {
                background: var(--background);
                border: 1px solid var(--border);
                border-radius: 0.375rem;
                padding: 1rem;
                white-space: pre-wrap;
                word-wrap: break-word;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                font-size: 0.7rem; /* xs - tremor-label */
                line-height: 1rem;
            }
            textarea {
                width: 100%;
                min-height: 100px;
                background: var(--background);
                border: 1px solid var(--border);
                border-radius: 0.375rem;
                padding: 0.75rem;
                color: var(--foreground);
                font-size: 0.825rem;
                resize: vertical;
                line-height: 1.5;
            }
            textarea:focus {
                outline: none;
                border-color: var(--primary-accent);
            }
            .save-button {
                background: hsl(142, 76.7%, 40%);
            }
            .save-button:hover {
                background: hsl(142, 76.7%, 35%);
            }
            .message {
                padding: 0.75rem 1rem;
                border-radius: 0.375rem;
                margin-bottom: 1.25rem;
                font-size: 0.825rem;
                border: 1px solid;
            }
            .message.success {
                background: hsl(142, 76%, 10%);
                color: hsl(142, 76.7%, 73.1%);
                border-color: hsl(142, 76%, 20%);
            }
            .message.error {
                background: hsl(0, 62.8%, 15%);
                color: hsl(0, 84.2%, 70%);
                border-color: hsl(0, 62.8%, 30%);
            }
            .message.info {
                background: hsl(217, 91%, 15%);
                color: hsl(212, 96.4%, 78.4%);
                border-color: hsl(217, 91%, 30%);
            }
            .loading {
                text-align: center;
                padding: 2.5rem;
                color: hsl(215, 20.2%, 65.1%);
            }
            .toggle-view {
                background: var(--muted);
                color: var(--foreground);
                font-size: 0.7rem;
                padding: 0.375rem 0.75rem;
                margin-bottom: 0.5rem;
                display: inline-block;
                border-radius: 0.375rem;
                border: 1px solid var(--border);
            }
            .toggle-view:hover {
                background: var(--border);
            }
            .formatted-view {
                background: var(--background);
                border: 1px solid var(--border);
                border-radius: 0.375rem;
                padding: 1rem;
                line-height: 1.6;
            }
            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            .copy-icon {
                cursor: pointer;
                color: hsl(215, 20.2%, 65.1%);
                padding: 0.25rem;
                border-radius: 0.25rem;
                transition: all 0.2s;
                font-size: 1rem;
            }
            .copy-icon:hover {
                color: var(--primary);
                background: var(--muted);
            }
            .copy-icon.copied {
                color: hsl(142, 76.7%, 73.1%);
            }
            .formatted-view p { margin-bottom: 0.75rem; }
            .formatted-view h1, .formatted-view h2, .formatted-view h3 {
                color: var(--primary-accent);
                margin-top: 1rem;
                margin-bottom: 0.5rem;
                font-weight: 600;
            }
            .formatted-view h1 { font-size: 1.3rem; }
            .formatted-view h2 { font-size: 1.1rem; }
            .formatted-view h3 { font-size: 0.9rem; }
            .formatted-view code {
                background: var(--muted);
                padding: 0.125rem 0.375rem;
                border-radius: 0.25rem;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                font-size: 0.7rem; /* xs */
                line-height: 1rem;
                color: hsl(212, 96.4%, 78.4%);
            }
            .formatted-view pre {
                background: var(--muted);
                padding: 0.75rem;
                border-radius: 0.375rem;
                overflow-x: auto;
                margin: 0.75rem 0;
                border: 1px solid var(--border);
            }
            .formatted-view pre code {
                background: none;
                padding: 0;
            }
            .formatted-view ul, .formatted-view ol {
                margin-left: 1.5rem;
                margin-bottom: 0.75rem;
            }
            .formatted-view li { margin-bottom: 0.25rem; }
            .formatted-view blockquote {
                border-left: 3px solid var(--primary-accent);
                padding-left: 0.75rem;
                margin: 0.75rem 0;
                color: hsl(215, 20.2%, 65.1%);
            }
            .formatted-view a {
                color: var(--primary-accent);
                text-decoration: none;
            }
            .formatted-view a:hover { text-decoration: underline; }

            /* Table styles */
            .table-container {
                background: var(--dark-tremor-background-muted);
                border-radius: 0.5rem;
                overflow: hidden;
                margin-bottom: 1.25rem;
                border: 1px solid var(--border);
            }
            table {
                width: 100%;
                border-collapse: collapse;
            }
            thead {
                background: var(--background);
                border-bottom: 1px solid var(--border);
            }
            th {
                text-align: left;
                padding: 0.75rem 1rem;
                font-size: 0.7rem; /* xs - tremor-label */
                line-height: 1rem;
                font-weight: 600;
                color: var(--foreground);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            tbody tr {
                border-bottom: 1px solid var(--border);
                cursor: pointer;
                transition: background 0.2s;
            }
            tbody tr:hover { background: var(--muted); }
            tbody tr.selected { background: var(--dark-tremor-brand-faint); }
            td {
                padding: 0.75rem 1rem;
                font-size: 0.825rem; /* sm - tremor-default */
                line-height: 1.25rem;
                color: var(--foreground);
                max-width: 300px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            td.timestamp {
                color: hsl(215, 20.2%, 65.1%);
                font-size: 0.7rem; /* xs - tremor-label */
                line-height: 1rem;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            }
            td.latency {
                color: hsl(142, 76.7%, 73.1%);
                font-size: 0.7rem;
            }

            /* Side panel */
            .side-panel {
                position: fixed;
                right: -600px;
                top: 0;
                width: 600px;
                height: 100vh;
                background: var(--dark-tremor-background-muted);
                box-shadow: -4px 0 12px rgba(0, 0, 0, 0.5);
                transition: right 0.3s ease;
                overflow-y: auto;
                z-index: 1000;
                border-left: 1px solid var(--border);
            }
            .side-panel.open { right: 0; }
            .panel-header {
                background: var(--background);
                padding: 1.25rem;
                border-bottom: 1px solid var(--border);
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: sticky;
                top: 0;
                z-index: 10;
            }
            .panel-title {
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--primary);
            }
            .close-panel {
                background: var(--muted);
                color: var(--foreground);
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 0.375rem;
                cursor: pointer;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            .close-panel:hover {
                background: var(--border);
            }
            .panel-content { padding: 1.25rem; }
            .panel-nav-buttons {
                display: flex;
                gap: 0.5rem;
                align-items: center;
            }
            .nav-button {
                background: var(--muted);
                color: var(--foreground);
                border: 1px solid var(--border);
                width: 36px;
                height: 36px;
                border-radius: 0.375rem;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
                font-weight: 600;
                font-family: ui-monospace, monospace;
            }
            .nav-button:hover {
                background: var(--border);
            }
            .nav-button:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }
            .expand-button {
                background: var(--muted);
                color: var(--foreground);
                border: 1px solid var(--border);
                width: 36px;
                height: 36px;
                border-radius: 0.375rem;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            .expand-button:hover {
                background: var(--border);
            }
            .side-panel.fullscreen {
                width: 100%;
            }

            /* Pagination */
            .pagination {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: #1e293b;
                border-radius: 8px;
                margin-top: 20px;
            }
            .pagination-info {
                font-size: 14px;
                color: #94a3b8;
            }
            .page-controls {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            .page-controls span {
                font-size: 14px;
                color: #e2e8f0;
            }

            /* Collapsible sections */
            .collapsible-section {
                margin-top: 1.25rem;
                border-top: 1px solid var(--border);
                padding-top: 1.25rem;
            }
            .collapsible-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                padding: 0.75rem 0;
                user-select: none;
                transition: background 0.2s;
                border-radius: 0.375rem;
            }
            .collapsible-header:hover {
                background: var(--muted);
            }
            .collapsible-header:hover .section-title {
                color: var(--primary-accent);
            }
            .collapsible-toggle {
                color: hsl(215, 20.2%, 65.1%);
                font-size: 1rem;
                transition: transform 0.2s;
            }
            .collapsible-toggle.expanded {
                transform: rotate(180deg);
            }
            .collapsible-content {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.2s ease-out;
            }
            .collapsible-content.expanded {
                max-height: 2000px;
            }
            .metadata-table {
                width: 100%;
                margin-top: 0.625rem;
            }
            .metadata-row {
                border-bottom: 1px solid var(--border);
                display: flex;
                padding: 0.5rem 0;
                font-size: 0.7rem;
                transition: background 0.15s;
            }
            .metadata-row:hover {
                background: var(--muted);
            }
            .metadata-key {
                color: hsl(215, 20.2%, 65.1%);
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                flex: 0 0 45%;
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }
            .metadata-value {
                color: hsl(142, 76.7%, 73.1%);
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                flex: 1;
                word-break: break-word;
            }
            .metadata-nested {
                margin-left: 0;
                padding-left: 1.25rem;
                border-left: 1px solid var(--border);
            }
            .tree-toggle {
                cursor: pointer;
                user-select: none;
                color: hsl(215, 20.2%, 65.1%);
                font-size: 0.7rem;
                width: 16px;
                display: inline-block;
            }
            .tree-toggle.collapsed::before {
                content: '▶';
            }
            .tree-toggle.expanded::before {
                content: '▼';
            }
            .tree-children {
                display: none;
            }
            .tree-children.expanded {
                display: block;
            }

            /* Chat Icon and Panel Styles */
            .chat-icon {
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: var(--primary-accent);
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                transition: all 0.3s ease;
                z-index: 1001;
                padding: 0;
            }
            .chat-icon:hover:not(:disabled) {
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
            }
            .chat-icon:disabled {
                background: var(--muted);
                cursor: not-allowed;
                opacity: 0.5;
            }
            .chat-icon img {
                width: 32px;
                height: 32px;
            }

            .chat-panel {
                position: fixed;
                bottom: 96px;
                right: 24px;
                width: 400px;
                height: 500px;
                background: var(--dark-tremor-background-muted);
                border: 1px solid var(--border);
                border-radius: 0.75rem;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
                display: none;
                flex-direction: column;
                z-index: 1000;
                overflow: hidden;
            }
            .chat-panel.open {
                display: flex;
            }

            .chat-header {
                background: var(--background);
                padding: 1rem 1.25rem;
                border-bottom: 1px solid var(--border);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .chat-header-title {
                font-size: 0.95rem;
                font-weight: 600;
                color: var(--primary);
            }
            .chat-minimize {
                background: var(--muted);
                color: var(--foreground);
                border: none;
                width: 28px;
                height: 28px;
                border-radius: 0.375rem;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            .chat-minimize:hover {
                background: var(--border);
            }

            .chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
                background: var(--background);
            }
            .chat-message {
                margin-bottom: 1rem;
                display: flex;
                flex-direction: column;
            }
            .chat-message.user {
                align-items: flex-end;
            }
            .chat-message.bot {
                align-items: flex-start;
            }
            .chat-bubble {
                max-width: 80%;
                padding: 0.75rem 1rem;
                border-radius: 0.75rem;
                font-size: 0.875rem;
                line-height: 1.4;
            }
            .chat-bubble.user {
                background: var(--primary-accent);
                color: white;
            }
            .chat-bubble.bot {
                background: var(--muted);
                color: var(--foreground);
            }

            /* Markdown styles in chat bubbles */
            .chat-bubble.bot p {
                margin-bottom: 0.5rem;
            }
            .chat-bubble.bot p:last-child {
                margin-bottom: 0;
            }
            .chat-bubble.bot h1, .chat-bubble.bot h2, .chat-bubble.bot h3 {
                color: var(--primary-accent);
                margin-top: 0.75rem;
                margin-bottom: 0.5rem;
                font-weight: 600;
            }
            .chat-bubble.bot h1 { font-size: 1.1rem; }
            .chat-bubble.bot h2 { font-size: 1rem; }
            .chat-bubble.bot h3 { font-size: 0.9rem; }
            .chat-bubble.bot code {
                background: var(--background);
                padding: 0.125rem 0.375rem;
                border-radius: 0.25rem;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                font-size: 0.8rem;
                color: hsl(212, 96.4%, 78.4%);
            }
            .chat-bubble.bot pre {
                background: var(--background);
                padding: 0.75rem;
                border-radius: 0.375rem;
                overflow-x: auto;
                margin: 0.5rem 0;
                border: 1px solid var(--border);
            }
            .chat-bubble.bot pre code {
                background: none;
                padding: 0;
            }
            .chat-bubble.bot ul, .chat-bubble.bot ol {
                margin-left: 1.5rem;
                margin-bottom: 0.5rem;
            }
            .chat-bubble.bot li {
                margin-bottom: 0.25rem;
            }
            .chat-bubble.bot blockquote {
                border-left: 3px solid var(--primary-accent);
                padding-left: 0.75rem;
                margin: 0.5rem 0;
                color: hsl(215, 20.2%, 65.1%);
            }
            .chat-bubble.bot a {
                color: var(--primary-accent);
                text-decoration: none;
            }
            .chat-bubble.bot a:hover {
                text-decoration: underline;
            }
            .chat-bubble.bot strong {
                font-weight: 600;
                color: var(--primary);
            }

            .chat-input-container {
                padding: 1rem;
                background: var(--dark-tremor-background-muted);
                border-top: 1px solid var(--border);
                display: flex;
                gap: 0.75rem;
                align-items: center;
            }
            .chat-input {
                flex: 1;
                background: var(--background);
                border: 1px solid var(--border);
                border-radius: 0.5rem;
                padding: 0.625rem 0.875rem;
                color: var(--foreground);
                font-size: 0.875rem;
                resize: none;
                max-height: 100px;
                overflow-y: auto;
            }
            .chat-input:focus {
                outline: none;
                border-color: var(--primary-accent);
            }
            .chat-input::placeholder {
                color: hsl(215, 20.2%, 65.1%);
            }
            .chat-send-btn {
                background: var(--primary-accent);
                border: none;
                width: 36px;
                height: 36px;
                border-radius: 0.5rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                flex-shrink: 0;
            }
            .chat-send-btn:hover {
                background: hsl(217, 91.2%, 55%);
            }
            .chat-send-btn:disabled {
                background: var(--muted);
                cursor: not-allowed;
                opacity: 0.5;
            }
        """)
    )
)

# Global storage for traces and annotations
traces = []
annotations = {}

def extract_system_prompt(trace):
    """Extract system prompt from trace data"""
    # Check trace metadata
    if trace.get('metadata'):
        metadata = trace['metadata']
        if isinstance(metadata, dict):
            if 'system_prompt' in metadata:
                return metadata['system_prompt']
            if 'llm' in metadata and isinstance(metadata['llm'], dict):
                if 'input_messages' in metadata['llm']:
                    for msg in metadata['llm']['input_messages']:
                        if isinstance(msg, dict) and msg.get('role') == 'system':
                            return msg.get('content', '')

    # Check observations for system messages
    for obs in trace.get('observations', []):
        if obs.get('input'):
            input_data = obs['input']
            if isinstance(input_data, dict):
                # Check messages array
                if 'messages' in input_data and isinstance(input_data['messages'], list):
                    for msg in input_data['messages']:
                        if isinstance(msg, dict) and msg.get('role') == 'system':
                            return msg.get('content', '')
                # Check llm.input_messages
                if 'llm' in input_data and isinstance(input_data['llm'], dict):
                    if 'input_messages' in input_data['llm']:
                        for msg in input_data['llm']['input_messages']:
                            if isinstance(msg, dict) and msg.get('role') == 'system':
                                return msg.get('content', '')

    return None

def format_simple_value(value):
    """Format a simple value for display"""
    if value is None:
        return Span("null", style="color: #64748b; font-style: italic;")
    elif isinstance(value, bool):
        return Span("true" if value else "false", style="color: #f59e0b;")
    elif isinstance(value, (int, float)):
        return Span(str(value), style="color: #10b981;")
    elif isinstance(value, str):
        # Don't add extra quotes, just show the string value
        return Span(value, style="color: #10b981;")
    else:
        return Span(str(value), style="color: #10b981;")

def render_tree_node(key, value, path="", depth=0):
    """Render a single tree node with collapsible children"""
    node_id = f"tree-{path}-{key}".replace(".", "-").replace(" ", "-")

    if isinstance(value, dict) and len(value) > 0:
        # Collapsible object
        children_elements = []
        for k, v in value.items():
            children_elements.append(render_tree_node(k, v, f"{path}.{key}", depth + 1))

        return Div(
            Div(
                Div(
                    Span(cls="tree-toggle collapsed", id=f"toggle-{node_id}",
                         onclick=f"toggleTree('{node_id}')"),
                    Span(key),
                    cls="metadata-key"
                ),
                Div(f"{len(value)} items", cls="metadata-value", style="color: #94a3b8; font-style: italic;"),
                cls="metadata-row"
            ),
            Div(
                *children_elements,
                id=f"children-{node_id}",
                cls="tree-children metadata-nested"
            )
        )
    elif isinstance(value, list) and len(value) > 0:
        # Check if it's a simple list
        if all(isinstance(item, (str, int, float, bool, type(None))) for item in value):
            # Display simple list inline
            return Div(
                Div(
                    Div(key, cls="metadata-key", style="padding-left: 16px;"),
                    Div(json.dumps(value), cls="metadata-value"),
                    cls="metadata-row"
                )
            )
        else:
            # Collapsible list with complex items
            children_elements = []
            for idx, item in enumerate(value):
                children_elements.append(render_tree_node(f"[{idx}]", item, f"{path}.{key}", depth + 1))

            return Div(
                Div(
                    Div(
                        Span(cls="tree-toggle collapsed", id=f"toggle-{node_id}",
                             onclick=f"toggleTree('{node_id}')"),
                        Span(key),
                        cls="metadata-key"
                    ),
                    Div(f"{len(value)} items", cls="metadata-value", style="color: #94a3b8; font-style: italic;"),
                    cls="metadata-row"
                ),
                Div(
                    *children_elements,
                    id=f"children-{node_id}",
                    cls="tree-children metadata-nested"
                )
            )
    else:
        # Leaf node
        return Div(
            Div(
                Div(key, cls="metadata-key", style="padding-left: 16px;"),
                Div(format_simple_value(value), cls="metadata-value"),
                cls="metadata-row"
            )
        )

def extract_user_input(trace, as_json=True):
    """Extract user input from trace data (excluding system messages)"""
    data = None
    if trace.get('input'):
        data = trace['input']
    else:
        for obs in trace.get('observations', []):
            if obs.get('input') and obs.get('type') == 'GENERATION':
                data = obs['input']
                break

    if data is None:
        return 'No input found'

    if as_json:
        return json.dumps(data, indent=2)

    # Try to extract text content from the data structure
    if isinstance(data, dict):
        # Common patterns in LLM inputs
        if 'messages' in data and isinstance(data['messages'], list):
            text_parts = []
            for msg in data['messages']:
                if isinstance(msg, dict) and 'content' in msg:
                    # Skip system messages - they are shown separately
                    if msg.get('role') != 'system':
                        text_parts.append(msg['content'])
            return '\n\n'.join(text_parts) if text_parts else json.dumps(data, indent=2)
        elif 'prompt' in data:
            return data['prompt']
        elif 'content' in data:
            return data['content']
    elif isinstance(data, str):
        return data

    return json.dumps(data, indent=2)

def extract_system_prompt(trace, as_json=True):
    """Extract system prompt from trace data"""
    system_content = None

    # Look in observations metadata.attributes (Langfuse stores it there)
    for obs in trace.get('observations', []):
        if obs.get('metadata') and obs['metadata'].get('attributes'):
            attributes = obs['metadata']['attributes']
            # Look for pattern: llm.input_messages.{N}.message.role = "system"
            # and get corresponding llm.input_messages.{N}.message.content
            for key, value in attributes.items():
                if key.endswith('.message.role') and value == 'system':
                    # Extract the index and get the content
                    # Key format: llm.input_messages.0.message.role
                    content_key = key.replace('.role', '.content')
                    system_content = attributes.get(content_key)
                    if system_content:
                        break
            if system_content:
                break

    # If not found in observations metadata, try trace-level metadata
    if not system_content:
        metadata = trace.get('metadata', {})
        if metadata:
            for key, value in metadata.items():
                if key.endswith('.message.role') and value == 'system':
                    content_key = key.replace('.role', '.content')
                    system_content = metadata.get(content_key)
                    if system_content:
                        break

    # If still not found, try the input/observations input field approach
    if not system_content:
        data = trace.get('input')

        # If not found, check observations input
        if not data:
            for obs in trace.get('observations', []):
                if obs.get('input') and obs.get('type') == 'GENERATION':
                    data = obs['input']
                    break

        if data:
            # Extract system message from messages array
            if isinstance(data, dict) and 'messages' in data and isinstance(data['messages'], list):
                for msg in data['messages']:
                    if isinstance(msg, dict) and msg.get('role') == 'system':
                        system_content = msg.get('content')
                        break

    if system_content is None:
        return None

    if as_json:
        return json.dumps({'role': 'system', 'content': system_content}, indent=2)

    return system_content

def extract_llm_output(trace, as_json=True):
    """Extract LLM output from trace data"""
    data = None
    if trace.get('output'):
        data = trace['output']
    else:
        for obs in trace.get('observations', []):
            if obs.get('output') and obs.get('type') == 'GENERATION':
                data = obs['output']
                break

    if data is None:
        return 'No output found'

    if as_json:
        return json.dumps(data, indent=2)

    # Try to extract text content from the data structure
    if isinstance(data, dict):
        # Common patterns in LLM outputs
        if 'choices' in data and isinstance(data['choices'], list):
            text_parts = []
            for choice in data['choices']:
                if isinstance(choice, dict):
                    if 'message' in choice and 'content' in choice['message']:
                        text_parts.append(choice['message']['content'])
                    elif 'text' in choice:
                        text_parts.append(choice['text'])
            return '\n\n'.join(text_parts) if text_parts else json.dumps(data, indent=2)
        elif 'message' in data and isinstance(data['message'], dict) and 'content' in data['message']:
            return data['message']['content']
        elif 'content' in data:
            return data['content']
        elif 'text' in data:
            return data['text']
    elif isinstance(data, str):
        return data

    return json.dumps(data, indent=2)

@rt('/')
def get():
    return Titled("LangFuse Trace Annotator",
        Div(
            # App Header
            Div(
                H1("LangFuse Trace Annotator", style="margin: 0; font-size: 1.5rem;"),
                cls="app-header"
            ),
            # Main Layout
            Div(
                # Left Sidebar
                Div(
                    Div(
                        H2("Fetch Traces", style="font-size: 18px; margin-bottom: 15px;"),
                        Form(
                            Div(
                                Label("Limit", _for="limit"),
                                Input(type="number", name="limit", id="limit", value="50", min="1", max="100"),
                                cls="form-group"
                            ),
                            Button("Fetch Traces", type="submit", id="fetch-traces-btn"),
                            hx_post="/fetch",
                            hx_target="#main-content",
                            hx_swap="innerHTML",
                            hx_indicator="#fetch-traces-btn",
                        ),
                    ),
                    id="left-sidebar",
                    cls="left-sidebar"
                ),
                # Sidebar Toggle Button
                Div(
                    Span("☰", id="toggle-icon"),
                    id="sidebar-toggle",
                    cls="sidebar-toggle",
                    onclick="toggleSidebar()"
                ),
                # Main Content Area
                Div(
                    Div(id="main-content"),
                    id="main-content-area",
                    cls="main-content-area"
                ),
                cls="app-layout"
            ),
            # Side Panel for trace details
            Div(id="side-panel", cls="side-panel"),
            # Chat Icon
            Button(
                Img(src="/img/openai-icon-blue.png", alt="Chat"),
                id="chat-icon",
                cls="chat-icon",
                onclick="toggleChatPanel()",
                disabled=True
            ),
            # Chat Panel
            Div(
                Div(
                    Div("New AI chat", cls="chat-header-title"),
                    Div(
                        Button("−", onclick="toggleChatPanel()", cls="chat-minimize", title="Minimize chat"),
                        style="display: flex; gap: 0.5rem; align-items: center;"
                    ),
                    cls="chat-header"
                ),
                Div(
                    Div("How may I be of service?",
                        cls="chat-message bot",
                        **{"data-initial-message": "true"},
                        style="text-align: center; margin-top: 1rem; font-style: italic; color: hsl(215, 20.2%, 65.1%);"
                    ),
                    id="chat-messages",
                    cls="chat-messages"
                ),
                Div(
                    Input(
                        type="text",
                        id="chat-input",
                        cls="chat-input",
                        placeholder="Ask me about your traces",
                        onkeypress="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendChatMessage(); }"
                    ),
                    Button(
                        "➤",
                        id="chat-send",
                        cls="chat-send-btn",
                        onclick="sendChatMessage()"
                    ),
                    cls="chat-input-container"
                ),
                id="chat-panel",
                cls="chat-panel"
            ),
            Script("""
                function toggleSidebar() {
                    const sidebar = document.getElementById('left-sidebar');
                    const toggle = document.getElementById('sidebar-toggle');
                    const icon = document.getElementById('toggle-icon');

                    sidebar.classList.toggle('collapsed');
                    toggle.classList.toggle('collapsed');

                    if (sidebar.classList.contains('collapsed')) {
                        icon.textContent = '☰';
                    } else {
                        icon.textContent = '☰';
                    }
                }

                function closePanel() {
                    document.getElementById('side-panel').classList.remove('open');
                    document.getElementById('main-content-area').classList.remove('panel-open');
                    // Remove selected class from all rows
                    document.querySelectorAll('tbody tr').forEach(row => row.classList.remove('selected'));
                }

                function navigateTrace(currentIndex, direction) {
                    const newIndex = currentIndex + direction;
                    const row = document.getElementById('trace-row-' + newIndex);
                    if (row) {
                        row.click();
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }

                function toggleFullscreen() {
                    const panel = document.getElementById('side-panel');
                    const contentArea = document.getElementById('main-content-area');
                    panel.classList.toggle('fullscreen');
                    if (panel.classList.contains('fullscreen')) {
                        contentArea.classList.remove('panel-open');
                    } else {
                        contentArea.classList.add('panel-open');
                    }
                }

                // Global keyboard navigation
                document.addEventListener('keydown', (e) => {
                    // Don't handle shortcuts if user is typing in an input field
                    const activeElement = document.activeElement;
                    const isTyping = activeElement && (
                        activeElement.tagName === 'INPUT' ||
                        activeElement.tagName === 'TEXTAREA' ||
                        activeElement.isContentEditable
                    );
                    if (isTyping) return;

                    // Only handle keyboard shortcuts if side panel is open
                    const panel = document.getElementById('side-panel');
                    if (!panel || !panel.classList.contains('open')) return;

                    // Get current index from panel data attribute
                    const currentIndex = parseInt(panel.getAttribute('data-current-index'));
                    if (isNaN(currentIndex)) return;

                    if (e.key === 'k' || e.key === 'K') {
                        e.preventDefault();
                        if (currentIndex > 0) {
                            navigateTrace(currentIndex, -1);
                        }
                    } else if (e.key === 'j' || e.key === 'J') {
                        e.preventDefault();
                        navigateTrace(currentIndex, 1);
                    }
                });

                // Chat panel functionality
                function toggleChatPanel() {
                    const chatPanel = document.getElementById('chat-panel');
                    chatPanel.classList.toggle('open');

                    // Focus on input when opening
                    if (chatPanel.classList.contains('open')) {
                        setTimeout(() => {
                            document.getElementById('chat-input').focus();
                        }, 100);
                    }
                }

                async function sendChatMessage() {
                    const input = document.getElementById('chat-input');
                    const sendBtn = document.getElementById('chat-send');
                    const message = input.value.trim();

                    if (!message) return;

                    // Add user message to chat
                    addChatMessage(message, 'user');

                    // Clear input and disable send button
                    input.value = '';
                    sendBtn.disabled = true;
                    input.disabled = true;

                    // Send message to backend
                    try {
                        const response = await fetch('/chat', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: new URLSearchParams({
                                'message': message
                            })
                        });

                        const data = await response.json();

                        if (data.success) {
                            addChatMessage(data.response, 'bot');

                            // Check if any traces were modified and refresh the detail panel if needed
                            if (data.modified_trace_ids && data.modified_trace_ids.length > 0) {
                                const panel = document.getElementById('side-panel');
                                if (panel && panel.classList.contains('open')) {
                                    const currentIndex = parseInt(panel.getAttribute('data-current-index'));
                                    if (!isNaN(currentIndex)) {
                                        // Get the trace ID for the currently displayed trace
                                        const currentTraceId = panel.getAttribute('data-trace-id');

                                        // If the current trace was modified, refresh the panel
                                        if (currentTraceId && data.modified_trace_ids.includes(currentTraceId)) {
                                            // Trigger HTMX to refresh the panel
                                            const currentView = panel.getAttribute('data-view') || 'formatted';
                                            fetch(`/trace-detail/${currentIndex}?view=${currentView}`)
                                                .then(res => res.text())
                                                .then(html => {
                                                    panel.innerHTML = html;
                                                });
                                        }
                                    }
                                }
                            }
                        } else {
                            addChatMessage('Error: ' + (data.error || 'Unknown error occurred'), 'bot');
                        }
                    } catch (error) {
                        addChatMessage('Failed to send message. Please try again.', 'bot');
                        console.error('Chat error:', error);
                    } finally {
                        // Re-enable input and send button
                        sendBtn.disabled = false;
                        input.disabled = false;
                        input.focus();
                    }
                }

                function addChatMessage(message, sender) {
                    const messagesContainer = document.getElementById('chat-messages');

                    // Remove initial message if present
                    const initialMsg = messagesContainer.querySelector('[data-initial-message]');
                    if (initialMsg) {
                        initialMsg.remove();
                    }

                    // Create message element
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `chat-message ${sender}`;

                    const bubble = document.createElement('div');
                    bubble.className = `chat-bubble ${sender}`;

                    // Render markdown for bot messages, plain text for user messages
                    if (sender === 'bot' && typeof marked !== 'undefined') {
                        bubble.innerHTML = marked.parse(message);
                    } else {
                        bubble.textContent = message;
                    }

                    messageDiv.appendChild(bubble);
                    messagesContainer.appendChild(messageDiv);

                    // Scroll to bottom
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }

                // Disable fetch button on submit and re-enable after response
                document.addEventListener('htmx:beforeRequest', function(evt) {
                    if (evt.detail.target.id === 'main-content') {
                        const fetchBtn = document.getElementById('fetch-traces-btn');
                        if (fetchBtn && evt.detail.elt.contains(fetchBtn)) {
                            fetchBtn.disabled = true;
                            fetchBtn.textContent = 'Fetching...';
                        }
                    }
                });

                document.addEventListener('htmx:afterSwap', function(evt) {
                    if (evt.detail.target.id === 'main-content') {
                        const fetchBtn = document.getElementById('fetch-traces-btn');
                        if (fetchBtn) {
                            fetchBtn.disabled = false;
                            fetchBtn.textContent = 'Fetch Traces';
                        }
                    }
                });
            """)
        )
    )

@rt('/img/{filename}')
def get_image(filename: str):
    """Serve static images"""
    import os
    img_path = os.path.join(os.path.dirname(__file__), 'frontend', 'img', filename)
    if os.path.exists(img_path):
        with open(img_path, 'rb') as f:
            content = f.read()
        # Determine content type based on extension
        content_type = 'image/png' if filename.endswith('.png') else 'image/jpeg'
        return content, 200, {'Content-Type': content_type}
    return "Image not found", 404

@rt('/fetch')
async def post(limit: int = 10):
    global traces, annotations

    try:
        # Initialize LangFuse client
        langfuse = Langfuse(
            public_key=os.environ.get("LANGFUSE_PUBLIC_KEY", ""),
            secret_key=os.environ.get("LANGFUSE_SECRET_KEY", ""),
            host=os.environ.get("LANGFUSE_HOST", "")
        )

        # Fetch traces
        traces_response = langfuse.api.trace.list(limit=min(limit, 100))

        traces.clear()
        annotations.clear()

        # Process each trace
        for trace in traces_response.data:
            full_trace = langfuse.api.trace.get(trace.id)

            trace_dict = {
                "id": full_trace.id,
                "timestamp": full_trace.timestamp.isoformat() if hasattr(full_trace.timestamp, 'isoformat') else str(full_trace.timestamp),
                "name": full_trace.name,
                "user_id": full_trace.user_id,
                "session_id": full_trace.session_id,
                "metadata": full_trace.metadata,
                "input": full_trace.input,
                "output": full_trace.output,
                "observations": []
            }

            # Get observations
            page = 1
            while True:
                obs_response = langfuse.api.observations.get_many(
                    trace_id=trace.id,
                    limit=100,
                    page=page
                )

                if not obs_response.data:
                    break

                for obs in obs_response.data:
                    trace_dict["observations"].append({
                        "id": obs.id,
                        "type": obs.type,
                        "input": obs.input,
                        "output": obs.output,
                        "metadata": obs.metadata if hasattr(obs, 'metadata') else None,
                    })

                if len(obs_response.data) < 100:
                    break
                page += 1

            traces.append(trace_dict)
            annotations[trace_dict["id"]] = ""

        return Div(
            Div(f"Successfully fetched {len(traces)} traces", cls="message success"),
            render_trace_table() if traces else Div("No traces found", cls="message info"),
            Script("""
                // Enable chat button when traces are loaded
                const chatIcon = document.getElementById('chat-icon');
                if (chatIcon) {
                    chatIcon.disabled = false;
                }
            """) if traces else None
        )

    except Exception as e:
        return Div(f"Error fetching traces: {str(e)}", cls="message error")

def render_trace_table():
    """Render the main trace table"""
    if not traces:
        return Div("No traces available", cls="message info")

    rows = []
    for idx, trace in enumerate(traces):
        # Extract preview of input/output
        input_preview = extract_user_input(trace, as_json=False)[:80]
        output_preview = extract_llm_output(trace, as_json=False)[:80]

        rows.append(
            Tr(
                Td(trace['timestamp'][:19], cls="timestamp"),
                Td(trace['name'] or 'litellm_request'),
                Td(input_preview),
                Td(output_preview),
                hx_get=f"/trace-detail/{idx}",
                hx_target="#side-panel",
                hx_swap="innerHTML",
                onclick=f"document.getElementById('side-panel').classList.add('open'); document.getElementById('main-content-area').classList.add('panel-open'); document.querySelectorAll('tbody tr').forEach(r => r.classList.remove('selected')); this.classList.add('selected');",
                id=f"trace-row-{idx}"
            )
        )

    return Div(
        Div(
            Table(
                Thead(
                    Tr(
                        Th("Timestamp"),
                        Th("Name"),
                        Th("Input"),
                        Th("Output")
                    )
                ),
                Tbody(*rows)
            ),
            cls="table-container"
        ),
        Div(
            Div(f"Showing {len(traces)} traces", cls="pagination-info"),
            Div(
                Button("Save All Annotations",
                       hx_post="/save",
                       hx_target="#save-result",
                       cls="save-button"),
                Div(id="save-result", style="margin-left: 15px;"),
                cls="page-controls"
            ),
            cls="pagination"
        )
    )

@rt('/trace-detail/{index}')
def get(index: int, view: str = "formatted"):
    """Render the side panel with trace details"""
    if not traces or index < 0 or index >= len(traces):
        return Div("Trace not found", cls="message error")

    trace = traces[index]
    system_prompt_text = extract_system_prompt(trace, as_json=False)
    user_input_text = extract_user_input(trace, as_json=False)
    llm_output_text = extract_llm_output(trace, as_json=False)

    prev_disabled = "disabled" if index == 0 else ""
    next_disabled = "disabled" if index >= len(traces) - 1 else ""

    return Div(
        Div(
            Div(trace['name'] or 'Trace Detail', cls="panel-title"),
            Div(
                Div(
                    Button("↑",
                           onclick=f"navigateTrace({index}, -1)" if index > 0 else "",
                           disabled=prev_disabled,
                           cls="nav-button",
                           title="Previous trace (K)"),
                    Span("K", style="font-size: 0.7rem; color: hsl(215, 20.2%, 65.1%); margin: 0 0.25rem;"),
                    cls="panel-nav-buttons"
                ),
                Div(
                    Button("↓",
                           onclick=f"navigateTrace({index}, 1)" if index < len(traces) - 1 else "",
                           disabled=next_disabled,
                           cls="nav-button",
                           title="Next trace (J)"),
                    Span("J", style="font-size: 0.7rem; color: hsl(215, 20.2%, 65.1%); margin: 0 0.25rem;"),
                    cls="panel-nav-buttons"
                ),
                Button("⛶",
                       onclick="toggleFullscreen()",
                       cls="expand-button",
                       id="expand-btn",
                       title="Toggle fullscreen"),
                Button("×", onclick="closePanel()", cls="close-panel"),
                style="display: flex; gap: 0.5rem; align-items: center;"
            ),
            cls="panel-header"
        ),
        Div(
            Div(
                Div("Trace ID", cls="section-title"),
                Div(trace['id'], cls="trace-id", style="margin-bottom: 15px;"),
                cls="section"
            ),
            Div(
                Div(
                    Div(
                        Div("System Prompt", cls="section-title"),
                        Span("📋", cls="copy-icon", id=f"copy-system-{index}",
                             onclick=f"copyToClipboard('system-text-{index}', 'copy-system-{index}')"),
                        cls="section-header"
                    ),
                    Button("JSON" if view == "formatted" else "Formatted",
                           hx_get=f"/trace-detail/{index}?view={'json' if view == 'formatted' else 'formatted'}",
                           hx_target="#side-panel",
                           hx_swap="innerHTML",
                           cls="toggle-view"),
                ),
                Div(
                    id=f"system-content-{index}",
                    cls="formatted-view",
                    **{"data-content": system_prompt_text or "No system prompt found", "data-text-id": f"system-text-{index}"}
                ) if view == "formatted" else Div(
                    extract_system_prompt(trace, as_json=True) or "No system prompt found",
                    cls="content-box",
                    id=f"system-text-{index}"
                ),
                Script(f"""
                    if (document.getElementById('system-content-{index}')) {{
                        const content = document.getElementById('system-content-{index}').getAttribute('data-content');
                        document.getElementById('system-content-{index}').innerHTML = marked.parse(content);
                        document.getElementById('system-content-{index}').setAttribute('id', 'system-text-{index}');
                    }}
                """) if view == "formatted" else None,
                cls="section"
            ),
            Div(
                Div(
                    Div(
                        Div("Input", cls="section-title"),
                        Span("📋", cls="copy-icon", id=f"copy-input-{index}",
                             onclick=f"copyToClipboard('input-text-{index}', 'copy-input-{index}')"),
                        cls="section-header"
                    ),
                    Button("JSON" if view == "formatted" else "Formatted",
                           hx_get=f"/trace-detail/{index}?view={'json' if view == 'formatted' else 'formatted'}",
                           hx_target="#side-panel",
                           hx_swap="innerHTML",
                           cls="toggle-view"),
                ),
                Div(
                    id=f"input-content-{index}",
                    cls="formatted-view",
                    **{"data-content": user_input_text, "data-text-id": f"input-text-{index}"}
                ) if view == "formatted" else Div(
                    extract_user_input(trace, as_json=True),
                    cls="content-box",
                    id=f"input-text-{index}"
                ),
                Script(f"""
                    if (document.getElementById('input-content-{index}')) {{
                        const content = document.getElementById('input-content-{index}').getAttribute('data-content');
                        document.getElementById('input-content-{index}').innerHTML = marked.parse(content);
                        document.getElementById('input-content-{index}').setAttribute('id', 'input-text-{index}');
                    }}
                """) if view == "formatted" else None,
                cls="section"
            ),
            Div(
                Div(
                    Div(
                        Div("Output", cls="section-title"),
                        Span("📋", cls="copy-icon", id=f"copy-output-{index}",
                             onclick=f"copyToClipboard('output-text-{index}', 'copy-output-{index}')"),
                        cls="section-header"
                    ),
                    Button("JSON" if view == "formatted" else "Formatted",
                           hx_get=f"/trace-detail/{index}?view={'json' if view == 'formatted' else 'formatted'}",
                           hx_target="#side-panel",
                           hx_swap="innerHTML",
                           cls="toggle-view"),
                ),
                Div(
                    id=f"output-content-{index}",
                    cls="formatted-view",
                    **{"data-content": llm_output_text}
                ) if view == "formatted" else Div(
                    extract_llm_output(trace, as_json=True),
                    cls="content-box",
                    id=f"output-text-{index}"
                ),
                Script(f"""
                    if (document.getElementById('output-content-{index}')) {{
                        const content = document.getElementById('output-content-{index}').getAttribute('data-content');
                        document.getElementById('output-content-{index}').innerHTML = marked.parse(content);
                        document.getElementById('output-content-{index}').setAttribute('id', 'output-text-{index}');
                    }}
                """) if view == "formatted" else None,
                cls="section"
            ),
            Div(
                Div("Comments", cls="section-title"),
                Textarea(
                    annotations.get(trace['id'], ''),
                    name="comment",
                    placeholder="Add your comments here...",
                    hx_post=f"/comment/{index}",
                    hx_trigger="change",
                    hx_swap="none"
                ),
                cls="section"
            ),
            # System Prompt Section
            (Div(
                Div(
                    Div("System Prompt", cls="section-title"),
                    Span("▼", cls="collapsible-toggle", id=f"system-toggle-{index}"),
                    cls="collapsible-header",
                    onclick=f"toggleCollapsible('system-{index}')"
                ),
                Div(
                    Div(
                        id=f"system-content-{index}",
                        cls="formatted-view",
                        **{"data-content": extract_system_prompt(trace) or "No system prompt found"}
                    ),
                    Script(f"""
                        if (document.getElementById('system-content-{index}')) {{
                            const content = document.getElementById('system-content-{index}').getAttribute('data-content');
                            document.getElementById('system-content-{index}').innerHTML = marked.parse(content);
                        }}
                    """),
                    id=f"system-{index}",
                    cls="collapsible-content"
                ),
                cls="collapsible-section"
            ) if extract_system_prompt(trace) else None),
            # Metadata Section
            Div(
                Div(
                    Div("Metadata", cls="section-title"),
                    Span("▼", cls="collapsible-toggle", id=f"metadata-toggle-{index}"),
                    cls="collapsible-header",
                    onclick=f"toggleCollapsible('metadata-{index}')"
                ),
                Div(
                    render_metadata_section(trace),
                    id=f"metadata-{index}",
                    cls="collapsible-content"
                ),
                cls="collapsible-section"
            ),
            # Observations Section
            Div(
                Div(
                    Div(f"Observations ({len(trace.get('observations', []))})", cls="section-title"),
                    Span("▼", cls="collapsible-toggle", id=f"observations-toggle-{index}"),
                    cls="collapsible-header",
                    onclick=f"toggleCollapsible('observations-{index}')"
                ),
                Div(
                    render_observations_section(trace),
                    id=f"observations-{index}",
                    cls="collapsible-content"
                ),
                cls="collapsible-section"
            ) if trace.get('observations') else None,
            Script(f"""
                function toggleCollapsible(id) {{
                    const content = document.getElementById(id);
                    const toggle = document.getElementById(id + '-toggle');
                    if (content.classList.contains('expanded')) {{
                        content.classList.remove('expanded');
                        toggle.classList.remove('expanded');
                    }} else {{
                        content.classList.add('expanded');
                        toggle.classList.add('expanded');
                    }}
                }}

                function copyToClipboard(elementId, iconId) {{
                    const element = document.getElementById(elementId);
                    const icon = document.getElementById(iconId);
                    if (!element) return;

                    // Get text content
                    const text = element.innerText || element.textContent;

                    // Copy to clipboard
                    navigator.clipboard.writeText(text).then(() => {{
                        // Show success feedback
                        const originalIcon = icon.innerText;
                        icon.innerText = '✓';
                        icon.classList.add('copied');

                        // Reset after 2 seconds
                        setTimeout(() => {{
                            icon.innerText = originalIcon;
                            icon.classList.remove('copied');
                        }}, 2000);
                    }}).catch(err => {{
                        console.error('Failed to copy:', err);
                    }});
                }}

                // Store current index, trace ID, and view in the panel element for keyboard navigation and refresh
                const panel = document.getElementById('side-panel');
                panel.setAttribute('data-current-index', '{index}');
                panel.setAttribute('data-trace-id', '{trace['id']}');
                panel.setAttribute('data-view', '{view}');
            """),
            cls="panel-content"
        ),
        cls="open"
    )

def parse_metadata_value(value):
    """Parse metadata value, handling JSON strings"""
    if isinstance(value, str):
        # Try to parse as JSON if it looks like JSON
        if (value.startswith('{') and value.endswith('}')) or (value.startswith('[') and value.endswith(']')):
            try:
                return json.loads(value)
            except:
                return value
    return value

def render_metadata_section(trace):
    """Render metadata as a collapsible tree"""
    metadata = trace.get('metadata')
    if not metadata or (isinstance(metadata, dict) and len(metadata) == 0):
        return Div("No metadata available", style="color: #64748b; font-size: 13px; padding: 10px 0;")

    # Parse metadata if it's a string
    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except:
            return Div(metadata, cls="content-box")

    if isinstance(metadata, dict):
        tree_nodes = []
        for key, value in metadata.items():
            # Parse value if it's a JSON string
            parsed_value = parse_metadata_value(value)
            tree_nodes.append(render_tree_node(key, parsed_value, "metadata"))

        return Div(
            *tree_nodes,
            Script("""
                function toggleTree(nodeId) {
                    const children = document.getElementById('children-' + nodeId);
                    const toggle = document.getElementById('toggle-' + nodeId);
                    if (children && toggle) {
                        if (children.classList.contains('expanded')) {
                            children.classList.remove('expanded');
                            toggle.classList.remove('expanded');
                            toggle.classList.add('collapsed');
                        } else {
                            children.classList.add('expanded');
                            toggle.classList.remove('collapsed');
                            toggle.classList.add('expanded');
                        }
                    }
                }
            """)
        )
    else:
        return Div(str(metadata), cls="content-box")

def render_observations_section(trace):
    """Render observations summary"""
    observations = trace.get('observations', [])
    if not observations:
        return Div("No observations", style="color: #64748b; font-size: 13px; padding: 10px 0;")

    rows = []
    for obs in observations:
        obs_type = obs.get('type', 'UNKNOWN')
        obs_id = obs.get('id', '')[:20] + '...'
        rows.append(
            Tr(
                Td(obs_type),
                Td(obs_id)
            )
        )

    return Table(*rows, cls="metadata-table")

@rt('/comment/{index}')
async def post(index: int, comment: str = ""):
    if 0 <= index < len(traces):
        trace_id = traces[index]['id']
        annotations[trace_id] = comment
    return ""

@rt('/save')
def post():
    try:
        export_data = []
        for trace in traces:
            export_data.append({
                "trace_id": trace['id'],
                "timestamp": trace['timestamp'],
                "user_input": extract_user_input(trace),
                "llm_output": extract_llm_output(trace),
                "comments": annotations.get(trace['id'], '')
            })

        filename = f"annotated_traces_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w') as f:
            json.dump(export_data, f, indent=2)

        return Div(f"Saved {len(export_data)} annotated traces to {filename}", cls="message success")
    except Exception as e:
        return Div(f"Error saving: {str(e)}", cls="message error")

@rt('/chat')
async def post(message: str = ""):
    """Handle chat messages with OpenAI Responses API"""
    try:
        if not message.strip():
            return json.dumps({"error": "Message cannot be empty"})

        # Initialize OpenAI client
        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

        # Build context from traces and comments
        traces_context = ""
        if traces:
            traces_context = "\n\n# LOADED TRACES AND COMMENTS\n\n"
            traces_context += f"You have access to {len(traces)} traces. Below is the data:\n\n"

            for idx, trace in enumerate(traces):
                trace_id = trace['id']
                trace_name = trace.get('name', 'litellm_request')
                user_input = extract_user_input(trace, as_json=False)
                llm_output = extract_llm_output(trace, as_json=False)
                user_comment = annotations.get(trace_id, '')

                traces_context += f"## Trace {idx + 1}\n"
                traces_context += f"**ID:** {trace_id}\n"
                traces_context += f"**Name:** {trace_name}\n"
                traces_context += f"**Timestamp:** {trace['timestamp']}\n"
                traces_context += f"**User Input:**\n{user_input[:500]}{'...' if len(user_input) > 500 else ''}\n\n"
                traces_context += f"**LLM Output:**\n{llm_output[:500]}{'...' if len(llm_output) > 500 else ''}\n\n"

                if user_comment:
                    traces_context += f"**User Comment:**\n{user_comment}\n\n"

                traces_context += "---\n\n"

        # System instructions for the chatbot
        system_instructions = """You are a helpful assistant specialized in analyzing AI application traces. You answer questions related to the loaded traces, user comments, and help categorize failures, identify patterns, and provide insights.

Your capabilities include:
- Analyzing trace data (inputs, outputs, timestamps)
- Reviewing and categorizing user comments
- Identifying patterns across multiple traces
- Suggesting failure mode categories
- Providing summaries and insights
- Adding comments to trace records

When asked to add comments to traces, you should respond with a special JSON block followed by your explanation.
Format your response like this:

```TRACE_ACTIONS
[
  {
    "action": "append_comment",
    "trace_id": "the-trace-id-here",
    "comment": "The comment to add"
  }
]
```

Then provide your natural language response to the user.

If asked to discuss topics unrelated to the traces or AI/LLM analysis, politely redirect the user back to trace analysis."""

        # Build the full input by combining system instructions, context, and user message
        full_input = system_instructions
        if traces_context:
            full_input += traces_context
        full_input += f"\n\nUser: {message}\n\nAssistant:"

        # Log the prompt being sent to the API
        print("\n" + "="*80)
        print("PROMPT SENT TO RESPONSES API:")
        print("="*80)
        print(full_input)
        print("="*80)
        print(f"Input length: {len(full_input)} characters")
        print("="*80 + "\n")

        # Call OpenAI Responses API
        response = client.responses.create(
            model="gpt-5",
            input=full_input,
            reasoning={"effort": "low"}
        )

        # Extract the response text
        assistant_message = response.output_text

        # Log the response received from the API
        print("\n" + "="*80)
        print("RESPONSE FROM API:")
        print("="*80)
        print(assistant_message)
        print("="*80)
        print(f"Response length: {len(assistant_message)} characters")
        print("="*80 + "\n")

        # Track which traces were modified
        modified_trace_ids = []

        # Parse the response for trace actions
        action_pattern = r'```TRACE_ACTIONS\s*(\[.*?\])\s*```'
        action_match = re.search(action_pattern, assistant_message, re.DOTALL)

        if action_match:
            try:
                actions = json.loads(action_match.group(1))

                # Execute each action
                for action in actions:
                    if action.get("action") == "append_comment":
                        trace_id = action.get("trace_id")
                        comment = action.get("comment")

                        # Find the trace and append the comment
                        for trace in traces:
                            if trace['id'] == trace_id:
                                current_comment = annotations.get(trace_id, '')
                                # Append with a separator if there's existing content
                                if current_comment.strip():
                                    annotations[trace_id] = current_comment + "\n\n[AI Assistant]\n" + comment
                                else:
                                    annotations[trace_id] = "[AI Assistant]\n" + comment
                                modified_trace_ids.append(trace_id)
                                break

                # Remove the JSON block from the response
                assistant_message = re.sub(action_pattern, '', assistant_message, flags=re.DOTALL).strip()

            except json.JSONDecodeError:
                # If we can't parse the actions, just continue with the original message
                pass

        return json.dumps({
            "response": assistant_message,
            "success": True,
            "modified_trace_ids": modified_trace_ids
        })

    except Exception as e:
        return json.dumps({
            "error": str(e),
            "success": False
        })

def is_port_in_use(port):
    """Check if a port is already in use"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def find_available_port(start_port=5001, max_attempts=10):
    """Find an available port starting from start_port"""
    for port in range(start_port, start_port + max_attempts):
        if not is_port_in_use(port):
            return port
    raise RuntimeError(f"Could not find an available port in range {start_port}-{start_port + max_attempts}")

if __name__ == "__main__":
    port = find_available_port()
    print(f"\n{'='*60}")
    print(f"🚀 LangFuse Trace Annotator starting on port {port}")
    print(f"{'='*60}")
    print(f"📱 Open your browser at: http://localhost:{port}")
    print(f"{'='*60}\n")
    serve(port=port)
