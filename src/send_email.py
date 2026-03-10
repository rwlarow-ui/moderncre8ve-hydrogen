"""
Send the weekly SEO brief via Resend.
"""

import os
import sys
import json
import urllib.request
import urllib.error


def send_brief(to: str, brief_path: str = "reports/weekly_brief.md"):
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        print("[EMAIL] RESEND_API_KEY not set — skipping email")
        return False

    with open(brief_path) as f:
        brief_md = f.read()

    # Extract period from brief
    period = "Weekly"
    for line in brief_md.splitlines():
        if line.startswith("**Period:**"):
            period = line.replace("**Period:**", "").strip()
            break

    # Convert markdown to simple HTML
    html = markdown_to_html(brief_md)

    payload = {
        "from": "SEO Truth Layer <seo@moderncre8ve.com>",
        "to": [to],
        "subject": f"ModernCre8ve SEO Brief — {period}",
        "html": html,
    }

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "ModernCre8ve-SEO-TruthLayer/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
            print(f"[EMAIL] Sent to {to} — id: {result.get('id', 'unknown')}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"[EMAIL] Failed ({e.code}): {body}")
        return False


def markdown_to_html(md: str) -> str:
    """Basic markdown to HTML for email rendering."""
    lines = md.split("\n")
    html_lines = [
        "<div style='font-family: -apple-system, sans-serif; max-width: 720px; margin: 0 auto; padding: 20px;'>"
    ]

    in_table = False

    for line in lines:
        stripped = line.strip()

        # Skip separator rows in tables
        if stripped.startswith("|") and all(c in "|-| " for c in stripped):
            continue

        # Table rows
        if stripped.startswith("|") and stripped.endswith("|"):
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if not in_table:
                html_lines.append("<table style='border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 14px;'>")
                html_lines.append("<tr>" + "".join(
                    f"<th style='border: 1px solid #ddd; padding: 8px; background: #f5f5f5; text-align: left;'>{c}</th>"
                    for c in cells
                ) + "</tr>")
                in_table = True
            else:
                html_lines.append("<tr>" + "".join(
                    f"<td style='border: 1px solid #ddd; padding: 8px;'>{c}</td>"
                    for c in cells
                ) + "</tr>")
            continue

        if in_table:
            html_lines.append("</table>")
            in_table = False

        if not stripped:
            continue
        elif stripped.startswith("# "):
            html_lines.append(f"<h1 style='color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 8px;'>{stripped[2:]}</h1>")
        elif stripped.startswith("## "):
            html_lines.append(f"<h2 style='color: #333; margin-top: 24px;'>{stripped[3:]}</h2>")
        elif stripped.startswith("### "):
            html_lines.append(f"<h3 style='color: #555; margin-top: 16px;'>{stripped[4:]}</h3>")
        elif stripped.startswith("---"):
            html_lines.append("<hr style='border: none; border-top: 1px solid #ddd; margin: 24px 0;'>")
        elif stripped.startswith("_") and stripped.endswith("_"):
            html_lines.append(f"<p style='color: #888; font-size: 12px;'><em>{stripped.strip('_')}</em></p>")
        else:
            # Handle inline code and bold
            text = stripped
            text = text.replace("**", "<strong>", 1).replace("**", "</strong>", 1)
            while "**" in text:
                text = text.replace("**", "<strong>", 1).replace("**", "</strong>", 1)
            while "`" in text:
                text = text.replace("`", "<code style='background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 13px;'>", 1)
                text = text.replace("`", "</code>", 1)
            html_lines.append(f"<p style='line-height: 1.6;'>{text}</p>")

    if in_table:
        html_lines.append("</table>")

    html_lines.append("</div>")
    return "\n".join(html_lines)


if __name__ == "__main__":
    to = sys.argv[1] if len(sys.argv) > 1 else "rob@moderncre8ve.com"
    send_brief(to)
