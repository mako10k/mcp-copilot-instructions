#!/usr/bin/env python3
import re
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

TARGETS = [
    Path('.github/copilot-instructions.md'),
    Path('docs/operation-scenarios.md'),
]

MAX_AGE_DAYS = 7

ISO_PATTERN = re.compile(
    r'(Created|Last Updated)\s*:\s*(\d{4}-\d{2}-\d{2})'
)


def get_last_updated(p: Path):
    text = p.read_text(encoding='utf-8')
    # Try to find ISO-like date
    m = ISO_PATTERN.search(text)
    if m:
        raw = m.group(2)
        try:
            dt = datetime.fromisoformat(raw)
            return dt
        except Exception:
            pass
    # Fallback: use file mtime
    return datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc)


def main():
    now = datetime.now(timezone.utc)
    stale = []
    for t in TARGETS:
        if not t.exists():
            stale.append((str(t), 'missing'))
            continue
        last = get_last_updated(t)
        age = (
            now - last
            if last.tzinfo
            else now - last.replace(tzinfo=timezone.utc)
        )
        if age > timedelta(days=MAX_AGE_DAYS):
            stale.append((str(t), f'>{MAX_AGE_DAYS}d old'))
    if stale:
        print('STALE files detected:')
        for name, reason in stale:
            print(f'- {name}: {reason}')
        sys.exit(1)
    print('All target files are fresh enough.')


if __name__ == '__main__':
    main()
