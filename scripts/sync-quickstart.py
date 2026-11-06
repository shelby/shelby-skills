#!/usr/bin/env python3
"""Sync the shelby skill from shelby-quickstart.

The quickstart's examples run against the live endpoint in CI, so they are the source
of truth for client settings and for where Shelby differs from S3. This copies their
READMEs into skills/shelby/references/, and the "Shelby is not quite S3" list from
the quickstart's AGENTS.md into skills/shelby/SKILL.md, at the commit pinned in
quickstart.lock. Relative links become absolute links to that commit on GitHub.

    python3 scripts/sync-quickstart.py                # rewrite the synced files
    python3 scripts/sync-quickstart.py --check        # exit 1 if any are stale (CI)
    python3 scripts/sync-quickstart.py --ref <commit> # move the pin, then sync

Reads from GitHub. Set QUICKSTART_DIR to a local clone to read from it instead; the
clone must have the pinned commit.
"""

import os
import posixpath
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

REPO = "shelby/shelby-quickstart"
ROOT = Path(__file__).resolve().parent.parent
SKILL = ROOT / "skills" / "shelby"
LOCK = ROOT / "quickstart.lock"

# Quickstart file -> reference file name.
SOURCES = {
    "clients/aws-cli/README.md": "aws-cli.md",
    "clients/python/README.md": "python.md",
    "clients/javascript/README.md": "javascript.md",
    "clients/rclone/README.md": "rclone.md",
    "clients/duckdb/README.md": "duckdb.md",
    "recipes/migrate-from-s3/README.md": "migrate-from-s3.md",
    "recipes/ml-training/README.md": "ml-training.md",
}
# The section's heading in the quickstart's AGENTS.md: current name first, then the
# name it had before 3847fd0, so commits on either side of the rename still sync.
HABITS = ("## Where Shelby differs from Amazon S3", "## Shelby is not quite S3")
BEGIN = "<!-- BEGIN SYNC: shelby-quickstart AGENTS.md. Run scripts/sync-quickstart.py, don't edit. -->"
END = "<!-- END SYNC -->"
RELATIVE_LINK = re.compile(r"\]\((?!https?://|#|mailto:)([^)\s]+)\)")


def fetch(ref: str, path: str) -> str:
    local = os.environ.get("QUICKSTART_DIR")
    if local:
        result = subprocess.run(
            ["git", "-C", local, "show", f"{ref}:{path}"],
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout
    url = f"https://raw.githubusercontent.com/{REPO}/{ref}/{path}"
    with urllib.request.urlopen(url, timeout=30) as response:
        return response.read().decode()


def absolutize(text: str, ref: str, path: str) -> str:
    """Point relative links at the same file on GitHub, at the pinned commit."""
    base = posixpath.dirname(path)

    def replace(match: re.Match) -> str:
        target, _, anchor = match.group(1).partition("#")
        resolved = posixpath.normpath(posixpath.join(base, target)) if target else path
        url = f"https://github.com/{REPO}/blob/{ref}/{resolved}"
        return f"]({url}{'#' + anchor if anchor else ''})"

    return RELATIVE_LINK.sub(replace, text)


def habits_list(agents_md: str) -> str:
    """The body of the habits section, without its heading."""
    lines = agents_md.splitlines()
    heading = next((h for h in HABITS if h in lines), None)
    if heading is None:
        raise SystemExit(f"AGENTS.md has none of the headings {HABITS}")
    start = lines.index(heading) + 1
    end = next(
        (i for i in range(start, len(lines)) if lines[i].startswith("## ")), len(lines)
    )
    return "\n".join(lines[start:end]).strip()


def render(ref: str) -> dict[Path, str]:
    rendered = {}
    for source, name in SOURCES.items():
        header = (
            f"<!-- Synced from {REPO}@{ref[:12]}, {source}. "
            "Edit it there, then run scripts/sync-quickstart.py. -->\n\n"
        )
        rendered[SKILL / "references" / name] = header + absolutize(
            fetch(ref, source), ref, source
        )
    skill = (SKILL / "SKILL.md").read_text()
    before, rest = skill.split(BEGIN, 1)
    _, after = rest.split(END, 1)
    block = absolutize(habits_list(fetch(ref, "AGENTS.md")), ref, "AGENTS.md")
    rendered[SKILL / "SKILL.md"] = f"{before}{BEGIN}\n{block}\n{END}{after}"
    return rendered


def main() -> int:
    args = sys.argv[1:]
    if "--ref" in args:
        LOCK.write_text(args[args.index("--ref") + 1].strip() + "\n")
    ref = LOCK.read_text().strip()
    rendered = render(ref)

    if "--check" in args:
        stale = [p for p, text in rendered.items() if not p.exists() or p.read_text() != text]
        for path in stale:
            print(f"stale: {path.relative_to(ROOT)}")
        if stale:
            print(f"run: python3 scripts/sync-quickstart.py (pinned at {ref[:12]})")
            return 1
        print(f"in sync with {REPO}@{ref[:12]}")
        return 0

    (SKILL / "references").mkdir(parents=True, exist_ok=True)
    for path, text in rendered.items():
        path.write_text(text)
    print(f"synced {len(rendered)} file(s) from {REPO}@{ref[:12]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
